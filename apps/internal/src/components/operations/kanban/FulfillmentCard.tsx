import { useOperationsStore } from '../../../stores/operations'
import { getFulfillmentColor } from '../../../types/operations'
import type { FulfillmentOrder } from '../../../types/operations'

interface FulfillmentCardProps {
  order: FulfillmentOrder
}

const formatValue = (value: number) =>
  new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatETA = (eta: string) => {
  const date = new Date(eta)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / 86_400_000)
  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  return `${diffDays}d`
}

export function FulfillmentCard({ order }: FulfillmentCardProps) {
  const setSelectedOrderId = useOperationsStore((s) => s.setSelectedOrderId)
  const setActiveTab = useOperationsStore((s) => s.setActiveTab)

  const handleSelect = () => {
    setSelectedOrderId(order.id)
    setActiveTab('order-detail')
  }

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
      className={`cursor-pointer rounded-lg border border-s-4 border-black/10 bg-white p-3 transition-shadow hover:shadow-md dark:border-white/10 dark:bg-black/40 ${getFulfillmentColor(order.color)}`}
    >
      {/* Order number */}
      <div className="mb-1 font-[family-name:var(--font-geist-mono)] text-xs font-medium text-black/60 dark:text-white/60">
        {order.orderNumber}
      </div>

      {/* Customer name */}
      <div className="mb-1 truncate text-sm font-medium">
        {order.customerName}
      </div>

      {/* Total value */}
      <div className="mb-2 font-[family-name:var(--font-geist-mono)] text-sm font-semibold">
        {formatValue(order.totalValue)}
      </div>

      {/* Bottom row: item readiness + ETA */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-black/50 dark:text-white/50">
          {order.readyItems} of {order.totalItems} items ready
        </span>
        <span className="font-[family-name:var(--font-geist-mono)] text-xs text-black/40 dark:text-white/40">
          {formatETA(order.eta)}
        </span>
      </div>
    </div>
  )
}
