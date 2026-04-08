import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '../../../lib/server/reports'
import { useReportsStore } from '../../../stores/reports'
import { TrendIndicator } from '../report-helpers'

/**
 * Operations — "The Pipeline"
 * Hero metric: On-Time Delivery %. Supporting: completion rate, cycle time, utilization.
 * Chart: Orders by stage as CSS horizontal bars.
 */
export function OperationsDashboard() {
  const { t } = useTranslation('reports')
  const filters = useReportsStore((s) => s.filters)

  const { data } = useQuery({
    queryKey: ['reports', 'operations', filters],
    queryFn: () => getDashboardData({ data: { role: 'operations', filters } }),
    staleTime: 30_000,
  })

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-[13px] text-black/40 dark:text-white/40">{t('loading', 'Loading...')}</span>
      </div>
    )
  }

  const heroKpi = data.kpis[0]
  const supportingKpis = data.kpis.slice(1)

  return (
    <div className="px-6 py-6 space-y-8">
      {/* Hero */}
      {heroKpi && (
        <div>
          <div className="text-[12px] uppercase tracking-widest text-black/40 dark:text-white/40 mb-1">
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
      <div className="grid grid-cols-3 gap-8">
        {supportingKpis.slice(0, 3).map((kpi) => (
          <div key={kpi.label}>
            <div className="text-[12px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-0.5">
              {t(`kpi.${kpi.label.toLowerCase().replace(/\s+/g, '_')}`, kpi.label)}
            </div>
            <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[22px] font-medium">
              {typeof kpi.value === 'number' && kpi.unit === '%' ? `${kpi.value}%` : kpi.value}
            </div>
            {kpi.trend !== undefined && kpi.trendDirection && (
              <TrendIndicator trend={kpi.trend} direction={kpi.trendDirection} />
            )}
          </div>
        ))}
      </div>

      {/* Orders by Stage — CSS bars */}
      <div>
        <div className="text-[12px] uppercase tracking-widest text-black/40 dark:text-white/40 mb-3">
          {t('operations.orders_by_stage', 'Orders by Stage')}
        </div>
        <div className="space-y-2.5">
          {(data.tableData ?? []).map((row) => {
            const pct = row.percentage as number
            return (
              <div key={row.stage as string}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs">{row.stage as string}</span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[12px] text-black/40 dark:text-white/40">
                    {row.count as number} ({pct}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-black/6 dark:bg-white/6 overflow-hidden">
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
