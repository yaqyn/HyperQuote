import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useOperationsStore } from '../../../stores/operations'
import { getOrderBoard, updateOrderStatus } from '../../../lib/server/operations-orders'
import { FULFILLMENT_COLUMNS } from '../../../types/operations'
import type { FulfillmentOrder, FulfillmentStage } from '../../../types/operations'
import { FulfillmentColumn } from './FulfillmentColumn'
import { KanbanFilters } from './KanbanFilters'
import { DragConfirmDialog } from './DragConfirmDialog'

interface PendingDrag {
  order: FulfillmentOrder
  fromStage: FulfillmentStage
  toStage: FulfillmentStage
}

export function FulfillmentKanban() {
  const { t } = useTranslation('internal')
  const kanbanFilters = useOperationsStore((s) => s.kanbanFilters)
  const queryClient = useQueryClient()
  const [pendingDrag, setPendingDrag] = useState<PendingDrag | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['order-board', kanbanFilters],
    queryFn: () => getOrderBoard({ data: { page: 1, limit: 50 } }),
    staleTime: 30_000,
  })

  const updateMutation = useMutation({
    mutationFn: (input: { orderId: string; status: string; notes?: string }) =>
      updateOrderStatus({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-board'] })
      setPendingDrag(null)
    },
  })

  const handleConfirm = (notes: string) => {
    if (!pendingDrag) return
    updateMutation.mutate({
      orderId: pendingDrag.order.id,
      status: pendingDrag.toStage,
      notes: notes || undefined,
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-black/40 dark:text-white/40">
          {t('common.loading', 'Loading...')}
        </p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-red-500">
          {t('common.error', 'Error loading board data')}
        </p>
      </div>
    )
  }

  // Filter orders client-side based on kanban filters
  let filteredOrders = data.orders
  if (kanbanFilters.customer) {
    const q = kanbanFilters.customer.toLowerCase()
    filteredOrders = filteredOrders.filter((o) =>
      o.customerName.toLowerCase().includes(q),
    )
  }
  if (kanbanFilters.status) {
    filteredOrders = filteredOrders.filter((o) => o.stage === kanbanFilters.status)
  }
  if (kanbanFilters.deliveryMethod) {
    // delivery method not on FulfillmentOrder currently -- filter pass-through
    filteredOrders = filteredOrders
  }

  return (
    <div className="flex h-full flex-col">
      <KanbanFilters />
      <div className="flex flex-1 gap-4 overflow-x-auto px-4 py-3">
        {FULFILLMENT_COLUMNS.map((col) => {
          const columnOrders = filteredOrders.filter((o) => o.stage === col.stage)
          const count = data.statusCounts[col.stage] ?? 0
          return (
            <FulfillmentColumn
              key={col.stage}
              stage={col.stage}
              label={col.label}
              count={count}
              orders={columnOrders}
              allOrders={filteredOrders}
              onDrop={(order, toStage) => {
                setPendingDrag({
                  order,
                  fromStage: order.stage,
                  toStage,
                })
              }}
            />
          )
        })}
      </div>

      {pendingDrag && (
        <DragConfirmDialog
          isOpen={true}
          onClose={() => setPendingDrag(null)}
          order={pendingDrag.order}
          fromStage={FULFILLMENT_COLUMNS.find((c) => c.stage === pendingDrag.fromStage)?.label ?? pendingDrag.fromStage}
          toStage={FULFILLMENT_COLUMNS.find((c) => c.stage === pendingDrag.toStage)?.label ?? pendingDrag.toStage}
          onConfirm={handleConfirm}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  )
}
