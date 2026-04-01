/**
 * Order/Quote card with reference, status badge, description, date, amount.
 * Geist Mono for all numbers. RTL-aware chevron.
 */
import { Button } from 'react-aria-components'
import { ChevronRight } from 'lucide-react'
import { StatusBadge } from '@hyperquote/ui'
import type { Order, OrderStatus } from '../../types/order'

/** Map OrderStatus to StatusBadge semantic variant */
function getStatusVariant(
  status: OrderStatus,
): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  switch (status) {
    case 'delivered':
    case 'order_confirmed':
      return 'success'
    case 'being_prepared':
    case 'negotiating':
      return 'warning'
    case 'expired':
    case 'cancelled':
      return 'error'
    case 'submitted':
    case 'out_for_delivery':
    case 'quote_ready':
      return 'info'
    default:
      return 'neutral'
  }
}

/** Human-readable status label */
function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    quote_ready: 'Quote Ready',
    negotiating: 'Negotiating',
    accepted: 'Accepted',
    order_confirmed: 'Confirmed',
    being_prepared: 'Being Prepared',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    expired: 'Expired',
    cancelled: 'Cancelled',
  }
  return labels[status] ?? status
}

/** Format amount as EGP with thousands separator */
function formatAmount(amount: number): string {
  return `EGP ${new Intl.NumberFormat('en-EG').format(amount)}`
}

interface OrderCardProps {
  order: Order
  onPress?: () => void
}

export function OrderCard({ order, onPress }: OrderCardProps) {
  const formattedDate = new Date(order.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <Button
      onPress={onPress}
      className="flex items-center justify-between w-full bg-[var(--color-base)] rounded-xl p-4 mb-3 border border-[var(--color-border)] text-start cursor-pointer transition-all duration-150 ease hover:border-[var(--color-primary)]/30 hover:-translate-y-px outline-none"
    >
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        {/* Row 1: Reference + Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm text-[var(--color-primary)]">
            {order.reference}
          </span>
          <StatusBadge status={getStatusVariant(order.status)}>
            {getStatusLabel(order.status)}
          </StatusBadge>
        </div>

        {/* Row 2: Item count + Description */}
        <p className="text-[13px] text-[var(--color-text-muted)] truncate">
          <span className="font-mono">{order.itemCount}</span> items
          {order.description ? ` \u00B7 ${order.description}` : ''}
        </p>

        {/* Row 3: Date + Amount */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-[var(--color-text-subtle)]">
            {formattedDate}
          </span>
          {order.amount != null && (
            <span className="font-mono text-sm text-[var(--color-text)]">
              {formatAmount(order.amount)}
            </span>
          )}
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight
        size={16}
        className="shrink-0 ms-3 text-[var(--color-text-subtle)] rtl:rotate-180"
      />
    </Button>
  )
}
