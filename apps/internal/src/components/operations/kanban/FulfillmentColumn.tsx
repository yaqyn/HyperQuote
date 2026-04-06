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

export function FulfillmentColumn({
  stage,
  label,
  count,
  orders,
  allOrders,
  onDrop,
}: FulfillmentColumnProps) {
  const { t } = useTranslation('internal')

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
    <div className="flex min-w-[240px] flex-1 flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]/50 p-3">
      {/* Column header */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium">{label}</h3>
        <span className="rounded-full bg-black/5 px-2 py-0.5 font-[family-name:var(--font-geist-mono)] text-xs dark:bg-white/5">
          {count}
        </span>
      </div>

      {/* Droppable card list */}
      <GridList
        aria-label={label}
        items={orders.map((o) => ({ ...o, key: o.id }))}
        dragAndDropHooks={dragAndDropHooks}
        renderEmptyState={() => (
          <div className="px-3 py-4 text-center text-xs text-black/30 dark:text-white/30">
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
            className="outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-lg"
          >
            <FulfillmentCard order={item} />
          </GridListItem>
        )}
      </GridList>
    </div>
  )
}
