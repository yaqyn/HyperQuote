import { useCallback, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button as AriaButton } from 'react-aria-components'
import { getPickSteps, confirmPick } from '../../../lib/server/warehouse-picking'
import { validateFEFOPick } from '../../../lib/warehouse/fefo'
import { ScanInput } from '../shared/ScanInput'
import { LargeNumberInput } from '../shared/LargeNumberInput'
import { StepIndicator } from '../shared/StepIndicator'
import { WeightTracker } from './WeightTracker'
import { PickExceptions, type PickExceptionResult } from './PickExceptions'
import type { PickStep, PickException } from '../../../types/warehouse'

interface DirectedPickingProps {
  orderId: string
  maxCapacityKg: number
  onComplete: () => void
  onBack: () => void
}

/**
 * Step-by-step directed picking — "The Route".
 * Current item LARGE AND CENTERED: product name (18px), location code (24px mono bold blue), quantity (32px mono).
 * Two-scan verification per step (location + product).
 * FEFO enforcement. Exception handling.
 */
export function DirectedPicking({
  orderId,
  maxCapacityKg,
  onComplete,
  onBack,
}: DirectedPickingProps) {
  const queryClient = useQueryClient()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [locationScanConfirmed, setLocationScanConfirmed] = useState(false)
  const [productScanConfirmed, setProductScanConfirmed] = useState(false)
  const [quantityPicked, setQuantityPicked] = useState<number>(0)
  const [fefoError, setFefoError] = useState<string | null>(null)
  const [exceptionType, setExceptionType] = useState<PickException | null>(null)
  const [cumulativeWeightKg, setCumulativeWeightKg] = useState(0)
  const [pickedLines, setPickedLines] = useState<
    { stepId: string; pickedQty: number; lotNumber: string }[]
  >([])

  const { data, isLoading } = useQuery({
    queryKey: ['warehouse', 'pick-steps', orderId],
    queryFn: () => getPickSteps({ data: { orderId } }),
    staleTime: 30_000,
  })

  const steps = data?.steps ?? []
  const currentStep = steps[currentStepIndex]
  const isLastStep = currentStepIndex === steps.length - 1

  const confirmMutation = useMutation({
    mutationFn: () =>
      confirmPick({
        data: {
          pickListId: orderId,
          lines: pickedLines,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'pick-queue'] })
      onComplete()
    },
  })

  const resetStepState = useCallback(() => {
    setLocationScanConfirmed(false)
    setProductScanConfirmed(false)
    setQuantityPicked(0)
    setFefoError(null)
    setExceptionType(null)
  }, [])

  const advanceStep = useCallback(
    (qty: number, lotNumber: string, stepId: string) => {
      const newLines = [...pickedLines, { stepId, pickedQty: qty, lotNumber }]
      setPickedLines(newLines)
      const step = steps.find((s) => s.id === stepId)
      if (step) {
        setCumulativeWeightKg((prev) => prev + qty * 10)
      }

      if (isLastStep) {
        confirmMutation.mutate()
      } else {
        setCurrentStepIndex((prev) => prev + 1)
        resetStepState()
      }
    },
    [pickedLines, steps, isLastStep, confirmMutation, resetStepState],
  )

  const handleConfirmPick = useCallback(() => {
    if (!currentStep) return

    if (currentStep.fefoEnforced) {
      const validation = validateFEFOPick(
        currentStep.lotNumber,
        [
          {
            lotNumber: currentStep.lotNumber,
            expiryDate: currentStep.expiryDate || null,
            quantityAvailable: currentStep.quantityToPick,
          },
        ],
        quantityPicked || currentStep.quantityToPick,
      )

      if (!validation.valid) {
        setFefoError(
          validation.reason ?? 'Older lot available. FEFO enforcement blocks this pick.',
        )
        return
      }
    }

    setFefoError(null)
    advanceStep(
      quantityPicked || currentStep.quantityToPick,
      currentStep.lotNumber,
      currentStep.id,
    )
  }, [currentStep, quantityPicked, advanceStep])

  const handleException = useCallback(
    (result: PickExceptionResult) => {
      if (!currentStep) return
      setExceptionType(null)

      if (result.type === 'short_pick') {
        advanceStep(result.pickedQty ?? 0, currentStep.lotNumber, currentStep.id)
      } else if (result.type === 'skip') {
        if (isLastStep) {
          confirmMutation.mutate()
        } else {
          setCurrentStepIndex((prev) => prev + 1)
          resetStepState()
        }
      } else if (result.type === 'substitute') {
        advanceStep(
          quantityPicked || currentStep.quantityToPick,
          result.substituteBarcode ?? currentStep.lotNumber,
          currentStep.id,
        )
      }
    },
    [currentStep, isLastStep, quantityPicked, advanceStep, confirmMutation, resetStepState],
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/10 dark:border-white/10 border-t-[#2563EB]" />
      </div>
    )
  }

  if (!currentStep) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-black/40 dark:text-white/40">No pick steps available</p>
      </div>
    )
  }

  const canConfirm = locationScanConfirmed && productScanConfirmed

  return (
    <div className="flex flex-col gap-6 px-6 py-4 min-h-[calc(100dvh-6rem)]">
      {/* Header: back + step indicator */}
      <div className="flex items-center gap-4">
        <AriaButton
          onPress={onBack}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-black/10 dark:border-white/10 cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
          aria-label="Back to pick queue"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </AriaButton>
        <div className="flex-1">
          <StepIndicator
            current={currentStep.stepNumber}
            total={currentStep.totalSteps}
            label="task"
          />
        </div>
      </div>

      {/* HERO: Location code — the BIGGEST thing on screen. Worker walks to it. */}
      <div className="flex flex-col items-center gap-2 py-6">
        <span className="text-[13px] font-bold text-[#2563EB] uppercase tracking-[0.2em]">Go To</span>
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[52px] font-bold text-[#2563EB] text-center leading-none">
          {currentStep.locationPath}
        </span>
      </div>

      {/* Quantity — second biggest. Worker needs to know HOW MANY to grab. */}
      <div className="flex flex-col items-center gap-2 py-3">
        <span className="text-[13px] font-bold text-black/40 dark:text-white/40 uppercase tracking-[0.2em]">Pick</span>
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[56px] font-bold text-black/90 dark:text-white/90 leading-none">
          {currentStep.quantityToPick}
        </span>
      </div>

      {/* Product info — readable but secondary */}
      <div className="flex flex-col items-center gap-2 py-2">
        <span className="text-[18px] font-semibold text-black/60 dark:text-white/60 text-center">
          {currentStep.productName}
        </span>
        <div className="flex items-center gap-4 text-[14px] text-black/30 dark:text-white/30">
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
            SKU {currentStep.sku}
          </span>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
            Lot {currentStep.lotNumber}
          </span>
        </div>
        {currentStep.fefoEnforced && currentStep.expiryDate && (
          <span className="text-[13px] font-medium text-amber-600 dark:text-amber-400">
            FEFO — expires{' '}
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
              {new Date(currentStep.expiryDate).toLocaleDateString()}
            </span>
          </span>
        )}
      </div>

      {/* Two-scan verification */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <ScanInput
            label="1. Scan Location"
            expectedValue={currentStep.locationPath}
            onScan={() => setLocationScanConfirmed(true)}
            autoFocus
            size="large"
          />
          {locationScanConfirmed && (
            <span className="text-[14px] font-medium text-green-600 dark:text-green-400">Location confirmed</span>
          )}
        </div>

        <div className={locationScanConfirmed ? '' : 'opacity-30 pointer-events-none'}>
          <ScanInput
            label="2. Scan Product"
            expectedValue={currentStep.sku}
            onScan={() => setProductScanConfirmed(true)}
            autoFocus={locationScanConfirmed}
            size="large"
          />
          {productScanConfirmed && (
            <span className="text-[14px] font-medium text-green-600 dark:text-green-400 mt-1">Product confirmed</span>
          )}
        </div>
      </div>

      {/* Quantity entry */}
      <LargeNumberInput
        label="Quantity Picked"
        value={quantityPicked || currentStep.quantityToPick}
        onChange={(val) => setQuantityPicked(val ?? currentStep.quantityToPick)}
        minValue={1}
        maxValue={currentStep.quantityToPick}
      />

      {/* FEFO error */}
      {fefoError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{fefoError}</p>
        </div>
      )}

      {/* Exception buttons — 48px+ touch targets for gloved hands */}
      <div className="flex gap-3">
        <AriaButton
          onPress={() => setExceptionType('short_pick')}
          className="flex h-14 flex-1 items-center justify-center rounded-xl border border-black/10 dark:border-white/10 text-[15px] font-semibold text-black/50 dark:text-white/50 cursor-pointer active:scale-[0.97]"
        >
          Short Pick
        </AriaButton>
        <AriaButton
          onPress={() => setExceptionType('skip')}
          className="flex h-14 flex-1 items-center justify-center rounded-xl border border-black/10 dark:border-white/10 text-[15px] font-semibold text-black/50 dark:text-white/50 cursor-pointer active:scale-[0.97]"
        >
          Skip
        </AriaButton>
        <AriaButton
          onPress={() => setExceptionType('substitute')}
          className="flex h-14 flex-1 items-center justify-center rounded-xl border border-black/10 dark:border-white/10 text-[15px] font-semibold text-black/50 dark:text-white/50 cursor-pointer active:scale-[0.97]"
        >
          Substitute
        </AriaButton>
      </div>

      {/* Weight tracker — compact, above actions */}
      <WeightTracker
        currentWeightKg={cumulativeWeightKg}
        maxCapacityKg={maxCapacityKg}
      />

      {confirmMutation.isError && (
        <p className="text-sm text-red-600 dark:text-red-400 text-center">
          Failed to confirm pick. Try again.
        </p>
      )}

      {/* Confirm Pick — BOTTOM of screen, thumb zone, biggest button */}
      <div className="mt-auto pt-4 pb-2">
        <AriaButton
          onPress={handleConfirmPick}
          isDisabled={!canConfirm || confirmMutation.isPending}
          className="flex h-[80px] w-full items-center justify-center rounded-2xl bg-[#2563EB] text-[20px] font-bold text-white cursor-pointer disabled:opacity-30 transition-all active:scale-[0.97] shadow-lg shadow-[#2563EB]/20"
        >
          {confirmMutation.isPending
            ? 'Confirming...'
            : isLastStep
              ? 'Complete Order'
              : 'Confirm Pick'}
        </AriaButton>
      </div>

      {/* Exception dialog */}
      {exceptionType && (
        <PickExceptions
          type={exceptionType}
          availableQty={currentStep.quantityToPick}
          substitutes={[]}
          onConfirm={handleException}
          onCancel={() => setExceptionType(null)}
        />
      )}
    </div>
  )
}
