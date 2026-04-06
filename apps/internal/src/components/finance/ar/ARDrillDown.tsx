import { useTranslation } from 'react-i18next'
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
 * Filtered invoice list after aging cell click.
 * Shows invoices for a specific customer+bucket combination.
 * Click invoice row -> navigates to InvoiceDetail (sets selectedInvoiceId in store).
 */
export function ARDrillDown({ customerId, bucket, onBack }: ARDrillDownProps) {
  const { t } = useTranslation('finance')
  const setSelectedInvoiceId = useFinanceStore((s) => s.setSelectedInvoiceId)
  const setActiveTab = useFinanceStore((s) => s.setActiveTab)

  const invoices = getMockDrillDownInvoices(customerId, bucket)

  const handleInvoiceClick = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId)
    setActiveTab('invoicing')
  }

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="text-[#2563EB] hover:underline text-sm"
          >
            {t('ar.drillDown.backToAR', 'Back to AR Dashboard')}
          </button>
          <span className="text-black/30 dark:text-white/30">/</span>
          <span className="text-sm font-medium">{BUCKET_LABELS[bucket]}</span>
        </div>
        <span className="text-xs text-black/50 dark:text-white/50 font-[family-name:var(--font-geist-mono)] tabular-nums">
          {invoices.length} {t('ar.drillDown.invoices', 'invoices')}
        </span>
      </div>

      {/* Invoice table */}
      {invoices.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
              <th className="px-4 py-2 text-start text-xs font-medium text-black/50 dark:text-white/50">
                {t('ar.drillDown.invoiceNumber', 'Invoice #')}
              </th>
              <th className="px-4 py-2 text-end text-xs font-medium text-black/50 dark:text-white/50">
                {t('ar.drillDown.amount', 'Amount')}
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-black/50 dark:text-white/50">
                {t('ar.drillDown.issueDate', 'Issue Date')}
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-black/50 dark:text-white/50">
                {t('ar.drillDown.dueDate', 'Due Date')}
              </th>
              <th className="px-4 py-2 text-end text-xs font-medium text-black/50 dark:text-white/50">
                {t('ar.drillDown.daysOverdue', 'Days Overdue')}
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-black/50 dark:text-white/50">
                {t('ar.drillDown.status', 'Status')}
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-black/50 dark:text-white/50">
                {t('ar.drillDown.communications', 'Comms')}
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr
                key={inv.id}
                className="border-b border-black/5 dark:border-white/5 hover:bg-[#2563EB]/5 cursor-pointer transition-colors"
                onClick={() => handleInvoiceClick(inv.id)}
              >
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium">
                      {inv.number}
                    </span>
                    {inv.hasDispute && (
                      <StatusBadge status="disputed" variant="invoice" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-end">
                  <CurrencyCell amount={inv.amount} />
                </td>
                <td className="px-4 py-2 text-center font-[family-name:var(--font-geist-mono)] tabular-nums text-black/60 dark:text-white/60">
                  {inv.issueDate}
                </td>
                <td className="px-4 py-2 text-center font-[family-name:var(--font-geist-mono)] tabular-nums text-black/60 dark:text-white/60">
                  {inv.dueDate}
                </td>
                <td className="px-4 py-2 text-end">
                  <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums ${inv.daysOverdue > 30 ? 'text-red-600 font-semibold' : 'text-black/60 dark:text-white/60'}`}>
                    {inv.daysOverdue}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">
                  <StatusBadge status={inv.status} variant="invoice" />
                </td>
                <td className="px-4 py-2 text-center text-xs text-black/40 dark:text-white/40">
                  {inv.lastReminder ? (
                    <div>
                      <div>{t('ar.drillDown.lastSent', 'Sent')}: {inv.lastReminder}</div>
                      {inv.nextReminder && (
                        <div>{t('ar.drillDown.nextScheduled', 'Next')}: {inv.nextReminder}</div>
                      )}
                    </div>
                  ) : (
                    <span>-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="p-8 text-center text-black/40 dark:text-white/40">
          {t('ar.drillDown.noInvoices', 'No invoices in this aging bucket')}
        </div>
      )}
    </div>
  )
}
