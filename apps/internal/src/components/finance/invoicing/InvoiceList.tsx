import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getInvoices } from '../../../lib/server/finance-invoices'
import { useFinanceStore } from '../../../stores/finance'
import { CurrencyCell } from '../shared/CurrencyCell'
import { StatusBadge } from '../shared/StatusBadge'
import type { Invoice, InvoiceStatus, ETASubmissionStatus } from '../../../types/finance'

// ─── ETA Status Badge (separate color scheme) ───────────
const ETA_COLORS: Record<ETASubmissionStatus, string> = {
  pending: 'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60',
  submitted: 'bg-[#2563EB]/10 text-[#2563EB]',
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  error: 'bg-red-200 text-red-900 font-bold dark:bg-red-900/50 dark:text-red-300',
}

function ETABadge({ status }: { status: ETASubmissionStatus }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ETA_COLORS[status]}`}>
      ETA: {label}
    </span>
  )
}

// ─── Filter bar types ───────────────────────────────────
const STATUS_OPTIONS: InvoiceStatus[] = [
  'draft', 'sent', 'viewed', 'partially_paid', 'paid',
  'overdue', 'collections', 'disputed', 'resolved', 'adjusted', 'written_off',
]

/**
 * Invoice list table with filters and bulk actions.
 * Columns: Invoice #, Customer, Amount, Date, Due Date, Status, ETA Status.
 * Row click sets selectedInvoiceId in store.
 */
export function InvoiceList() {
  const { t } = useTranslation('finance')
  const setSelectedInvoiceId = useFinanceStore((s) => s.setSelectedInvoiceId)

  // Filters
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['finance', 'invoices'],
    queryFn: () => getInvoices(),
    staleTime: 30_000,
  })

  const invoices = data?.invoices ?? []

  // Apply filters
  const filtered = invoices.filter((inv) => {
    if (statusFilter && inv.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!inv.number.toLowerCase().includes(q) && !inv.customerName.toLowerCase().includes(q)) return false
    }
    return true
  })

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((inv) => inv.id)))
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 text-center text-black/40 dark:text-white/40">
        Loading invoices...
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* ─── Filter Bar ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')}
          className="rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm px-3 py-1.5 text-sm"
        >
          <option value="">{t('invoicing.allStatuses', 'All Statuses')}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('invoicing.searchPlaceholder', 'Search invoice # or customer...')}
          className="rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm px-3 py-1.5 text-sm flex-1 min-w-[200px]"
        />
      </div>

      {/* ─── Bulk Action Bar ────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-[#2563EB]/30 bg-[#2563EB]/5 px-4 py-2">
          <span className="text-sm font-[family-name:var(--font-geist-mono)] tabular-nums">
            {selectedIds.size} {t('invoicing.selected', 'selected')}
          </span>
          <button
            type="button"
            className="rounded-lg bg-[#2563EB] text-white px-3 py-1 text-xs font-medium hover:bg-[#2563EB]/90 transition-colors"
          >
            {t('invoicing.batchSend', 'Batch Send')}
          </button>
          <button
            type="button"
            className="rounded-lg border border-[#2563EB] text-[#2563EB] px-3 py-1 text-xs font-medium hover:bg-[#2563EB]/10 transition-colors"
          >
            {t('invoicing.batchGenerate', 'Batch Generate')}
          </button>
        </div>
      )}

      {/* ─── Invoice Table ──────────────────────────────── */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 text-xs text-black/50 dark:text-white/50">
                <th className="py-3 ps-4 pe-2 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-black/20 dark:border-white/20"
                  />
                </th>
                <th className="py-3 px-2 font-medium text-start">{t('invoicing.invoiceNumber', 'Invoice #')}</th>
                <th className="py-3 px-2 font-medium text-start">{t('invoicing.customer', 'Customer')}</th>
                <th className="py-3 px-2 font-medium text-end">{t('invoicing.amount', 'Amount')}</th>
                <th className="py-3 px-2 font-medium text-start">{t('invoicing.date', 'Date')}</th>
                <th className="py-3 px-2 font-medium text-start">{t('invoicing.dueDate', 'Due Date')}</th>
                <th className="py-3 px-2 font-medium text-center">{t('invoicing.status', 'Status')}</th>
                <th className="py-3 px-2 pe-4 font-medium text-center">{t('invoicing.etaStatus', 'ETA Status')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => setSelectedInvoiceId(inv.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setSelectedInvoiceId(inv.id) }}
                  tabIndex={0}
                  role="button"
                >
                  <td className="py-3 ps-4 pe-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(inv.id)}
                      onChange={() => toggleSelect(inv.id)}
                      className="rounded border-black/20 dark:border-white/20"
                    />
                  </td>
                  <td className="py-3 px-2 font-[family-name:var(--font-geist-mono)] tabular-nums">{inv.number}</td>
                  <td className="py-3 px-2">{inv.customerName}</td>
                  <td className="py-3 px-2 text-end"><CurrencyCell amount={inv.grandTotal} /></td>
                  <td className="py-3 px-2 font-[family-name:var(--font-geist-mono)] tabular-nums">{inv.issuedDate}</td>
                  <td className="py-3 px-2 font-[family-name:var(--font-geist-mono)] tabular-nums">{inv.dueDate}</td>
                  <td className="py-3 px-2 text-center"><StatusBadge status={inv.status} /></td>
                  <td className="py-3 px-2 pe-4 text-center"><ETABadge status={inv.etaStatus} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-black/40 dark:text-white/40">
                    {t('invoicing.noInvoices', 'No invoices found')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
