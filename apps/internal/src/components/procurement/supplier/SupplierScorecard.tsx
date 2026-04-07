import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { motion } from 'motion/react'
import { getSupplierScorecard } from '../../../lib/server/procurement-suppliers'
import type { SupplierScorecard as ScorecardType } from '../../../types/procurement'
import { SupplierTierBadge } from './SupplierTierBadge'
import { PerformanceTrend } from './PerformanceTrend'
import { getTierInspectionLevel, normalizeToStars } from './scorecard-utils'

interface SupplierScorecardProps {
  supplierId: string
  onBack: () => void
}

// ─── Mock Recent POs ──────────────────────────────────────

const MOCK_RECENT_POS = [
  { poNumber: 'PO-2026-0142', date: '2026-03-28', total: 245000, status: 'received' },
  { poNumber: 'PO-2026-0128', date: '2026-03-15', total: 180000, status: 'closed' },
  { poNumber: 'PO-2026-0101', date: '2026-02-22', total: 320000, status: 'closed' },
  { poNumber: 'PO-2026-0089', date: '2026-02-10', total: 95000, status: 'inspected' },
  { poNumber: 'PO-2026-0074', date: '2026-01-28', total: 410000, status: 'closed' },
]

// ─── Horizontal Metric Bar ────────────────────────────────

function MetricBar({
  label,
  value,
  displayValue,
  maxValue = 100,
  trend,
  invertTrend,
}: {
  label: string
  value: number
  displayValue: string
  maxValue?: number
  trend?: ScorecardType['trend']
  invertTrend?: boolean
}) {
  const pct = Math.min((value / maxValue) * 100, 100)

  return (
    <div className="flex items-center gap-4">
      <span className="w-36 shrink-0 text-[11px] text-black/40 dark:text-white/40">{label}</span>
      <div className="flex-1 flex items-center gap-3">
        <div className="flex-1 h-1 rounded-full bg-black/[0.04] dark:bg-white/[0.04]">
          <motion.div
            className="h-full rounded-full bg-black/20 dark:bg-white/20"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.1 }}
          />
        </div>
        <span className="w-14 text-end font-[family-name:var(--font-geist-mono)] text-sm font-medium tabular-nums text-black/70 dark:text-white/70">
          {displayValue}
        </span>
        {trend && (
          <div className="w-8">
            <PerformanceTrend trend={trend} inverted={invertTrend} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────

export function SupplierScorecard({ supplierId, onBack }: SupplierScorecardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['supplier-scorecard', supplierId],
    queryFn: () => getSupplierScorecard({ data: { supplierId } }),
    staleTime: 60_000,
  })

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-black/25 dark:text-white/25">Loading...</p>
      </div>
    )
  }

  const sc = data.scorecard

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="space-y-8 p-4"
    >
      {/* Hero header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black/90 dark:text-white/90">{sc.supplierName}</h2>
          <div className="mt-2 flex items-center gap-3">
            <SupplierTierBadge tier={sc.tier} />
            <PerformanceTrend trend={sc.trend} showLabel />
          </div>
        </div>

        {/* Large mono score */}
        <div className="text-end">
          <div className="font-[family-name:var(--font-geist-mono)] text-4xl font-bold tabular-nums text-black dark:text-white leading-none">
            {sc.overallScore}
          </div>
          <div className="mt-0.5 text-[9px] uppercase tracking-wider text-black/25 dark:text-white/25">
            Score
          </div>
        </div>
      </div>

      {/* Back */}
      <Button
        onPress={onBack}
        className="text-[11px] text-black/35 outline-none data-[hovered]:text-black/60 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 dark:text-white/35 dark:data-[hovered]:text-white/60"
      >
        <span className="inline-flex items-center gap-1">
          <svg className="h-3 w-3 rtl:rotate-180" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to directory
        </span>
      </Button>

      {/* Performance metrics as horizontal bars */}
      <section>
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30 mb-4">
          Performance
        </h3>
        <div className="space-y-3">
          <MetricBar
            label="On-time Delivery"
            value={sc.onTimeDeliveryRate}
            displayValue={`${sc.onTimeDeliveryRate}%`}
            trend={sc.trend}
          />
          <MetricBar
            label="Order Fill Rate"
            value={sc.fillRate}
            displayValue={`${sc.fillRate}%`}
            trend={sc.trend}
          />
          <MetricBar
            label="Quality Rejection"
            value={sc.qualityRejectionRate}
            displayValue={`${sc.qualityRejectionRate}%`}
            trend={sc.trend}
            invertTrend
          />
          <MetricBar
            label="Price Competitiveness"
            value={sc.priceCompetitiveness}
            displayValue={`${sc.priceCompetitiveness}`}
          />
          <MetricBar
            label="Avg Response Time"
            value={Math.min(sc.avgResponseTimeDays, 10)}
            displayValue={`${sc.avgResponseTimeDays}d`}
            maxValue={10}
          />
        </div>
      </section>

      {/* Tier + Inspection level */}
      <section>
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30 mb-2">
          Inspection Level
        </h3>
        <div className="flex items-center gap-3">
          <SupplierTierBadge tier={sc.tier} />
          <span className="text-sm text-black/50 dark:text-white/50">{getTierInspectionLevel(sc.tier)}</span>
        </div>
      </section>

      {/* Recent POs */}
      <section>
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30 mb-3">
          Recent Orders
        </h3>
        <div className="space-y-px">
          {MOCK_RECENT_POS.map((po) => (
            <div key={po.poNumber} className="flex items-center gap-4 py-2 px-1">
              <span className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-[#2563EB]">
                {po.poNumber}
              </span>
              <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-black/30 dark:text-white/30">
                {po.date}
              </span>
              <span className="ms-auto font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-black/70 dark:text-white/70">
                {po.total.toLocaleString('en-EG')}
              </span>
              <span className="text-[10px] text-black/30 dark:text-white/30 capitalize w-16 text-end">
                {po.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  )
}
