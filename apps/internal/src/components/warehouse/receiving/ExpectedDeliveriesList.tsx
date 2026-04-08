import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  Button,
  Select,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem,
  Label,
  Dialog,
  DialogTrigger,
  Modal,
  ModalOverlay,
  Heading,
} from 'react-aria-components'
import { Plus } from 'lucide-react'
import { getExpectedDeliveries } from '../../../lib/server/warehouse-receiving'
import { useWarehouseStore } from '../../../stores/warehouse'
import { UnderlineInput } from '../../ui/UnderlineInput'
import { Button as UiButton } from '../../ui/Button'
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
  const setActiveWorkflow = useWarehouseStore((s) => s.setActiveWorkflow)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [unscheduledOpen, setUnscheduledOpen] = useState(false)
  const [unscheduledForm, setUnscheduledForm] = useState<{
    supplierName: string
    truckPlate: string
    materialDescription: string
    estimatedWeight: string
  }>({
    supplierName: '',
    truckPlate: '',
    materialDescription: '',
    estimatedWeight: '',
  })

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

  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US'
  const timeFmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' })

  // Sort by ETA — soonest first (warehouse worker needs to know what's coming next)
  const deliveries = useMemo(() => {
    const raw = data?.deliveries ?? []
    return [...raw].sort((a, b) => new Date(a.eta).getTime() - new Date(b.eta).getTime())
  }, [data?.deliveries])

  // Tapping a delivery immediately starts receiving — no extra "Start Receiving" tap
  const handleCardPress = (delivery: ExpectedDelivery) => {
    setSelectedReceivingId(delivery.id)
  }

  return (
    <div className="flex flex-col gap-5 px-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">
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
          <Button className="flex h-12 w-full items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 px-5 text-[14px] cursor-pointer">
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

        <DialogTrigger isOpen={unscheduledOpen} onOpenChange={setUnscheduledOpen}>
          <Button
            className="flex h-12 shrink-0 items-center gap-2 rounded-xl bg-[#2563EB] px-5 text-[14px] font-semibold text-white cursor-pointer"
          >
            <Plus size={16} />
            {t('warehouse.receiving.unscheduled', 'Unscheduled')}
          </Button>
          <ModalOverlay className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
            <Modal className="w-full max-w-md rounded-t-2xl bg-white/90 dark:bg-black/90 backdrop-blur-2xl p-6 shadow-xl sm:rounded-2xl" isKeyboardDismissDisabled>
              <Dialog className="outline-none flex flex-col gap-5">
                <Heading slot="title" className="text-lg font-bold text-black/90 dark:text-white/90">
                  {t('warehouse.receiving.unscheduledDelivery', 'Unscheduled Delivery')}
                </Heading>
                <p className="text-xs text-black/40 dark:text-white/40">
                  {t('warehouse.receiving.unscheduledDesc', 'Log a delivery that was not on today\'s schedule.')}
                </p>

                <div className="flex flex-col gap-4">
                  <UnderlineInput
                    label={t('warehouse.receiving.supplierName', 'Supplier Name')}
                    placeholder={t('warehouse.receiving.supplierNamePlaceholder', 'e.g. Cairo Steel Co.')}
                    value={unscheduledForm.supplierName}
                    onChange={(v) => setUnscheduledForm((p) => ({ ...p, supplierName: v }))}
                  />
                  <UnderlineInput
                    label={t('warehouse.receiving.truckPlate', 'Truck Plate')}
                    placeholder={t('warehouse.receiving.truckPlatePlaceholder', 'e.g. ABC 1234')}
                    value={unscheduledForm.truckPlate}
                    onChange={(v) => setUnscheduledForm((p) => ({ ...p, truckPlate: v }))}
                  />
                  <UnderlineInput
                    label={t('warehouse.receiving.materialDescription', 'Material Description')}
                    placeholder={t('warehouse.receiving.materialDescPlaceholder', 'e.g. Steel Rebar 16mm')}
                    value={unscheduledForm.materialDescription}
                    onChange={(v) => setUnscheduledForm((p) => ({ ...p, materialDescription: v }))}
                  />
                  <UnderlineInput
                    label={t('warehouse.receiving.estimatedWeight', 'Estimated Weight (kg)')}
                    placeholder="0"
                    value={unscheduledForm.estimatedWeight}
                    onChange={(v) => setUnscheduledForm((p) => ({ ...p, estimatedWeight: v }))}
                    className="font-[family-name:var(--font-geist-mono)] tabular-nums"
                  />
                </div>

                <div className="flex gap-3 mt-2">
                  <UiButton
                    variant="outline"
                    onPress={() => setUnscheduledOpen(false)}
                    className="flex-1 h-12 flex items-center justify-center"
                  >
                    {t('common.cancel', 'Cancel')}
                  </UiButton>
                  <UiButton
                    variant="primary"
                    isDisabled={!unscheduledForm.supplierName || !unscheduledForm.materialDescription}
                    onPress={() => {
                      // Create a transient delivery ID and navigate to receiving flow
                      const unschedId = `unsched-${Date.now()}`
                      setActiveWorkflow({
                        type: 'unscheduled-receiving',
                        step: 0,
                        data: {
                          supplierName: unscheduledForm.supplierName,
                          truckPlate: unscheduledForm.truckPlate,
                          materialDescription: unscheduledForm.materialDescription,
                          estimatedWeight: unscheduledForm.estimatedWeight,
                        },
                      })
                      setUnscheduledOpen(false)
                      setUnscheduledForm({ supplierName: '', truckPlate: '', materialDescription: '', estimatedWeight: '' })
                      setSelectedReceivingId(unschedId)
                    }}
                    className="flex-1 h-12 flex items-center justify-center"
                  >
                    {t('warehouse.receiving.startReceiving', 'Start Receiving')}
                  </UiButton>
                </div>
              </Dialog>
            </Modal>
          </ModalOverlay>
        </DialogTrigger>
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
      <div className="flex flex-col gap-3">
        {deliveries.map((delivery) => (
          <Button
            key={delivery.id}
            onPress={() => handleCardPress(delivery)}
            className="relative flex items-center gap-4 min-h-[80px] rounded-xl border border-black/8 dark:border-white/8 px-6 py-4 text-start cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
          >
            {/* ETA — large mono, the primary glanceable info */}
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[22px] font-bold text-black/90 dark:text-white/90 w-[80px] shrink-0">
              {timeFmt.format(new Date(delivery.eta))}
            </span>

            {/* Status dot */}
            <StatusDot status={delivery.status} />

            {/* Supplier + PO */}
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <span className="text-[15px] font-semibold text-black/80 dark:text-white/80 truncate">
                {delivery.supplierName}
              </span>
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[13px] text-black/40 dark:text-white/40">
                {delivery.poNumber}
              </span>
            </div>

            {/* Item count + dock */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[18px] font-semibold text-black/70 dark:text-white/70">
                {delivery.lineItemCount}
              </span>
              <span className="text-[13px] text-black/30 dark:text-white/30">
                {delivery.assignedDock}
              </span>
            </div>

            {/* Progress bar for in-progress deliveries */}
            {delivery.receivingProgress > 0 && delivery.receivingProgress < 100 && (
              <div className="absolute bottom-0 start-0 end-0 h-1 bg-black/5 dark:bg-white/5 rounded-b-xl overflow-hidden">
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
