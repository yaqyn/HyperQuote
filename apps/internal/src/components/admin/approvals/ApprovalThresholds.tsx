import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { getApprovalThresholds } from '../../../lib/server/admin'
import type { ApprovalType } from '../../../types/admin'

/**
 * Approval thresholds table.
 * 5 types: Quote Margin, Credit Limit Increase, PO Approval, Return/Credit Note, Inventory Adjustment.
 * Escalation indicator: "2h" badge next to each threshold.
 */

const TYPE_LABELS: Record<ApprovalType, { key: string; fallback: string }> = {
  quote_margin: { key: 'approvals.quoteMargin', fallback: 'Quote Margin' },
  credit_limit: { key: 'approvals.creditLimit', fallback: 'Credit Limit Increase' },
  po_approval: { key: 'approvals.poApproval', fallback: 'PO Approval' },
  return_credit: { key: 'approvals.returnCredit', fallback: 'Return/Credit Note' },
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
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold">{t('approvals.title', 'Approval Thresholds')}</h2>

      <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10">
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('approvals.type', 'Type')}</th>
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('approvals.condition', 'Condition')}</th>
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('approvals.approvers', 'Approver(s)')}</th>
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('approvals.escalation', 'Escalation')}</th>
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('approvals.escalationTarget', 'Escalation Target')}</th>
              <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50" />
            </tr>
          </thead>
          <tbody>
            {(thresholds ?? []).map((threshold) => {
              const typeLabel = TYPE_LABELS[threshold.type]
              return (
                <tr key={threshold.id} className="border-b border-black/5 dark:border-white/5">
                  <td className="px-4 py-3 font-medium">
                    {t(typeLabel.key, typeLabel.fallback)}
                  </td>
                  <td className="px-4 py-3 text-black/60 dark:text-white/60">
                    {threshold.condition}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {threshold.approvers.map((approver) => (
                        <span
                          key={approver}
                          className="rounded-full bg-[#2563EB]/10 px-2 py-0.5 text-xs font-medium text-[#2563EB]"
                        >
                          {approver.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1">
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                        {threshold.escalationMinutes}
                      </span>
                      <span className="text-xs text-black/40 dark:text-white/40">min</span>
                      <span className="ms-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                        {formatEscalation(threshold.escalationMinutes)}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-black/60 dark:text-white/60">
                    {threshold.escalationTarget.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      className="rounded-md px-2 py-1 text-xs text-[#2563EB] hover:bg-[#2563EB]/5 cursor-pointer outline-none"
                    >
                      {t('approvals.edit', 'Edit')}
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
