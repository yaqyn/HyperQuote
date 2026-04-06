import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getAPInvoices } from '../../../lib/server/finance-ap'
import { CurrencyCell } from '../shared/CurrencyCell'
import { StatusBadge } from '../shared/StatusBadge'
import type { APInvoice, MatchStatus } from '../../../types/finance'

interface APInvoiceListProps {
  onSelectInvoice: (invoice: APInvoice) => void
}

type FilterMatchStatus = MatchStatus | 'all'

/**
 * Supplier invoice table with three-way match status (Section 5.5).
 * Columns: Supplier, Invoice #, PO #, Amount, VAT, Withholding, Net Payable,
 * Received Date, Due Date, Match Status.
 * Row click opens ThreeWayMatchReview.
 */
export function APInvoiceList({ onSelectInvoice }: APInvoiceListProps) {
  const { t } = useTranslation('finance')
  const [invoices, setInvoices] = useState<APInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterMatchStatus>('all')
  const [filterSupplier, setFilterSupplier] = useState('')

  // Fetch invoices on mount
  useState(() => {
    getAPInvoices().then((res) => {
      setInvoices(res.invoices)
      setLoading(false)
    })
  })

  const filtered = useMemo(() => {
    let result = invoices
    if (filterStatus !== 'all') {
      result = result.filter((inv) => inv.matchStatus === filterStatus)
    }
    if (filterSupplier) {
      const q = filterSupplier.toLowerCase()
      result = result.filter((inv) => inv.supplierName.toLowerCase().includes(q))
    }
    return result
  }, [invoices, filterStatus, filterSupplier])

  const matchedCount = invoices.filter((inv) => inv.matchStatus === 'matched').length
  const totalPayable = invoices.reduce((sum, inv) => sum + inv.netPayable, 0)

  if (loading) {
    return (
      <div className="p-6 text-center text-black/50 dark:text-white/50">
        {t('ap.loading', 'Loading supplier invoices...')}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Action bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-black/10 dark:border-white/10">
        <div className="text-sm text-black/60 dark:text-white/60">
          {t('ap.matchSummary', 'Match Status: {{matched}} of {{total}} invoices fully matched', {
            matched: matchedCount,
            total: invoices.length,
          })}
          <span className="mx-3">|</span>
          {t('ap.totalPayable', 'Total Payable:')}{' '}
          <CurrencyCell amount={totalPayable} className="text-sm" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterMatchStatus)}
          className="rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 px-3 py-1.5 text-sm backdrop-blur-sm"
        >
          <option value="all">{t('ap.filter.allStatuses', 'All Statuses')}</option>
          <option value="matched">{t('ap.filter.matched', 'Matched')}</option>
          <option value="within_tolerance">{t('ap.filter.withinTolerance', 'Within Tolerance')}</option>
          <option value="exceeds_tolerance">{t('ap.filter.exceedsTolerance', 'Exceeds Tolerance')}</option>
          <option value="unmatched">{t('ap.filter.unmatched', 'Unmatched')}</option>
        </select>
        <input
          type="text"
          value={filterSupplier}
          onChange={(e) => setFilterSupplier(e.target.value)}
          placeholder={t('ap.filter.supplierSearch', 'Search supplier...')}
          className="rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 px-3 py-1.5 text-sm backdrop-blur-sm"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto px-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 text-start text-xs text-black/50 dark:text-white/50">
              <th className="py-2 pe-4 text-start font-medium">{t('ap.col.supplier', 'Supplier')}</th>
              <th className="py-2 pe-4 text-start font-medium">{t('ap.col.invoiceNo', 'Invoice #')}</th>
              <th className="py-2 pe-4 text-start font-medium">{t('ap.col.poNo', 'PO #')}</th>
              <th className="py-2 pe-4 text-end font-medium">{t('ap.col.amount', 'Amount')}</th>
              <th className="py-2 pe-4 text-end font-medium">{t('ap.col.vat', 'VAT')}</th>
              <th className="py-2 pe-4 text-end font-medium">{t('ap.col.withholding', 'Withholding')}</th>
              <th className="py-2 pe-4 text-end font-medium">{t('ap.col.netPayable', 'Net Payable')}</th>
              <th className="py-2 pe-4 text-start font-medium">{t('ap.col.received', 'Received')}</th>
              <th className="py-2 pe-4 text-start font-medium">{t('ap.col.due', 'Due')}</th>
              <th className="py-2 pe-4 text-start font-medium">{t('ap.col.matchStatus', 'Match Status')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((invoice) => (
              <tr
                key={invoice.id}
                onClick={() => onSelectInvoice(invoice)}
                className="border-b border-black/5 dark:border-white/5 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
              >
                <td className="py-3 pe-4">{invoice.supplierName}</td>
                <td className="py-3 pe-4 font-[family-name:var(--font-geist-mono)] tabular-nums">
                  {invoice.id}
                </td>
                <td className="py-3 pe-4 font-[family-name:var(--font-geist-mono)] tabular-nums">
                  {invoice.poNumber}
                </td>
                <td className="py-3 pe-4 text-end">
                  <CurrencyCell amount={invoice.amount} />
                </td>
                <td className="py-3 pe-4 text-end">
                  <CurrencyCell amount={invoice.vatAmount} />
                </td>
                <td className="py-3 pe-4 text-end">
                  <CurrencyCell amount={invoice.withholdingTax} />
                </td>
                <td className="py-3 pe-4 text-end">
                  <CurrencyCell amount={invoice.netPayable} className="font-semibold" />
                </td>
                <td className="py-3 pe-4 font-[family-name:var(--font-geist-mono)] tabular-nums text-black/60 dark:text-white/60">
                  {invoice.receivedDate}
                </td>
                <td className="py-3 pe-4 font-[family-name:var(--font-geist-mono)] tabular-nums text-black/60 dark:text-white/60">
                  {invoice.dueDate}
                </td>
                <td className="py-3 pe-4">
                  <StatusBadge status={invoice.matchStatus} variant="match" />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="py-8 text-center text-black/40 dark:text-white/40">
                  {t('ap.noInvoices', 'No invoices found')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
