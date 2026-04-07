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

function getWorstBucket(row: ARAgingRow): ARAgingBucket {
  if (row.days90plus > 0) return '90+'
  if (row.days90 > 0) return '61-90'
  if (row.days60 > 0) return '31-60'
  if (row.days30 > 0) return '1-30'
  return 'current'
}

function getRowAccent(bucket: ARAgingBucket): string {
  const severity = getAgingSeverity(bucket)
  switch (severity) {
    case 'green':
    case 'yellow':
      return ''
    case 'orange':
      return 'border-s-2 border-orange-400'
    case 'red':
      return 'border-s-2 border-red-400'
    case 'dark_red':
      return 'border-s-2 border-red-600'
  }
}

const PAGE_SIZE = 20

/**
 * Grouped list by aging bucket. NOT a traditional table.
 * Each customer: name + amount (mono) + days overdue + sparkline.
 * Expandable cells drill into invoices for that customer+bucket.
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

  const sortIcon = (field: SortField) =>
    sortField === field ? (sortDir === 'asc' ? ' \u2191' : ' \u2193') : ''

  return (
    <div>
      {/* Aggregate totals strip */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
        <span className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 me-2">
          {t('ar.aging.totals', 'Totals')}
        </span>
        {BUCKET_KEYS.map((b) => (
          <div key={b.key} className="flex items-center gap-1.5">
            <AgingBadge bucket={b.bucket} />
            <CurrencyCell
              amount={aggregates[b.key as keyof typeof aggregates] as number}
              className="text-xs"
            />
          </div>
        ))}
        <div className="ms-auto flex items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40">
            {t('ar.aging.total', 'Total')}
          </span>
          <CurrencyCell amount={aggregates.total} className="text-xs font-semibold" />
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_repeat(5,minmax(80px,auto))_100px_48px] items-center gap-0 px-4 py-2 border-b border-black/10 dark:border-white/10 text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40">
        <button type="button" className="text-start cursor-pointer select-none hover:text-black dark:hover:text-white" onClick={() => toggleSort('customerName')}>
          {t('ar.aging.customer', 'Customer')}{sortIcon('customerName')}
        </button>
        {BUCKET_KEYS.map((b) => (
          <span key={b.key} className="text-end">
            <AgingBadge bucket={b.bucket} />
          </span>
        ))}
        <button type="button" className="text-end cursor-pointer select-none hover:text-black dark:hover:text-white" onClick={() => toggleSort('total')}>
          {t('ar.aging.total', 'Total')}{sortIcon('total')}
        </button>
        <span className="text-center">{t('ar.aging.trend', '6mo')}</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
        {pageRows.map((row) => {
          const worstBucket = getWorstBucket(row)
          const accent = getRowAccent(worstBucket)

          return (
            <div
              key={row.customerId}
              className={`grid grid-cols-[1fr_repeat(5,minmax(80px,auto))_100px_48px] items-center gap-0 px-4 py-2.5 hover:bg-[#2563EB]/[0.02] transition-colors ${accent}`}
            >
              {/* Customer */}
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium truncate">{row.customerName}</span>
                  <span className="text-[10px] text-black/30 dark:text-white/30 shrink-0">
                    {row.tierBadge}
                  </span>
                </div>
                <div className="text-[11px] text-black/35 dark:text-white/35">
                  {row.salesRep}
                </div>
              </div>

              {/* Bucket amounts */}
              {BUCKET_KEYS.map((b) => {
                const amount = row[b.key] as number
                return (
                  <div key={b.key} className="text-end">
                    {amount > 0 ? (
                      <button
                        type="button"
                        className="hover:text-[#2563EB] cursor-pointer transition-colors"
                        onClick={() => onCellClick(row.customerId, b.bucket)}
                      >
                        <CurrencyCell amount={amount} className="text-sm" />
                      </button>
                    ) : (
                      <span className="text-black/15 dark:text-white/15 font-[family-name:var(--font-geist-mono)] tabular-nums text-sm">
                        \u2014
                      </span>
                    )}
                  </div>
                )
              })}

              {/* Total */}
              <div className="text-end">
                <CurrencyCell amount={row.total} className="text-sm font-semibold" />
              </div>

              {/* Sparkline */}
              <div className="flex justify-center">
                <SparklineSVG data={row.sparklineData} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 text-xs text-black/40 dark:text-white/40 border-t border-black/5 dark:border-white/5">
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
            {page * PAGE_SIZE + 1}\u2013{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20 transition-colors"
            >
              {t('ar.aging.prev', 'Prev')}
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20 transition-colors"
            >
              {t('ar.aging.next', 'Next')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
