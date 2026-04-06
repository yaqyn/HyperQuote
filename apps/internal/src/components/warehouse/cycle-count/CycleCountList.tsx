import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCycleCountAssignments } from '../../../lib/server/warehouse-count'
import { useWarehouseStore } from '../../../stores/warehouse'
import { StepIndicator } from '../shared/StepIndicator'
import type { CycleCountStatus } from '../../../types/warehouse'

const STATUS_LABELS: Record<CycleCountStatus, string> = {
  assigned: 'Assigned',
  counting: 'Counting',
  submitted: 'Submitted',
  recount_requested: 'Recount',
  approved: 'Approved',
  investigating: 'Investigating',
}

const STATUS_COLORS: Record<CycleCountStatus, string> = {
  assigned: 'bg-blue-100 text-blue-800',
  counting: 'bg-yellow-100 text-yellow-800',
  submitted: 'bg-purple-100 text-purple-800',
  recount_requested: 'bg-red-100 text-red-800',
  approved: 'bg-green-100 text-green-800',
  investigating: 'bg-orange-100 text-orange-800',
}

interface CycleCountListProps {
  onNavigate: (countId: string, view: 'blind' | 'review' | 'approval') => void
}

/**
 * List of assigned cycle counts with status filter.
 * Tap card navigates to BlindCountEntry (assigned/counting),
 * CountReview (submitted), or SupervisorApproval (recount_requested).
 */
export function CycleCountList({ onNavigate }: CycleCountListProps) {
  const [statusFilter, setStatusFilter] = useState<CycleCountStatus | 'all'>('all')
  const setSelectedCountId = useWarehouseStore((s) => s.setSelectedCountId)

  const { data, isLoading } = useQuery({
    queryKey: ['cycleCount', 'assignments'],
    queryFn: () => getCycleCountAssignments({ data: {} }),
  })

  const assignments = data?.assignments ?? []

  // Mock status for demo — in production this comes from server
  const getStatus = (index: number): CycleCountStatus => {
    const statuses: CycleCountStatus[] = ['assigned', 'submitted', 'recount_requested']
    return statuses[index % statuses.length]
  }

  const filteredAssignments = assignments.map((a, i) => ({
    ...a,
    status: getStatus(i),
  })).filter((a) => statusFilter === 'all' || a.status === statusFilter)

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

  const assignedCount = assignments.filter((_, i) => getStatus(i) === 'assigned').length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-[var(--color-text-secondary)] text-sm">Loading counts...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Cycle Counts</h2>
      </div>

      {assignments.length > 0 && (
        <StepIndicator
          current={assignedCount}
          total={assignments.length}
          label="count"
        />
      )}

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'assigned', 'counting', 'submitted', 'recount_requested', 'approved'] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[48px] ${
              statusFilter === status
                ? 'bg-[#2563EB] text-white'
                : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            {status === 'all' ? 'All' : STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {/* Count cards */}
      <div className="flex flex-col gap-3">
        {filteredAssignments.map((assignment) => (
          <button
            key={assignment.id}
            type="button"
            onClick={() => handleCardTap(assignment.id, assignment.status)}
            className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] transition-colors text-start min-h-[48px]"
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                {assignment.locationCode}
              </span>
              <span className="font-mono tabular-nums text-xs text-[var(--color-text-secondary)]">
                Count{' '}
                <span className="font-mono tabular-nums">{assignment.countNumber}</span>
                {' / '}
                <span className="font-mono tabular-nums">{assignment.totalCounts}</span>
              </span>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[assignment.status]}`}>
              {STATUS_LABELS[assignment.status]}
            </span>
          </button>
        ))}

        {filteredAssignments.length === 0 && (
          <p className="text-center text-sm text-[var(--color-text-secondary)] py-8">
            No counts matching filter
          </p>
        )}
      </div>
    </div>
  )
}
