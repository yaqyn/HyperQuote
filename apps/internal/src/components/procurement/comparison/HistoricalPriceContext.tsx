import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { getHistoricalPrices } from '../../../lib/server/procurement-comparison'
import type { HistoricalPurchase } from '../../../types/procurement'

const PERFORMANCE_STYLES: Record<HistoricalPurchase['deliveryPerformance'], string> = {
  on_time: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800',
  early: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-800',
  late: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800',
}

const PERFORMANCE_LABELS: Record<HistoricalPurchase['deliveryPerformance'], string> = {
  on_time: 'On Time',
  early: 'Early',
  late: 'Late',
}

interface HistoricalPriceContextProps {
  productId: string
}

export function HistoricalPriceContext({ productId }: HistoricalPriceContextProps) {
  const { i18n } = useTranslation()
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'
  const [expanded, setExpanded] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['historical-prices', productId],
    queryFn: () => getHistoricalPrices({ data: { productId, limit: 5 } }),
    staleTime: 60_000,
    enabled: expanded,
  })

  const history = data?.history ?? []

  const fmtPrice = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(n)

  const fmtQty = (n: number) => new Intl.NumberFormat(locale).format(n)

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(iso))

  return (
    <div className="mt-2">
      <Button
        onPress={() => setExpanded(!expanded)}
        className="text-xs text-black/50 underline-offset-2 hover:underline dark:text-white/50"
      >
        {expanded ? 'Hide' : 'Show'} purchase history
      </Button>

      {expanded && (
        <div className="mt-2 overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
          {isLoading ? (
            <div className="px-3 py-2 text-xs text-black/40 dark:text-white/40">Loading...</div>
          ) : history.length === 0 ? (
            <div className="px-3 py-2 text-xs text-black/40 dark:text-white/40">No purchase history</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-black/5 bg-black/3 dark:border-white/5 dark:bg-white/3">
                  <th className="px-3 py-1.5 text-start font-medium text-black/50 dark:text-white/50">Date</th>
                  <th className="px-3 py-1.5 text-start font-medium text-black/50 dark:text-white/50">Supplier</th>
                  <th className="px-3 py-1.5 text-end font-medium text-black/50 dark:text-white/50">Price</th>
                  <th className="px-3 py-1.5 text-end font-medium text-black/50 dark:text-white/50">Qty</th>
                  <th className="px-3 py-1.5 text-start font-medium text-black/50 dark:text-white/50">Delivery</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr
                    key={`${h.date}-${h.supplierId}`}
                    className={i < history.length - 1 ? 'border-b border-black/5 dark:border-white/5' : ''}
                  >
                    <td className="px-3 py-1.5 font-mono">{fmtDate(h.date)}</td>
                    <td className="px-3 py-1.5">{h.supplierName}</td>
                    <td className="px-3 py-1.5 text-end font-mono">{fmtPrice(h.unitPrice)}</td>
                    <td className="px-3 py-1.5 text-end font-mono">{fmtQty(h.quantity)}</td>
                    <td className="px-3 py-1.5">
                      <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${PERFORMANCE_STYLES[h.deliveryPerformance]}`}>
                        {PERFORMANCE_LABELS[h.deliveryPerformance]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
