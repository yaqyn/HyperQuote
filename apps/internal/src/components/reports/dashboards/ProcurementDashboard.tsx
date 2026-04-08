import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '../../../lib/server/reports'
import { useReportsStore } from '../../../stores/reports'
import { TrendIndicator, formatKpiValue } from '../report-helpers'

/**
 * Procurement — "The Supply Desk"
 * Hero metric: Pending Inquiries. Supporting: response rate, PO status, cost savings.
 * Table: Supplier rankings.
 */
export function ProcurementDashboard() {
  const { t } = useTranslation('reports')
  const filters = useReportsStore((s) => s.filters)

  const { data } = useQuery({
    queryKey: ['reports', 'procurement', filters],
    queryFn: () => getDashboardData({ data: { role: 'procurement', filters } }),
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
            {formatKpiValue(heroKpi.value, heroKpi.unit)}
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
              {formatKpiValue(kpi.value, kpi.unit)}
            </div>
            {kpi.trend !== undefined && kpi.trendDirection && (
              <TrendIndicator trend={kpi.trend} direction={kpi.trendDirection} />
            )}
          </div>
        ))}
      </div>

      {/* Supplier Rankings */}
      <div>
        <div className="text-[11px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-3">
          {t('procurement.supplier_rankings', 'Supplier Rankings')}
        </div>
        <div className="border border-black/6 dark:border-white/6 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-black/6 dark:border-white/6 text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">
                <th className="py-2 ps-3 font-medium text-start">{t('table.supplier', 'Supplier')}</th>
                <th className="py-2 font-medium text-end">{t('table.response_rate', 'Response')}</th>
                <th className="py-2 font-medium text-end">{t('table.avg_response_time', 'Avg Time')}</th>
                <th className="py-2 font-medium text-end">{t('table.active_pos', 'POs')}</th>
                <th className="py-2 pe-3 font-medium text-end">{t('table.rating', 'Rating')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
              {(data.tableData ?? []).map((row) => (
                <tr key={row.id as string}>
                  <td className="py-2 ps-3">{row.supplier as string}</td>
                  <td className="py-2 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">{row.responseRate as number}%</td>
                  <td className="py-2 text-end font-[family-name:var(--font-geist-mono)] tabular-nums text-black/50 dark:text-white/50">{row.avgResponseTime as string}</td>
                  <td className="py-2 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">{row.activePOs as number}</td>
                  <td className="py-2 pe-3 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">{row.rating as number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

