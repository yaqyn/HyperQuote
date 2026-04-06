import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '../../../lib/server/reports'
import { useReportsStore } from '../../../stores/reports'

/**
 * Customer Service dashboard: open tickets by priority (4 cards),
 * SLA compliance, avg resolution time, NPS score, top issue categories table.
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
      <div className="p-6 text-center text-black/40 dark:text-white/40">
        {t('loading', 'Loading...')}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* ─── KPI Strip ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
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

      {/* ─── Top Issue Categories ────────────────────────── */}
      <div className="backdrop-blur-sm bg-white/60 dark:bg-black/60 rounded-2xl border border-black/5 dark:border-white/10 p-5">
        <h3 className="text-sm font-semibold mb-3">{t('cs.top_issues', 'Top Issue Categories')}</h3>
        <div className="space-y-3">
          {(data.tableData ?? []).map((row) => (
            <div key={row.category as string}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">{row.category as string}</span>
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm text-black/60 dark:text-white/60">
                  {row.count as number} ({row.percentage as number}%)
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
                  style={{ width: `${row.percentage as number}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
