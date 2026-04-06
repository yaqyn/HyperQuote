import type { OrderLineItem } from '../../../types/operations'

interface OrderProgressBarProps {
  items: OrderLineItem[]
}

/**
 * Visual fulfillment progress bar -- computes percentage from line items.
 * Shows "X% Complete" and "Y of Z items fulfilled" with blue fill bar.
 */
export function OrderProgressBar({ items }: OrderProgressBarProps) {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const fulfilledQuantity = items.reduce((sum, item) => sum + item.fulfilledQuantity, 0)
  const percentage = totalQuantity > 0 ? Math.round((fulfilledQuantity / totalQuantity) * 100) : 0

  return (
    <div className="flex items-center gap-4">
      <span className="font-geist-mono text-base font-medium whitespace-nowrap">
        {percentage}% Complete
      </span>
      <div className="flex-1 h-2 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#2563EB] transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-[13px] text-black/50 dark:text-white/50 whitespace-nowrap">
        <span className="font-geist-mono">{fulfilledQuantity}</span> of{' '}
        <span className="font-geist-mono">{totalQuantity}</span> items fulfilled
      </span>
    </div>
  )
}
