import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCycleCountAssignments } from '../../../lib/server/warehouse-count'
import { useWarehouseStore } from '../../../stores/warehouse'
import type { CycleCountStatus } from '../../../types/warehouse'

const STATUS_CONFIG: Record<CycleCountStatus, { label: string; color: string; bg: string }> = {
  assigned: { label: 'Assigned', color: '#2563EB', bg: 'rgba(37, 99, 235, 0.08)' },
  counting: { label: 'Counting', color: '#a16207', bg: 'rgba(234, 179, 8, 0.06)' },
  submitted: { label: 'Submitted', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.06)' },
  recount_requested: { label: 'Recount', color: '#b91c1c', bg: 'rgba(239, 68, 68, 0.06)' },
  approved: { label: 'Approved', color: '#15803d', bg: 'rgba(22, 163, 74, 0.06)' },
  investigating: { label: 'Investigating', color: '#c2410c', bg: 'rgba(249, 115, 22, 0.06)' },
}

const FILTER_STATUSES: (CycleCountStatus | 'all')[] = [
  'all', 'assigned', 'counting', 'submitted', 'recount_requested', 'approved',
]

interface CycleCountListProps {
  onNavigate: (countId: string, view: 'blind' | 'review' | 'approval') => void
}

/**
 * "The Audit" — Active counts as compact cards.
 * Count ID (mono) + zone + items to count + progress bar + assigned.
 * Status dot: pending/in-progress/review/approved.
 */
export function CycleCountList({ onNavigate }: CycleCountListProps) {
  const [statusFilter, setStatusFilter] = useState<CycleCountStatus | 'all'>('all')
  const setSelectedCountId = useWarehouseStore((s) => s.setSelectedCountId)

  const { data, isLoading } = useQuery({
    queryKey: ['cycleCount', 'assignments'],
    queryFn: () => getCycleCountAssignments({ data: {} }),
  })

  const assignments = data?.assignments ?? []

  // Mock status for demo
  const getStatus = (index: number): CycleCountStatus => {
    const statuses: CycleCountStatus[] = ['assigned', 'submitted', 'recount_requested']
    return statuses[index % statuses.length]
  }

  const enrichedAssignments = assignments.map((a, i) => ({
    ...a,
    status: getStatus(i),
  }))

  const filteredAssignments = enrichedAssignments.filter(
    (a) => statusFilter === 'all' || a.status === statusFilter,
  )

  const handleCardTap = (countId: string, status: CycleCountStatus) => {
    setSelectedCountId(countId)
    if (status === 'assigned' || status === 'counting') {
      onNavigate(countId, 'blind')
    } else if (status === 'submitted') {
      onNavigate(countId, 'review')
    } else if (status === 'recount_requested') {
      onNavigate(countId, 'approval')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[#2563EB]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Header ──────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Cycle Counts</h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Inventory audit queue</p>
        </div>
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-bold text-[var(--color-text-primary)]">
          {enrichedAssignments.length}
        </span>
      </div>

      {/* ─── Status filter pills ─────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_STATUSES.map((status) => {
          const isActive = statusFilter === status
          const config = status === 'all' ? null : STATUS_CONFIG[status]
          return (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all min-h-[44px] ${
                isActive
                  ? 'bg-[#2563EB] text-white'
                  : 'border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-black/[0.02]'
              }`}
            >
              {status === 'all' ? 'All' : config!.label}
            </button>
          )
        })}
      </div>

      {/* ─── Count rows (departure board style) ──────────── */}
      <div className="flex flex-col">
        {filteredAssignments.map((assignment) => {
          const config = STATUS_CONFIG[assignment.status]
          const progress = assignment.totalCounts > 0
            ? (assignment.countNumber / assignment.totalCounts) * 100
            : 0

          return (
            <button
              key={assignment.id}
              type="button"
              onClick={() => handleCardTap(assignment.id, assignment.status)}
              className="group flex items-center gap-4 border-b border-[var(--color-border)] px-2 py-4 text-start transition-colors hover:bg-black/[0.02] active:bg-black/[0.04] min-h-[72px]"
            >
              {/* Status dot */}
              <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: config.color }} />

              {/* Count ID + zone */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">
                  {assignment.locationCode}
                </p>
                <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-secondary)]">
                  {assignment.countNumber} / {assignment.totalCounts}
                </p>
              </div>

              {/* Progress bar (inline, compact) */}
              <div className="w-24 shrink-0">
                <div className="h-1.5 w-full rounded-full bg-[var(--color-border)]">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress}%`, background: config.color }}
                  />
                </div>
              </div>

              {/* Status badge */}
              <span
                className="shrink-0 rounded-md px-2.5 py-1 text-[10px] font-bold"
                style={{ color: config.color, background: config.bg }}
              >
                {config.label}
              </span>

              {/* Arrow */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
                <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )
        })}

        {filteredAssignments.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-[var(--color-text-secondary)]">No counts matching filter</p>
          </div>
        )}
      </div>
    </div>
  )
}
