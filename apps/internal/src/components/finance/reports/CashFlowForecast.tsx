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
 * CSS-only area chart. Inflows above zero (blue), outflows below (muted).
 * Net position as running line. 7-day forward look.
 */
function CashAreaChart({ data }: { data: CashFlowForecastType[] }) {
  if (data.length === 0) return null

  const w = 600
  const h = 100
  const pad = { t: 8, r: 8, b: 8, l: 8 }
  const cw = w - pad.l - pad.r
  const ch = h - pad.t - pad.b

  // Normalize all values to find range
  const allValues = data.flatMap((d) => [d.expectedInflows, -d.expectedOutflows, d.cumulativeCash])
  const maxVal = Math.max(...allValues.map(Math.abs), 1)

  const toX = (i: number) => pad.l + (i / Math.max(data.length - 1, 1)) * cw
  const toY = (v: number) => pad.t + ch / 2 - (v / maxVal) * (ch / 2)

  // Zero line
  const zeroY = toY(0)

  // Inflows area (above zero)
  const inflowPoints = data.map((d, i) => `${toX(i)},${toY(d.expectedInflows)}`)
  const inflowArea = `M ${toX(0)},${zeroY} L ${inflowPoints.join(' L ')} L ${toX(data.length - 1)},${zeroY} Z`

  // Outflows area (below zero)
  const outflowPoints = data.map((d, i) => `${toX(i)},${toY(-d.expectedOutflows)}`)
  const outflowArea = `M ${toX(0)},${zeroY} L ${outflowPoints.join(' L ')} L ${toX(data.length - 1)},${zeroY} Z`

  // Cumulative line
  const cumLine = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)},${toY(d.cumulativeCash)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto max-h-[100px]">
      {/* Zero line */}
      <line x1={pad.l} y1={zeroY} x2={w - pad.r} y2={zeroY} stroke="currentColor" strokeOpacity={0.06} strokeWidth={1} />

      {/* Inflows area — blue */}
      <path d={inflowArea} fill="#2563EB" fillOpacity={0.12} />

      {/* Outflows area — muted */}
      <path d={outflowArea} fill="currentColor" fillOpacity={0.04} />

      {/* Cumulative line */}
      <path d={cumLine} fill="none" stroke="#2563EB" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots on cumulative */}
      {data.map((d, i) => (
        <circle key={d.week} cx={toX(i)} cy={toY(d.cumulativeCash)} r={2} fill="#2563EB" />
      ))}
    </svg>
  )
}

/**
 * "The Brief" — 13-week cash flow forecast.
 * CSS-only area chart: inflows above zero (blue), outflows below (muted).
 * Net position as running line. Dense data table below.
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
      <div className="flex items-center justify-center py-20">
        <span className="text-xs tracking-widest uppercase text-black/30 dark:text-white/30">
          {t('reports.loading', 'Loading')}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {/* ─── Header ────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
        <span className="text-[10px] tracking-widest uppercase text-black/25 dark:text-white/25">
          {t('reports.cashFlowForecast', '13-Week Cash Flow Forecast')}
        </span>
        <Button
          onPress={onBack}
          className="text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
        >
          {t('reports.backToReports', 'Back')}
        </Button>
      </div>

      {/* ─── Summary strip ─────────────────────────────── */}
      <div className="flex items-center gap-8 px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div>
          <div className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20">
            Total Inflows
          </div>
          <CurrencyCell amount={totals.inflows} className="text-sm" />
        </div>
        <div>
          <div className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20">
            Total Outflows
          </div>
          <CurrencyCell amount={totals.outflows} className="text-sm" />
        </div>
        <div>
          <div className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20">
            Net
          </div>
          <CurrencyCell
            amount={totals.net}
            className={`text-sm ${totals.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
          />
        </div>
        <div>
          <div className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20">
            End Balance
          </div>
          <CurrencyCell
            amount={forecast.length > 0 ? forecast[forecast.length - 1].cumulativeCash : 0}
            className="text-sm font-medium"
          />
        </div>
      </div>

      {/* ─── Area chart ────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.06]">
        <CashAreaChart data={forecast} />
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1.5 rounded-sm bg-[#2563EB]/20" />
            <span className="text-[9px] text-black/20 dark:text-white/20">Inflows</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1.5 rounded-sm bg-black/[0.06] dark:bg-white/[0.06]" />
            <span className="text-[9px] text-black/20 dark:text-white/20">Outflows</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-px bg-[#2563EB]" />
            <span className="text-[9px] text-black/20 dark:text-white/20">Cumulative</span>
          </div>
        </div>
      </div>

      {/* ─── Data table ────────────────────────────────── */}
      <div>
        {/* Header */}
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-0 px-5 py-2 text-[10px] tracking-wider uppercase text-black/25 dark:text-white/25 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div>{t('reports.week', 'Week')}</div>
          <div className="text-end">{t('reports.expectedInflows', 'Inflows')}</div>
          <div className="text-end">{t('reports.expectedOutflows', 'Outflows')}</div>
          <div className="text-end">{t('reports.netCash', 'Net')}</div>
          <div className="text-end">{t('reports.cumulativeCash', 'Cumulative')}</div>
        </div>

        {/* Rows */}
        {forecast.map((week) => (
          <div
            key={week.week}
            className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-0 px-5 py-2 border-b border-black/[0.03] dark:border-white/[0.03]"
          >
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/50 dark:text-white/50 font-medium">
              {week.week}
            </span>
            <span className="text-end">
              <CurrencyCell amount={week.expectedInflows} className="text-xs" />
            </span>
            <span className="text-end">
              <CurrencyCell amount={week.expectedOutflows} className="text-xs text-black/40 dark:text-white/40" />
            </span>
            <span className="text-end">
              <CurrencyCell
                amount={week.netCash}
                className={`text-xs ${week.netCash >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
              />
            </span>
            <span className="text-end">
              <CurrencyCell amount={week.cumulativeCash} className="text-xs font-medium" />
            </span>
          </div>
        ))}

        {/* Totals row */}
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-0 px-5 py-2 border-t-2 border-black/[0.08] dark:border-white/[0.08] bg-black/[0.01] dark:bg-white/[0.01]">
          <span className="text-xs font-medium text-black/50 dark:text-white/50">
            {t('reports.total', 'Total')}
          </span>
          <span className="text-end">
            <CurrencyCell amount={totals.inflows} className="text-xs font-medium" />
          </span>
          <span className="text-end">
            <CurrencyCell amount={totals.outflows} className="text-xs font-medium text-black/40 dark:text-white/40" />
          </span>
          <span className="text-end">
            <CurrencyCell
              amount={totals.net}
              className={`text-xs font-medium ${totals.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
            />
          </span>
          <span className="text-end">
            <CurrencyCell
              amount={forecast.length > 0 ? forecast[forecast.length - 1].cumulativeCash : 0}
              className="text-xs font-bold"
            />
          </span>
        </div>
      </div>
    </div>
  )
}
