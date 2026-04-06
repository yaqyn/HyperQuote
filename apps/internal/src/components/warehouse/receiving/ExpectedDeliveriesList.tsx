import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Button, Select, SelectValue, Popover, ListBox, ListBoxItem, Label } from 'react-aria-components'
import { Plus } from 'lucide-react'
import { getExpectedDeliveries } from '../../../lib/server/warehouse-receiving'
import { useWarehouseStore } from '../../../stores/warehouse'
import { StatusDot } from '../shared/StatusDot'
import type { DeliveryStatus, ExpectedDelivery } from '../../../types/warehouse'

const STATUS_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'in_transit', label: 'In Transit' },
  { id: 'arrived', label: 'Arrived' },
  { id: 'receiving', label: 'Receiving' },
  { id: 'complete', label: 'Complete' },
]

/**
 * Expected deliveries list per spec section 4.2.
 * Shows POs sorted by ETA with status dots, filters, and unscheduled delivery button.
 * Tap card -> navigates to ActiveReceivingStandard or ActiveReceivingBulk.
 */
export function ExpectedDeliveriesList() {
  const { t, i18n } = useTranslation('internal')
  const setSelectedReceivingId = useWarehouseStore((s) => s.setSelectedReceivingId)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['warehouse', 'expected-deliveries', statusFilter],
    queryFn: () =>
      getExpectedDeliveries({
        data: {
          status: statusFilter === 'all' ? undefined : statusFilter,
        },
      }),
    staleTime: 15_000,
  })

  const deliveries = data?.deliveries ?? []
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US'
  const dateFmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' })

  const handleCardPress = (delivery: ExpectedDelivery) => {
    setSelectedReceivingId(delivery.id)
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between gap-3">
        <Select
          selectedKey={statusFilter}
          onSelectionChange={(key) => setStatusFilter(key as string)}
          className="flex flex-col gap-1"
        >
          <Label className="text-xs font-medium text-black/50 dark:text-white/50">
            {t('warehouse.receiving.filterStatus', 'Status')}
          </Label>
          <Button className="flex items-center gap-2 rounded-lg border border-black/10 dark:border-white/10 px-3 py-2 text-sm cursor-pointer">
            <SelectValue />
          </Button>
          <Popover className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-lg">
            <ListBox className="p-1 outline-none">
              {STATUS_OPTIONS.map((opt) => (
                <ListBoxItem
                  key={opt.id}
                  id={opt.id}
                  className="rounded-md px-3 py-2 text-sm cursor-pointer outline-none data-[focused]:bg-[#2563EB]/10 data-[selected]:font-semibold"
                >
                  {t(`warehouse.receiving.status.${opt.id}`, opt.label)}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>

        <Button
          onPress={() => {
            // TODO: Open unscheduled delivery form
          }}
          className="flex items-center gap-1.5 rounded-lg border border-[#2563EB]/30 bg-[#2563EB]/5 px-3 py-2 text-sm font-medium text-[#2563EB] cursor-pointer hover:bg-[#2563EB]/10 transition-colors"
        >
          <Plus size={16} />
          {t('warehouse.receiving.unscheduled', 'Unscheduled Delivery')}
        </Button>
      </div>

      {/* Delivery cards */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 text-sm text-black/40 dark:text-white/40">
          {t('common.loading', 'Loading...')}
        </div>
      )}

      {!isLoading && deliveries.length === 0 && (
        <div className="flex items-center justify-center py-12 text-sm text-black/40 dark:text-white/40">
          {t('warehouse.receiving.noDeliveries', 'No expected deliveries')}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {deliveries.map((delivery) => (
          <Button
            key={delivery.id}
            onPress={() => handleCardPress(delivery)}
            className="flex flex-col gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4 text-start cursor-pointer transition-all hover:border-[#2563EB]/30 hover:bg-[#2563EB]/5 outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
          >
            {/* Header row: PO number + status */}
            <div className="flex items-center justify-between">
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-semibold text-black/90 dark:text-white/90">
                {delivery.poNumber}
              </span>
              <div className="flex items-center gap-2">
                <StatusDot status={delivery.status} />
                <span className="text-xs capitalize text-black/50 dark:text-white/50">
                  {t(`warehouse.receiving.status.${delivery.status}`, delivery.status.replace('_', ' '))}
                </span>
              </div>
            </div>

            {/* Supplier + truck type */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-black/70 dark:text-white/70">
                {delivery.supplierName}
              </span>
              <span className="text-xs text-black/40 dark:text-white/40 capitalize">
                {delivery.truckType}
              </span>
            </div>

            {/* ETA + line items + dock */}
            <div className="flex items-center justify-between text-xs text-black/50 dark:text-white/50">
              <span>
                {t('warehouse.receiving.eta', 'ETA')}:{' '}
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium text-black/70 dark:text-white/70">
                  {dateFmt.format(new Date(delivery.eta))}
                </span>
              </span>
              <span>
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                  {delivery.lineItemCount}
                </span>{' '}
                {t('warehouse.receiving.items', 'items')}
              </span>
              <span>{delivery.assignedDock}</span>
            </div>

            {/* Progress bar for receiving status */}
            {delivery.receivingProgress > 0 && delivery.receivingProgress < 100 && (
              <div className="h-1 w-full rounded-full bg-black/5 dark:bg-white/5">
                <div
                  className="h-full rounded-full bg-[#2563EB] transition-all"
                  style={{ width: `${delivery.receivingProgress}%` }}
                />
              </div>
            )}
          </Button>
        ))}
      </div>
    </div>
  )
}
