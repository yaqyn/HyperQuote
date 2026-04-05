import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { Button } from 'react-aria-components'
import { getSupplierScorecard } from '../../../lib/server/procurement-suppliers'
import type { SupplierScorecard as ScorecardType } from '../../../types/procurement'
import { SupplierTierBadge } from './SupplierTierBadge'
import { PerformanceTrend } from './PerformanceTrend'
import { getTierInspectionLevel, normalizeToStars } from './scorecard-utils'

interface SupplierScorecardProps {
  supplierId: string
  onBack: () => void
}

// ─── Star Rating Display ──────────────────────────────────

function StarRating({ score }: { score: number }) {
  const stars = normalizeToStars(score)
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${stars} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`size-4 ${i < stars ? 'fill-[#2563EB] text-[#2563EB]' : 'fill-none text-black/20'}`}
          aria-hidden="true"
        />
      ))}
    </span>
  )
}

// ─── Metric Card ──────────────────────────────────────────

interface MetricCardProps {
  label: string
  value: string
  trend?: ScorecardType['trend']
  /** Invert trend colors (lower is better) */
  invertTrend?: boolean
}

function MetricCard({ label, value, trend, invertTrend }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-black/5 bg-white/60 p-4 backdrop-blur-sm">
      <p className="text-xs text-black/50 mb-1">{label}</p>
      <div className="flex items-center justify-between">
        <span className="font-[family-name:var(--font-geist-mono)] text-lg font-semibold text-black/90">
          {value}
        </span>
        {trend && <PerformanceTrend trend={trend} inverted={invertTrend} />}
      </div>
    </div>
  )
}

// ─── Mock Recent POs ──────────────────────────────────────

const MOCK_RECENT_POS = [
  { poNumber: 'PO-2026-0142', date: '2026-03-28', total: 245000, status: 'received' },
  { poNumber: 'PO-2026-0128', date: '2026-03-15', total: 180000, status: 'closed' },
  { poNumber: 'PO-2026-0101', date: '2026-02-22', total: 320000, status: 'closed' },
  { poNumber: 'PO-2026-0089', date: '2026-02-10', total: 95000, status: 'inspected' },
  { poNumber: 'PO-2026-0074', date: '2026-01-28', total: 410000, status: 'closed' },
]

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
        <p className="text-sm text-black/40">Loading scorecard...</p>
      </div>
    )
  }

  const sc = data.scorecard

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-black/90">{sc.supplierName}</h2>
          <div className="flex items-center gap-3">
            <SupplierTierBadge tier={sc.tier} />
            <StarRating score={sc.overallScore} />
            <PerformanceTrend trend={sc.trend} showLabel />
          </div>
        </div>
        <Button
          onPress={onBack}
          className="rounded-lg border border-black/10 bg-white/60 px-3 py-1.5 text-sm text-black/70 hover:bg-white/80 pressed:bg-white/90 transition-colors"
        >
          Back to Directory
        </Button>
      </div>

      {/* 6 Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="On-time Delivery Rate"
          value={`${sc.onTimeDeliveryRate}%`}
          trend={sc.trend}
        />
        <MetricCard
          label="Order Fill Rate"
          value={`${sc.fillRate}%`}
          trend={sc.trend}
        />
        <MetricCard
          label="Quality Rejection Rate"
          value={`${sc.qualityRejectionRate}%`}
          trend={sc.trend}
          invertTrend
        />
        <MetricCard
          label="Price Competitiveness"
          value={`${sc.priceCompetitiveness}`}
          trend={sc.trend}
        />
        <MetricCard
          label="Avg Response Time"
          value={`${sc.avgResponseTimeDays} days`}
        />
        <div className="rounded-xl border border-black/5 bg-white/60 p-4 backdrop-blur-sm">
          <p className="text-xs text-black/50 mb-1">Overall Score</p>
          <StarRating score={sc.overallScore} />
        </div>
      </div>

      {/* Tiering Section */}
      <div className="rounded-xl border border-black/5 bg-white/60 p-4 backdrop-blur-sm">
        <h3 className="text-sm font-medium text-black/70 mb-2">Supplier Tier & Inspection Level</h3>
        <div className="flex items-center gap-3">
          <SupplierTierBadge tier={sc.tier} />
          <span className="text-sm text-black/60">{getTierInspectionLevel(sc.tier)}</span>
        </div>
      </div>

      {/* Recent POs mini-table */}
      <div className="rounded-xl border border-black/5 bg-white/60 p-4 backdrop-blur-sm">
        <h3 className="text-sm font-medium text-black/70 mb-3">Recent Purchase Orders</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/5 text-start">
              <th className="pb-2 text-xs font-medium text-black/40 text-start">PO Number</th>
              <th className="pb-2 text-xs font-medium text-black/40 text-start">Date</th>
              <th className="pb-2 text-xs font-medium text-black/40 text-end">Total (EGP)</th>
              <th className="pb-2 text-xs font-medium text-black/40 text-start">Status</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_RECENT_POS.map((po) => (
              <tr key={po.poNumber} className="border-b border-black/5 last:border-0">
                <td className="py-2 font-[family-name:var(--font-geist-mono)] text-black/80">{po.poNumber}</td>
                <td className="py-2 font-[family-name:var(--font-geist-mono)] text-black/60">{po.date}</td>
                <td className="py-2 font-[family-name:var(--font-geist-mono)] text-black/80 text-end">
                  {po.total.toLocaleString('en-EG')}
                </td>
                <td className="py-2 text-black/60 capitalize">{po.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
