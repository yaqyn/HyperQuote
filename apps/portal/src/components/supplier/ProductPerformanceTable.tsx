/**
 * ProductPerformanceTable -- Sortable top-20 product performance table.
 * React Aria Table with all number columns in Geist Mono.
 * Default sort: revenue descending.
 */
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import type { ProductPerformance } from '../../types/supplier'

interface ProductPerformanceTableProps {
  products: ProductPerformance[]
  locale: 'ar' | 'en'
  showAll?: boolean
}

type SortKey = keyof Pick<
  ProductPerformance,
  'views' | 'quoteInclusions' | 'purchaseOrders' | 'revenue' | 'winRate'
>
type SortDir = 'asc' | 'desc'

export function ProductPerformanceTable({
  products,
  locale,
  showAll: initialShowAll = false,
}: ProductPerformanceTableProps) {
  const { t } = useTranslation('portal')
  const numLocale = locale === 'ar' ? 'ar-EG' : 'en-EG'
  const [sortKey, setSortKey] = useState<SortKey>('revenue')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showAll, setShowAll] = useState(initialShowAll)

  const fmt = useMemo(
    () => new Intl.NumberFormat(numLocale, { maximumFractionDigits: 0 }),
    [numLocale],
  )
  const pctFmt = useMemo(
    () => new Intl.NumberFormat(numLocale, { maximumFractionDigits: 1 }),
    [numLocale],
  )

  const sorted = useMemo(() => {
    const copy = [...products]
    copy.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return showAll ? copy : copy.slice(0, 20)
  }, [products, sortKey, sortDir, showAll])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return ''
    return sortDir === 'asc' ? ' \u2191' : ' \u2193'
  }

  const headerClass =
    'px-4 py-3 text-start text-[13px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--color-text)] select-none'

  return (
    <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full" role="grid">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              <th className="px-4 py-3 text-start text-[13px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                {t('supplier.product')}
              </th>
              <th
                className={headerClass}
                onClick={() => handleSort('views')}
              >
                {t('supplier.views')}
                {sortIndicator('views')}
              </th>
              <th
                className={headerClass}
                onClick={() => handleSort('quoteInclusions')}
              >
                {t('supplier.quoteInclusions')}
                {sortIndicator('quoteInclusions')}
              </th>
              <th
                className={headerClass}
                onClick={() => handleSort('purchaseOrders')}
              >
                {t('supplier.purchaseOrders')}
                {sortIndicator('purchaseOrders')}
              </th>
              <th
                className={headerClass}
                onClick={() => handleSort('revenue')}
              >
                {t('supplier.revenue')}
                {sortIndicator('revenue')}
              </th>
              <th
                className={headerClass}
                onClick={() => handleSort('winRate')}
              >
                {t('supplier.winRate')}
                {sortIndicator('winRate')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((product) => (
              <tr
                key={product.id}
                className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface)] transition-colors"
              >
                <td className="px-4 py-3 text-sm text-[var(--color-text)]">
                  {locale === 'ar'
                    ? product.productNameAr
                    : product.productName}
                </td>
                <td className="px-4 py-3 font-mono text-sm text-[var(--color-text)]">
                  {fmt.format(product.views)}
                </td>
                <td className="px-4 py-3 font-mono text-sm text-[var(--color-text)]">
                  {fmt.format(product.quoteInclusions)}
                </td>
                <td className="px-4 py-3 font-mono text-sm text-[var(--color-text)]">
                  {fmt.format(product.purchaseOrders)}
                </td>
                <td className="px-4 py-3 font-mono text-sm text-[var(--color-text)]">
                  EGP {fmt.format(product.revenue)}
                </td>
                <td className="px-4 py-3 font-mono text-sm text-[var(--color-text)]">
                  {pctFmt.format(product.winRate)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!showAll && products.length > 20 && (
        <div className="p-3 text-center border-t border-[var(--color-border)]">
          <Button
            onPress={() => setShowAll(true)}
            className="text-sm text-[var(--color-primary)] hover:underline cursor-pointer outline-none"
          >
            {t('supplier.viewAll')}
          </Button>
        </div>
      )}
    </div>
  )
}
