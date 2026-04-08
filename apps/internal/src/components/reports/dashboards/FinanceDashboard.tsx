import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '../../../lib/server/reports'
import { useReportsStore } from '../../../stores/reports'
import { TrendIndicator, formatKpiValue, formatCurrency } from '../report-helpers'

/**
 * Finance — "The Ledger"
 * Hero metric: Cash Position. Supporting: AR outstanding, AP outstanding, overdue AR.
 * Table: AR aging breakdown.
 * Chart: Payment distribution by type.
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

      {/* AR Aging */}
      <div>
        <div className="text-[11px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-3">
          {t('finance.ar_aging', 'AR Aging')}
        </div>
        <div className="border border-black/6 dark:border-white/6 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-black/6 dark:border-white/6 text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">
                <th className="py-2 ps-3 font-medium text-start">{t('table.bucket', 'Bucket')}</th>
                <th className="py-2 font-medium text-end">{t('table.amount', 'Amount')}</th>
                <th className="py-2 pe-3 font-medium text-end">{t('table.count', 'Count')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
              {(data.tableData ?? []).map((row) => (
                <tr key={row.bucket as string}>
                  <td className="py-2 ps-3">{row.bucket as string}</td>
                  <td className="py-2 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {formatCurrency(row.amount as number)}
                  </td>
                  <td className="py-2 pe-3 text-end font-[family-name:var(--font-geist-mono)] tabular-nums text-black/40 dark:text-white/40">{row.count as number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Distribution — CSS-only */}
      {data.chartData && data.chartData.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-3">
            {t('finance.payment_distribution', 'Payment Distribution')}
          </div>
          <div className="flex items-end gap-4">
            {data.chartData.map((row) => {
              const maxCount = Math.max(...data.chartData!.map((r) => r.count as number))
              const height = maxCount > 0 ? ((row.count as number) / maxCount) * 80 : 0
              return (
                <div key={row.type as string} className="flex-1 flex flex-col items-center">
                  {/* Bar */}
                  <div
                    className="w-full max-w-[40px] bg-[#2563EB]/15 rounded-t transition-all duration-500"
                    style={{ height: `${height}px` }}
                  />
                  {/* Count */}
                  <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm mt-2">
                    {row.count as number}
                  </div>
                  {/* Type */}
                  <div className="text-[10px] text-black/30 dark:text-white/30 mt-0.5">{row.type as string}</div>
                  {/* Amount */}
                  <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-black/25 dark:text-white/25 mt-0.5">
                    {formatCurrency(row.amount as number)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

