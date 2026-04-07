import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '../../../lib/server/reports'
import { useReportsStore } from '../../../stores/reports'

/**
 * Customer Service — "The Pulse"
 * Hero metric: Open Tickets. Supporting: SLA compliance, avg resolution, NPS.
 * Chart: Top issue categories as CSS horizontal bars (funnel-like).
 */
export function CSDashboard() {
  const { t } = useTranslation('reports')
  const filters = useReportsStore((s) => s.filters)

  const { data } = useQuery({
    queryKey: ['reports', 'cs', filters],
    queryFn: () => getDashboardData({ data: { role: 'cs', filters } }),
    staleTime: 30_000,
  })

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-xs text-black/20 dark:text-white/20">{t('loading', 'Loading...')}</span>
      </div>
    )
  }

  const heroKpi = data.kpis[0]
  const supportingKpis = data.kpis.slice(1)

  return (
    <div className="p-5 space-y-6 max-w-4xl">
      {/* Hero */}
      {heroKpi && (
        <div>
          <div className="text-[11px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-1">
            {t(`kpi.${heroKpi.label.toLowerCase().replace(/\s+/g, '_')}`, heroKpi.label)}
          </div>
          <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[40px] leading-none font-light">
            {typeof heroKpi.value === 'number' && heroKpi.unit === '%' ? `${heroKpi.value}%` : heroKpi.value}
          </div>
          {heroKpi.trend !== undefined && heroKpi.trendDirection && (
            <TrendIndicator trend={heroKpi.trend} direction={heroKpi.trendDirection} />
          )}
        </div>
      )}

      {/* Supporting */}
      <div className="flex items-start gap-8">
        {supportingKpis.slice(0, 3).map((kpi) => (
          <div key={kpi.label}>
            <div className="text-[10px] uppercase tracking-wider text-black/25 dark:text-white/25 mb-0.5">
              {t(`kpi.${kpi.label.toLowerCase().replace(/\s+/g, '_')}`, kpi.label)}
            </div>
            <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-lg">
              {typeof kpi.value === 'number' && kpi.unit === '%' ? `${kpi.value}%` : kpi.value}
            </div>
            {kpi.trend !== undefined && kpi.trendDirection && (
              <TrendIndicator trend={kpi.trend} direction={kpi.trendDirection} />
            )}
          </div>
        ))}
      </div>

      {/* Top Issue Categories — CSS bars */}
      <div>
        <div className="text-[11px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-3">
          {t('cs.top_issues', 'Top Issues')}
        </div>
        <div className="space-y-2.5">
          {(data.tableData ?? []).map((row) => {
            const pct = row.percentage as number
            return (
              <div key={row.category as string}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs">{row.category as string}</span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-black/40 dark:text-white/40">
                    {row.count as number} ({pct}%)
                  </span>
                </div>
                <div className="h-1 rounded-full bg-black/6 dark:bg-white/6 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#2563EB] transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TrendIndicator({ trend, direction }: { trend: number; direction: 'up' | 'down' | 'flat' }) {
  const arrow = direction === 'up' ? '\u2191' : direction === 'down' ? '\u2193' : '\u2192'
  const color = direction === 'up' ? 'text-green-600 dark:text-green-400' :
                direction === 'down' ? 'text-red-600 dark:text-red-400' :
                'text-black/30 dark:text-white/30'
  return (
    <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] ${color}`}>
      {arrow} {direction === 'up' ? '+' : ''}{trend}%
    </span>
  )
}
