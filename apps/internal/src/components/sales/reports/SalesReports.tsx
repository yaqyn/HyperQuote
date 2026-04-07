import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, ToggleButton } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { getSalesAnalytics } from '../../../lib/server/sales-activity'
import type { SalesAnalytics } from '../../../types/sales'

type Period = 'week' | 'month' | 'quarter' | 'year'

// ─── Formatters ─────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return String(value)
}

// ─── Revenue by Product — Horizontal Bars ───────────────────

function RevenueByProduct({ items }: { items: { label: string; value: number }[] }) {
  const maxValue = items.reduce((max, item) => Math.max(max, item.value), 0)

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-36 shrink-0 truncate text-[13px] text-[var(--color-text)]">
            {item.label}
          </span>
          <div className="flex-1">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
              className="h-6 rounded-md bg-[var(--color-primary)]/12"
            />
          </div>
          <span className="w-20 shrink-0 text-end font-[family-name:var(--font-geist-mono)] text-[13px] font-medium tabular-nums text-[var(--color-text)]">
            {formatCurrency(item.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Margin by Customer — Ranked List with Bars ─────────────

function MarginByCustomer({ customers }: { customers: SalesAnalytics['topCustomers'] }) {
  // Mock margin data per customer
  const MARGINS = [19.2, 17.8, 15.5, 21.3, 16.0]

  return (
    <div className="flex flex-col gap-2.5">
      {customers.map((c, i) => {
        const margin = MARGINS[i] ?? 18
        return (
          <div key={c.name} className="flex items-center gap-3">
            <span className="w-40 shrink-0 truncate text-[13px] text-[var(--color-text)]">
              {c.name}
            </span>
            <div className="flex-1">
              <div
                className="h-4 rounded bg-[var(--color-text)]/8 dark:bg-white/[0.08]"
                style={{ width: `${margin * 4}%` }}
              />
            </div>
            <span className="w-14 shrink-0 text-end font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
              {margin.toFixed(1)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Pipeline — Funnel Bars ─────────────────────────────────

function PipelineFunnel({ stages }: { stages: SalesAnalytics['pipelineByStage'] }) {
  const maxValue = stages.reduce((max, s) => Math.max(max, s.value), 0)

  return (
    <div className="flex flex-col items-center gap-1.5">
      {stages.map((stage, i) => {
        const widthPct = maxValue > 0 ? Math.max(15, (stage.value / maxValue) * 100) : 15
        return (
          <div key={stage.stage} className="flex w-full items-center gap-3">
            <span className="w-24 shrink-0 text-end text-[11px] text-[var(--color-text-subtle)]">
              {stage.stage}
            </span>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${widthPct}%` }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="flex h-7 items-center justify-center rounded-md bg-[var(--color-primary)]"
              style={{ opacity: 1 - i * 0.1 }}
            >
              <span className="font-[family-name:var(--font-geist-mono)] text-[11px] font-medium tabular-nums text-white">
                {stage.count}
              </span>
            </motion.div>
            <span className="w-16 font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-muted)]">
              {formatCurrency(stage.value)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Conversion Rates — Big Mono Numbers ────────────────────

function ConversionRates({ rates }: { rates: SalesAnalytics['conversionRates'] }) {
  return (
    <div className="flex flex-col items-center gap-0">
      {rates.map((r, i) => (
        <div key={r.fromStage} className="flex flex-col items-center">
          <div className="text-center">
            <span className="text-[11px] text-[var(--color-text-subtle)]">{r.fromStage}</span>
          </div>
          <span className="font-[family-name:var(--font-geist-mono)] text-[28px] font-bold tabular-nums text-[var(--color-text)]">
            {r.rate}%
          </span>
          {i < rates.length - 1 && (
            <svg width="12" height="20" viewBox="0 0 12 20" className="my-1 text-[var(--color-text-subtle)]">
              <path d="M6 0L6 14M2 10L6 16L10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      ))}
      {rates.length > 0 && (
        <div className="text-center">
          <span className="text-[11px] text-[var(--color-text-subtle)]">
            {rates[rates.length - 1].toStage}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── CSV Export ──────────────────────────────────────────────

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

  const pipelineStages = useMemo(() => {
    if (!analytics) return []
    return analytics.pipelineByStage
  }, [analytics])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="h-24 animate-pulse rounded-xl bg-black/[0.03] dark:bg-white/[0.03]" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-black/[0.03] dark:bg-white/[0.03]" />
          ))}
        </div>
      </div>
    )
  }

  if (!analytics) return null

  // Trend indicator (mock — would come from comparing periods)
  const revenueTrend = analytics.revenue > 0 ? 'up' : 'flat'

  // Weighted pipeline forecast
  const weightedPipeline = analytics.pipelineByStage.reduce((sum, s) => {
    const weights: Record<string, number> = {
      'RFQ Received': 0.2, Reviewing: 0.3, Sourcing: 0.4,
      Quoting: 0.5, Sent: 0.6, Negotiating: 0.7, Closing: 0.85,
    }
    return sum + s.value * (weights[s.stage] ?? 0.5)
  }, 0)

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Top bar: period selector + export */}
      <div className="flex items-center justify-between">
        {/* Period pill toggle */}
        <div className="flex rounded-full bg-black/[0.04] p-0.5 dark:bg-white/[0.06]">
          {(['week', 'month', 'quarter', 'year'] as Period[]).map((p) => (
            <ToggleButton
              key={p}
              isSelected={period === p}
              onChange={() => setPeriod(p)}
              className={[
                'rounded-full px-3.5 py-1 text-[11px] font-medium capitalize outline-none transition-colors',
                period === p
                  ? 'bg-[var(--color-text)] text-white dark:bg-white dark:text-black'
                  : 'text-[var(--color-text-subtle)] data-[hovered]:text-[var(--color-text-muted)]',
              ].join(' ')}
            >
              {p}
            </ToggleButton>
          ))}
        </div>

        {/* CSV export — small text link */}
        <button
          type="button"
          onClick={handleExportCSV}
          className="text-[11px] text-[var(--color-text-subtle)] underline-offset-2 transition-colors hover:text-[var(--color-text-muted)] hover:underline"
        >
          {t('sales.reports.exportCSV', 'Export CSV')}
        </button>
      </div>

      {/* Hero metric */}
      <div className="flex flex-col items-start">
        <span className="text-[11px] uppercase tracking-wider text-[var(--color-text-subtle)]">
          {t('sales.reports.totalRevenue', 'Total Revenue')}
        </span>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-geist-mono)] text-[48px] font-bold leading-none tabular-nums text-[var(--color-text)]">
            EGP {formatCurrency(analytics.revenue)}
          </span>
          {revenueTrend === 'up' && (
            <span className="text-[13px] text-green-600 dark:text-green-400">↑</span>
          )}
        </div>
      </div>

      {/* Supporting metrics row */}
      <div className="flex gap-8">
        <div>
          <span className="text-[11px] text-[var(--color-text-subtle)]">
            {t('sales.reports.orders', 'Orders')}
          </span>
          <p className="font-[family-name:var(--font-geist-mono)] text-[22px] font-semibold tabular-nums text-[var(--color-text)]">
            {analytics.orderCount}
          </p>
        </div>
        <div>
          <span className="text-[11px] text-[var(--color-text-subtle)]">
            {t('sales.reports.avgOrder', 'Avg Order')}
          </span>
          <p className="font-[family-name:var(--font-geist-mono)] text-[22px] font-semibold tabular-nums text-[var(--color-text)]">
            EGP {formatCurrency(analytics.avgOrderValue)}
          </p>
        </div>
        <div>
          <span className="text-[11px] text-[var(--color-text-subtle)]">
            {t('sales.reports.forecast', 'Forecast')}
          </span>
          <p className="font-[family-name:var(--font-geist-mono)] text-[22px] font-semibold tabular-nums text-[var(--color-text)]">
            EGP {formatCurrency(weightedPipeline)}
          </p>
        </div>
      </div>

      {/* Two-column editorial layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Revenue by Product */}
        <div>
          <h3 className="mb-4 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
            {t('sales.reports.revenueByProduct', 'Revenue by Product')}
          </h3>
          <RevenueByProduct items={revenueBarItems} />
        </div>

        {/* Margin by Customer */}
        <div>
          <h3 className="mb-4 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
            {t('sales.reports.marginByCustomer', 'Margin by Customer')}
          </h3>
          <MarginByCustomer customers={analytics.topCustomers} />
        </div>

        {/* Pipeline Funnel */}
        <div>
          <h3 className="mb-4 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
            {t('sales.reports.pipelineByStage', 'Pipeline by Stage')}
          </h3>
          <PipelineFunnel stages={pipelineStages} />
        </div>

        {/* Conversion Rates */}
        <div>
          <h3 className="mb-4 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
            {t('sales.reports.conversionRates', 'Conversion Rates')}
          </h3>
          <ConversionRates rates={analytics.conversionRates} />
        </div>
      </div>
    </div>
  )
}
