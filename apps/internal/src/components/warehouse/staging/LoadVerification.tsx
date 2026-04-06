import { useCallback, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Button, Dialog, DialogTrigger, Heading, Modal, ModalOverlay, TextField, Label, Input } from 'react-aria-components'
import { GatedStep } from './GatedStep'
import { ScanInput } from '../shared/ScanInput'
import { SignaturePad } from '../shared/SignaturePad'
import { PhotoCapture } from '../shared/PhotoCapture'
import { LargeNumberInput } from '../shared/LargeNumberInput'
import { useWarehouseStore } from '../../../stores/warehouse'
import { loadVerification } from '../../../lib/server/warehouse-staging'
import type { LoadVerificationStep, StagingItem } from '../../../types/warehouse'

// ─── Configurable Tolerance ──────────────────────────────────
// Weight verification tolerance is configurable, NOT hardcoded (per locked decision)
const TOLERANCE_CONFIG = {
  /** Green: within this percentage — load approved */
  green: 2,
  /** Yellow: between green and red — warning but passable with review */
  yellow: 5,
  /** Red: above this — blocked, requires manager override */
  red: 5,
  /** Minimum required photos for gate clearance */
  minPhotos: 3,
} as const

// ─── Step Definitions ────────────────────────────────────────

const STEPS: { key: LoadVerificationStep; title: string; description: string }[] = [
  { key: 'scan_truck', title: 'Scan Truck ID', description: 'Scan the truck barcode to confirm assignment' },
  { key: 'scan_items', title: 'Scan Items', description: 'Scan each item as it is loaded onto the truck' },
  { key: 'verify_weight', title: 'Verify Weight', description: 'Compare actual weight against expected' },
  { key: 'photos', title: 'Capture Photos', description: 'Take rear, side, and seal photos' },
  { key: 'sign_off', title: 'Sign-Off', description: 'Driver and loader signatures required' },
]

// ─── Form Types ──────────────────────────────────────────────

interface VerificationFormValues {
  truckId: string
  actualWeightKg: number | null
  managerOverride: boolean
  managerCredentials: string
  managerReason: string
}

interface LoadVerificationProps {
  routeId: string
  items: StagingItem[]
  expectedWeightKg: number
  assignedTruckId: string
  assignedRoute: string
  onComplete: () => void
  onBack: () => void
}

/**
 * 5-step gated load verification flow.
 * Hard gating blocks departure for missing items, weight variance, or missing photos.
 * Manager override available for blocked departures via React Aria Dialog.
 * Dual signature pad captures driver + loader separately.
 */
export function LoadVerification({
  routeId,
  items,
  expectedWeightKg,
  assignedTruckId,
  assignedRoute,
  onComplete,
  onBack,
}: LoadVerificationProps) {
  const { activeWorkflow, setActiveWorkflow, clearWorkflow } = useWarehouseStore()

  // Restore persisted step from workflow state
  const persistedStep = activeWorkflow?.type === 'load-verification'
    ? (activeWorkflow.step as number)
    : 0

  const [currentStepIndex, setCurrentStepIndex] = useState(persistedStep)
  const [truckScanned, setTruckScanned] = useState(false)
  const [scannedItemIds, setScannedItemIds] = useState<Set<string>>(new Set())
  const [photos, setPhotos] = useState<{ rear: File | null; side: File | null; seal: File | null }>({
    rear: null,
    side: null,
    seal: null,
  })
  const [driverSignature, setDriverSignature] = useState<string | null>(null)
  const [loaderSignature, setLoaderSignature] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clearanceResult, setClearanceResult] = useState<'granted' | 'blocked' | null>(null)

  const { control, setValue, getValues } = useForm<VerificationFormValues>({
    defaultValues: {
      truckId: '',
      actualWeightKg: null,
      managerOverride: false,
      managerCredentials: '',
      managerReason: '',
    },
  })

  const actualWeightKg = useWatch({ control, name: 'actualWeightKg' })
  const managerOverride = useWatch({ control, name: 'managerOverride' })

  // ─── Weight Calculations ─────────────────────────────────
  const weightVariancePercent = useMemo(() => {
    if (!actualWeightKg || expectedWeightKg === 0) return 0
    return Math.abs(actualWeightKg - expectedWeightKg) / expectedWeightKg * 100
  }, [actualWeightKg, expectedWeightKg])

  const weightColor = useMemo(() => {
    if (!actualWeightKg) return 'text-[var(--color-text-secondary)]'
    if (weightVariancePercent <= TOLERANCE_CONFIG.green) return 'text-green-600'
    if (weightVariancePercent <= TOLERANCE_CONFIG.yellow) return 'text-amber-600'
    return 'text-red-600'
  }, [actualWeightKg, weightVariancePercent])

  const weightWithinTolerance = weightVariancePercent <= TOLERANCE_CONFIG.green

  // ─── Step Advancement ────────────────────────────────────
  const totalItems = items.length
  const scannedCount = scannedItemIds.size
  const allItemsScanned = totalItems > 0 && scannedCount === totalItems

  const photoCapturedCount = [photos.rear, photos.side, photos.seal].filter(Boolean).length
  const minPhotosReached = photoCapturedCount >= TOLERANCE_CONFIG.minPhotos

  const bothSigned = Boolean(driverSignature) && Boolean(loaderSignature)

  const canAdvanceForStep = useCallback(
    (stepIndex: number): boolean => {
      switch (STEPS[stepIndex].key) {
        case 'scan_truck':
          return truckScanned
        case 'scan_items':
          return allItemsScanned
        case 'verify_weight':
          return Boolean(actualWeightKg) && (weightWithinTolerance || managerOverride)
        case 'photos':
          return minPhotosReached
        case 'sign_off':
          return bothSigned
        default:
          return false
      }
    },
    [truckScanned, allItemsScanned, actualWeightKg, weightWithinTolerance, managerOverride, minPhotosReached, bothSigned],
  )

  const advanceStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < STEPS.length) {
      setCurrentStepIndex(nextIndex)
      setActiveWorkflow({
        type: 'load-verification',
        step: nextIndex,
        data: { routeId },
      })
    }
  }, [currentStepIndex, setActiveWorkflow, routeId])

  // ─── Block Reasons ───────────────────────────────────────
  const blockReasons = useMemo(() => {
    const reasons: string[] = []
    if (!allItemsScanned) reasons.push(`Missing items: ${totalItems - scannedCount} not scanned`)
    if (actualWeightKg && !weightWithinTolerance && !managerOverride) {
      reasons.push(`Weight variance ${weightVariancePercent.toFixed(1)}% exceeds ${TOLERANCE_CONFIG.green}% tolerance`)
    }
    if (!minPhotosReached) reasons.push(`Photos missing: ${photoCapturedCount}/${TOLERANCE_CONFIG.minPhotos} captured`)
    return reasons
  }, [allItemsScanned, totalItems, scannedCount, actualWeightKg, weightWithinTolerance, managerOverride, weightVariancePercent, minPhotosReached, photoCapturedCount])

  const isBlocked = blockReasons.length > 0 && !managerOverride

  // ─── Submit ──────────────────────────────────────────────
  const handleGateClearance = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const result = await loadVerification({
        data: {
          routeId,
          scanResults: items.map((item) => ({
            itemId: item.id,
            barcode: item.barcode,
            scanned: scannedItemIds.has(item.id),
          })),
          weight: actualWeightKg ?? 0,
          photos: [photos.rear, photos.side, photos.seal].filter(Boolean).map((f) => f!.name),
          driverSignature: driverSignature ?? '',
          loaderSignature: loaderSignature ?? '',
        },
      })

      if (result.clearance) {
        setClearanceResult('granted')
        clearWorkflow()
        setTimeout(() => onComplete(), 2000)
      } else {
        setClearanceResult('blocked')
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [routeId, items, scannedItemIds, actualWeightKg, photos, driverSignature, loaderSignature, clearWorkflow, onComplete])

  // ─── Manager Override ────────────────────────────────────
  const handleManagerOverride = useCallback(() => {
    const creds = getValues('managerCredentials')
    const reason = getValues('managerReason')
    if (creds && reason) {
      setValue('managerOverride', true)
    }
  }, [getValues, setValue])

  // ─── Success State ───────────────────────────────────────
  if (clearanceResult === 'granted') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M8 17L14 23L24 10" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Gate clearance granted
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          BOL will be generated
        </p>
      </div>
    )
  }

  const allStepsComplete = currentStepIndex === STEPS.length - 1 && canAdvanceForStep(STEPS.length - 1)

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          onPress={onBack}
          className="text-sm text-[#2563EB] hover:underline cursor-pointer"
        >
          Back to Staging
        </Button>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Load Verification
        </h2>
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-3">
        {/* Step 1: Scan Truck ID */}
        <GatedStep
          stepNumber={1}
          totalSteps={5}
          title={STEPS[0].title}
          description={STEPS[0].description}
          canAdvance={canAdvanceForStep(0)}
          isActive={currentStepIndex === 0}
          isCompleted={currentStepIndex > 0}
          onAdvance={advanceStep}
        >
          <div className="flex flex-col gap-3">
            <ScanInput
              label="Truck ID Barcode"
              expectedValue={assignedTruckId}
              onScan={() => setTruckScanned(true)}
              autoFocus
              size="large"
            />
            {truckScanned && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <div className="text-sm">
                  <span className="text-[var(--color-text-secondary)]">Truck ID: </span>
                  <span className="font-mono font-medium">{assignedTruckId}</span>
                </div>
                <div className="text-sm">
                  <span className="text-[var(--color-text-secondary)]">Route: </span>
                  <span className="font-medium">{assignedRoute}</span>
                </div>
              </div>
            )}
          </div>
        </GatedStep>

        {/* Step 2: Scan Items */}
        <GatedStep
          stepNumber={2}
          totalSteps={5}
          title={STEPS[1].title}
          description={STEPS[1].description}
          canAdvance={canAdvanceForStep(1)}
          isActive={currentStepIndex === 1}
          isCompleted={currentStepIndex > 1}
          onAdvance={advanceStep}
        >
          <div className="flex flex-col gap-3">
            <div className="text-sm text-[var(--color-text-secondary)]">
              <span className="font-mono font-[family-name:var(--font-geist-mono)] tabular-nums font-medium text-[var(--color-text-primary)]">
                {scannedCount}
              </span>{' '}
              of{' '}
              <span className="font-mono font-[family-name:var(--font-geist-mono)] tabular-nums font-medium text-[var(--color-text-primary)]">
                {totalItems}
              </span>{' '}
              scanned
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full rounded-full bg-[var(--color-border)]">
              <div
                className="h-full rounded-full bg-[#2563EB] transition-all duration-300"
                style={{ width: `${totalItems > 0 ? (scannedCount / totalItems) * 100 : 0}%` }}
              />
            </div>

            {/* Remaining items checklist */}
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {items.map((item) => {
                const isScanned = scannedItemIds.has(item.id)
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                      isScanned ? 'border-green-200 bg-green-50' : 'border-[var(--color-border)]'
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        isScanned ? 'bg-green-500 text-white' : 'border border-[var(--color-border)]'
                      }`}
                    >
                      {isScanned && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="flex-1 text-sm">{item.name}</span>
                    {!isScanned && (
                      <div className="w-44">
                        <ScanInput
                          label=""
                          expectedValue={item.barcode}
                          onScan={() => {
                            setScannedItemIds((prev) => new Set(prev).add(item.id))
                          }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </GatedStep>

        {/* Step 3: Verify Weight */}
        <GatedStep
          stepNumber={3}
          totalSteps={5}
          title={STEPS[2].title}
          description={STEPS[2].description}
          canAdvance={canAdvanceForStep(2)}
          isActive={currentStepIndex === 2}
          isCompleted={currentStepIndex > 2}
          onAdvance={advanceStep}
        >
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-[var(--color-text-secondary)]">Expected</div>
                <div className="font-mono font-[family-name:var(--font-geist-mono)] tabular-nums text-lg font-semibold">
                  {expectedWeightKg.toLocaleString()} kg
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-text-secondary)]">Actual</div>
                <div className={`font-mono font-[family-name:var(--font-geist-mono)] tabular-nums text-lg font-semibold ${weightColor}`}>
                  {actualWeightKg ? `${actualWeightKg.toLocaleString()} kg` : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-text-secondary)]">Variance</div>
                <div className={`font-mono font-[family-name:var(--font-geist-mono)] tabular-nums text-lg font-semibold ${weightColor}`}>
                  {actualWeightKg ? `${weightVariancePercent.toFixed(1)}%` : '—'}
                </div>
              </div>
            </div>

            <LargeNumberInput
              label="Actual Weight (kg)"
              unit="kg"
              value={actualWeightKg ?? undefined}
              onChange={(val) => setValue('actualWeightKg', val)}
              minValue={0}
              maxValue={99999}
              step={10}
            />

            {/* Tolerance info */}
            <div className="text-xs text-[var(--color-text-secondary)]">
              Tolerance: within{' '}
              <span className="font-mono tabular-nums">{TOLERANCE_CONFIG.green}%</span> = approved,{' '}
              <span className="font-mono tabular-nums">{TOLERANCE_CONFIG.green}-{TOLERANCE_CONFIG.yellow}%</span> = warning,{' '}
              above <span className="font-mono tabular-nums">{TOLERANCE_CONFIG.red}%</span> = blocked
            </div>
          </div>
        </GatedStep>

        {/* Step 4: Capture Photos */}
        <GatedStep
          stepNumber={4}
          totalSteps={5}
          title={STEPS[3].title}
          description={STEPS[3].description}
          canAdvance={canAdvanceForStep(3)}
          isActive={currentStepIndex === 3}
          isCompleted={currentStepIndex > 3}
          onAdvance={advanceStep}
        >
          <div className="grid grid-cols-3 gap-4">
            <PhotoCapture
              label="Rear Photo"
              required
              onCapture={(file) => setPhotos((p) => ({ ...p, rear: file }))}
            />
            <PhotoCapture
              label="Side Photo"
              required
              onCapture={(file) => setPhotos((p) => ({ ...p, side: file }))}
            />
            <PhotoCapture
              label="Seal Photo"
              required
              onCapture={(file) => setPhotos((p) => ({ ...p, seal: file }))}
            />
          </div>
        </GatedStep>

        {/* Step 5: Sign-Off — dual SignaturePad (driver + loader) */}
        <GatedStep
          stepNumber={5}
          totalSteps={5}
          title={STEPS[4].title}
          description={STEPS[4].description}
          canAdvance={canAdvanceForStep(4)}
          isActive={currentStepIndex === 4}
          isCompleted={false}
          onAdvance={() => {
            // Final step — no more steps to advance to
          }}
        >
          <div className="flex flex-col gap-6">
            {/* Driver Signature — SignaturePad instance 1 */}
            <SignaturePad
              label="Driver Signature"
              onSign={(dataUrl) => setDriverSignature(dataUrl)}
            />

            {/* Loader Signature — SignaturePad instance 2 */}
            <SignaturePad
              label="Loader Signature"
              onSign={(dataUrl) => setLoaderSignature(dataUrl)}
            />
          </div>
        </GatedStep>
      </div>

      {/* Hard Gating / Gate Clearance */}
      {allStepsComplete && (
        <div className="mt-2">
          {isBlocked ? (
            <div className="flex flex-col gap-3">
              {/* BLOCKED banner */}
              <div className="rounded-xl border border-red-300 bg-red-50 p-4">
                <h3 className="text-sm font-semibold text-red-700">
                  BLOCKED - Resolve Issues
                </h3>
                <ul className="mt-2 flex flex-col gap-1">
                  {blockReasons.map((reason, i) => (
                    <li key={i} className="text-sm text-red-600">
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Manager Override */}
              <DialogTrigger>
                <Button className="h-12 min-h-[48px] w-full rounded-lg border border-amber-300 bg-amber-50 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer">
                  Manager Override
                </Button>
                <ModalOverlay
                  isDismissable={false}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                >
                  <Modal className="w-full max-w-md">
                    <Dialog className="rounded-2xl bg-white p-6 shadow-xl outline-none" isKeyboardDismissDisabled>
                      <Heading slot="title" className="text-base font-semibold text-[var(--color-text-primary)]">
                        Manager Override
                      </Heading>
                      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                        Enter manager credentials and reason to override gate blocks.
                      </p>

                      <div className="mt-4 flex flex-col gap-3">
                        <TextField
                          value={getValues('managerCredentials')}
                          onChange={(v) => setValue('managerCredentials', v)}
                        >
                          <Label className="text-sm font-medium text-[var(--color-text-secondary)]">
                            Manager ID / Credentials
                          </Label>
                          <Input className="h-12 w-full rounded-lg border border-[var(--color-border)] px-3 text-sm" />
                        </TextField>

                        <TextField
                          value={getValues('managerReason')}
                          onChange={(v) => setValue('managerReason', v)}
                        >
                          <Label className="text-sm font-medium text-[var(--color-text-secondary)]">
                            Override Reason
                          </Label>
                          <Input className="h-12 w-full rounded-lg border border-[var(--color-border)] px-3 text-sm" />
                        </TextField>

                        <Button
                          onPress={handleManagerOverride}
                          className="h-12 min-h-[48px] w-full rounded-lg bg-amber-600 text-sm font-medium text-white hover:bg-amber-700 transition-colors cursor-pointer"
                        >
                          Confirm Override
                        </Button>
                      </div>
                    </Dialog>
                  </Modal>
                </ModalOverlay>
              </DialogTrigger>
            </div>
          ) : (
            <Button
              onPress={handleGateClearance}
              isDisabled={isSubmitting}
              className="h-14 min-h-[48px] w-full rounded-xl bg-[#2563EB] text-base font-semibold text-white hover:bg-[#1d4ed8] transition-colors cursor-pointer"
            >
              {isSubmitting ? 'Processing...' : 'Generate BOL'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
