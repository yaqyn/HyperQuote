import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '../../../lib/server/reports'
import { useReportsStore } from '../../../stores/reports'

/**
 * Warehouse — "The Inventory"
 * Hero metric: Inventory Accuracy %. Supporting: pick accuracy, on-time shipment, capacity.
 * Table: Inventory overview with SKU, qty, turnover.
 */
export function WarehouseDashboard() {
  const { t } = useTranslation('reports')
  const filters = useReportsStore((s) => s.filters)

  const { data } = useQuery({
    queryKey: ['reports', 'warehouse', filters],
    queryFn: () => getDashboardData({ data: { role: 'warehouse', filters } }),
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

      {/* Inventory Table */}
      <div>
        <div className="text-[11px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-3">
          {t('warehouse.inventory_overview', 'Inventory Overview')}
        </div>
        <div className="border border-black/6 dark:border-white/6 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-black/6 dark:border-white/6 text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">
                <th className="py-2 ps-3 font-medium text-start">{t('table.item', 'Item')}</th>
                <th className="py-2 font-medium text-start">{t('table.sku', 'SKU')}</th>
                <th className="py-2 font-medium text-end">{t('table.qty', 'Qty')}</th>
                <th className="py-2 font-medium text-start">{t('table.unit', 'Unit')}</th>
                <th className="py-2 pe-3 font-medium text-end">{t('table.turnover', 'Turns')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
              {(data.tableData ?? []).map((row) => (
                <tr key={row.sku as string}>
                  <td className="py-2 ps-3">{row.item as string}</td>
                  <td className="py-2 font-[family-name:var(--font-geist-mono)] tabular-nums text-black/40 dark:text-white/40">{row.sku as string}</td>
                  <td className="py-2 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {new Intl.NumberFormat('en-EG').format(row.qty as number)}
                  </td>
                  <td className="py-2 text-black/40 dark:text-white/40">{row.unit as string}</td>
                  <td className="py-2 pe-3 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">{row.turnover as number}x</td>
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

function formatKpiValue(value: number | string, unit?: string): string {
  if (typeof value === 'number' && unit === 'EGP')
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(value)
  if (typeof value === 'number' && unit === '%') return `${value}%`
  return String(value)
}
