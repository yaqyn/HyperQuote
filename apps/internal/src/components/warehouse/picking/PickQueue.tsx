import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Select, SelectValue, Label, Button as AriaButton, ListBox, ListBoxItem, Popover } from 'react-aria-components'
import { getPickQueue } from '../../../lib/server/warehouse-picking'
import { useWarehouseStore } from '../../../stores/warehouse'
import type { PickOrder } from '../../../types/warehouse'

const PRIORITY_OPTIONS = [
  { id: 'all', label: 'All Priorities' },
  { id: 'urgent', label: 'Urgent (< 2h)' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Tomorrow+' },
] as const

/**
 * Pick Queue — "The Route" list view.
 * Each order: order # (mono) + customer + items count + zone.
 * Status as horizontal progress bar (items picked / total).
 * Priority indicated by left border color (data-semantic only).
 */
export function PickQueue() {
  const { t } = useTranslation('internal')
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
    <div className="flex flex-col gap-5 px-6 py-4">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <h2 className="text-[14px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">
          Pick Queue
        </h2>
        {orders.length > 0 && (
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-bold text-black/90 dark:text-white/90">
            {orders.length}
          </span>
        )}
      </div>

      {/* Filter */}
      <Select
        selectedKey={priorityFilter}
        onSelectionChange={(key) => setPriorityFilter(key as string)}
      >
        <Label className="sr-only">Priority filter</Label>
        <AriaButton className="flex h-12 w-full items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 px-5 text-[14px] cursor-pointer">
          <SelectValue />
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </AriaButton>
        <Popover className="w-[--trigger-width] rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-lg">
          <ListBox className="p-1 outline-none">
            {PRIORITY_OPTIONS.map((opt) => (
              <ListBoxItem
                key={opt.id}
                id={opt.id}
                className="flex h-12 cursor-pointer items-center rounded-md px-4 text-sm outline-none data-[focused]:bg-black/5 dark:data-[focused]:bg-white/5"
              >
                {opt.label}
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      </Select>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/10 dark:border-white/10 border-t-[#2563EB]" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-black/40 dark:text-white/40">
            All orders have been picked
          </p>
        </div>
      )}

      {/* Top priority — prominent "Start Picking" CTA */}
      {orders.length > 0 && (
        <div className="flex flex-col gap-3">
          <PickOrderCard
            order={orders[0]}
            onSelect={() => setSelectedPickOrderId(orders[0].id)}
            isTopPriority
          />
        </div>
      )}

      {/* Remaining order cards */}
      {orders.length > 1 && (
        <div className="flex flex-col gap-3">
          {orders.slice(1).map((order) => (
            <PickOrderCard
              key={order.id}
              order={order}
              onSelect={() => setSelectedPickOrderId(order.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PickOrderCard({
  order,
  onSelect,
  isTopPriority = false,
}: {
  order: PickOrder
  onSelect: () => void
  isTopPriority?: boolean
}) {
  const { t } = useTranslation('internal')
  const deadlineDate = new Date(order.shippingDeadline)
  const timeStr = deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const priorityBorder =
    order.priority === 'urgent'
      ? 'border-s-red-500'
      : order.priority === 'today'
        ? 'border-s-amber-500'
        : 'border-s-green-500'

  // Progress bar
  const pickedCount = order.pickedItems ?? 0
  const progressPct = order.itemCount > 0 ? (pickedCount / order.itemCount) * 100 : 0

  return (
    <AriaButton
      onPress={onSelect}
      className={`flex flex-col gap-3 rounded-xl border border-black/10 dark:border-white/10 border-s-4 ${priorityBorder} px-6 py-5 text-start cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors min-h-[96px] outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50`}
    >
      {/* Row 1: Order # + deadline time */}
      <div className="flex items-center justify-between">
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[17px] font-bold text-black/90 dark:text-white/90">
          {order.soNumber}
        </span>
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[22px] font-bold text-black/90 dark:text-white/90">
          {timeStr}
        </span>
      </div>

      {/* Row 2: Customer + zone */}
      <div className="flex items-center justify-between">
        <span className="text-[16px] text-black/70 dark:text-white/70">
          {order.customerName}
        </span>
        <span className="text-[14px] text-black/40 dark:text-white/40">
          {order.assignedRoute}
        </span>
      </div>

      {/* Row 3: Items count + weight + progress bar */}
      <div className="flex items-center gap-4">
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[15px] font-medium text-black/60 dark:text-white/60">
          {order.itemCount} {t('warehouse.picking.items', 'items')}
        </span>
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[15px] font-semibold text-black/60 dark:text-white/60">
          {(order.totalWeightKg / 1000).toFixed(1)}t
        </span>
        {/* Progress bar */}
        <div className="flex-1 h-2.5 rounded-full bg-black/5 dark:bg-white/5">
          <div
            className="h-full rounded-full bg-[#2563EB] transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[14px] text-black/40 dark:text-white/40">
          {pickedCount}/{order.itemCount}
        </span>
      </div>

      {/* Top priority: prominent Start Picking CTA — HUGE for tablet */}
      {isTopPriority && (
        <div className="flex h-16 w-full items-center justify-center rounded-xl bg-[#2563EB] text-[17px] font-bold text-white mt-1">
          {t('warehouse.picking.startPicking', 'Start Picking')}
        </div>
      )}
    </AriaButton>
  )
}
