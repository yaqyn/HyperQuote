import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { Download, Mail } from 'lucide-react'
import { getSalesAnalytics } from '../../../lib/server/sales-activity'
import type { SalesAnalytics } from '../../../types/sales'

type Period = 'week' | 'month' | 'quarter' | 'year'

// ─── CSS-based bar chart (no chart library) ─────────────────

function BarChart({ items, maxValue }: { items: { label: string; value: number }[]; maxValue: number }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="w-32 shrink-0 truncate text-xs text-black/60 dark:text-white/60">
            {item.label}
          </span>
          <div className="flex-1">
            <div
              className="h-5 rounded bg-[#2563EB]/20"
              style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
            />
          </div>
          <span className="w-20 shrink-0 text-end font-[family-name:var(--font-geist-mono)] text-xs tabular-nums">
            {formatCurrency(item.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function HorizontalStackedBar({ segments }: { segments: { label: string; value: number; count: number }[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const colors = [
    'bg-[#2563EB]', 'bg-[#2563EB]/80', 'bg-[#2563EB]/60',
    'bg-[#2563EB]/40', 'bg-[#2563EB]/30', 'bg-[#2563EB]/20', 'bg-[#2563EB]/10',
  ]
  return (
    <div>
      <div className="flex h-8 overflow-hidden rounded-lg">
        {segments.map((seg, i) => {
          const pct = total > 0 ? (seg.value / total) * 100 : 0
          if (pct < 1) return null
          return (
            <div
              key={seg.label}
              className={`${colors[i % colors.length]} flex items-center justify-center`}
              style={{ width: `${pct}%` }}
              title={`${seg.label}: ${formatCurrency(seg.value)} (${seg.count} deals)`}
            >
              {pct > 8 && (
                <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-white mix-blend-difference">
                  {seg.count}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-3">
        {segments.map((seg, i) => (
          <div key={seg.label} className="flex items-center gap-1">
            <div className={`size-2 rounded-full ${colors[i % colors.length]}`} />
            <span className="text-[11px] text-black/50 dark:text-white/50">{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConversionFunnel({ rates }: { rates: SalesAnalytics['conversionRates'] }) {
  return (
    <div className="flex flex-col gap-1">
      {rates.map((r, i) => {
        const width = Math.max(20, r.rate)
        return (
          <div key={r.fromStage} className="flex items-center gap-2">
            <span className="w-24 shrink-0 truncate text-xs text-black/60 dark:text-white/60">
              {r.fromStage}
            </span>
            <div className="flex-1 flex justify-center">
              <div
                className="h-6 rounded bg-[#2563EB]/20 flex items-center justify-center"
                style={{ width: `${width}%` }}
              >
                <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums">
                  {r.rate}%
                </span>
              </div>
            </div>
            {i < rates.length - 1 && (
              <span className="w-16 shrink-0 text-end text-xs text-black/30 dark:text-white/30">
                {r.toStage}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return String(value)
}

// ─── CSV Export ─────────────────────────────────────────────

function generateCSV(analytics: SalesAnalytics): string {
  const lines: string[] = []

  lines.push('Section,Metric,Value')
  lines.push(`Summary,Revenue,"${analytics.revenue}"`)
  lines.push(`Summary,Order Count,"${analytics.orderCount}"`)
  lines.push(`Summary,Avg Order Value,"${analytics.avgOrderValue}"`)
  lines.push('')

  lines.push('Top Products,Product,Revenue,Quantity')
  for (const p of analytics.topProducts) {
    lines.push(`,"${p.name}","${p.revenue}","${p.quantity}"`)
  }
  lines.push('')

  lines.push('Top Customers,Customer,Revenue,Orders')
  for (const c of analytics.topCustomers) {
    lines.push(`,"${c.name}","${c.revenue}","${c.orderCount}"`)
  }
  lines.push('')

  lines.push('Pipeline by Stage,Stage,Count,Value')
  for (const s of analytics.pipelineByStage) {
    lines.push(`,"${s.stage}","${s.count}","${s.value}"`)
  }

  return lines.join('\n')
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// ─── Main Component ─────────────────────────────────────────

export function SalesReports() {
  const { t } = useTranslation('internal')
  const [period, setPeriod] = useState<Period>('month')

  const { data, isLoading } = useQuery({
    queryKey: ['sales-analytics', period],
    queryFn: () => getSalesAnalytics({ data: { period } }),
    staleTime: 300_000,
  })

  const analytics = data ?? null

  const handleExportCSV = useCallback(() => {
    if (!analytics) return
    const csv = generateCSV(analytics)
    downloadCSV(csv, `sales-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`)
  }, [analytics, period])

  const revenueBarItems = useMemo(() => {
    if (!analytics) return []
    return analytics.topProducts.map((p) => ({ label: p.name, value: p.revenue }))
  }, [analytics])

  const maxRevenue = useMemo(() => {
    return revenueBarItems.reduce((max, item) => Math.max(max, item.value), 0)
  }, [revenueBarItems])

  const pipelineSegments = useMemo(() => {
    if (!analytics) return []
    return analytics.pipelineByStage.map((s) => ({
      label: s.stage,
      value: s.value,
      count: s.count,
    }))
  }, [analytics])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-black/5 dark:bg-white/5" />
        ))}
      </div>
    )
  }

  if (!analytics) return null

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Header with filters and export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {t('sales.reports.title', 'Sales Reports')}
        </h2>
        <div className="flex items-center gap-2">
          {/* Period filter */}
          <div className="flex rounded-lg border border-black/10 dark:border-white/10">
            {(['week', 'month', 'quarter', 'year'] as Period[]).map((p) => (
              <Button
                key={p}
                onPress={() => setPeriod(p)}
                className={`px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  period === p
                    ? 'bg-[#2563EB] text-white'
                    : 'text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/5'
                }`}
              >
                {p}
              </Button>
            ))}
          </div>

          <Button
            onPress={handleExportCSV}
            className="flex items-center gap-1 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
          >
            <Download className="size-3.5" />
            {t('sales.reports.exportCSV', 'Export CSV')}
          </Button>

          <Button
            onPress={() => {
              // Placeholder: Email report (Phase 28)
            }}
            className="flex items-center gap-1 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
          >
            <Mail className="size-3.5" />
            {t('sales.reports.emailReport', 'Email Report')}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
          <span className="text-xs text-black/40 dark:text-white/40">
            {t('sales.reports.totalRevenue', 'Total Revenue')}
          </span>
          <p className="font-[family-name:var(--font-geist-mono)] text-2xl font-semibold tabular-nums">
            EGP {formatCurrency(analytics.revenue)}
          </p>
        </div>
        <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
          <span className="text-xs text-black/40 dark:text-white/40">
            {t('sales.reports.orders', 'Orders')}
          </span>
          <p className="font-[family-name:var(--font-geist-mono)] text-2xl font-semibold tabular-nums">
            {analytics.orderCount}
          </p>
        </div>
        <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
          <span className="text-xs text-black/40 dark:text-white/40">
            {t('sales.reports.avgOrder', 'Avg Order Value')}
          </span>
          <p className="font-[family-name:var(--font-geist-mono)] text-2xl font-semibold tabular-nums">
            EGP {formatCurrency(analytics.avgOrderValue)}
          </p>
        </div>
      </div>

      {/* Revenue by product (bar chart) */}
      <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
        <h3 className="mb-3 text-sm font-medium text-black/60 dark:text-white/60">
          {t('sales.reports.revenueByProduct', 'Revenue by Product')}
        </h3>
        <BarChart items={revenueBarItems} maxValue={maxRevenue} />
      </div>

      {/* Margin by customer */}
      <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
        <h3 className="mb-3 text-sm font-medium text-black/60 dark:text-white/60">
          {t('sales.reports.marginByCustomer', 'Margin by Customer')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/5">
                <th className="py-1.5 text-start text-xs font-medium text-black/40 dark:text-white/40">Customer</th>
                <th className="py-1.5 text-end text-xs font-medium text-black/40 dark:text-white/40">Revenue</th>
                <th className="py-1.5 text-end text-xs font-medium text-black/40 dark:text-white/40">Orders</th>
                <th className="py-1.5 text-end text-xs font-medium text-black/40 dark:text-white/40">Margin %</th>
                <th className="py-1.5 text-end text-xs font-medium text-black/40 dark:text-white/40">Profit</th>
              </tr>
            </thead>
            <tbody>
              {analytics.topCustomers.map((c, i) => {
                // Mock margin data per customer
                const margin = [19.2, 17.8, 15.5, 21.3, 16.0][i] ?? 18
                const profit = Math.round(c.revenue * (margin / 100))
                return (
                  <tr key={c.name} className="border-b border-black/[0.03] dark:border-white/[0.03]">
                    <td className="py-2 text-sm">{c.name}</td>
                    <td className="py-2 text-end font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
                      EGP {formatCurrency(c.revenue)}
                    </td>
                    <td className="py-2 text-end font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
                      {c.orderCount}
                    </td>
                    <td className="py-2 text-end font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
                      {margin.toFixed(1)}%
                    </td>
                    <td className="py-2 text-end font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
                      EGP {formatCurrency(profit)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pipeline by stage (stacked bar) */}
      <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
        <h3 className="mb-3 text-sm font-medium text-black/60 dark:text-white/60">
          {t('sales.reports.pipelineByStage', 'Pipeline by Stage')}
        </h3>
        <HorizontalStackedBar segments={pipelineSegments} />
      </div>

      {/* Conversion rates (funnel) */}
      <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
        <h3 className="mb-3 text-sm font-medium text-black/60 dark:text-white/60">
          {t('sales.reports.conversionRates', 'Conversion Rates')}
        </h3>
        <ConversionFunnel rates={analytics.conversionRates} />
      </div>

      {/* Forecast (weighted pipeline vs actual) */}
      <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
        <h3 className="mb-3 text-sm font-medium text-black/60 dark:text-white/60">
          {t('sales.reports.forecast', 'Forecast')}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-black/40 dark:text-white/40">Weighted Pipeline</span>
            <p className="font-[family-name:var(--font-geist-mono)] text-xl font-semibold tabular-nums">
              EGP {formatCurrency(
                analytics.pipelineByStage.reduce((sum, s) => {
                  // Simplified weight: later stages higher probability
                  const weights: Record<string, number> = {
                    'RFQ Received': 0.2, Reviewing: 0.3, Sourcing: 0.4,
                    Quoting: 0.5, Sent: 0.6, Negotiating: 0.7, Closing: 0.85,
                  }
                  return sum + s.value * (weights[s.stage] ?? 0.5)
                }, 0),
              )}
            </p>
          </div>
          <div>
            <span className="text-xs text-black/40 dark:text-white/40">Actual Revenue</span>
            <p className="font-[family-name:var(--font-geist-mono)] text-xl font-semibold tabular-nums">
              EGP {formatCurrency(analytics.revenue)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
