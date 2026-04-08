import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { getSupplierScorecard } from '../../../lib/server/procurement-suppliers'
import type { SupplierScorecard as ScorecardType } from '../../../types/procurement'
import { SupplierTierBadge } from './SupplierTierBadge'
import { getTierInspectionLevel } from './scorecard-utils'
import { Button } from '../../ui'
import { useProcurementStore } from '../../../stores/procurement'

interface SupplierScorecardProps {
  supplierId: string
  onBack: () => void
}

// ─── Trend Arrow ─────────────────────────────────────────

function TrendArrow({ trend }: { trend: ScorecardType['trend'] }) {
  if (trend === 'improving') return <span className="text-green-600 dark:text-green-400">↗</span>
  if (trend === 'declining') return <span className="text-red-500 dark:text-red-400">↘</span>
  return <span className="text-black/30 dark:text-white/30">→</span>
}

const TREND_LABEL: Record<string, string> = {
  improving: 'Improving',
  declining: 'Declining',
  stable: 'Stable',
}

// ─── Mock Recent POs ─────────────────────────────────────

const MOCK_RECENT_POS = [
  { poNumber: 'PO-2026-0142', poId: 'po-2026-0142', date: '2026-03-28', total: 245000, status: 'received' },
  { poNumber: 'PO-2026-0128', poId: 'po-2026-0128', date: '2026-03-15', total: 180000, status: 'closed' },
  { poNumber: 'PO-2026-0101', poId: 'po-2026-0101', date: '2026-02-22', total: 320000, status: 'closed' },
  { poNumber: 'PO-2026-0089', poId: 'po-2026-0089', date: '2026-02-10', total: 95000, status: 'inspected' },
  { poNumber: 'PO-2026-0074', poId: 'po-2026-0074', date: '2026-01-28', total: 410000, status: 'closed' },
]

// Mock contact info keyed by supplier name hash
const MOCK_CONTACTS: Record<string, { phone: string; email: string }> = {
  default: { phone: '+20 2 2345 6789', email: 'sales@supplier.eg' },
}

// ─── Main Component ──────────────────────────────────────

export function SupplierScorecard({ supplierId, onBack }: SupplierScorecardProps) {
  const setActiveTab = useProcurementStore((s) => s.setActiveTab)
  const setPreSelectedSupplierId = useProcurementStore((s) => s.setPreSelectedSupplierId)
  const setSelectedPOId = useProcurementStore((s) => s.setSelectedPOId)

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-scorecard', supplierId],
    queryFn: () => getSupplierScorecard({ data: { supplierId } }),
    staleTime: 60_000,
  })

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[13px] text-black/40 dark:text-white/40">Loading...</p>
      </div>
    )
  }

  const sc = data.scorecard
  const contact = MOCK_CONTACTS.default

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="space-y-10 px-6 py-6"
    >
      {/* ── Hero: Name + Score + Actions ── */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="text-[22px] font-semibold tracking-tight text-black/90 dark:text-white/90">
            {sc.supplierName}
          </h2>
          <div className="flex items-center gap-3">
            <SupplierTierBadge tier={sc.tier} />
            <span className="text-[12px] text-black/40 dark:text-white/40">
              {getTierInspectionLevel(sc.tier)}
            </span>
            <span className="flex items-center gap-1.5 text-[13px] text-black/40 dark:text-white/40">
              <TrendArrow trend={sc.trend} />
              {TREND_LABEL[sc.trend] ?? 'Stable'}
            </span>
          </div>
          {/* Contact links */}
          <div className="flex items-center gap-4 pt-1">
            <a
              href={`tel:${contact.phone}`}
              className="flex items-center gap-1.5 text-[12px] text-black/40 dark:text-white/40 hover:text-black/60 dark:hover:text-white/60 transition-colors"
            >
              <svg className="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6.5 1.5h-3a1 1 0 0 0-1 1v1a10 10 0 0 0 10 10h1a1 1 0 0 0 1-1v-3l-3-1.5-1.5 2a7 7 0 0 1-4-4l2-1.5L6.5 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {contact.phone}
            </a>
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-1.5 text-[12px] text-black/40 dark:text-white/40 hover:text-black/60 dark:hover:text-white/60 transition-colors"
            >
              <svg className="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="1.5" y="3" width="13" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <path d="M1.5 4.5L8 9l6.5-4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {contact.email}
            </a>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="text-end">
            <div className="font-[family-name:var(--font-geist-mono)] text-[48px] font-bold tabular-nums leading-none text-black dark:text-white">
              {sc.overallScore}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-widest text-black/25 dark:text-white/25">
              Score
            </div>
          </div>
          <Button
            variant="primary"
            onPress={() => {
              setPreSelectedSupplierId(supplierId)
              setActiveTab('sourcing')
            }}
            className="text-[12px]"
          >
            Add to New Inquiry
          </Button>
        </div>
      </div>

      {/* ── Metrics Grid: Numbers ARE the design ── */}
      <div className="grid grid-cols-5 gap-6">
        {[
          { label: 'On-time Delivery', value: `${sc.onTimeDeliveryRate}%` },
          { label: 'Order Fill Rate', value: `${sc.fillRate}%` },
          { label: 'Quality Rejection', value: `${sc.qualityRejectionRate}%` },
          { label: 'Price Competitiveness', value: `${sc.priceCompetitiveness}` },
          { label: 'Avg Response', value: `${sc.avgResponseTimeDays}d` },
        ].map((metric) => (
          <div key={metric.label}>
            <div className="font-[family-name:var(--font-geist-mono)] text-[24px] font-semibold tabular-nums text-black/80 dark:text-white/80">
              {metric.value}
            </div>
            <div className="mt-1 text-[12px] text-black/40 dark:text-white/40">
              {metric.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Recent Orders ── */}
      <div>
        <h3 className="mb-4 text-[12px] font-medium uppercase tracking-widest text-black/30 dark:text-white/30">
          Recent Orders
        </h3>
        <div className="space-y-0">
          {MOCK_RECENT_POS.map((po) => (
            <div
              key={po.poNumber}
              className="flex items-center py-3 border-b border-black/[0.03] dark:border-white/[0.03]"
            >
              <button
                type="button"
                className="w-36 text-start font-[family-name:var(--font-geist-mono)] text-[13px] font-medium tabular-nums text-[#2563EB] hover:underline outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 rounded"
                onClick={() => {
                  setSelectedPOId(po.poId)
                  setActiveTab('po-management')
                }}
              >
                {po.poNumber}
              </button>
              <span className="w-24 font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-black/40 dark:text-white/40">
                {po.date}
              </span>
              <span className="flex-1" />
              <span className="w-28 text-end font-[family-name:var(--font-geist-mono)] text-[13px] font-medium tabular-nums text-black/70 dark:text-white/70">
                {po.total.toLocaleString('en-EG')}
              </span>
              <span className="w-20 text-end text-[12px] capitalize text-black/40 dark:text-white/40">
                {po.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
