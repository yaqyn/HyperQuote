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

const MOVEMENT_TYPE_LABELS: Record<StockMovement['type'], string> = {
  receive: 'Receive',
  pick: 'Pick',
  putaway: 'Putaway',
  adjustment: 'Adjustment',
  transfer: 'Transfer',
}

interface SupervisorApprovalProps {
  approval: SupervisorApprovalData
  onComplete: () => void
  onBack: () => void
}

/**
 * Supervisor variance approval view.
 * Shows: system qty, initial count, recount qty, variance, recent movements, financial impact.
 * Supervisor selects a reason code and either approves or requests further investigation.
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
    onSuccess: () => {
      onComplete()
    },
  })

  const handleApprove = useCallback(() => {
    if (!selectedReason) return
    approveMutation.mutate('approve')
  }, [selectedReason, approveMutation])

  const handleInvestigate = useCallback(() => {
    approveMutation.mutate('investigate')
  }, [approveMutation])

  const varianceColor =
    approval.variance > 0 ? 'text-green-700' : approval.variance < 0 ? 'text-red-700' : 'text-[var(--color-text-primary)]'

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-[#2563EB] font-medium min-h-[48px] min-w-[48px] flex items-center"
        >
          Back
        </button>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Supervisor Approval
        </h2>
        <div className="w-12" />
      </div>

      {/* Location + Product */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-sm text-[var(--color-text-secondary)]">Location</p>
        <p className="text-base font-medium text-[var(--color-text-primary)]">{approval.location}</p>
        <p className="text-sm text-[var(--color-text-secondary)] mt-2">Product</p>
        <p className="text-base font-medium text-[var(--color-text-primary)]">{approval.productName}</p>
      </div>

      {/* Count comparison */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-[var(--color-text-secondary)]">System Qty</span>
            <span className="font-mono tabular-nums text-lg font-medium text-[var(--color-text-primary)]">
              {approval.systemQty}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-[var(--color-text-secondary)]">Initial Count</span>
            <span className="font-mono tabular-nums text-lg font-medium text-[var(--color-text-primary)]">
              {approval.initialCount}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-[var(--color-text-secondary)]">Recount Qty</span>
            <span className="font-mono tabular-nums text-lg font-medium text-[var(--color-text-primary)]">
              {approval.recountQty}
            </span>
          </div>
        </div>

        <div className="border-t border-[var(--color-border)] mt-3 pt-3 grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-[var(--color-text-secondary)]">Variance</span>
            <span className={`font-mono tabular-nums text-lg font-medium ${varianceColor}`}>
              {approval.variance > 0 ? '+' : ''}{approval.variance}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-[var(--color-text-secondary)]">Variance %</span>
            <span className={`font-mono tabular-nums text-lg font-medium ${varianceColor}`}>
              {(approval.variancePercent * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Financial impact */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-xs text-[var(--color-text-secondary)]">Financial Impact</p>
        <p className={`font-mono tabular-nums text-xl font-semibold ${
          approval.financialImpact < 0 ? 'text-red-700' : 'text-green-700'
        }`}>
          {approval.financialImpact < 0 ? '-' : '+'}EGP{' '}
          {Math.abs(approval.financialImpact).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>

      {/* Recent movements */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Recent Movements</h3>
        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-surface)]">
                <th className="text-start px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)]">Type</th>
                <th className="text-end px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)]">Qty</th>
                <th className="text-end px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)]">Time</th>
                <th className="text-start px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)]">Reference</th>
              </tr>
            </thead>
            <tbody>
              {approval.recentMovements.map((mv) => (
                <tr key={mv.id} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-2 text-[var(--color-text-primary)]">
                    {MOVEMENT_TYPE_LABELS[mv.type]}
                  </td>
                  <td className={`px-3 py-2 text-end font-mono tabular-nums ${
                    mv.quantity > 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {mv.quantity > 0 ? '+' : ''}{mv.quantity}
                  </td>
                  <td className="px-3 py-2 text-end font-mono tabular-nums text-[var(--color-text-secondary)]">
                    {new Date(mv.timestamp).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">
                    {mv.reference}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reason code select */}
      <Select
        selectedKey={selectedReason}
        onSelectionChange={(key) => setSelectedReason(key as CountVarianceReason)}
        className="flex flex-col gap-1"
      >
        <Label className="text-sm font-medium text-[var(--color-text-primary)]">
          Variance Reason Code
        </Label>
        <Button className="min-h-[48px] rounded-lg border border-[var(--color-border)] px-3 text-base text-start bg-[var(--color-surface)] flex items-center justify-between">
          <SelectValue className="text-[var(--color-text-primary)]">
            {selectedReason
              ? REASON_OPTIONS.find((r) => r.id === selectedReason)?.label
              : 'Select reason...'}
          </SelectValue>
          <span className="text-[var(--color-text-secondary)]" aria-hidden="true">
            &#x25BC;
          </span>
        </Button>
        <Popover className="rounded-lg border border-[var(--color-border)] bg-white shadow-lg">
          <ListBox className="p-1 outline-none">
            {REASON_OPTIONS.map((reason) => (
              <ListBoxItem
                key={reason.id}
                id={reason.id}
                className="px-3 py-2 rounded cursor-pointer text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] outline-none focus:bg-[var(--color-surface-hover)]"
              >
                {reason.label}
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      </Select>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleInvestigate}
          disabled={approveMutation.isPending}
          className="flex-1 min-h-[48px] rounded-xl border border-[var(--color-border)] text-base font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors disabled:opacity-50"
        >
          Investigate Further
        </button>
        <button
          type="button"
          onClick={handleApprove}
          disabled={!selectedReason || approveMutation.isPending}
          className="flex-1 min-h-[48px] rounded-xl bg-[#2563EB] text-white text-base font-medium hover:bg-[#1d4ed8] transition-colors disabled:opacity-50"
        >
          Approve
        </button>
      </div>
    </div>
  )
}
