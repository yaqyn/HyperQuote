import { GridList, GridListItem, useDragAndDrop } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { FulfillmentOrder, FulfillmentStage } from '../../../types/operations'
import { FulfillmentCard } from './FulfillmentCard'

interface FulfillmentColumnProps {
  stage: FulfillmentStage
  label: string
  count: number
  orders: FulfillmentOrder[]
  allOrders: FulfillmentOrder[]
  onDrop: (order: FulfillmentOrder, toStage: FulfillmentStage) => void
}

/**
 * Stage name as 10px uppercase + order count (mono) + thin top accent line
 * (blue for active/has orders, muted for idle/empty).
 */
export function FulfillmentColumn({
  stage,
  label,
  count,
  orders,
  allOrders,
  onDrop,
}: FulfillmentColumnProps) {
  const { t } = useTranslation('internal')
  const hasOrders = orders.length > 0

  const { dragAndDropHooks } = useDragAndDrop({
    acceptedDragTypes: ['fulfillment-order'],
    getItems(keys) {
      return [...keys].map((key) => ({
        'fulfillment-order': String(key),
        'text/plain': String(key),
      }))
    },
    onReorder() {
      // Reorder within column -- no-op
    },
    onInsert(e) {
      for (const item of e.items) {
        if (item.kind === 'text') {
          item.getText('fulfillment-order').then((orderId) => {
            const order = allOrders.find((o) => o.id === orderId)
            if (order && order.stage !== stage) {
              onDrop(order, stage)
            }
          })
        }
      }
    },
    onRootDrop(e) {
      for (const item of e.items) {
        if (item.kind === 'text') {
          item.getText('fulfillment-order').then((orderId) => {
            const order = allOrders.find((o) => o.id === orderId)
            if (order && order.stage !== stage) {
              onDrop(order, stage)
            }
          })
        }
      }
    },
  })

  return (
    <div className="flex min-w-[220px] flex-1 flex-col">
      {/* Thin accent line at top */}
      <div className={`h-0.5 rounded-full mb-3 ${
        hasOrders ? 'bg-[#2563EB]' : 'bg-black/8 dark:bg-white/8'
      }`} />

      {/* Column header */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
          {label}
        </span>
        <span className="font-[family-name:var(--font-geist-mono)] text-[11px] text-black/30 dark:text-white/30">
          {count}
        </span>
      </div>

      {/* Droppable card list */}
      <GridList
        aria-label={label}
        items={orders.map((o) => ({ ...o, key: o.id }))}
        dragAndDropHooks={dragAndDropHooks}
        renderEmptyState={() => (
          <div className="px-3 py-6 text-center text-[11px] text-black/20 dark:text-white/20">
            {t('operations.kanban.noOrders', 'No orders')}
          </div>
        )}
        className="flex-1 space-y-2 overflow-y-auto"
      >
        {(item) => (
          <GridListItem
            key={item.id}
            id={item.id}
            textValue={item.customerName}
            className="outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40 rounded-lg"
          >
            <FulfillmentCard order={item} />
          </GridListItem>
        )}
      </GridList>
    </div>
  )
}
