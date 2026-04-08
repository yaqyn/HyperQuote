import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import type { ARAgingBucket } from '../../../types/finance'
import { useFinanceStore } from '../../../stores/finance'
import { CurrencyCell } from '../shared/CurrencyCell'
import { StatusBadge } from '../shared/StatusBadge'

interface ARDrillDownProps {
  customerId: string
  bucket: ARAgingBucket
  onBack: () => void
}

// Mock invoice data for drill-down (will be replaced by server function query)
interface DrillDownInvoice {
  id: string
  number: string
  amount: number
  issueDate: string
  dueDate: string
  daysOverdue: number
  status: string
  lastReminder: string | null
  nextReminder: string | null
  hasDispute: boolean
}

function getMockDrillDownInvoices(customerId: string, bucket: ARAgingBucket): DrillDownInvoice[] {
  const base: DrillDownInvoice[] = [
    {
      id: 'inv-dd-001', number: 'INV-2026-0042', amount: 285_000,
      issueDate: '2026-02-15', dueDate: '2026-03-15', daysOverdue: 21,
      status: 'overdue', lastReminder: '2026-03-25', nextReminder: '2026-04-05',
      hasDispute: false,
    },
    {
      id: 'inv-dd-002', number: 'INV-2026-0058', amount: 135_000,
      issueDate: '2026-02-28', dueDate: '2026-03-28', daysOverdue: 8,
      status: 'overdue', lastReminder: '2026-04-01', nextReminder: '2026-04-08',
      hasDispute: false,
    },
    {
      id: 'inv-dd-003', number: 'INV-2026-0071', amount: 420_000,
      issueDate: '2026-01-10', dueDate: '2026-02-10', daysOverdue: 54,
      status: 'collections', lastReminder: '2026-03-20', nextReminder: null,
      hasDispute: true,
    },
  ]

  // Filter based on bucket ranges for demo realism
  return base.filter((inv) => {
    switch (bucket) {
      case 'current': return inv.daysOverdue <= 0
      case '1-30': return inv.daysOverdue > 0 && inv.daysOverdue <= 30
      case '31-60': return inv.daysOverdue > 30 && inv.daysOverdue <= 60
      case '61-90': return inv.daysOverdue > 60 && inv.daysOverdue <= 90
      case '90+': return inv.daysOverdue > 90
      default: return true
    }
  })
}

const BUCKET_LABELS: Record<ARAgingBucket, string> = {
  current: 'Current',
  '1-30': '1-30 Days',
  '31-60': '31-60 Days',
  '61-90': '61-90 Days',
  '90+': '90+ Days',
}

/**
 * Slide-in panel showing customer AR detail.
 * Invoice list, payment history, aging breakdown.
 * Click invoice row -> navigates to InvoiceDetail.
 */
export function ARDrillDown({ customerId, bucket, onBack }: ARDrillDownProps) {
  const { t } = useTranslation('finance')
  const setSelectedInvoiceId = useFinanceStore((s) => s.setSelectedInvoiceId)
  const setActiveTab = useFinanceStore((s) => s.setActiveTab)

  const invoices = getMockDrillDownInvoices(customerId, bucket)
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0)

  const handleInvoiceClick = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId)
    setActiveTab('receivables')
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="rounded-lg border border-black/10 dark:border-white/10 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-black/40 dark:text-white/40 hover:text-[#2563EB] transition-colors"
          >
            \u2190 {t('ar.drillDown.backToAR', 'Back')}
          </button>
          <span className="text-black/15 dark:text-white/15">/</span>
          <span className="text-sm font-medium">{BUCKET_LABELS[bucket]}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/40 dark:text-white/40">
            {invoices.length} {t('ar.drillDown.invoices', 'invoices')}
          </span>
          <CurrencyCell amount={totalAmount} className="text-sm font-semibold" />
        </div>
      </div>

      {/* Invoice list */}
      {invoices.length > 0 ? (
        <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
          {invoices.map((inv) => (
            <button
              key={inv.id}
              type="button"
              className="w-full flex items-center gap-4 px-4 py-3 text-start hover:bg-[#2563EB]/[0.02] cursor-pointer transition-colors"
              onClick={() => handleInvoiceClick(inv.id)}
            >
              {/* Invoice number + dispute flag */}
              <div className="w-36 shrink-0">
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-medium">
                  {inv.number}
                </span>
                {inv.hasDispute && (
                  <div className="mt-0.5">
                    <StatusBadge status="disputed" variant="invoice" />
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="w-28 shrink-0 text-end">
                <CurrencyCell amount={inv.amount} className="text-sm" />
              </div>

              {/* Dates */}
              <div className="flex-1 flex items-center gap-4 text-xs font-[family-name:var(--font-geist-mono)] tabular-nums text-black/40 dark:text-white/40">
                <span>{inv.issueDate}</span>
                <span className="text-black/15 dark:text-white/15">\u2192</span>
                <span>{inv.dueDate}</span>
              </div>

              {/* Days overdue */}
              <div className="w-16 text-end">
                <span
                  className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-sm ${
                    inv.daysOverdue > 30 ? 'text-red-600 font-semibold' : 'text-black/50 dark:text-white/50'
                  }`}
                >
                  {inv.daysOverdue}d
                </span>
              </div>

              {/* Status */}
              <div className="w-24 text-end">
                <StatusBadge status={inv.status} variant="invoice" />
              </div>

              {/* Last communication */}
              <div className="w-28 text-end text-[11px] text-black/30 dark:text-white/30">
                {inv.lastReminder ? (
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {inv.lastReminder}
                  </span>
                ) : (
                  <span>\u2014</span>
                )}
              </div>

              {/* Send reminder action */}
              <div className="w-24 text-end" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="text-[10px] font-medium text-[#2563EB] hover:underline underline-offset-2 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    // Will trigger reminder workflow
                  }}
                >
                  {t('ar.drillDown.sendReminder', 'Send Reminder')}
                </button>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-sm text-black/30 dark:text-white/30">
          {t('ar.drillDown.noInvoices', 'No invoices in this aging bucket')}
        </div>
      )}
    </motion.div>
  )
}
