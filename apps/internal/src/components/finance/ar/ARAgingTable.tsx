import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ARAgingBucket, ARAgingRow } from '../../../types/finance'
import { getAgingSeverity } from '../../../lib/finance/aging'
import { CurrencyCell } from '../shared/CurrencyCell'
import { AgingBadge } from '../shared/AgingBadge'
import { SparklineSVG } from '../shared/SparklineSVG'

type SortField = 'customerName' | 'total' | 'days90plus' | 'days90'
type SortDir = 'asc' | 'desc'

interface ARAgingTableProps {
  rows: ARAgingRow[]
  onCellClick: (customerId: string, bucket: ARAgingBucket) => void
}

const BUCKET_KEYS: { key: keyof ARAgingRow; bucket: ARAgingBucket; label: string }[] = [
  { key: 'current', bucket: 'current', label: 'Current' },
  { key: 'days30', bucket: '1-30', label: '1-30' },
  { key: 'days60', bucket: '31-60', label: '31-60' },
  { key: 'days90', bucket: '61-90', label: '61-90' },
  { key: 'days90plus', bucket: '90+', label: '90+' },
]

const CELL_BG: Record<ARAgingBucket, string> = {
  current: 'bg-green-50 dark:bg-green-950/20',
  '1-30': 'bg-yellow-50 dark:bg-yellow-950/20',
  '31-60': 'bg-orange-50 dark:bg-orange-950/20',
  '61-90': 'bg-red-50 dark:bg-red-950/20',
  '90+': 'bg-red-100 dark:bg-red-950/40 font-bold',
}

function getWorstBucket(row: ARAgingRow): ARAgingBucket {
  if (row.days90plus > 0) return '90+'
  if (row.days90 > 0) return '61-90'
  if (row.days60 > 0) return '31-60'
  if (row.days30 > 0) return '1-30'
  return 'current'
}

function getRowBg(bucket: ARAgingBucket): string {
  const severity = getAgingSeverity(bucket)
  switch (severity) {
    case 'green':
    case 'yellow':
      return ''
    case 'orange':
      return 'bg-yellow-50/30 dark:bg-yellow-950/10'
    case 'red':
    case 'dark_red':
      return 'bg-red-50/30 dark:bg-red-950/10'
  }
}

const PAGE_SIZE = 20

/**
 * AR aging table with color-coded cells, sparklines, and drill-down.
 * Columns: Customer | Current | 1-30 | 31-60 | 61-90 | 90+ | Total | Sparkline
 * All amounts right-aligned in Geist Mono via CurrencyCell.
 * Each amount cell clickable -> drills into invoices for that customer+bucket.
 * Column header row shows aggregate totals per bucket.
 */
export function ARAgingTable({ rows, onCellClick }: ARAgingTableProps) {
  const { t } = useTranslation('finance')
  const [sortField, setSortField] = useState<SortField>('total')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const sorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'customerName':
          cmp = a.customerName.localeCompare(b.customerName)
          break
        case 'total':
          cmp = a.total - b.total
          break
        case 'days90plus':
          cmp = a.days90plus - b.days90plus
          break
        case 'days90':
          cmp = a.days90 - b.days90
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [rows, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Aggregate totals per bucket
  const aggregates = useMemo(() => {
    const agg = { current: 0, days30: 0, days60: 0, days90: 0, days90plus: 0, total: 0 }
    for (const row of rows) {
      agg.current += row.current
      agg.days30 += row.days30
      agg.days60 += row.days60
      agg.days90 += row.days90
      agg.days90plus += row.days90plus
      agg.total += row.total
    }
    return agg
  }, [rows])

  const sortIndicator = (field: SortField) =>
    sortField === field ? (sortDir === 'asc' ? ' \u2191' : ' \u2193') : ''

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="grid">
        <thead>
          {/* Aggregate totals row */}
          <tr className="border-b border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
            <th className="px-3 py-2 text-start text-xs font-medium text-black/50 dark:text-white/50">
              {t('ar.aging.totals', 'Totals')}
            </th>
            {BUCKET_KEYS.map((b) => (
              <th key={b.key} className={`px-3 py-2 text-end ${CELL_BG[b.bucket]}`}>
                <CurrencyCell amount={aggregates[b.key as keyof typeof aggregates] as number} className="text-xs font-semibold" />
              </th>
            ))}
            <th className="px-3 py-2 text-end">
              <CurrencyCell amount={aggregates.total} className="text-xs font-bold" />
            </th>
            <th className="px-3 py-2" />
          </tr>
          {/* Column headers */}
          <tr className="border-b border-black/10 dark:border-white/10">
            <th
              className="px-3 py-2 text-start text-xs font-medium text-black/50 dark:text-white/50 cursor-pointer select-none"
              onClick={() => toggleSort('customerName')}
            >
              {t('ar.aging.customer', 'Customer')}{sortIndicator('customerName')}
            </th>
            {BUCKET_KEYS.map((b) => (
              <th key={b.key} className="px-3 py-2 text-end text-xs font-medium text-black/50 dark:text-white/50">
                <AgingBadge bucket={b.bucket} />
              </th>
            ))}
            <th
              className="px-3 py-2 text-end text-xs font-medium text-black/50 dark:text-white/50 cursor-pointer select-none"
              onClick={() => toggleSort('total')}
            >
              {t('ar.aging.total', 'Total')}{sortIndicator('total')}
            </th>
            <th className="px-3 py-2 text-center text-xs font-medium text-black/50 dark:text-white/50">
              {t('ar.aging.trend', 'Trend')}
            </th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((row) => {
            const worstBucket = getWorstBucket(row)
            const rowBg = getRowBg(worstBucket)

            return (
              <tr
                key={row.customerId}
                className={`border-b border-black/5 dark:border-white/5 ${rowBg} hover:bg-[#2563EB]/5 transition-colors`}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{row.customerName}</span>
                    <span className="text-xs text-black/40 dark:text-white/40">
                      {row.tierBadge}
                    </span>
                  </div>
                  <div className="text-xs text-black/40 dark:text-white/40">
                    {row.salesRep}
                  </div>
                </td>
                {BUCKET_KEYS.map((b) => {
                  const amount = row[b.key] as number
                  return (
                    <td key={b.key} className={`px-3 py-2 text-end ${amount > 0 ? CELL_BG[b.bucket] : ''}`}>
                      {amount > 0 ? (
                        <button
                          type="button"
                          className="hover:underline cursor-pointer"
                          onClick={() => onCellClick(row.customerId, b.bucket)}
                        >
                          <CurrencyCell amount={amount} />
                        </button>
                      ) : (
                        <span className="text-black/20 dark:text-white/20 font-[family-name:var(--font-geist-mono)] tabular-nums">
                          -
                        </span>
                      )}
                    </td>
                  )
                })}
                <td className="px-3 py-2 text-end">
                  <CurrencyCell amount={row.total} className="font-semibold" />
                </td>
                <td className="px-3 py-2 text-center">
                  <SparklineSVG data={row.sparklineData} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 text-xs text-black/50 dark:text-white/50">
          <span>
            {t('ar.aging.showing', 'Showing')} {page * PAGE_SIZE + 1}-
            {Math.min((page + 1) * PAGE_SIZE, sorted.length)} {t('ar.aging.of', 'of')}{' '}
            {sorted.length}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-2 py-1 rounded border border-black/10 dark:border-white/10 disabled:opacity-30"
            >
              {t('ar.aging.prev', 'Prev')}
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 rounded border border-black/10 dark:border-white/10 disabled:opacity-30"
            >
              {t('ar.aging.next', 'Next')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
