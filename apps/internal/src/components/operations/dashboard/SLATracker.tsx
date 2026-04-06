import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Cell,
  Column,
  Row,
  Table,
  TableBody,
  TableHeader,
} from 'react-aria-components'
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
  return ms <= 0 ? `Overdue by ${time}` : time
}

function formatDeadline(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const STATUS_BADGE: Record<SLAStatus, string> = {
  on_track: 'bg-green-100 text-green-700',
  at_risk: 'bg-yellow-100 text-yellow-700',
  breached: 'bg-red-100 text-red-700',
}

const STATUS_LABEL: Record<SLAStatus, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  breached: 'Breached',
}

const SLA_TYPE_OPTIONS: { value: SLAType; label: string }[] = Object.entries(SLA_DURATIONS).map(
  ([key, val]) => ({ value: key as SLAType, label: val.label }),
)

const STATUS_OPTIONS: { value: SLAStatus; label: string }[] = [
  { value: 'on_track', label: 'On Track' },
  { value: 'at_risk', label: 'At Risk' },
  { value: 'breached', label: 'Breached' },
]

// ─── Sort logic ─────────────────────────────────────────────

type SortColumn = 'slaType' | 'deadline' | 'remainingMs' | 'status'
type SortDirection = 'ascending' | 'descending'

const STATUS_PRIORITY: Record<SLAStatus, number> = { breached: 0, at_risk: 1, on_track: 2 }

function sortItems(items: SLAItem[], column: SortColumn, direction: SortDirection): SLAItem[] {
  const sorted = [...items].sort((a, b) => {
    let cmp = 0
    switch (column) {
      case 'slaType':
        cmp = SLA_DURATIONS[a.slaType].label.localeCompare(SLA_DURATIONS[b.slaType].label)
        break
      case 'deadline':
        cmp = new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        break
      case 'remainingMs':
        cmp = a.remainingMs - b.remainingMs
        break
      case 'status':
        cmp = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]
        break
    }
    return cmp
  })
  if (direction === 'descending') sorted.reverse()
  return sorted
}

// ─── Component ──────────────────────────────────────────────

export function SLATracker() {
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [sortColumn, setSortColumn] = useState<SortColumn>('status')
  const [sortDirection, setSortDirection] = useState<SortDirection>('ascending')

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
    return sortItems(data.items, sortColumn, sortDirection)
  }, [data?.items, sortColumn, sortDirection])

  const handleSort = (descriptor: { column?: string | number; direction?: SortDirection }) => {
    if (descriptor.column) {
      setSortColumn(descriptor.column as SortColumn)
    }
    if (descriptor.direction) {
      setSortDirection(descriptor.direction)
    }
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 mt-6">
      {/* Header + Filters */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">SLA Tracker</h3>
        <div className="flex gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-sm"
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
            className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-sm"
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
        <div className="h-48 animate-pulse bg-black/5 dark:bg-white/5 rounded-lg" />
      )}

      {/* Empty state */}
      {!isLoading && sortedItems.length === 0 && (
        <p className="text-sm text-black/40 dark:text-white/40 text-center py-8">
          No SLA items match your filters
        </p>
      )}

      {/* Table */}
      {!isLoading && sortedItems.length > 0 && (
        <Table
          aria-label="SLA Tracker"
          sortDescriptor={{ column: sortColumn, direction: sortDirection }}
          onSortChange={handleSort}
          className="w-full"
        >
          <TableHeader>
            <Column id="entity" isRowHeader>
              <span className="text-xs font-medium text-black/50 dark:text-white/50">Entity</span>
            </Column>
            <Column id="slaType" allowsSorting>
              <span className="text-xs font-medium text-black/50 dark:text-white/50">SLA Type</span>
            </Column>
            <Column id="deadline" allowsSorting>
              <span className="text-xs font-medium text-black/50 dark:text-white/50">Deadline</span>
            </Column>
            <Column id="remainingMs" allowsSorting>
              <span className="text-xs font-medium text-black/50 dark:text-white/50">Time Remaining</span>
            </Column>
            <Column id="status" allowsSorting>
              <span className="text-xs font-medium text-black/50 dark:text-white/50">Status</span>
            </Column>
          </TableHeader>
          <TableBody items={sortedItems}>
            {(item) => (
              <Row id={item.id} className="border-b border-[var(--color-border)] last:border-b-0">
                <Cell className="py-3 pe-4">
                  <div className="flex flex-col">
                    <span className="font-geist-mono text-[13px]">{item.entityRef}</span>
                    <span className="text-[11px] font-normal text-black/40 dark:text-white/40">
                      {item.entityType}
                    </span>
                  </div>
                </Cell>
                <Cell className="py-3 pe-4">
                  <span className="text-sm">{SLA_DURATIONS[item.slaType].label}</span>
                </Cell>
                <Cell className="py-3 pe-4">
                  <span className="font-geist-mono text-[13px]">
                    {formatDeadline(item.deadline)}
                  </span>
                </Cell>
                <Cell className="py-3 pe-4">
                  <span
                    className={`font-geist-mono text-[13px] ${getTimeRemainingColor(item.remainingMs, item.totalMs)}`}
                  >
                    {formatRemaining(item.remainingMs)}
                  </span>
                </Cell>
                <Cell className="py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[computeSLAStatus(item.remainingMs, item.totalMs)]}`}
                  >
                    {STATUS_LABEL[computeSLAStatus(item.remainingMs, item.totalMs)]}
                  </span>
                </Cell>
              </Row>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
