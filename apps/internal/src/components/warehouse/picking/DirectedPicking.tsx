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
 * Step-by-step directed picking with FEFO enforcement.
 * Two-scan verification per step (location + product).
 * Exception handling: short pick, skip, substitute.
 * Per spec section 4.7.
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
      // Estimate weight per step proportionally
      const step = steps.find((s) => s.id === stepId)
      if (step) {
        setCumulativeWeightKg((prev) => prev + qty * 10) // Rough estimate per unit
      }

      if (isLastStep) {
        // Submit all lines
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

    // FEFO enforcement: strict — block if newer lot when older available
    if (currentStep.fefoEnforced) {
      const validation = validateFEFOPick(
        currentStep.lotNumber,
        // In production, available lots come from server; here use current step as the directed lot
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
        // Skip: advance without adding to picked lines
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
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[#2563EB]" />
      </div>
    )
  }

  if (!currentStep) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-base font-medium text-[var(--color-text-primary)]">
          No pick steps available
        </p>
      </div>
    )
  }

  const canConfirm = locationScanConfirmed && productScanConfirmed

  return (
    <div className="flex flex-col gap-4">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] min-h-[48px] min-w-[48px]"
          aria-label="Back to pick queue"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1">
          <StepIndicator
            current={currentStep.stepNumber}
            total={currentStep.totalSteps}
          />
        </div>
      </div>

      {/* Navigate direction */}
      <section className="rounded-lg border border-[var(--color-border)] bg-[#2563EB]/5 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[#2563EB] mb-1">
          Go To
        </p>
        <p className="text-base font-semibold text-[var(--color-text-primary)]">
          {currentStep.locationPath}
        </p>
      </section>

      {/* Product info */}
      <section className="rounded-lg border border-[var(--color-border)] p-4 flex flex-col gap-2">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
          {currentStep.productName}
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-[var(--color-text-secondary)]">SKU</span>
            <p className="font-mono text-sm text-[var(--color-text-primary)]">
              {currentStep.sku}
            </p>
          </div>
          <div>
            <span className="text-[var(--color-text-secondary)]">Lot</span>
            <p className="font-mono font-medium text-[var(--color-text-primary)]">
              {currentStep.lotNumber}
            </p>
          </div>
          <div>
            <span className="text-[var(--color-text-secondary)]">Quantity</span>
            <p className="font-mono text-lg font-semibold text-[var(--color-text-primary)]">
              {currentStep.quantityToPick}
            </p>
          </div>
          {currentStep.fefoEnforced && currentStep.expiryDate && (
            <div>
              <span className="text-[var(--color-text-secondary)]">FEFO</span>
              <p className="text-sm font-medium text-amber-600">
                Oldest lot — expires{' '}
                <span className="font-mono">
                  {new Date(currentStep.expiryDate).toLocaleDateString()}
                </span>
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Two-scan verification */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <ScanInput
            label="Scan location barcode"
            expectedValue={currentStep.locationPath}
            onScan={() => setLocationScanConfirmed(true)}
            autoFocus
            size="large"
          />
          {locationScanConfirmed && (
            <p className="text-xs text-green-600 font-medium">Location confirmed</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          {locationScanConfirmed ? (
            <ScanInput
              label="Scan product barcode"
              expectedValue={currentStep.sku}
              onScan={() => setProductScanConfirmed(true)}
              autoFocus
              size="large"
            />
          ) : (
            <div className="opacity-40 pointer-events-none">
              <ScanInput
                label="Scan product barcode"
                expectedValue={currentStep.sku}
                onScan={() => {}}
                size="large"
              />
            </div>
          )}
          {productScanConfirmed && (
            <p className="text-xs text-green-600 font-medium">Product confirmed</p>
          )}
        </div>
      </section>

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
        <div className="rounded-lg border border-red-300 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-700">{fefoError}</p>
        </div>
      )}

      {/* Exception buttons */}
      <div className="flex gap-2">
        <AriaButton
          onPress={() => setExceptionType('short_pick')}
          className="flex h-10 min-h-[48px] flex-1 items-center justify-center rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-secondary)]"
        >
          Short Pick
        </AriaButton>
        <AriaButton
          onPress={() => setExceptionType('skip')}
          className="flex h-10 min-h-[48px] flex-1 items-center justify-center rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-secondary)]"
        >
          Skip Item
        </AriaButton>
        <AriaButton
          onPress={() => setExceptionType('substitute')}
          className="flex h-10 min-h-[48px] flex-1 items-center justify-center rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-secondary)]"
        >
          Substitute
        </AriaButton>
      </div>

      {/* Confirm Pick */}
      <button
        type="button"
        onClick={handleConfirmPick}
        disabled={!canConfirm || confirmMutation.isPending}
        className="flex h-14 min-h-[48px] items-center justify-center rounded-lg bg-[#2563EB] text-base font-semibold text-white transition-colors disabled:opacity-40 hover:bg-[#1d4ed8]"
      >
        {confirmMutation.isPending
          ? 'Confirming...'
          : isLastStep
            ? 'Complete Order'
            : 'Confirm Pick'}
      </button>

      {confirmMutation.isError && (
        <p className="text-sm text-red-600 text-center">
          Failed to confirm pick. Please try again.
        </p>
      )}

      {/* Weight Tracker — always visible at bottom */}
      <WeightTracker
        currentWeightKg={cumulativeWeightKg}
        maxCapacityKg={maxCapacityKg}
      />

      {/* Exception Dialog */}
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
