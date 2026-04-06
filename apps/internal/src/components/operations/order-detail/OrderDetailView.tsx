import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { ChevronLeft } from 'lucide-react'
import { useOperationsStore } from '../../../stores/operations'
import { getOrderDetail } from '../../../lib/server/operations-orders'
import { OrderProgressBar } from './OrderProgressBar'
import { OrderLineItems } from './OrderLineItems'
import { OrderActivityLog } from './OrderActivityLog'
import { OrderDocuments } from './OrderDocuments'
import { CrossModuleHandoff } from './CrossModuleHandoff'
import { OrderActions } from './OrderActions'

/**
 * Main order detail layout -- fetches order data and composes all sub-components.
 * Reads selectedOrderId from operations store.
 */
export function OrderDetailView() {
  const selectedOrderId = useOperationsStore((s) => s.selectedOrderId)
  const setSelectedOrderId = useOperationsStore((s) => s.setSelectedOrderId)
  const setActiveTab = useOperationsStore((s) => s.setActiveTab)

  const { data: order, isLoading } = useQuery({
    queryKey: ['getOrderDetail', selectedOrderId],
    queryFn: () => getOrderDetail({ data: { orderId: selectedOrderId! } }),
    enabled: !!selectedOrderId,
    staleTime: 30_000,
  })

  if (!selectedOrderId) return null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
      </div>
    )
  }

  if (!order) return null

  function handleBack() {
    setSelectedOrderId(null)
    setActiveTab('kanban')
  }

  // Format EGP value
  const formattedValue = new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
  }).format(order.totalValue)

  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const statusLabel = order.status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div className="relative flex flex-col gap-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          className="rounded-lg p-1.5 outline-none data-[hovered]:bg-black/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 dark:data-[hovered]:bg-white/10"
          onPress={handleBack}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-geist-mono text-lg font-semibold">{order.orderNumber}</h2>
        <span className="rounded-full bg-[#2563EB]/10 px-2.5 py-0.5 text-xs font-medium text-[#2563EB]">
          {statusLabel}
        </span>
      </div>

      {/* Cross-module handoff (expandable) */}
      <CrossModuleHandoff orderId={order.id} handoff={order.handoff} />

      {/* Info strip */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <span className="text-black/40 dark:text-white/40 text-xs">Customer</span>
            <p className="font-medium">{order.customerName}</p>
          </div>
          <div>
            <span className="text-black/40 dark:text-white/40 text-xs">Quote Ref</span>
            <p className="font-geist-mono font-medium">{order.quoteRef}</p>
          </div>
          <div>
            <span className="text-black/40 dark:text-white/40 text-xs">Total Value</span>
            <p className="font-geist-mono font-medium">{formattedValue}</p>
          </div>
          <div>
            <span className="text-black/40 dark:text-white/40 text-xs">Created</span>
            <p className="font-geist-mono font-medium">{formattedDate}</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <OrderProgressBar items={order.items} />
      </div>

      {/* Line items */}
      <OrderLineItems items={order.items} />

      {/* Documents */}
      <OrderDocuments documents={order.documents} />

      {/* Activity log */}
      <OrderActivityLog activityLog={order.activityLog} />

      {/* Floating action bar */}
      <OrderActions orderId={order.id} />
    </div>
  )
}
