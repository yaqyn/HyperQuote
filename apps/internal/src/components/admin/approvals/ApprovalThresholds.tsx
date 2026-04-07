import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Button, Switch } from 'react-aria-components'
import { getApprovalThresholds } from '../../../lib/server/admin'
import type { ApprovalType } from '../../../types/admin'

/**
 * ApprovalThresholds — "The Rules"
 * Each rule as a compact row: condition (text) + threshold value (mono) + approver level + toggle.
 * Add rule at bottom as inline form.
 *
 * 5 types: Quote Margin, Credit Limit Increase, PO Approval, Return/Credit Note, Inventory Adjustment.
 */

const TYPE_LABELS: Record<ApprovalType, { key: string; fallback: string }> = {
  quote_margin: { key: 'approvals.quoteMargin', fallback: 'Quote Margin' },
  credit_limit: { key: 'approvals.creditLimit', fallback: 'Credit Limit Increase' },
  po_approval: { key: 'approvals.poApproval', fallback: 'PO Approval' },
  return_credit: { key: 'approvals.returnCredit', fallback: 'Return / Credit Note' },
  inventory_adjustment: { key: 'approvals.inventoryAdjustment', fallback: 'Inventory Adjustment' },
}

function formatEscalation(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function ApprovalThresholds() {
  const { t } = useTranslation('admin')

  const { data: thresholds } = useQuery({
    queryKey: ['admin', 'approvals'],
    queryFn: () => getApprovalThresholds(),
    staleTime: 30_000,
  })

  return (
    <div className="p-5 space-y-4">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30">
        {t('approvals.title', 'Approval Rules')}
      </span>

      {/* Rules list */}
      <div className="border border-black/6 dark:border-white/6 rounded-lg overflow-hidden divide-y divide-black/[0.04] dark:divide-white/[0.04]">
        {(thresholds ?? []).map((threshold) => {
          const typeLabel = TYPE_LABELS[threshold.type]
          return (
            <div
              key={threshold.id}
              className="grid grid-cols-[1fr_1fr_auto_80px_80px_40px] gap-3 items-center px-4 py-3"
            >
              {/* Condition */}
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">
                  {t(typeLabel.key, typeLabel.fallback)}
                </div>
                <div className="text-[11px] text-black/35 dark:text-white/35 truncate mt-0.5">
                  {threshold.condition}
                </div>
              </div>

              {/* Approvers */}
              <div className="flex flex-wrap gap-1">
                {threshold.approvers.map((approver) => (
                  <span
                    key={approver}
                    className="rounded-full bg-black/[0.04] dark:bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-black/50 dark:text-white/50"
                  >
                    {approver.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>

              {/* Escalation time — mono */}
              <div className="flex items-center gap-1.5">
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs">
                  {formatEscalation(threshold.escalationMinutes)}
                </span>
              </div>

              {/* Escalation target */}
              <span className="text-[11px] text-black/40 dark:text-white/40 truncate">
                {threshold.escalationTarget.replace(/_/g, ' ')}
              </span>

              {/* Enabled toggle */}
              <Switch
                defaultSelected
                className="group flex items-center cursor-pointer"
              >
                <div className="w-7 h-4 rounded-full transition-colors bg-black/15 group-data-[selected]:bg-[#2563EB] dark:bg-white/15">
                  <div className="w-3 h-3 mt-0.5 ms-0.5 rounded-full bg-white shadow transition-transform group-data-[selected]:translate-x-3 rtl:group-data-[selected]:-translate-x-3" />
                </div>
              </Switch>

              {/* Edit */}
              <Button className="text-[11px] text-[#2563EB]/70 hover:text-[#2563EB] cursor-pointer outline-none">
                {t('approvals.edit', 'Edit')}
              </Button>
            </div>
          )
        })}
      </div>

      {/* Add rule inline */}
      <button
        type="button"
        className="w-full rounded-lg border border-dashed border-black/10 dark:border-white/10 py-2.5 text-xs text-black/30 dark:text-white/30 hover:text-black/50 dark:hover:text-white/50 hover:border-black/20 dark:hover:border-white/20 transition-colors cursor-pointer"
      >
        + {t('approvals.addRule', 'Add rule')}
      </button>
    </div>
  )
}
