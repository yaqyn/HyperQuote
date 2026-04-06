import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '../../../lib/server/reports'
import { useReportsStore } from '../../../stores/reports'

/**
 * Dispatch dashboard: deliveries today (completed/total), first-attempt success,
 * avg stops/driver, route efficiency, Cairo night count.
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
      <div className="p-6 text-center text-black/40 dark:text-white/40">
        {t('loading', 'Loading...')}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* ─── KPI Strip ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {data.kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="backdrop-blur-sm bg-white/60 dark:bg-black/60 rounded-2xl border border-black/5 dark:border-white/10 p-5"
          >
            <div className="text-xs text-black/50 dark:text-white/50 mb-1">
              {t(`kpi.${kpi.label.toLowerCase().replace(/\s+/g, '_')}`, kpi.label)}
            </div>
            <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl">
              {typeof kpi.value === 'number' && kpi.unit === '%'
                ? `${kpi.value}%`
                : kpi.value}
            </div>
            {kpi.trend !== undefined && kpi.trendDirection && (
              <div className={`text-xs mt-1 font-[family-name:var(--font-geist-mono)] tabular-nums ${
                kpi.trendDirection === 'up' ? 'text-green-600 dark:text-green-400' :
                kpi.trendDirection === 'down' ? 'text-red-600 dark:text-red-400' :
                'text-black/40 dark:text-white/40'
              }`}>
                {kpi.trendDirection === 'up' ? '+' : ''}{kpi.trend}%
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ─── Driver Status Table ─────────────────────────── */}
      <div className="backdrop-blur-sm bg-white/60 dark:bg-black/60 rounded-2xl border border-black/5 dark:border-white/10 p-5">
        <h3 className="text-sm font-semibold mb-3">{t('dispatch.driver_status', 'Driver Status')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-black/50 dark:text-white/50 border-b border-black/10 dark:border-white/10">
                <th className="pb-2 ps-2 font-medium text-start">{t('table.driver', 'Driver')}</th>
                <th className="pb-2 font-medium text-start">{t('table.vehicle', 'Vehicle')}</th>
                <th className="pb-2 font-medium text-end">{t('table.stops', 'Stops')}</th>
                <th className="pb-2 font-medium text-end">{t('table.completed', 'Completed')}</th>
                <th className="pb-2 pe-2 font-medium text-start">{t('table.status', 'Status')}</th>
              </tr>
            </thead>
            <tbody>
              {(data.tableData ?? []).map((row) => (
                <tr
                  key={row.driver as string}
                  className="border-b border-black/5 dark:border-white/5"
                >
                  <td className="py-2 ps-2">{row.driver as string}</td>
                  <td className="py-2 font-[family-name:var(--font-geist-mono)] tabular-nums">{row.vehicle as string}</td>
                  <td className="py-2 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">{row.stops as number}</td>
                  <td className="py-2 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">{row.completed as number}</td>
                  <td className="py-2 pe-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.status === 'In Transit' ? 'bg-[#2563EB]/10 text-[#2563EB]' :
                      row.status === 'Loading' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                      'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60'
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
