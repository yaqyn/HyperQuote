import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '../../../lib/server/reports'
import { useReportsStore } from '../../../stores/reports'

/**
 * Finance dashboard: revenue MTD, AR/AP outstanding, overdue AR,
 * cash position, AR aging breakdown table, cheque summary.
 */
export function FinanceDashboard() {
  const { t } = useTranslation('reports')
  const filters = useReportsStore((s) => s.filters)

  const { data } = useQuery({
    queryKey: ['reports', 'finance', filters],
    queryFn: () => getDashboardData({ data: { role: 'finance', filters } }),
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

      {/* ─── AR Aging Breakdown Table ───────────────────── */}
      <div className="backdrop-blur-sm bg-white/60 dark:bg-black/60 rounded-2xl border border-black/5 dark:border-white/10 p-5">
        <h3 className="text-sm font-semibold mb-3">{t('finance.ar_aging', 'AR Aging Breakdown')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-black/50 dark:text-white/50 border-b border-black/10 dark:border-white/10">
                <th className="pb-2 ps-2 font-medium text-start">{t('table.bucket', 'Bucket')}</th>
                <th className="pb-2 font-medium text-end">{t('table.amount', 'Amount')}</th>
                <th className="pb-2 pe-2 font-medium text-end">{t('table.count', 'Count')}</th>
              </tr>
            </thead>
            <tbody>
              {(data.tableData ?? []).map((row) => (
                <tr
                  key={row.bucket as string}
                  className="border-b border-black/5 dark:border-white/5"
                >
                  <td className="py-2 ps-2">{row.bucket as string}</td>
                  <td className="py-2 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(row.amount as number)}
                  </td>
                  <td className="py-2 pe-2 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">{row.count as number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Payment Distribution ───────────────────────── */}
      <div className="backdrop-blur-sm bg-white/60 dark:bg-black/60 rounded-2xl border border-black/5 dark:border-white/10 p-5">
        <h3 className="text-sm font-semibold mb-3">{t('finance.payment_distribution', 'Payment Distribution')}</h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {(data.chartData ?? []).map((row) => (
            <div key={row.type as string} className="text-center">
              <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xl">
                {row.count as number}
              </div>
              <div className="text-xs text-black/50 dark:text-white/50">{row.type as string}</div>
              <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm text-black/60 dark:text-white/60 mt-1">
                {new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(row.amount as number)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
