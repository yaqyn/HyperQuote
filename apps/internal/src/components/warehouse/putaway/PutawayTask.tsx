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
import { motion } from 'motion/react'
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
 * "The Shelf" — Single putaway task.
 * Product + quantity + source -> destination.
 * Location codes in HUGE bold mono. Confirm as big green-tinted button.
 * Two-scan confirmation: source barcode, then destination barcode.
 */
export function PutawayTask({ task, onComplete }: PutawayTaskProps) {
  const queryClient = useQueryClient()

  const [sourceScanConfirmed, setSourceScanConfirmed] = useState(false)
  const [destScanConfirmed, setDestScanConfirmed] = useState(false)
  const [quantityPlaced, setQuantityPlaced] = useState<number>(task.quantity)

  const [overrideOpen, setOverrideOpen] = useState(false)
  const [overrideReason, setOverrideReason] = useState<PutawayOverrideReason | null>(null)
  const [overrideLocation, setOverrideLocation] = useState<string | null>(null)

  const [showSuccess, setShowSuccess] = useState(false)

  const effectiveDestination = overrideLocation ?? task.toLocation

  const mutation = useMutation({
    mutationFn: () =>
      putawayConfirm({
        data: {
          taskId: task.id,
          locationBarcode: effectiveDestination,
          itemBarcode: task.fromLocation,
          quantity: quantityPlaced,
          ...(overrideReason ? { overrideReason } : {}),
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

  // ─── Success Overlay ──────────────────────────────────────
  if (showSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="flex flex-col items-center justify-center py-24 gap-6"
      >
        <div className="flex h-24 w-24 items-center justify-center rounded-full" style={{ background: 'rgba(22, 163, 74, 0.08)' }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path d="M14 24L22 32L34 16" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-xl font-bold text-[var(--color-text-primary)]">Putaway Complete</p>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ─── Product Identity ──────────────────────────────── */}
      <div>
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
          {task.productName}
        </h3>
        <div className="mt-3 flex items-baseline gap-6">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
              Qty
            </span>
            <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-bold text-[var(--color-text-primary)]">
              {task.quantity}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
              Lot
            </span>
            <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-base font-semibold text-[var(--color-text-primary)]">
              {task.lotNumber}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
              Mfg
            </span>
            <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm text-[var(--color-text-secondary)]">
              {new Date(task.manufactureDate).toLocaleDateString()}
            </p>
          </div>
          {task.expiryDate && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-600">
                Exp
              </span>
              <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-semibold text-amber-600">
                {new Date(task.expiryDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── FROM → TO (the hero of the screen) ───────────── */}
      <div className="flex items-center gap-4">
        {/* From */}
        <div className="flex-1 rounded-xl border border-[var(--color-border)] p-4">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
            From
          </span>
          <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xl font-bold text-[var(--color-text-primary)] mt-1">
            {task.fromLocation}
          </p>
        </div>

        {/* Arrow */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[var(--color-text-secondary)]" aria-hidden="true">
          <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* To — HUGE location code in blue */}
        <div className="flex-1 rounded-xl border-2 border-[#2563EB] p-4" style={{ background: 'rgba(37, 99, 235, 0.04)' }}>
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#2563EB]">
            To
          </span>
          <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[28px] font-bold text-[#2563EB] mt-1 leading-tight">
            {effectiveDestination}
          </p>
          {overrideLocation && (
            <p className="text-xs text-amber-600 mt-1 font-medium">
              Override: {OVERRIDE_REASONS.find((r) => r.id === overrideReason)?.label}
            </p>
          )}
        </div>
      </div>

      {/* ─── Two-Scan Confirmation ────────────────────────── */}
      <div className="flex flex-col gap-5">
        {/* Source scan */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ScanStepIndicator done={sourceScanConfirmed} step={1} />
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              Scan source
            </span>
          </div>
          {!sourceScanConfirmed ? (
            <ScanInput
              label="Scan source location"
              expectedValue={task.fromLocation}
              onScan={handleSourceScan}
              autoFocus
              size="large"
            />
          ) : (
            <p className="ps-8 text-xs font-semibold text-green-600">Confirmed</p>
          )}
        </div>

        {/* Destination scan */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ScanStepIndicator done={destScanConfirmed} step={2} />
            <span className={`text-sm font-semibold ${sourceScanConfirmed ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
              Scan destination
            </span>
          </div>
          {sourceScanConfirmed && !destScanConfirmed ? (
            <ScanInput
              label="Scan destination location"
              expectedValue={effectiveDestination}
              onScan={handleDestScan}
              autoFocus
              size="large"
            />
          ) : destScanConfirmed ? (
            <p className="ps-8 text-xs font-semibold text-green-600">Confirmed</p>
          ) : (
            <p className="ps-8 text-xs text-[var(--color-text-secondary)]">Complete step 1 first</p>
          )}
        </div>
      </div>

      {/* ─── Quantity Placed ──────────────────────────────── */}
      <LargeNumberInput
        label="Quantity Placed"
        value={quantityPlaced}
        onChange={(val) => setQuantityPlaced(val ?? task.quantity)}
        minValue={1}
        maxValue={task.quantity}
      />

      {/* ─── Override Location ────────────────────────────── */}
      <DialogTrigger isOpen={overrideOpen} onOpenChange={setOverrideOpen}>
        <AriaButton
          className="flex h-14 min-h-[48px] items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-black/[0.02] transition-colors"
        >
          Override Location
        </AriaButton>
        <ModalOverlay className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <Modal className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl" isKeyboardDismissDisabled>
            <Dialog className="outline-none flex flex-col gap-5">
              <Heading slot="title" className="text-lg font-bold text-[var(--color-text-primary)]">
                Override Putaway Location
              </Heading>

              <Select
                selectedKey={overrideReason}
                onSelectionChange={(key) => setOverrideReason(key as PutawayOverrideReason)}
              >
                <Label className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  Reason (required)
                </Label>
                <AriaButton className="flex h-14 min-h-[48px] w-full items-center justify-between rounded-xl border border-[var(--color-border)] px-4 text-sm">
                  <SelectValue />
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </AriaButton>
                <Popover className="w-[--trigger-width] rounded-xl border border-[var(--color-border)] bg-white shadow-lg">
                  <ListBox className="p-1 outline-none">
                    {OVERRIDE_REASONS.map((reason) => (
                      <ListBoxItem
                        key={reason.id}
                        id={reason.id}
                        className="flex h-12 min-h-[48px] cursor-pointer items-center rounded-lg px-4 text-sm hover:bg-black/[0.02] outline-none data-[focused]:bg-black/[0.02]"
                      >
                        {reason.label}
                      </ListBoxItem>
                    ))}
                  </ListBox>
                </Popover>
              </Select>

              <ScanInput
                label="Scan alternate location"
                onScan={(value) => setOverrideLocation(value)}
              />

              <div className="flex gap-3 mt-2">
                <AriaButton
                  onPress={() => setOverrideOpen(false)}
                  className="flex h-14 min-h-[48px] flex-1 items-center justify-center rounded-xl border border-[var(--color-border)] text-sm font-semibold text-[var(--color-text-secondary)]"
                >
                  Cancel
                </AriaButton>
                <AriaButton
                  onPress={handleOverrideConfirm}
                  isDisabled={!overrideReason || !overrideLocation}
                  className="flex h-14 min-h-[48px] flex-1 items-center justify-center rounded-xl bg-[#2563EB] text-sm font-semibold text-white disabled:opacity-40"
                >
                  Confirm Override
                </AriaButton>
              </div>
            </Dialog>
          </Modal>
        </ModalOverlay>
      </DialogTrigger>

      {/* ─── Confirm Putaway — big green-tinted button ────── */}
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={!canConfirm || mutation.isPending}
        className="flex h-16 min-h-[48px] items-center justify-center rounded-xl text-base font-bold transition-all active:scale-[0.98] disabled:opacity-40"
        style={{
          background: canConfirm ? 'rgba(22, 163, 74, 0.08)' : undefined,
          border: canConfirm ? '2px solid rgba(22, 163, 74, 0.3)' : '2px solid var(--color-border)',
          color: canConfirm ? '#16a34a' : 'var(--color-text-secondary)',
        }}
      >
        {mutation.isPending ? 'Confirming...' : 'Confirm Putaway'}
      </button>

      {mutation.isError && (
        <p className="text-sm text-red-600 text-center font-medium">
          Failed to confirm putaway. Try again.
        </p>
      )}
    </div>
  )
}

// ─── Scan Step Indicator ────────────────────────────────────

function ScanStepIndicator({ done, step }: { done: boolean; step: number }) {
  if (done) {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: 'rgba(22, 163, 74, 0.1)' }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6.5L5 9.5L10 3" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    )
  }
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-border)]">
      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] font-semibold text-[var(--color-text-secondary)]">
        {step}
      </span>
    </div>
  )
}
