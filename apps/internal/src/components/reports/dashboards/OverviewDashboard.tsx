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
        <span className="text-[13px] text-black/40 dark:text-white/40">{t('loading', 'Loading...')}</span>
      </div>
    )
  }

  const heroKpi = data.kpis[0]
  const topRowKpis = data.kpis.slice(1, 4)
  const bottomRowKpis = data.kpis.slice(4)

  return (
    <div className="px-6 py-6 space-y-10">
      {/* Hero metric */}
      {heroKpi && (
        <div>
          <div className="text-[12px] uppercase tracking-widest text-black/40 dark:text-white/40 mb-1">
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

      {/* KPI rows */}
      <div className="grid grid-cols-3 gap-8">
        {topRowKpis.map((kpi) => (
          <div key={kpi.label}>
            <div className="text-[12px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-1">
              {t(`kpi.${kpi.label.toLowerCase().replace(/\s+/g, '_')}`, kpi.label)}
            </div>
            <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[22px] font-medium">
              {formatKpiValue(kpi.value, kpi.unit)}
            </div>
            {kpi.trend !== undefined && kpi.trendDirection && (
              <TrendIndicator trend={kpi.trend} direction={kpi.trendDirection} />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-8">
        {bottomRowKpis.map((kpi) => (
          <div key={kpi.label}>
            <div className="text-[12px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-1">
              {t(`kpi.${kpi.label.toLowerCase().replace(/\s+/g, '_')}`, kpi.label)}
            </div>
            <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[22px] font-medium">
              {formatKpiValue(kpi.value, kpi.unit)}
            </div>
            {kpi.trend !== undefined && kpi.trendDirection && (
              <TrendIndicator trend={kpi.trend} direction={kpi.trendDirection} />
            )}
          </div>
        ))}
      </div>

      {/* Department Health — blue bars, opacity reflects score */}
      {data.chartData && data.chartData.length > 0 && (
        <div>
          <div className="text-[12px] uppercase tracking-widest text-black/40 dark:text-white/40 mb-4">
            {t('overview.department_health', 'Department Health')}
          </div>
          <div className="space-y-3">
            {data.chartData.map((row) => {
              const health = row.health as number
              return (
                <div key={row.department as string} className="flex items-center gap-4">
                  <span className="w-28 shrink-0 text-[13px] text-[var(--color-text)]">
                    {row.department as string}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-black/[0.04] dark:bg-white/[0.04] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#2563EB] transition-all duration-700"
                      style={{ width: `${health}%`, opacity: Math.max(0.3, health / 100) }}
                    />
                  </div>
                  <span className="w-10 text-end font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-black/50 dark:text-white/50">
                    {health}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Cross-Department Metrics Table */}
      <div>
        <div className="text-[12px] uppercase tracking-widest text-black/40 dark:text-white/40 mb-4">
          {t('overview.key_metrics', 'Key Metrics by Department')}
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-black/[0.06] dark:border-white/[0.06]">
              <th className="py-2.5 pe-4 text-start text-[12px] font-medium text-black/40 dark:text-white/40">
                {t('table.department', 'Department')}
              </th>
              <th className="py-2.5 pe-4 text-start text-[12px] font-medium text-black/40 dark:text-white/40">
                {t('table.metric', 'Metric')}
              </th>
              <th className="py-2.5 pe-6 text-end text-[12px] font-medium text-black/40 dark:text-white/40">
                {t('table.value', 'Value')}
              </th>
              <th className="py-2.5 text-start text-[12px] font-medium text-black/40 dark:text-white/40">
                {t('table.status', 'Status')}
              </th>
            </tr>
          </thead>
          <tbody>
            {(data.tableData ?? []).map((row) => (
              <tr
                key={`${row.department}-${row.metric}`}
                className="border-b border-black/[0.03] dark:border-white/[0.03]"
              >
                <td className="py-2.5 pe-4 font-medium text-[var(--color-text)]">
                  {row.department as string}
                </td>
                <td className="py-2.5 pe-4 text-black/50 dark:text-white/50">
                  {row.metric as string}
                </td>
                <td className="py-2.5 pe-6 text-end font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">
                  {row.unit === 'EGP'
                    ? formatCurrency(row.value as number)
                    : row.unit === '%'
                      ? `${row.value}%`
                      : row.unit === 'days'
                        ? `${row.value} days`
                        : formatNumber(row.value as number)}
                </td>
                <td className="py-2.5">
                  <span className={`text-[12px] font-medium ${
                    (row.status as string) === 'good' ? 'text-green-600 dark:text-green-400' :
                    (row.status as string) === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-500'
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
  )
}
