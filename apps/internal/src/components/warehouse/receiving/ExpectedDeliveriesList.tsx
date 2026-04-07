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
 * "The Dock" — Today's delivery timeline.
 * Each delivery: ETA (large mono) + supplier + PO number + item count.
 * Status dot. Sortable by ETA. Glanceable in 0.5 seconds.
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
  const timeFmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' })

  const handleCardPress = (delivery: ExpectedDelivery) => {
    setSelectedReceivingId(delivery.id)
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium text-black/40 dark:text-white/40 uppercase tracking-wider">
          {t('warehouse.receiving.title', 'Expected Deliveries')}
        </h2>
        {deliveries.length > 0 && (
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-bold text-black/90 dark:text-white/90">
            {deliveries.length}
          </span>
        )}
      </div>

      {/* Filter + unscheduled button */}
      <div className="flex items-center gap-3">
        <Select
          selectedKey={statusFilter}
          onSelectionChange={(key) => setStatusFilter(key as string)}
          className="flex-1"
        >
          <Label className="sr-only">
            {t('warehouse.receiving.filterStatus', 'Status')}
          </Label>
          <Button className="flex h-12 w-full items-center gap-2 rounded-lg border border-black/10 dark:border-white/10 px-4 text-sm cursor-pointer">
            <SelectValue />
          </Button>
          <Popover className="w-[--trigger-width] rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-lg">
            <ListBox className="p-1 outline-none">
              {STATUS_OPTIONS.map((opt) => (
                <ListBoxItem
                  key={opt.id}
                  id={opt.id}
                  className="flex h-12 cursor-pointer items-center rounded-md px-4 text-sm outline-none data-[focused]:bg-black/5 dark:data-[focused]:bg-white/5 data-[selected]:font-semibold"
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
          className="flex h-12 shrink-0 items-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-medium text-white cursor-pointer"
        >
          <Plus size={16} />
          {t('warehouse.receiving.unscheduled', 'Unscheduled')}
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/10 dark:border-white/10 border-t-[#2563EB]" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && deliveries.length === 0 && (
        <div className="flex items-center justify-center py-16 text-sm text-black/30 dark:text-white/30">
          {t('warehouse.receiving.noDeliveries', 'No expected deliveries')}
        </div>
      )}

      {/* Delivery timeline */}
      <div className="flex flex-col gap-1">
        {deliveries.map((delivery) => (
          <Button
            key={delivery.id}
            onPress={() => handleCardPress(delivery)}
            className="flex items-center gap-4 min-h-[72px] rounded-lg border border-black/5 dark:border-white/5 p-4 text-start cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
          >
            {/* ETA — large mono, the primary glanceable info */}
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xl font-bold text-black/90 dark:text-white/90 w-[72px] shrink-0">
              {timeFmt.format(new Date(delivery.eta))}
            </span>

            {/* Status dot */}
            <StatusDot status={delivery.status} />

            {/* Supplier + PO */}
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <span className="text-sm font-medium text-black/80 dark:text-white/80 truncate">
                {delivery.supplierName}
              </span>
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/40 dark:text-white/40">
                {delivery.poNumber}
              </span>
            </div>

            {/* Item count + dock */}
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-base font-semibold text-black/70 dark:text-white/70">
                {delivery.lineItemCount}
              </span>
              <span className="text-xs text-black/30 dark:text-white/30">
                {delivery.assignedDock}
              </span>
            </div>

            {/* Progress bar for in-progress deliveries */}
            {delivery.receivingProgress > 0 && delivery.receivingProgress < 100 && (
              <div className="absolute bottom-0 start-0 end-0 h-0.5 bg-black/5 dark:bg-white/5">
                <div
                  className="h-full bg-[#2563EB] transition-all"
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
