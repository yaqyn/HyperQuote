import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSLAItems } from '../../../lib/server/operations-dashboard'
import {
  computeSLAStatus,
  getTimeRemainingColor,
  SLA_DURATIONS,
} from '../../../types/operations'
import type { SLAType, SLAStatus, SLAItem } from '../../../types/operations'

// ─── Helpers ────────────────────────────────────────────────

function formatRemaining(ms: number): string {
  const absMs = Math.abs(ms)
  const hours = Math.floor(absMs / 3_600_000)
  const minutes = Math.floor((absMs % 3_600_000) / 60_000)
  const time = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  return ms <= 0 ? `Overdue ${time}` : time
}

const STATUS_DOT: Record<SLAStatus, string> = {
  on_track: 'bg-green-500',
  at_risk: 'bg-yellow-500',
  breached: 'bg-red-500',
}

const STATUS_PRIORITY: Record<SLAStatus, number> = { breached: 0, at_risk: 1, on_track: 2 }

const SLA_TYPE_OPTIONS: { value: SLAType; label: string }[] = Object.entries(SLA_DURATIONS).map(
  ([key, val]) => ({ value: key as SLAType, label: val.label }),
)

const STATUS_OPTIONS: { value: SLAStatus; label: string }[] = [
  { value: 'breached', label: 'Breached' },
  { value: 'at_risk', label: 'At Risk' },
  { value: 'on_track', label: 'On Track' },
]

// ─── Sort ───────────────────────────────────────────────────

function sortByUrgency(items: SLAItem[]): SLAItem[] {
  return [...items].sort((a, b) => {
    const aPri = STATUS_PRIORITY[computeSLAStatus(a.remainingMs, a.totalMs)]
    const bPri = STATUS_PRIORITY[computeSLAStatus(b.remainingMs, b.totalMs)]
    if (aPri !== bPri) return aPri - bPri
    return a.remainingMs - b.remainingMs
  })
}

// ─── Component ──────────────────────────────────────────────

/**
 * Compact list of active SLA timers sorted by urgency.
 * Each: order # (mono) + customer + SLA deadline (countdown mono) + status dot.
 * Overdue items float to top with red text.
 */
export function SLATracker() {
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  const { data, isLoading } = useQuery({
    queryKey: ['operations', 'sla-items', typeFilter, statusFilter],
    queryFn: () =>
      getSLAItems({
        data: {
          type: typeFilter || undefined,
          status: statusFilter || undefined,
        },
      }),
    staleTime: 30_000,
  })

  const sortedItems = useMemo(() => {
    if (!data?.items) return []
    return sortByUrgency(data.items)
  }, [data?.items])

  // Count breached items
  const breachedCount = sortedItems.filter((item) => computeSLAStatus(item.remainingMs, item.totalMs) === 'breached').length
  const atRiskCount = sortedItems.filter((item) => computeSLAStatus(item.remainingMs, item.totalMs) === 'at_risk').length

  return (
    <div>
      {/* Breach alert banner — prominent red count */}
      {breachedCount > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-red-500/[0.06] border border-red-500/10 px-4 py-3">
          <div className="flex size-6 items-center justify-center rounded-full bg-red-500/10">
            <div className="size-2 rounded-full bg-red-500" />
          </div>
          <span className="font-[family-name:var(--font-geist-mono)] text-[18px] font-semibold text-red-600">
            {breachedCount}
          </span>
          <span className="text-[13px] font-medium text-red-600">
            order{breachedCount !== 1 ? 's' : ''} breaching SLA
          </span>
          {atRiskCount > 0 && (
            <span className="text-[12px] text-yellow-600 ms-2">
              + {atRiskCount} at risk
            </span>
          )}
        </div>
      )}

      {/* Header + Filters */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
          SLA Timers
        </span>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border-0 bg-black/[0.04] dark:bg-white/[0.04] px-2.5 py-1 text-[12px] text-black/60 dark:text-white/60 outline-none focus:ring-2 focus:ring-[#2563EB]/30"
            aria-label="Filter by SLA type"
          >
            <option value="">All Types</option>
            {SLA_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border-0 bg-black/[0.04] dark:bg-white/[0.04] px-2.5 py-1 text-[12px] text-black/60 dark:text-white/60 outline-none focus:ring-2 focus:ring-[#2563EB]/30"
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-black/[0.03] dark:bg-white/[0.03]" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sortedItems.length === 0 && (
        <p className="text-[13px] text-black/30 dark:text-white/30 py-8">
          No SLA items match your filters
        </p>
      )}

      {/* Compact list */}
      {!isLoading && sortedItems.length > 0 && (
        <div className="flex flex-col">
          {sortedItems.map((item) => {
            const status = computeSLAStatus(item.remainingMs, item.totalMs)
            const isOverdue = item.remainingMs <= 0

            return (
              <div
                key={item.id}
                className="flex items-center gap-4 py-2.5 border-b border-black/[0.04] dark:border-white/[0.04] last:border-b-0"
              >
                {/* Status dot */}
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[status]}`} />

                {/* Entity ref (order #) */}
                <span className={`font-[family-name:var(--font-geist-mono)] text-[13px] w-28 shrink-0 ${
                  isOverdue ? 'text-red-600' : ''
                }`}>
                  {item.entityRef}
                </span>

                {/* Entity type */}
                <span className="text-[12px] text-black/40 dark:text-white/40 w-20 shrink-0">
                  {item.entityType}
                </span>

                {/* SLA type */}
                <span className="text-[13px] w-32 shrink-0">
                  {SLA_DURATIONS[item.slaType].label}
                </span>

                {/* Countdown — the most important number */}
                <span
                  className={`font-[family-name:var(--font-geist-mono)] text-[13px] font-medium flex-1 ${getTimeRemainingColor(item.remainingMs, item.totalMs)}`}
                >
                  {formatRemaining(item.remainingMs)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
