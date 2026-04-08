import { useOperationsStore } from '../../../stores/operations'
import type { FulfillmentOrder } from '../../../types/operations'

interface FulfillmentCardProps {
  order: FulfillmentOrder
}

const formatETA = (eta: string) => {
  const date = new Date(eta)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / 86_400_000)
  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  return `${diffDays}d`
}

/** Check if ETA is overdue by more than 2 days (stuck indicator) */
function isStuck(eta: string): boolean {
  const date = new Date(eta)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  return diffMs > 2 * 86_400_000
}

/** Format how long an order has been in its current stage */
function formatStuckDuration(eta: string): string {
  const date = new Date(eta)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000)
  if (diffDays <= 0) return ''
  return `${diffDays}d stuck`
}

/**
 * Compact card — order # (mono) + customer name on line 1,
 * items count + deadline on line 2. Status dot. Stuck warning for > 2 days.
 */
export function FulfillmentCard({ order }: FulfillmentCardProps) {
  const setSelectedOrderId = useOperationsStore((s) => s.setSelectedOrderId)

  const handleSelect = () => {
    setSelectedOrderId(order.id)
  }

  // Status dot color from fulfillment color
  const dotColor = order.color === 'green'
    ? 'bg-green-500'
    : order.color === 'yellow'
      ? 'bg-yellow-500'
      : 'bg-red-500'

  const stuck = isStuck(order.eta)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleSelect()
        }
      }}
      className={`cursor-pointer rounded-lg border bg-white dark:bg-white/[0.03] px-3 py-2.5 transition-all
        hover:border-black/10 dark:hover:border-white/10 hover:shadow-sm group ${
          stuck
            ? 'border-red-500/20 bg-red-500/[0.02] dark:bg-red-500/[0.04]'
            : 'border-black/[0.06] dark:border-white/[0.06]'
        }`}
    >
      {/* Stuck warning banner */}
      {stuck && (
        <div className="flex items-center gap-1.5 mb-1.5 -mt-0.5">
          <div className="size-1.5 rounded-full bg-red-500 shrink-0" />
          <span className="font-[family-name:var(--font-geist-mono)] text-[10px] font-medium text-red-600">
            {formatStuckDuration(order.eta)}
          </span>
        </div>
      )}

      {/* Line 1: status dot + order # + customer */}
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
        <span className="font-[family-name:var(--font-geist-mono)] text-[12px] text-black/50 dark:text-white/50 shrink-0">
          {order.orderNumber}
        </span>
        <span className="text-[13px] font-medium truncate">
          {order.customerName}
        </span>
      </div>

      {/* Line 2: items count + ETA */}
      <div className="flex items-center justify-between ps-4">
        <span className="text-[11px] text-black/35 dark:text-white/35">
          {order.readyItems}/{order.totalItems} items
        </span>
        <span className={`font-[family-name:var(--font-geist-mono)] text-[11px] ${
          stuck ? 'text-red-500' : 'text-black/30 dark:text-white/30'
        }`}>
          {formatETA(order.eta)}
        </span>
      </div>
    </div>
  )
}
