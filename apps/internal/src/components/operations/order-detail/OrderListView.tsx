import { useMemo, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { getOrderBoard } from '../../../lib/server/operations-orders'
import type { FulfillmentOrder } from '../../../types/operations'
import { useOperationsStore } from '../../../stores/operations'

// ─── Status Labels ───────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string; dot?: boolean }> = {
  confirmed: { label: 'Confirmed', className: 'text-[#2563EB]', dot: true },
  processing: { label: 'Processing', className: 'text-black/50 dark:text-white/50' },
  partially_fulfilled: { label: 'Partial', className: 'text-yellow-600 dark:text-yellow-400' },
  fulfilled: { label: 'Fulfilled', className: 'text-green-600 dark:text-green-400' },
  completed: { label: 'Completed', className: 'text-black/40 dark:text-white/40' },
  on_hold: { label: 'On Hold', className: 'text-yellow-600 dark:text-yellow-400' },
  cancellation_requested: { label: 'Cancel Req.', className: 'text-red-500' },
  cancelled: { label: 'Cancelled', className: 'text-black/40 dark:text-white/40' },
  back_ordered: { label: 'Back Ordered', className: 'text-yellow-600 dark:text-yellow-400' },
  // Fulfillment stage fallbacks (data uses stages, not OrderStatus)
  po_placed: { label: 'Processing', className: 'text-black/50 dark:text-white/50' },
  in_transit: { label: 'Processing', className: 'text-black/50 dark:text-white/50' },
  at_warehouse: { label: 'Processing', className: 'text-black/50 dark:text-white/50' },
  preparing: { label: 'Processing', className: 'text-black/50 dark:text-white/50' },
  out_for_delivery: { label: 'Fulfilled', className: 'text-green-600 dark:text-green-400' },
  delivered: { label: 'Completed', className: 'text-black/40 dark:text-white/40' },
}

// ─── Formatting ───────────────────────────────────────────

function formatEGP(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(value)
}

/** Relative time: "3 days in Processing" instead of just a date */
function formatRelativeStatus(eta: string, stage: string): string {
  const date = new Date(eta)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)
  const stageLabel = STATUS_CONFIG[stage]?.label ?? stage.replace(/_/g, ' ')

  if (diffDays <= 0) return `Today in ${stageLabel}`
  if (diffDays === 1) return `1 day in ${stageLabel}`
  return `${diffDays} days in ${stageLabel}`
}

/** Threshold for "needs action" — same status for > 2 days */
const STUCK_THRESHOLD_MS = 2 * 86_400_000

function isOrderStuck(eta: string): boolean {
  const date = new Date(eta)
  const now = new Date()
  return now.getTime() - date.getTime() > STUCK_THRESHOLD_MS
}

// ─── Filter Tabs ──────────────────────────────────────────

type FilterTab = 'all' | 'processing' | 'fulfilled' | 'on_hold' | 'completed'

/** Map fulfillment stages to logical filter groups */
function getOrderFilterGroup(order: FulfillmentOrder): FilterTab {
  switch (order.stage) {
    case 'po_placed':
    case 'in_transit':
    case 'at_warehouse':
    case 'preparing':
      return 'processing'
    case 'out_for_delivery':
      return 'fulfilled'
    case 'delivered':
      return 'completed'
    default:
      return 'processing'
  }
}

const TAB_FILTERS: Record<FilterTab, (order: FulfillmentOrder) => boolean> = {
  all: () => true,
  processing: (o) => getOrderFilterGroup(o) === 'processing',
  fulfilled: (o) => getOrderFilterGroup(o) === 'fulfilled',
  on_hold: () => false, // No mock data for on_hold yet — will match when real statuses exist
  completed: (o) => getOrderFilterGroup(o) === 'completed',
}

// ─── Component ────────────────────────────────────────────

export function OrderListView() {
  const selectedOrderId = useOperationsStore((s) => s.selectedOrderId)
  const setSelectedOrderId = useOperationsStore((s) => s.setSelectedOrderId)
  const { i18n } = useTranslation('internal')
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'

  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['order-list'],
    queryFn: () => getOrderBoard({ data: { page: 1, limit: 50 } }),
    staleTime: 30_000,
  })

  const allOrders = data?.orders ?? []
  const filteredOrders = useMemo(() => {
    const filterFn = TAB_FILTERS[activeTab]
    const filtered = allOrders.filter(filterFn)
    // Sort by urgency: oldest unactioned first (stuck orders surface to top)
    return [...filtered].sort((a, b) => {
      const aStuck = isOrderStuck(a.eta) ? 0 : 1
      const bStuck = isOrderStuck(b.eta) ? 0 : 1
      if (aStuck !== bStuck) return aStuck - bStuck
      // Within same urgency tier, oldest ETA first
      return new Date(a.eta).getTime() - new Date(b.eta).getTime()
    })
  }, [allOrders, activeTab])

  // J/K keyboard navigation
  const listRef = useRef<HTMLDivElement>(null)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'j' && e.key !== 'k') return
      e.preventDefault()

      if (filteredOrders.length === 0) return

      const currentIndex = filteredOrders.findIndex((o) => o.id === selectedOrderId)
      let nextIndex: number
      if (e.key === 'j') {
        nextIndex = currentIndex < filteredOrders.length - 1 ? currentIndex + 1 : 0
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : filteredOrders.length - 1
      }
      setSelectedOrderId(filteredOrders[nextIndex].id)
    },
    [selectedOrderId, filteredOrders, setSelectedOrderId],
  )

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'processing', label: 'Processing' },
    { id: 'fulfilled', label: 'Fulfilled' },
    { id: 'on_hold', label: 'On Hold' },
    { id: 'completed', label: 'Completed' },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[13px] text-black/40 dark:text-white/40">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-4 py-2.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`shrink-0 rounded-full px-3.5 py-1 text-[12px] font-medium outline-none transition-colors
              focus-visible:ring-2 focus-visible:ring-[#2563EB]/50
              ${
                activeTab === tab.id
                  ? 'bg-[#2563EB]/10 text-[#2563EB]'
                  : 'text-black/40 dark:text-white/40 hover:text-black/60 dark:hover:text-white/60'
              }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Order list */}
      <div
        ref={listRef}
        className="flex-1 overflow-auto focus:outline-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="listbox"
        aria-label="Orders"
      >
        {filteredOrders.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[13px] text-black/40 dark:text-white/40">No orders</p>
          </div>
        ) : (
          <div>
            {filteredOrders.map((order, i) => {
              const statusKey = order.stage
              const status = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.processing
              const stuck = isOrderStuck(order.eta)
              return (
                <motion.button
                  key={order.id}
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className={`
                    w-full flex items-center justify-between px-5 py-4 text-start outline-none transition-colors border-b border-black/[0.03] dark:border-white/[0.03]
                    focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2563EB]/50
                    ${order.id === selectedOrderId
                      ? 'bg-[#2563EB]/[0.04]'
                      : stuck
                        ? 'bg-red-500/[0.02] hover:bg-red-500/[0.04]'
                        : 'hover:bg-black/[0.015] dark:hover:bg-white/[0.015]'
                    }
                  `}
                  onClick={() => setSelectedOrderId(order.id)}
                  role="option"
                  aria-selected={order.id === selectedOrderId}
                >
                  {/* Left: Order info */}
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-[family-name:var(--font-geist-mono)] text-[14px] font-medium tabular-nums text-[#2563EB]">
                        {order.orderNumber}
                      </span>
                      <span className="text-[13px] text-black/50 dark:text-white/50 truncate">
                        {order.customerName}
                      </span>
                      {/* Needs action badge */}
                      {stuck && (
                        <span className="shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-600">
                          Needs action
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1.5 text-[12px] ${status.className}`}>
                        {status.dot && (
                          <span className="inline-block size-1.5 rounded-full bg-[#2563EB]" />
                        )}
                        {status.label}
                      </span>
                      {/* Relative time in status */}
                      <span className={`font-[family-name:var(--font-geist-mono)] text-[11px] ${
                        stuck ? 'text-red-500' : 'text-black/30 dark:text-white/30'
                      }`}>
                        {formatRelativeStatus(order.eta, order.stage)}
                      </span>
                    </div>
                  </div>

                  {/* Right: Amount */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="font-[family-name:var(--font-geist-mono)] text-[15px] font-semibold tabular-nums text-black dark:text-white">
                      {formatEGP(order.totalValue, locale)}
                    </span>
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
