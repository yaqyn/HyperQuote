import { useTranslation } from 'react-i18next'
import type { ThreeWayMatchResult, MatchStatus } from '../../../types/procurement'

interface ThreeWayMatchProps {
  match: ThreeWayMatchResult
}

const MATCH_CONFIG: Record<MatchStatus, { icon: React.ReactNode; color: string; label: string }> = {
  matched: {
    icon: (
      <svg className="h-4 w-4 text-green-600 dark:text-green-400" viewBox="0 0 16 16" fill="none">
        <path d="M4 8L7 11L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
    label: 'Matched',
  },
  partial_match: {
    icon: (
      <svg className="h-4 w-4 text-yellow-600 dark:text-yellow-400" viewBox="0 0 16 16" fill="none">
        <path d="M8 4V9M8 11.5V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    color: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800',
    label: 'Partial Match',
  },
  mismatch: {
    icon: (
      <svg className="h-4 w-4 text-red-600 dark:text-red-400" viewBox="0 0 16 16" fill="none">
        <path d="M5 5L11 11M11 5L5 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    color: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
    label: 'Mismatch',
  },
  pending: {
    icon: (
      <svg className="h-4 w-4 text-black/30 dark:text-white/30" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 5V8.5L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    color: 'bg-black/3 border-black/10 dark:bg-white/5 dark:border-white/10',
    label: 'Pending',
  },
}

function MatchStatusBadge({ status }: { status: MatchStatus }) {
  const config = MATCH_CONFIG[status]
  return (
    <div className={`flex items-center gap-1.5 rounded-md border px-2 py-1 ${config.color}`}>
      {config.icon}
      <span className="text-xs font-medium">{config.label}</span>
    </div>
  )
}

function formatVariance(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

/**
 * Three-way match display (READ-ONLY per Pitfall 5).
 * 3-column comparison: PO | Receipt | Invoice
 * Status indicators: green (matched), yellow (partial), red (mismatch), gray (pending)
 */
export function ThreeWayMatch({ match }: ThreeWayMatchProps) {
  const { t } = useTranslation('internal')

  const comparisons = [
    { label: 'PO vs Receipt', status: match.poVsReceipt, variance: match.variances.quantityVariance },
    { label: 'PO vs Invoice', status: match.poVsInvoice, variance: match.variances.priceVariance },
    { label: 'Receipt vs Invoice', status: match.receiptVsInvoice, variance: match.variances.taxVariance },
  ]

  return (
    <div className="rounded-lg border border-black/10 dark:border-white/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold">Three-Way Match</h4>
        <MatchStatusBadge status={match.overall} />
      </div>

      {/* Comparison rows */}
      <div className="space-y-2">
        {comparisons.map((comp) => (
          <div
            key={comp.label}
            className="flex items-center justify-between rounded-md bg-black/[0.02] dark:bg-white/[0.02] px-3 py-2"
          >
            <span className="text-xs text-black/60 dark:text-white/60">{comp.label}</span>
            <div className="flex items-center gap-3">
              <span className="font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-black/50 dark:text-white/50">
                {formatVariance(comp.variance)}
              </span>
              <MatchStatusBadge status={comp.status} />
            </div>
          </div>
        ))}
      </div>

      {/* Tolerance thresholds */}
      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-black/40 dark:text-white/40">
        <span>Price: 0-5%</span>
        <span>Qty: 0-2%</span>
        <span>Tax: 0%</span>
      </div>
    </div>
  )
}
