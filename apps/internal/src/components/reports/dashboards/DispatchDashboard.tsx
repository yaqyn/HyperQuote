import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '../../../lib/server/reports'
import { useReportsStore } from '../../../stores/reports'

/**
 * Dispatch — "The Routes"
 * Hero metric: Deliveries Today (completed/total). Supporting: first-attempt success, stops/driver, route efficiency.
 * Table: Driver status.
 */
export function DispatchDashboard() {
  const { t } = useTranslation('reports')
  const filters = useReportsStore((s) => s.filters)

  const { data } = useQuery({
    queryKey: ['reports', 'dispatch', filters],
    queryFn: () => getDashboardData({ data: { role: 'dispatch', filters } }),
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

      {/* Driver Status Table */}
      <div>
        <div className="text-[11px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-3">
          {t('dispatch.driver_status', 'Driver Status')}
        </div>
        <div className="border border-black/6 dark:border-white/6 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-black/6 dark:border-white/6 text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">
                <th className="py-2 ps-3 font-medium text-start">{t('table.driver', 'Driver')}</th>
                <th className="py-2 font-medium text-start">{t('table.vehicle', 'Vehicle')}</th>
                <th className="py-2 font-medium text-end">{t('table.stops', 'Stops')}</th>
                <th className="py-2 font-medium text-end">{t('table.completed', 'Done')}</th>
                <th className="py-2 pe-3 font-medium text-start">{t('table.status', 'Status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
              {(data.tableData ?? []).map((row) => (
                <tr key={row.driver as string}>
                  <td className="py-2 ps-3">{row.driver as string}</td>
                  <td className="py-2 font-[family-name:var(--font-geist-mono)] tabular-nums text-black/40 dark:text-white/40">{row.vehicle as string}</td>
                  <td className="py-2 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">{row.stops as number}</td>
                  <td className="py-2 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">{row.completed as number}</td>
                  <td className="py-2 pe-3">
                    <span className={`text-[10px] font-medium ${
                      row.status === 'In Transit' ? 'text-[#2563EB]' :
                      row.status === 'Loading' ? 'text-amber-600 dark:text-amber-400' :
                      'text-black/35 dark:text-white/35'
                    }`}>
                      {row.status as string}
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
