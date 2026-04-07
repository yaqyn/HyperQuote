import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CurrencyCell } from '../shared/CurrencyCell'
import { StatusBadge } from '../shared/StatusBadge'
import type { APInvoice, MatchStatus } from '../../../types/finance'

interface APInvoiceListProps {
  invoices: APInvoice[]
  loading: boolean
  onSelectInvoice: (invoice: APInvoice) => void
}

type FilterMatchStatus = MatchStatus | 'all'

/** Due-date grouping keys */
type DueGroup = 'overdue' | 'today' | 'this_week' | 'this_month' | 'later'

function getDueGroup(dueDate: string): DueGroup {
  const due = new Date(dueDate)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 86_400_000)
  const weekEnd = new Date(today.getTime() + 7 * 86_400_000)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  if (due < today) return 'overdue'
  if (due >= today && due < tomorrow) return 'today'
  if (due >= tomorrow && due < weekEnd) return 'this_week'
  if (due >= weekEnd && due <= monthEnd) return 'this_month'
  return 'later'
}

const GROUP_ORDER: DueGroup[] = ['overdue', 'today', 'this_week', 'this_month', 'later']

/**
 * Dense invoice list grouped by due date proximity.
 * Each row: vendor + invoice # (mono) + amount + due date + status dot.
 * Overdue > Today > This Week > This Month > Later.
 */
export function APInvoiceList({ invoices, loading, onSelectInvoice }: APInvoiceListProps) {
  const { t } = useTranslation('finance')
  const [filterStatus, setFilterStatus] = useState<FilterMatchStatus>('all')
  const [filterSupplier, setFilterSupplier] = useState('')

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

  // Group by due date
  const grouped = useMemo(() => {
    const groups = new Map<DueGroup, APInvoice[]>()
    for (const inv of filtered) {
      const group = getDueGroup(inv.dueDate)
      const list = groups.get(group) ?? []
      list.push(inv)
      groups.set(group, list)
    }
    return groups
  }, [filtered])

  const groupLabels: Record<DueGroup, string> = {
    overdue: t('ap.group.overdue', 'Overdue'),
    today: t('ap.group.today', 'Today'),
    this_week: t('ap.group.thisWeek', 'This Week'),
    this_month: t('ap.group.thisMonth', 'This Month'),
    later: t('ap.group.later', 'Later'),
  }

  if (loading) {
    return (
      <div className="px-6 py-16 text-center text-sm text-black/30 dark:text-white/30">
        {t('ap.loading', 'Loading supplier invoices...')}
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Filters — tight, minimal */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-black/10 dark:border-white/10">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterMatchStatus)}
          className="rounded-md border border-black/10 dark:border-white/10 bg-transparent px-2.5 py-1.5 text-xs text-black dark:text-white outline-none focus:border-[#2563EB]"
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
          className="rounded-md border border-black/10 dark:border-white/10 bg-transparent px-2.5 py-1.5 text-xs text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none focus:border-[#2563EB] w-48"
        />
        <span className="ms-auto text-[11px] font-[family-name:var(--font-geist-mono)] tabular-nums text-black/30 dark:text-white/30">
          {filtered.length}/{invoices.length}
        </span>
      </div>

      {/* Grouped invoice rows */}
      {GROUP_ORDER.map((group) => {
        const items = grouped.get(group)
        if (!items || items.length === 0) return null

        const groupTotal = items.reduce((sum, inv) => sum + inv.netPayable, 0)

        return (
          <div key={group}>
            {/* Group header */}
            <div className="flex items-center justify-between px-6 py-2 bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                {group === 'overdue' && (
                  <div className="size-1.5 rounded-full bg-red-500" />
                )}
                {group === 'today' && (
                  <div className="size-1.5 rounded-full bg-[#2563EB]" />
                )}
                <span className="text-[11px] font-semibold uppercase tracking-wider text-black/50 dark:text-white/50">
                  {groupLabels[group]}
                </span>
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-black/30 dark:text-white/30">
                  {items.length}
                </span>
              </div>
              <CurrencyCell
                amount={groupTotal}
                className={`text-[11px] ${group === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-black/40 dark:text-white/40'}`}
              />
            </div>

            {/* Rows */}
            {items.map((invoice) => (
              <button
                key={invoice.id}
                type="button"
                onClick={() => onSelectInvoice(invoice)}
                className="flex w-full items-center gap-0 px-6 py-2.5 border-b border-black/[0.04] dark:border-white/[0.04] text-start transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer group"
              >
                {/* Status dot */}
                <div className="w-6 flex-shrink-0">
                  <MatchDot status={invoice.matchStatus} />
                </div>

                {/* Supplier */}
                <span className="flex-1 min-w-0 truncate text-sm text-black dark:text-white">
                  {invoice.supplierName}
                </span>

                {/* Invoice # */}
                <span className="w-32 flex-shrink-0 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/50 dark:text-white/50">
                  {invoice.id}
                </span>

                {/* PO # */}
                <span className="w-28 flex-shrink-0 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/30 dark:text-white/30">
                  {invoice.poNumber}
                </span>

                {/* Due date */}
                <span className="w-24 flex-shrink-0 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/40 dark:text-white/40 text-end">
                  {invoice.dueDate}
                </span>

                {/* Net payable — prominent */}
                <CurrencyCell
                  amount={invoice.netPayable}
                  className="w-36 flex-shrink-0 text-sm font-medium text-black dark:text-white justify-end"
                />

                {/* Match status badge */}
                <div className="w-28 flex-shrink-0 flex justify-end">
                  <StatusBadge status={invoice.matchStatus} variant="match" />
                </div>
              </button>
            ))}
          </div>
        )
      })}

      {filtered.length === 0 && (
        <div className="px-6 py-16 text-center text-sm text-black/30 dark:text-white/30">
          {t('ap.noInvoices', 'No invoices found')}
        </div>
      )}
    </div>
  )
}

/** Tiny match status indicator dot */
function MatchDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    matched: 'bg-green-500',
    within_tolerance: 'bg-yellow-500',
    exceeds_tolerance: 'bg-red-500',
    unmatched: 'bg-black/20 dark:bg-white/20',
  }
  return <div className={`size-2 rounded-full ${colors[status] ?? 'bg-black/10 dark:bg-white/10'}`} />
}
