import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { CurrencyCell } from '../shared/CurrencyCell'
import { getCashFlowForecast } from '../../../lib/server/finance-reports'
import type { CashFlowForecast as CashFlowForecastType } from '../../../types/finance'

interface CashFlowForecastProps {
  onBack: () => void
}

/**
 * Simple SVG line chart showing cumulative cash over 13 weeks.
 */
function CumulativeCashChart({ data }: { data: CashFlowForecastType[] }) {
  if (data.length === 0) return null

  const width = 600
  const height = 120
  const padding = { top: 10, right: 10, bottom: 10, left: 10 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const values = data.map((d) => d.cumulativeCash)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartWidth
    const y = padding.top + chartHeight - ((d.cumulativeCash - min) / range) * chartHeight
    return `${x},${y}`
  })

  const pathD = `M ${points.join(' L ')}`

  // Fill area under the line
  const firstX = padding.left
  const lastX = padding.left + chartWidth
  const bottomY = padding.top + chartHeight
  const areaD = `${pathD} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-[120px]">
      <defs>
        <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#cashGradient)" />
      <path d={pathD} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = padding.left + (i / (data.length - 1)) * chartWidth
        const y = padding.top + chartHeight - ((d.cumulativeCash - min) / range) * chartHeight
        return <circle key={d.week} cx={x} cy={y} r="3" fill="#2563EB" />
      })}
    </svg>
  )
}

/**
 * 13-week cash flow forecast (Section 5.8).
 * Table with inflows, outflows, net cash (green/red), cumulative.
 * SVG line chart above showing cumulative cash trend.
 */
export function CashFlowForecast({ onBack }: CashFlowForecastProps) {
  const { t } = useTranslation('finance')
  const [forecast, setForecast] = useState<CashFlowForecastType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getCashFlowForecast({ data: { months: 3 } })
      .then((result) => {
        if (!cancelled) {
          setForecast(result.forecast)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const totals = useMemo(() => {
    if (forecast.length === 0) return { inflows: 0, outflows: 0, net: 0 }
    return {
      inflows: forecast.reduce((s, w) => s + w.expectedInflows, 0),
      outflows: forecast.reduce((s, w) => s + w.expectedOutflows, 0),
      net: forecast.reduce((s, w) => s + w.netCash, 0),
    }
  }, [forecast])

  if (loading) {
    return (
      <div className="p-6 text-center text-black/40 dark:text-white/40">
        {t('reports.loading', 'Loading...')}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-black/90 dark:text-white/90">
          {t('reports.cashFlowForecast', '13-Week Cash Flow Forecast')}
        </h3>
        <Button
          onPress={onBack}
          className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-1.5 text-sm text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          {t('reports.backToReports', 'Back to Reports')}
        </Button>
      </div>

      {/* Cumulative cash chart */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
        <CumulativeCashChart data={forecast} />
      </div>

      {/* Forecast table */}
      <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 bg-black/3 dark:bg-white/3">
              <th className="px-4 py-2.5 text-start font-medium text-black/60 dark:text-white/60">{t('reports.week', 'Week')}</th>
              <th className="px-4 py-2.5 text-end font-medium text-black/60 dark:text-white/60">{t('reports.expectedInflows', 'Expected Inflows')}</th>
              <th className="px-4 py-2.5 text-end font-medium text-black/60 dark:text-white/60">{t('reports.expectedOutflows', 'Expected Outflows')}</th>
              <th className="px-4 py-2.5 text-end font-medium text-black/60 dark:text-white/60">{t('reports.netCash', 'Net Cash')}</th>
              <th className="px-4 py-2.5 text-end font-medium text-black/60 dark:text-white/60">{t('reports.cumulativeCash', 'Cumulative Cash')}</th>
            </tr>
          </thead>
          <tbody>
            {forecast.map((week) => (
              <tr key={week.week} className="border-b border-black/5 dark:border-white/5">
                <td className="px-4 py-2.5 font-[family-name:var(--font-geist-mono)] tabular-nums font-medium">{week.week}</td>
                <td className="px-4 py-2.5 text-end">
                  <CurrencyCell amount={week.expectedInflows} />
                </td>
                <td className="px-4 py-2.5 text-end">
                  <CurrencyCell amount={week.expectedOutflows} />
                </td>
                <td className={`px-4 py-2.5 text-end ${week.netCash >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  <CurrencyCell amount={week.netCash} />
                </td>
                <td className="px-4 py-2.5 text-end font-bold">
                  <CurrencyCell amount={week.cumulativeCash} />
                </td>
              </tr>
            ))}
          </tbody>
          {/* Summary row */}
          <tfoot>
            <tr className="border-t-2 border-black/20 dark:border-white/20 bg-black/3 dark:bg-white/3 font-semibold">
              <td className="px-4 py-2.5">{t('reports.total', 'Total')}</td>
              <td className="px-4 py-2.5 text-end">
                <CurrencyCell amount={totals.inflows} />
              </td>
              <td className="px-4 py-2.5 text-end">
                <CurrencyCell amount={totals.outflows} />
              </td>
              <td className={`px-4 py-2.5 text-end ${totals.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                <CurrencyCell amount={totals.net} />
              </td>
              <td className="px-4 py-2.5 text-end font-bold">
                <CurrencyCell amount={forecast.length > 0 ? forecast[forecast.length - 1].cumulativeCash : 0} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
