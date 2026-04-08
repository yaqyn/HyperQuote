import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '../../../lib/server/reports'
import { useReportsStore } from '../../../stores/reports'
import { TrendIndicator, formatKpiValue, formatCurrency } from '../report-helpers'

/**
 * Sales — "The Front Page"
 * Hero metric: Pipeline Value. Supporting: conversion rate, avg response time, win rate.
 * Chart: Revenue vs Target progress bar.
 * Table: Top 10 deals.
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
      <div className="flex items-center justify-center h-64">
        <span className="text-[13px] text-black/40 dark:text-white/40">{t('loading', 'Loading...')}</span>
      </div>
    )
  }

  const revenueKpi = data.kpis.find((k) => k.label === 'Revenue MTD')
  const targetKpi = data.kpis.find((k) => k.label === 'Revenue Target')
  const revenueMTD = typeof revenueKpi?.value === 'number' ? revenueKpi.value : 0
  const revenueTarget = typeof targetKpi?.value === 'number' ? targetKpi.value : 1
  const progressPct = Math.round((revenueMTD / revenueTarget) * 100)
  const heroKpi = data.kpis.find((k) => k.label !== 'Revenue Target') ?? data.kpis[0]
  const supportingKpis = data.kpis.filter((k) => k !== heroKpi && k.label !== 'Revenue Target')

  return (
    <div className="px-6 py-6 space-y-8">
      {/* Hero metric */}
      {heroKpi && (
        <div>
          <div className="text-[12px] uppercase tracking-widest text-black/40 dark:text-white/40 mb-1">
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

      {/* Supporting metrics */}
      <div className="grid grid-cols-3 gap-8">
        {supportingKpis.slice(0, 3).map((kpi) => (
          <div key={kpi.label}>
            <div className="text-[12px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-0.5">
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

      {/* Revenue vs Target — CSS bar */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[12px] uppercase tracking-widest text-black/40 dark:text-white/40">
            {t('kpi.revenue_vs_target', 'Revenue vs Target')}
          </span>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/40 dark:text-white/40">
            {progressPct}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-black/6 dark:bg-white/6 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#2563EB] transition-all duration-700"
            style={{ width: `${Math.min(progressPct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[12px] font-[family-name:var(--font-geist-mono)] tabular-nums text-black/40 dark:text-white/40">
          <span>{formatCurrency(revenueMTD)}</span>
          <span>{formatCurrency(revenueTarget)}</span>
        </div>
      </div>

      {/* Top Deals Table */}
      <div>
        <div className="text-[12px] uppercase tracking-widest text-black/40 dark:text-white/40 mb-3">
          {t('sales.top_deals', 'Top Deals')}
        </div>
        <div className="border border-black/6 dark:border-white/6 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-black/6 dark:border-white/6 text-[12px] uppercase tracking-wider text-black/40 dark:text-white/40">
                <th className="py-2 ps-3 font-medium text-start">{t('table.customer', 'Customer')}</th>
                <th className="py-2 font-medium text-start">{t('table.deal', 'Deal')}</th>
                <th className="py-2 font-medium text-end">{t('table.value', 'Value')}</th>
                <th className="py-2 font-medium text-start">{t('table.stage', 'Stage')}</th>
                <th className="py-2 pe-3 font-medium text-start">{t('table.rep', 'Rep')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
              {(data.tableData ?? []).map((row) => (
                <tr key={row.id as string}>
                  <td className="py-2 ps-3">{row.customer as string}</td>
                  <td className="py-2 font-[family-name:var(--font-geist-mono)] tabular-nums text-black/50 dark:text-white/50">{row.deal as string}</td>
                  <td className="py-2 pe-6 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {formatCurrency(row.value as number)}
                  </td>
                  <td className="py-2">
                    <span className={`text-[12px] font-medium ${
                      row.stage === 'Won' ? 'text-green-600 dark:text-green-400' :
                      row.stage === 'Negotiation' ? 'text-amber-600 dark:text-amber-400' :
                      'text-[#2563EB]'
                    }`}>
                      {row.stage as string}
                    </span>
                  </td>
                  <td className="py-2 pe-3 text-black/40 dark:text-white/40">{row.rep as string}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

