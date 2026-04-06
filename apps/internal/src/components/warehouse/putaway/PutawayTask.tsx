import { useCallback, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogTrigger,
  Modal,
  ModalOverlay,
  Heading,
  Button as AriaButton,
  Select,
  SelectValue,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
} from 'react-aria-components'
import { animate } from 'motion'
import { putawayConfirm } from '../../../lib/server/warehouse-putaway'
import { ScanInput } from '../shared/ScanInput'
import { LargeNumberInput } from '../shared/LargeNumberInput'
import type { PutawayTask as PutawayTaskType, PutawayOverrideReason } from '../../../types/warehouse'

interface PutawayTaskProps {
  task: PutawayTaskType
  onComplete: () => void
}

const OVERRIDE_REASONS: { id: PutawayOverrideReason; label: string }[] = [
  { id: 'location_full', label: 'Location Full' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'equipment_issue', label: 'Equipment Issue' },
]

/**
 * Single directed putaway task with two-scan confirmation.
 * Scan source barcode, then destination barcode, confirm quantity.
 * Override location with mandatory reason.
 */
export function PutawayTask({ task, onComplete }: PutawayTaskProps) {
  const queryClient = useQueryClient()

  // Scan state
  const [sourceScanConfirmed, setSourceScanConfirmed] = useState(false)
  const [destScanConfirmed, setDestScanConfirmed] = useState(false)
  const [quantityPlaced, setQuantityPlaced] = useState<number>(task.quantity)

  // Override state
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [overrideReason, setOverrideReason] = useState<PutawayOverrideReason | null>(null)
  const [overrideLocation, setOverrideLocation] = useState<string | null>(null)

  // Success animation state
  const [showSuccess, setShowSuccess] = useState(false)

  const effectiveDestination = overrideLocation ?? task.toLocation

  const mutation = useMutation({
    mutationFn: () =>
      putawayConfirm({
        data: {
          locationBarcode: effectiveDestination,
          itemBarcode: task.fromLocation,
          quantity: quantityPlaced,
        },
      }),
    onSuccess: () => {
      setShowSuccess(true)
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'putaway-tasks'] })
      setTimeout(() => {
        onComplete()
      }, 1000)
    },
  })

  const canConfirm = sourceScanConfirmed && destScanConfirmed && quantityPlaced > 0

  const handleSourceScan = useCallback((_value: string) => {
    setSourceScanConfirmed(true)
  }, [])

  const handleDestScan = useCallback((_value: string) => {
    setDestScanConfirmed(true)
  }, [])

  const handleOverrideConfirm = useCallback(() => {
    if (!overrideReason || !overrideLocation) return
    setDestScanConfirmed(true)
    setOverrideOpen(false)
  }, [overrideReason, overrideLocation])

  // Success overlay
  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <path d="M12 20L18 26L28 14" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-green-700">Putaway Complete</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Product Info */}
      <section className="rounded-lg border border-[var(--color-border)] p-4 flex flex-col gap-2">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
          {task.productName}
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-[var(--color-text-secondary)]">Quantity</span>
            <p className="font-mono text-lg font-semibold text-[var(--color-text-primary)]">
              {task.quantity}
            </p>
          </div>
          <div>
            <span className="text-[var(--color-text-secondary)]">Lot</span>
            <p className="font-mono font-medium text-[var(--color-text-primary)]">
              {task.lotNumber}
            </p>
          </div>
          <div>
            <span className="text-[var(--color-text-secondary)]">Manufacture</span>
            <p className="font-mono text-sm text-[var(--color-text-primary)]">
              {new Date(task.manufactureDate).toLocaleDateString()}
            </p>
          </div>
          {task.expiryDate && (
            <div>
              <span className="text-[var(--color-text-secondary)]">Expiry</span>
              <p className="font-mono text-sm font-semibold text-amber-600">
                {new Date(task.expiryDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* FROM section */}
      <section className="rounded-lg border border-[var(--color-border)] p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)] mb-1">
          From
        </p>
        <p className="text-base font-semibold text-[var(--color-text-primary)]">
          {task.fromLocation}
        </p>
      </section>

      {/* TO section */}
      <section className="rounded-lg border border-[var(--color-border)] p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)] mb-1">
          To
        </p>
        <p className="text-base font-semibold text-[var(--color-text-primary)]">
          {effectiveDestination}
        </p>
        {overrideLocation && (
          <p className="text-xs text-amber-600 mt-1">
            Override: {OVERRIDE_REASONS.find((r) => r.id === overrideReason)?.label}
          </p>
        )}
      </section>

      {/* Two-scan confirmation */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <ScanInput
            label="Scan source location"
            expectedValue={task.fromLocation}
            onScan={handleSourceScan}
            autoFocus
            size="large"
          />
          {sourceScanConfirmed && (
            <p className="text-xs text-green-600 font-medium">Source confirmed</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          {sourceScanConfirmed ? (
            <ScanInput
              label="Scan destination location"
              expectedValue={effectiveDestination}
              onScan={handleDestScan}
              autoFocus
              size="large"
            />
          ) : (
            <div className="flex flex-col gap-1 opacity-40 pointer-events-none">
              <ScanInput
                label="Scan destination location"
                expectedValue={effectiveDestination}
                onScan={() => {}}
                size="large"
              />
            </div>
          )}
          {destScanConfirmed && (
            <p className="text-xs text-green-600 font-medium">Destination confirmed</p>
          )}
        </div>
      </section>

      {/* Quantity placed */}
      <LargeNumberInput
        label="Quantity Placed"
        value={quantityPlaced}
        onChange={(val) => setQuantityPlaced(val ?? task.quantity)}
        minValue={1}
        maxValue={task.quantity}
      />

      {/* Override Location */}
      <DialogTrigger isOpen={overrideOpen} onOpenChange={setOverrideOpen}>
        <AriaButton
          className="flex h-12 min-h-[48px] items-center justify-center rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
        >
          Override Location
        </AriaButton>
        <ModalOverlay className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <Modal className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl" isKeyboardDismissDisabled>
            <Dialog className="outline-none flex flex-col gap-4">
              <Heading slot="title" className="text-lg font-semibold text-[var(--color-text-primary)]">
                Override Putaway Location
              </Heading>

              {/* Mandatory reason select */}
              <Select
                selectedKey={overrideReason}
                onSelectionChange={(key) => setOverrideReason(key as PutawayOverrideReason)}
              >
                <Label className="text-sm font-medium text-[var(--color-text-secondary)]">
                  Reason (required)
                </Label>
                <AriaButton className="flex h-12 min-h-[48px] w-full items-center justify-between rounded-lg border border-[var(--color-border)] px-3 text-sm">
                  <SelectValue />
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </AriaButton>
                <Popover className="w-[--trigger-width] rounded-lg border border-[var(--color-border)] bg-white shadow-lg">
                  <ListBox className="p-1 outline-none">
                    {OVERRIDE_REASONS.map((reason) => (
                      <ListBoxItem
                        key={reason.id}
                        id={reason.id}
                        className="flex h-10 min-h-[48px] cursor-pointer items-center rounded-md px-3 text-sm hover:bg-[var(--color-bg-hover)] outline-none data-[focused]:bg-[var(--color-bg-hover)]"
                      >
                        {reason.label}
                      </ListBoxItem>
                    ))}
                  </ListBox>
                </Popover>
              </Select>

              {/* Alternate location scan */}
              <ScanInput
                label="Scan alternate location"
                onScan={(value) => setOverrideLocation(value)}
              />

              {/* Confirm Override */}
              <div className="flex gap-3 mt-2">
                <AriaButton
                  onPress={() => setOverrideOpen(false)}
                  className="flex h-12 min-h-[48px] flex-1 items-center justify-center rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)]"
                >
                  Cancel
                </AriaButton>
                <AriaButton
                  onPress={handleOverrideConfirm}
                  isDisabled={!overrideReason || !overrideLocation}
                  className="flex h-12 min-h-[48px] flex-1 items-center justify-center rounded-lg bg-[#2563EB] text-sm font-medium text-white disabled:opacity-40"
                >
                  Confirm Override
                </AriaButton>
              </div>
            </Dialog>
          </Modal>
        </ModalOverlay>
      </DialogTrigger>

      {/* Confirm Putaway */}
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={!canConfirm || mutation.isPending}
        className="flex h-14 min-h-[48px] items-center justify-center rounded-lg bg-[#2563EB] text-base font-semibold text-white transition-colors disabled:opacity-40 hover:bg-[#1d4ed8]"
      >
        {mutation.isPending ? 'Confirming...' : 'Confirm Putaway'}
      </button>

      {mutation.isError && (
        <p className="text-sm text-red-600 text-center">
          Failed to confirm putaway. Please try again.
        </p>
      )}
    </div>
  )
}
