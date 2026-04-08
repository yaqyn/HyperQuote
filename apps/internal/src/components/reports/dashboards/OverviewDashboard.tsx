import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '../../../lib/server/reports'
import { useReportsStore } from '../../../stores/reports'
import { TrendIndicator, formatKpiValue, formatCurrency, formatNumber } from '../report-helpers'

/**
 * Overview — "The Front Page"
 * Cross-department executive summary. Hero: Revenue MTD.
 * Department health bars. Key metrics from every department in one view.
 */
export function OverviewDashboard() {
  const { t } = useTranslation('reports')
  const filters = useReportsStore((s) => s.filters)

  const { data } = useQuery({
    queryKey: ['reports', 'overview', filters],
    queryFn: () => getDashboardData({ data: { role: 'overview', filters } }),
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
  const topRowKpis = data.kpis.slice(1, 4)
  const bottomRowKpis = data.kpis.slice(4)

  return (
    <div className="p-5 space-y-8 max-w-4xl">
      {/* Hero metric */}
      {heroKpi && (
        <div>
          <div className="text-[11px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-1">
            {t(`kpi.${heroKpi.label.toLowerCase().replace(/\s+/g, '_')}`, heroKpi.label)}
          </div>
          <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[48px] leading-none font-light">
            {formatKpiValue(heroKpi.value, heroKpi.unit)}
          </div>
          {heroKpi.trend !== undefined && heroKpi.trendDirection && (
            <TrendIndicator trend={heroKpi.trend} direction={heroKpi.trendDirection} />
          )}
        </div>
      )}

      {/* Top row KPIs */}
      <div className="flex items-start gap-10">
        {topRowKpis.map((kpi) => (
          <div key={kpi.label}>
            <div className="text-[10px] uppercase tracking-wider text-black/25 dark:text-white/25 mb-0.5">
              {t(`kpi.${kpi.label.toLowerCase().replace(/\s+/g, '_')}`, kpi.label)}
            </div>
            <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xl">
              {formatKpiValue(kpi.value, kpi.unit)}
            </div>
            {kpi.trend !== undefined && kpi.trendDirection && (
              <TrendIndicator trend={kpi.trend} direction={kpi.trendDirection} />
            )}
          </div>
        ))}
      </div>

      {/* Bottom row KPIs */}
      <div className="flex items-start gap-10">
        {bottomRowKpis.map((kpi) => (
          <div key={kpi.label}>
            <div className="text-[10px] uppercase tracking-wider text-black/25 dark:text-white/25 mb-0.5">
              {t(`kpi.${kpi.label.toLowerCase().replace(/\s+/g, '_')}`, kpi.label)}
            </div>
            <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xl">
              {formatKpiValue(kpi.value, kpi.unit)}
            </div>
            {kpi.trend !== undefined && kpi.trendDirection && (
              <TrendIndicator trend={kpi.trend} direction={kpi.trendDirection} />
            )}
          </div>
        ))}
      </div>

      {/* Department Health — CSS bars */}
      {data.chartData && data.chartData.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-3">
            {t('overview.department_health', 'Department Health')}
          </div>
          <div className="space-y-2.5">
            {data.chartData.map((row) => {
              const health = row.health as number
              return (
                <div key={row.department as string}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-xs">{row.department as string}</span>
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-black/40 dark:text-white/40">
                      {health}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/6 dark:bg-white/6 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        health >= 85 ? 'bg-[#2563EB]' :
                        health >= 70 ? 'bg-amber-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${health}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Cross-Department Metrics Table */}
      <div>
        <div className="text-[11px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-3">
          {t('overview.key_metrics', 'Key Metrics by Department')}
        </div>
        <div className="border border-black/6 dark:border-white/6 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-black/6 dark:border-white/6 text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">
                <th className="py-2 ps-3 font-medium text-start">{t('table.department', 'Department')}</th>
                <th className="py-2 font-medium text-start">{t('table.metric', 'Metric')}</th>
                <th className="py-2 font-medium text-end">{t('table.value', 'Value')}</th>
                <th className="py-2 pe-3 font-medium text-start">{t('table.status', 'Status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
              {(data.tableData ?? []).map((row, i) => (
                <tr key={`${row.department}-${row.metric}`}>
                  <td className="py-2 ps-3 font-medium">{row.department as string}</td>
                  <td className="py-2 text-black/60 dark:text-white/60">{row.metric as string}</td>
                  <td className="py-2 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {row.unit === 'EGP'
                      ? formatCurrency(row.value as number)
                      : row.unit === '%'
                        ? `${row.value}%`
                        : row.unit === 'days'
                          ? `${row.value} days`
                          : formatNumber(row.value as number)}
                  </td>
                  <td className="py-2 pe-3">
                    <span className={`text-[10px] font-medium ${
                      (row.status as string) === 'good' ? 'text-green-600 dark:text-green-400' :
                      (row.status as string) === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {(row.status as string) === 'good' ? 'On Track' :
                       (row.status as string) === 'warning' ? 'Attention' : 'Critical'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
