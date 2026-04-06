import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Select, SelectValue, Label, Button as AriaButton, ListBox, ListBoxItem, Popover } from 'react-aria-components'
import { getPickQueue } from '../../../lib/server/warehouse-picking'
import { useWarehouseStore } from '../../../stores/warehouse'
import type { PickOrder } from '../../../types/warehouse'

const PRIORITY_BORDER: Record<PickOrder['priority'], string> = {
  urgent: 'border-s-4 border-s-red-500',
  today: 'border-s-4 border-s-yellow-500',
  upcoming: 'border-s-4 border-s-green-500',
}

const PRIORITY_OPTIONS = [
  { id: 'all', label: 'All Priorities' },
  { id: 'urgent', label: 'Urgent (< 2h)' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Tomorrow+' },
] as const

/**
 * Pick queue — orders sorted by shipping deadline with priority colors.
 * Per spec section 4.6.
 */
export function PickQueue() {
  const setSelectedPickOrderId = useWarehouseStore((s) => s.setSelectedPickOrderId)
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['warehouse', 'pick-queue', priorityFilter],
    queryFn: () =>
      getPickQueue({
        data: {
          priority: priorityFilter === 'all' ? undefined : priorityFilter,
        },
      }),
    staleTime: 30_000,
  })

  const orders = data?.orders ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Pick Queue
        </h2>
        {orders.length > 0 && (
          <span className="text-sm text-[var(--color-text-secondary)]">
            <span className="font-mono">{orders.length}</span> orders
          </span>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex gap-3">
        <Select
          selectedKey={priorityFilter}
          onSelectionChange={(key) => setPriorityFilter(key as string)}
        >
          <Label className="sr-only">Priority filter</Label>
          <AriaButton className="flex h-10 min-h-[48px] items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 text-sm">
            <SelectValue />
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </AriaButton>
          <Popover className="w-[--trigger-width] rounded-lg border border-[var(--color-border)] bg-white shadow-lg">
            <ListBox className="p-1 outline-none">
              {PRIORITY_OPTIONS.map((opt) => (
                <ListBoxItem
                  key={opt.id}
                  id={opt.id}
                  className="flex h-10 min-h-[48px] cursor-pointer items-center rounded-md px-3 text-sm hover:bg-[var(--color-bg-hover)] outline-none data-[focused]:bg-[var(--color-bg-hover)]"
                >
                  {opt.label}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[#2563EB]" />
        </div>
      )}

      {!isLoading && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-base font-medium text-[var(--color-text-primary)]">
            No pick orders
          </p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            All orders have been picked
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {orders.map((order) => (
          <PickOrderCard
            key={order.id}
            order={order}
            onSelect={() => setSelectedPickOrderId(order.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Pick Order Card ─────────────────────────────────────

function PickOrderCard({
  order,
  onSelect,
}: {
  order: PickOrder
  onSelect: () => void
}) {
  const deadlineDate = new Date(order.shippingDeadline)
  const timeStr = deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = deadlineDate.toLocaleDateString([], { month: 'short', day: 'numeric' })

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col gap-2 rounded-lg border border-[var(--color-border)] p-4 text-start hover:bg-[var(--color-bg-hover)] transition-colors min-h-[48px] ${PRIORITY_BORDER[order.priority]}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-medium text-[var(--color-text-primary)]">
          {order.soNumber}
        </span>
        <span className="font-mono text-sm font-semibold text-[var(--color-text-primary)]">
          {timeStr}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--color-text-primary)]">
          {order.customerName}
        </span>
        <span className="text-xs text-[var(--color-text-secondary)]">
          {dateStr}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
        <span>{order.assignedTruck}</span>
        <span>{order.assignedRoute}</span>
        <span className="font-mono">{order.itemCount} items</span>
        <span className="font-mono font-semibold ms-auto">
          {(order.totalWeightKg / 1000).toFixed(1)}t
        </span>
      </div>
    </button>
  )
}
