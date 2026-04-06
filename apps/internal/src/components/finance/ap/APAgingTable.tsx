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

const SEVERITY_STYLES: Record<ReturnType<typeof getAgingSeverity>, string> = {
  green: 'text-green-700 dark:text-green-400',
  yellow: 'text-yellow-700 dark:text-yellow-400',
  orange: 'text-orange-700 dark:text-orange-400',
  red: 'text-red-700 dark:text-red-400',
  dark_red: 'text-red-900 dark:text-red-300 font-bold',
}

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
 * AP aging table (Section 5.5).
 * Supplier Name | Current | 1-30 | 31-60 | 61-90 | 90+ | Total
 * All CurrencyCell, color-coded per bucket severity.
 * Sortable by total, supplier name, worst bucket.
 */
export function APAgingTable() {
  const { t } = useTranslation('finance')
  const [rows] = useState<APAgingRow[]>(buildAgingRows)
  const [sortBy, setSortBy] = useState<SortField>('total')
  const [sortDesc, setSortDesc] = useState(true)

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

  const sortIndicator = (field: SortField) =>
    sortBy === field ? (sortDesc ? ' \u2193' : ' \u2191') : ''

  return (
    <div className="flex flex-col gap-4">
      <div className="px-6">
        <h3 className="text-sm font-semibold mb-3">
          {t('ap.aging', 'AP Aging')}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 text-xs text-black/50 dark:text-white/50">
                <th
                  className="py-2 pe-4 text-start font-medium cursor-pointer hover:text-black dark:hover:text-white"
                  onClick={() => handleSort('supplierName')}
                >
                  {t('ap.col.supplier', 'Supplier')}{sortIndicator('supplierName')}
                </th>
                <AgingHeader bucket="current" label={t('ap.aging.current', 'Current')} amount={totals.current} />
                <AgingHeader bucket="1-30" label={t('ap.aging.30', '1-30')} amount={totals.days30} />
                <AgingHeader bucket="31-60" label={t('ap.aging.60', '31-60')} amount={totals.days60} />
                <AgingHeader bucket="61-90" label={t('ap.aging.90', '61-90')} amount={totals.days90} />
                <AgingHeader bucket="90+" label={t('ap.aging.90plus', '90+')} amount={totals.days90plus} />
                <th
                  className="py-2 text-end font-medium cursor-pointer hover:text-black dark:hover:text-white"
                  onClick={() => handleSort('total')}
                >
                  {t('ap.col.total', 'Total')}{sortIndicator('total')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.supplierId} className="border-b border-black/5 dark:border-white/5">
                  <td className="py-3 pe-4">{row.supplierName}</td>
                  <AgingCell amount={row.current} bucket="current" />
                  <AgingCell amount={row.days30} bucket="1-30" />
                  <AgingCell amount={row.days60} bucket="31-60" />
                  <AgingCell amount={row.days90} bucket="61-90" />
                  <AgingCell amount={row.days90plus} bucket="90+" />
                  <td className="py-3 text-end font-semibold">
                    <CurrencyCell amount={row.total} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black/10 dark:border-white/10 font-semibold">
                <td className="py-3 pe-4">{t('ap.total', 'Total')}</td>
                <AgingCell amount={totals.current} bucket="current" />
                <AgingCell amount={totals.days30} bucket="1-30" />
                <AgingCell amount={totals.days60} bucket="31-60" />
                <AgingCell amount={totals.days90} bucket="61-90" />
                <AgingCell amount={totals.days90plus} bucket="90+" />
                <td className="py-3 text-end">
                  <CurrencyCell amount={totals.total} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

/** Column header with aggregate total */
function AgingHeader({ bucket, label, amount }: { bucket: ARAgingBucket; label: string; amount: number }) {
  const severity = getAgingSeverity(bucket)
  return (
    <th className="py-2 pe-3 text-end font-medium">
      <div>{label}</div>
      <div className={`text-[10px] font-[family-name:var(--font-geist-mono)] tabular-nums ${SEVERITY_STYLES[severity]}`}>
        <CurrencyCell amount={amount} className="text-[10px]" />
      </div>
    </th>
  )
}

/** Color-coded aging cell */
function AgingCell({ amount, bucket }: { amount: number; bucket: ARAgingBucket }) {
  const severity = getAgingSeverity(bucket)
  if (amount === 0) {
    return (
      <td className="py-3 pe-3 text-end font-[family-name:var(--font-geist-mono)] tabular-nums text-black/20 dark:text-white/20">
        --
      </td>
    )
  }
  return (
    <td className={`py-3 pe-3 text-end ${SEVERITY_STYLES[severity]}`}>
      <CurrencyCell amount={amount} />
    </td>
  )
}
