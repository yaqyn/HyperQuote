import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CurrencyCell } from '../shared/CurrencyCell'
import { getAPAgingReport } from '../../../lib/server/finance-ap'
import { getAgingSeverity } from '../../../lib/finance/aging'
import type { ARAgingBucket } from '../../../types/finance'

interface APAgingRow {
  supplierId: string
  supplierName: string
  current: number
  days30: number
  days60: number
  days90: number
  days90plus: number
  total: number
}

type SortField = 'supplierName' | 'total' | 'worst'

/** Get the worst aging bucket for a row */
function getWorstBucket(row: APAgingRow): ARAgingBucket {
  if (row.days90plus > 0) return '90+'
  if (row.days90 > 0) return '61-90'
  if (row.days60 > 0) return '31-60'
  if (row.days30 > 0) return '1-30'
  return 'current'
}

/** Map bucket to sort rank */
function bucketRank(bucket: ARAgingBucket): number {
  switch (bucket) {
    case 'current': return 0
    case '1-30': return 1
    case '31-60': return 2
    case '61-90': return 3
    case '90+': return 4
  }
}

/** Mock: transform AP invoices into aging rows by supplier */
function buildAgingRows(): APAgingRow[] {
  return [
    {
      supplierId: 'sup-001',
      supplierName: 'Cairo Steel Co.',
      current: 1_250_000,
      days30: 150_000,
      days60: 0,
      days90: 0,
      days90plus: 0,
      total: 1_400_000,
    },
    {
      supplierId: 'sup-002',
      supplierName: 'Delta Cement Group',
      current: 240_000,
      days30: 80_000,
      days60: 45_000,
      days90: 0,
      days90plus: 0,
      total: 365_000,
    },
    {
      supplierId: 'sup-003',
      supplierName: 'Nile Aggregates',
      current: 225_000,
      days30: 120_000,
      days60: 85_000,
      days90: 50_000,
      days90plus: 0,
      total: 480_000,
    },
    {
      supplierId: 'sup-004',
      supplierName: 'Express Logistics',
      current: 0,
      days30: 100_000,
      days60: 50_000,
      days90: 0,
      days90plus: 0,
      total: 150_000,
    },
  ]
}

/**
 * AP Aging Table — grouped by vendor, expandable.
 * Supplier | Current | 1-30 | 31-60 | 61-90 | 90+ | Total
 * Sortable columns. Color-coded severity for data cells only.
 * Dense, borderless Swiss-typography table.
 */
export function APAgingTable() {
  const { t } = useTranslation('finance')
  const [rows] = useState<APAgingRow[]>(buildAgingRows)
  const [sortBy, setSortBy] = useState<SortField>('total')
  const [sortDesc, setSortDesc] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'supplierName':
          cmp = a.supplierName.localeCompare(b.supplierName)
          break
        case 'total':
          cmp = a.total - b.total
          break
        case 'worst':
          cmp = bucketRank(getWorstBucket(a)) - bucketRank(getWorstBucket(b))
          break
      }
      return sortDesc ? -cmp : cmp
    })
    return copy
  }, [rows, sortBy, sortDesc])

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDesc(!sortDesc)
    } else {
      setSortBy(field)
      setSortDesc(true)
    }
  }

  // Column aggregate totals
  const totals = rows.reduce(
    (acc, row) => ({
      current: acc.current + row.current,
      days30: acc.days30 + row.days30,
      days60: acc.days60 + row.days60,
      days90: acc.days90 + row.days90,
      days90plus: acc.days90plus + row.days90plus,
      total: acc.total + row.total,
    }),
    { current: 0, days30: 0, days60: 0, days90: 0, days90plus: 0, total: 0 },
  )

  const sortArrow = (field: SortField) =>
    sortBy === field ? (sortDesc ? ' \u2193' : ' \u2191') : ''

  // Distribution bar widths
  const barTotal = totals.total || 1

  return (
    <div className="px-6 py-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-black/40 dark:text-white/40">
          {t('ap.aging', 'AP Aging')}
        </h3>
        <CurrencyCell amount={totals.total} className="text-sm font-semibold text-black dark:text-white" />
      </div>

      {/* Distribution bar */}
      <div className="flex h-1 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/5 mb-5">
        <div className="bg-black/15 dark:bg-white/15 transition-all" style={{ width: `${(totals.current / barTotal) * 100}%` }} />
        <div className="bg-black/30 dark:bg-white/30 transition-all" style={{ width: `${(totals.days30 / barTotal) * 100}%` }} />
        <div className="bg-[#2563EB] transition-all" style={{ width: `${(totals.days60 / barTotal) * 100}%` }} />
        <div className="bg-red-500 transition-all" style={{ width: `${(totals.days90 / barTotal) * 100}%` }} />
        <div className="bg-red-700 transition-all" style={{ width: `${(totals.days90plus / barTotal) * 100}%` }} />
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] text-black/40 dark:text-white/40">
            <th
              className="pb-2 pe-4 text-start font-medium cursor-pointer select-none hover:text-black dark:hover:text-white transition-colors"
              onClick={() => handleSort('supplierName')}
            >
              {t('ap.col.supplier', 'Supplier')}{sortArrow('supplierName')}
            </th>
            <th className="pb-2 pe-3 text-end font-medium w-24">{t('ap.aging.current', 'Current')}</th>
            <th className="pb-2 pe-3 text-end font-medium w-24">{t('ap.aging.30', '1-30')}</th>
            <th className="pb-2 pe-3 text-end font-medium w-24">{t('ap.aging.60', '31-60')}</th>
            <th className="pb-2 pe-3 text-end font-medium w-24">{t('ap.aging.90', '61-90')}</th>
            <th className="pb-2 pe-3 text-end font-medium w-24">{t('ap.aging.90plus', '90+')}</th>
            <th
              className="pb-2 text-end font-medium w-28 cursor-pointer select-none hover:text-black dark:hover:text-white transition-colors"
              onClick={() => handleSort('total')}
            >
              {t('ap.col.total', 'Total')}{sortArrow('total')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.supplierId}
              onClick={() => setExpandedId(expandedId === row.supplierId ? null : row.supplierId)}
              className="border-t border-black/[0.04] dark:border-white/[0.04] cursor-pointer hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors"
            >
              <td className="py-2.5 pe-4 text-black dark:text-white">{row.supplierName}</td>
              <AgingCell amount={row.current} bucket="current" />
              <AgingCell amount={row.days30} bucket="1-30" />
              <AgingCell amount={row.days60} bucket="31-60" />
              <AgingCell amount={row.days90} bucket="61-90" />
              <AgingCell amount={row.days90plus} bucket="90+" />
              <td className="py-2.5 text-end font-semibold text-black dark:text-white">
                <CurrencyCell amount={row.total} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-black/10 dark:border-white/10 text-black dark:text-white font-semibold">
            <td className="py-2.5 pe-4">{t('ap.total', 'Total')}</td>
            <AgingCell amount={totals.current} bucket="current" bold />
            <AgingCell amount={totals.days30} bucket="1-30" bold />
            <AgingCell amount={totals.days60} bucket="31-60" bold />
            <AgingCell amount={totals.days90} bucket="61-90" bold />
            <AgingCell amount={totals.days90plus} bucket="90+" bold />
            <td className="py-2.5 text-end">
              <CurrencyCell amount={totals.total} />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

/** Color-coded aging cell — semantic colors for DATA only */
function AgingCell({ amount, bucket, bold }: { amount: number; bucket: ARAgingBucket; bold?: boolean }) {
  if (amount === 0) {
    return (
      <td className="py-2.5 pe-3 text-end font-[family-name:var(--font-geist-mono)] tabular-nums text-black/10 dark:text-white/10 text-xs">
        --
      </td>
    )
  }

  // Semantic data color: only 61-90 and 90+ get warning/danger
  const colorClass =
    bucket === '90+' ? 'text-red-600 dark:text-red-400' :
    bucket === '61-90' ? 'text-red-500 dark:text-red-400' :
    bucket === '31-60' ? 'text-[#2563EB]' :
    'text-black/70 dark:text-white/70'

  return (
    <td className={`py-2.5 pe-3 text-end ${colorClass} ${bold ? 'font-semibold' : ''}`}>
      <CurrencyCell amount={amount} className="text-xs" />
    </td>
  )
}
