import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { useOperationsStore } from '../../../stores/operations'
import { getOrderDetail } from '../../../lib/server/operations-orders'
import { OrderProgressBar } from './OrderProgressBar'
import { OrderLineItems } from './OrderLineItems'
import { OrderActivityLog } from './OrderActivityLog'
import { OrderDocuments } from './OrderDocuments'
import { CrossModuleHandoff } from './CrossModuleHandoff'
import { OrderActions } from './OrderActions'

/**
 * Document-style layout. Header: order # (large mono) + customer + status flow dots + total.
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
      <div className="flex flex-col gap-6 px-5 py-6">
        <div className="h-10 w-48 animate-pulse rounded bg-black/5 dark:bg-white/5" />
        <div className="h-6 w-96 animate-pulse rounded bg-black/[0.03] dark:bg-white/[0.03]" />
        <div className="h-12 animate-pulse rounded-lg bg-black/[0.03] dark:bg-white/[0.03]" />
        <div className="h-48 animate-pulse rounded-lg bg-black/[0.03] dark:bg-white/[0.03]" />
      </div>
    )
  }

  if (!order) return null

  function handleBack() {
    setSelectedOrderId(null)
    setActiveTab('operations')
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

  // Determine if there's a pending handoff (not yet completed all stages)
  const hasPendingHandoff = order.handoff.completedStages.length < 5 // 6 stages total, current counts as pending
  const handoffBreached = order.handoff.timeInStage > order.handoff.slaMs

  // Determine the next action needed based on order status
  const nextAction = (() => {
    switch (order.status) {
      case 'confirmed': return 'Next step: Schedule delivery'
      case 'processing': return 'Next step: Track procurement progress'
      case 'partially_fulfilled': return 'Next step: Follow up on remaining items'
      case 'on_hold': return 'Action needed: Resolve hold reason to continue'
      case 'back_ordered': return 'Action needed: Source alternative supplier'
      case 'cancellation_requested': return 'Action needed: Review cancellation request'
      default: return null
    }
  })()

  return (
    <div className="relative flex flex-col gap-8 px-5 py-6 pb-28">
      {/* Header — order # large mono + back + status */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Button
              className="rounded-md p-1 outline-none data-[hovered]:bg-black/[0.04] dark:data-[hovered]:bg-white/[0.04]
                data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/40 -ms-1"
              onPress={handleBack}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-black/40 dark:text-white/40">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Button>
            <h2 className="font-[family-name:var(--font-geist-mono)] text-[22px] font-semibold tracking-tight">
              {order.orderNumber}
            </h2>
            <span className="rounded-md bg-[#2563EB]/8 px-2 py-0.5 text-[11px] font-medium text-[#2563EB]">
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Total value — large mono */}
        <span className="font-[family-name:var(--font-geist-mono)] text-[22px] font-semibold tracking-tight">
          {formattedValue}
        </span>
      </div>

      {/* Progress bar — status visualization */}
      <OrderProgressBar items={order.items} />

      {/* Action needed banner — prominent if order needs next step */}
      {nextAction && (
        <div className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
          order.status === 'on_hold' || order.status === 'cancellation_requested' || order.status === 'back_ordered'
            ? 'bg-red-500/[0.06] border border-red-500/10'
            : 'bg-[#2563EB]/[0.04] border border-[#2563EB]/[0.08]'
        }`}>
          <div className={`flex size-5 items-center justify-center rounded-full ${
            order.status === 'on_hold' || order.status === 'cancellation_requested' || order.status === 'back_ordered'
              ? 'bg-red-500/10'
              : 'bg-[#2563EB]/10'
          }`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={
              order.status === 'on_hold' || order.status === 'cancellation_requested' || order.status === 'back_ordered'
                ? 'text-red-600'
                : 'text-[#2563EB]'
            }>
              <path d="M6 3V6.5M6 8.5V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className={`text-[13px] font-medium ${
            order.status === 'on_hold' || order.status === 'cancellation_requested' || order.status === 'back_ordered'
              ? 'text-red-600'
              : 'text-[#2563EB]'
          }`}>
            {nextAction}
          </span>
        </div>
      )}

      {/* Cross-module handoff — at TOP when there's a pending/breached handoff */}
      {(hasPendingHandoff || handoffBreached) && (
        <CrossModuleHandoff orderId={order.id} handoff={order.handoff} />
      )}

      {/* Actions bar */}
      <OrderActions orderId={order.id} />

      {/* Info strip — horizontal key-value pairs */}
      <div className="flex flex-wrap gap-x-10 gap-y-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-black/35 dark:text-white/35">Customer</span>
          <span className="text-[14px] font-medium">{order.customerName}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-black/35 dark:text-white/35">Quote Ref</span>
          <span className="font-[family-name:var(--font-geist-mono)] text-[14px] font-medium">{order.quoteRef}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-black/35 dark:text-white/35">Created</span>
          <span className="font-[family-name:var(--font-geist-mono)] text-[14px] font-medium">{formattedDate}</span>
        </div>
      </div>

      {/* Line items */}
      <OrderLineItems items={order.items} />

      {/* Documents */}
      <OrderDocuments documents={order.documents} />

      {/* Cross-module handoff — full section when NOT pending (completed handoff history) */}
      {!hasPendingHandoff && !handoffBreached && (
        <CrossModuleHandoff orderId={order.id} handoff={order.handoff} />
      )}

      {/* Activity log */}
      <OrderActivityLog activityLog={order.activityLog} />
    </div>
  )
}
