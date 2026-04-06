import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '../../../lib/server/reports'
import { useReportsStore } from '../../../stores/reports'

/**
 * Sales dashboard: pipeline value, conversion rate, response time, win rate,
 * revenue MTD vs target (progress bar), top 10 deals table.
 */
export function SalesDashboard() {
  const { t } = useTranslation('reports')
  const filters = useReportsStore((s) => s.filters)

  const { data } = useQuery({
    queryKey: ['reports', 'sales', filters],
    queryFn: () => getDashboardData({ data: { role: 'sales', filters } }),
    staleTime: 30_000,
  })

  if (!data) {
    return (
      <div className="p-6 text-center text-black/40 dark:text-white/40">
        {t('loading', 'Loading...')}
      </div>
    )
  }

  const revenueKpi = data.kpis.find((k) => k.label === 'Revenue MTD')
  const targetKpi = data.kpis.find((k) => k.label === 'Revenue Target')
  const revenueMTD = typeof revenueKpi?.value === 'number' ? revenueKpi.value : 0
  const revenueTarget = typeof targetKpi?.value === 'number' ? targetKpi.value : 1
  const progressPct = Math.round((revenueMTD / revenueTarget) * 100)

  return (
    <div className="p-6 space-y-6">
      {/* ─── KPI Strip ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {data.kpis.filter((k) => k.label !== 'Revenue Target').map((kpi) => (
          <div
            key={kpi.label}
            className="backdrop-blur-sm bg-white/60 dark:bg-black/60 rounded-2xl border border-black/5 dark:border-white/10 p-5"
          >
            <div className="text-xs text-black/50 dark:text-white/50 mb-1">
              {t(`kpi.${kpi.label.toLowerCase().replace(/\s+/g, '_')}`, kpi.label)}
            </div>
            <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl">
              {typeof kpi.value === 'number' && kpi.unit === 'EGP'
                ? new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(kpi.value)
                : typeof kpi.value === 'number' && kpi.unit === '%'
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

      {/* ─── Revenue Progress ───────────────────────────── */}
      <div className="backdrop-blur-sm bg-white/60 dark:bg-black/60 rounded-2xl border border-black/5 dark:border-white/10 p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{t('kpi.revenue_vs_target', 'Revenue vs Target')}</span>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm">
            {progressPct}%
          </span>
        </div>
        <div className="h-3 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
            style={{ width: `${Math.min(progressPct, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1 text-xs text-black/40 dark:text-white/40">
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
            {new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(revenueMTD)}
          </span>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
            {new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(revenueTarget)}
          </span>
        </div>
      </div>

      {/* ─── Top 10 Deals Table ─────────────────────────── */}
      <div className="backdrop-blur-sm bg-white/60 dark:bg-black/60 rounded-2xl border border-black/5 dark:border-white/10 p-5">
        <h3 className="text-sm font-semibold mb-3">{t('sales.top_deals', 'Top 10 Deals')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-black/50 dark:text-white/50 border-b border-black/10 dark:border-white/10">
                <th className="pb-2 ps-2 font-medium text-start">{t('table.customer', 'Customer')}</th>
                <th className="pb-2 font-medium text-start">{t('table.deal', 'Deal')}</th>
                <th className="pb-2 font-medium text-end">{t('table.value', 'Value')}</th>
                <th className="pb-2 font-medium text-start">{t('table.stage', 'Stage')}</th>
                <th className="pb-2 pe-2 font-medium text-start">{t('table.rep', 'Rep')}</th>
              </tr>
            </thead>
            <tbody>
              {(data.tableData ?? []).map((row) => (
                <tr
                  key={row.id as string}
                  className="border-b border-black/5 dark:border-white/5"
                >
                  <td className="py-2 ps-2">{row.customer as string}</td>
                  <td className="py-2 font-[family-name:var(--font-geist-mono)] tabular-nums">{row.deal as string}</td>
                  <td className="py-2 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(row.value as number)}
                  </td>
                  <td className="py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.stage === 'Won' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      row.stage === 'Negotiation' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                      'bg-[#2563EB]/10 text-[#2563EB]'
                    }`}>
                      {row.stage as string}
                    </span>
                  </td>
                  <td className="py-2 pe-2">{row.rep as string}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
