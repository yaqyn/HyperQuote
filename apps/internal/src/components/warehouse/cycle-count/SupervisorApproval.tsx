import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Select, SelectValue, Label, Button, ListBox, ListBoxItem, Popover } from 'react-aria-components'
import { submitCycleCountApproval } from '../../../lib/server/warehouse-count'
import type { SupervisorApproval as SupervisorApprovalData, CountVarianceReason, StockMovement } from '../../../types/warehouse'

const REASON_OPTIONS: { id: CountVarianceReason; label: string }[] = [
  { id: 'receiving_error', label: 'Receiving error' },
  { id: 'pick_error', label: 'Pick error' },
  { id: 'damage_unrecorded', label: 'Damage (unrecorded)' },
  { id: 'theft', label: 'Theft' },
  { id: 'miscount', label: 'Miscount' },
  { id: 'location_error', label: 'Location error' },
]

const MOVEMENT_TYPE_CONFIG: Record<StockMovement['type'], { label: string; color: string; bg: string }> = {
  receive: { label: 'Receive', color: '#2563EB', bg: 'rgba(37, 99, 235, 0.08)' },
  pick: { label: 'Pick', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.06)' },
  putaway: { label: 'Putaway', color: '#2563EB', bg: 'rgba(37, 99, 235, 0.08)' },
  adjustment: { label: 'Adjust', color: '#a16207', bg: 'rgba(234, 179, 8, 0.06)' },
  transfer: { label: 'Transfer', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.06)' },
}

interface SupervisorApprovalProps {
  approval: SupervisorApprovalData
  onComplete: () => void
  onBack: () => void
}

/**
 * "The Audit" — Supervisor approval.
 * List of completed counts needing approval. Each shows variance summary.
 * Approve/Reject with one tap. System qty, initial count, recount qty,
 * variance, recent movements, financial impact.
 */
export function SupervisorApproval({ approval, onComplete, onBack }: SupervisorApprovalProps) {
  const [selectedReason, setSelectedReason] = useState<CountVarianceReason | null>(null)

  const approveMutation = useMutation({
    mutationFn: (decision: 'approve' | 'investigate') =>
      submitCycleCountApproval({
        data: {
          countId: approval.countId,
          decision,
          reason: selectedReason ?? undefined,
        },
      }),
    onSuccess: () => onComplete(),
  })

  const handleApprove = useCallback(() => {
    if (!selectedReason) return
    approveMutation.mutate('approve')
  }, [selectedReason, approveMutation])

  const handleInvestigate = useCallback(() => {
    approveMutation.mutate('investigate')
  }, [approveMutation])

  const varianceColor =
    approval.variance > 0 ? 'text-green-600' : approval.variance < 0 ? 'text-red-600' : 'text-[var(--color-text-primary)]'

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Header ──────────────────────────────────────── */}
      <div className="flex items-center gap-4 border-b border-[var(--color-border)] pb-4">
        <button
          type="button"
          onClick={onBack}
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-black/[0.02] active:scale-95 transition-all"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Supervisor Approval</h2>
          <p className="text-xs text-[var(--color-text-secondary)]">Variance review</p>
        </div>
      </div>

      {/* ─── Location + Product ──────────────────────────── */}
      <div className="flex items-baseline gap-6">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Location</span>
          <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-base font-bold text-[var(--color-text-primary)] mt-0.5">
            {approval.location}
          </p>
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Product</span>
          <p className="text-base font-bold text-[var(--color-text-primary)] mt-0.5">
            {approval.productName}
          </p>
        </div>
      </div>

      {/* ─── Count comparison — LARGE MONO ───────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] p-5">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">System</span>
            <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-bold text-[var(--color-text-primary)] mt-0.5">
              {approval.systemQty}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Initial</span>
            <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-bold text-[var(--color-text-primary)] mt-0.5">
              {approval.initialCount}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Recount</span>
            <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-bold text-[var(--color-text-primary)] mt-0.5">
              {approval.recountQty}
            </p>
          </div>
        </div>

        <div className="border-t border-[var(--color-border)] mt-4 pt-4 grid grid-cols-2 gap-6">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Variance</span>
            <p className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-bold mt-0.5 ${varianceColor}`}>
              {approval.variance > 0 ? '+' : ''}{approval.variance}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Variance %</span>
            <p className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-bold mt-0.5 ${varianceColor}`}>
              {(approval.variancePercent * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* ─── Financial Impact ────────────────────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] p-5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Financial Impact</span>
        <p className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-3xl font-bold mt-1 ${
          approval.financialImpact < 0 ? 'text-red-600' : 'text-green-600'
        }`}>
          {approval.financialImpact < 0 ? '-' : '+'}EGP{' '}
          {Math.abs(approval.financialImpact).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>

      {/* ─── Recent Movements (timeline) ─────────────────── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)] mb-3">
          Recent Movements
        </p>
        <div className="relative">
          <div className="absolute start-[11px] top-0 bottom-0 w-px bg-[var(--color-border)]" />
          <div className="flex flex-col">
            {approval.recentMovements.map((mv) => {
              const config = MOVEMENT_TYPE_CONFIG[mv.type]
              return (
                <div key={mv.id} className="relative flex items-center gap-4 py-2.5 ps-8">
                  <div className="absolute start-[6px] top-[14px] h-3 w-3 rounded-full border-2 border-white" style={{ background: config.color }} />
                  <span className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold" style={{ color: config.color, background: config.bg }}>
                    {config.label}
                  </span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-secondary)] flex-1 truncate">
                    {mv.reference}
                  </span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-[var(--color-text-secondary)] shrink-0">
                    {new Date(mv.timestamp).toLocaleDateString()}
                  </span>
                  <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-bold shrink-0 w-14 text-end ${
                    mv.quantity > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {mv.quantity > 0 ? '+' : ''}{mv.quantity}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ─── Reason Code ─────────────────────────────────── */}
      <Select
        selectedKey={selectedReason}
        onSelectionChange={(key) => setSelectedReason(key as CountVarianceReason)}
        className="flex flex-col gap-1"
      >
        <Label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
          Variance Reason Code
        </Label>
        <Button className="min-h-[56px] rounded-xl border border-[var(--color-border)] px-4 text-base text-start flex items-center justify-between cursor-pointer hover:bg-black/[0.02]">
          <SelectValue className="text-[var(--color-text-primary)] font-medium">
            {selectedReason
              ? REASON_OPTIONS.find((r) => r.id === selectedReason)?.label
              : 'Select reason...'}
          </SelectValue>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[var(--color-text-secondary)]" aria-hidden="true">
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </Button>
        <Popover className="rounded-xl border border-[var(--color-border)] bg-white shadow-lg">
          <ListBox className="p-1 outline-none">
            {REASON_OPTIONS.map((reason) => (
              <ListBoxItem
                key={reason.id}
                id={reason.id}
                className="px-4 py-3 rounded-lg cursor-pointer text-sm text-[var(--color-text-primary)] hover:bg-black/[0.02] outline-none focus:bg-black/[0.02] min-h-[48px] flex items-center"
              >
                {reason.label}
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      </Select>

      {/* ─── Action buttons — one-tap ────────────────────── */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleInvestigate}
          disabled={approveMutation.isPending}
          className="flex-1 min-h-[56px] rounded-xl border border-[var(--color-border)] text-base font-bold text-[var(--color-text-primary)] hover:bg-black/[0.02] transition-colors active:scale-[0.98] disabled:opacity-50"
        >
          Investigate
        </button>
        <button
          type="button"
          onClick={handleApprove}
          disabled={!selectedReason || approveMutation.isPending}
          className="flex-1 min-h-[56px] rounded-xl bg-[#2563EB] text-white text-base font-bold hover:bg-[#1d4ed8] transition-all active:scale-[0.98] disabled:opacity-40"
        >
          Approve
        </button>
      </div>
    </div>
  )
}
