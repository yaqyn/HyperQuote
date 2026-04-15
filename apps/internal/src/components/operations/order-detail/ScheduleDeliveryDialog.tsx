import { useState, useMemo } from 'react'
import { Dialog, Heading, Modal, ModalOverlay, Checkbox, Button as AriaButton } from 'react-aria-components'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, PillGroup, Pill, UnderlineTextArea } from '../../ui'
import { scheduleDelivery } from '../../../lib/server/operations-delivery'
import type { OrderLineItem } from '../../../types/operations'

interface ScheduleDeliveryDialogProps {
  orderId: string
  items: OrderLineItem[]
  customerName: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

const DELIVERY_WINDOWS = [
  { value: '08:00-12:00', label: '08:00 - 12:00' },
  { value: '12:00-17:00', label: '12:00 - 17:00' },
  { value: '08:00-17:00', label: '08:00 - 17:00' },
  { value: '00:00-06:00', label: '00:00 - 06:00 (night)' },
]

const FULFILLMENT_MODES = [
  { value: 'drop_ship', label: 'Drop-ship' },
  { value: 'own_delivery', label: 'Own delivery' },
  { value: 'cross_dock', label: 'Cross-dock' },
] as const

function getDefaultDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 3)
  return d.toISOString().split('T')[0]
}

export function ScheduleDeliveryDialog({
  orderId,
  items,
  customerName,
  isOpen,
  onOpenChange,
}: ScheduleDeliveryDialogProps) {
  const queryClient = useQueryClient()

  const [deliveryDate, setDeliveryDate] = useState(getDefaultDate)
  const [deliveryWindow, setDeliveryWindow] = useState('08:00-12:00')
  const [fulfillmentMode, setFulfillmentMode] = useState<'drop_ship' | 'own_delivery' | 'cross_dock'>('own_delivery')
  const [driverNotes, setDriverNotes] = useState('')

  // Track selected items and their delivery quantities
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((item: OrderLineItem) => [item.id, true]))
  )
  const [deliveryQuantities, setDeliveryQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(items.map((item: OrderLineItem) => [item.id, item.quantity]))
  )

  const includedItems = useMemo(
    () => items.filter((item) => selectedItems[item.id]),
    [items, selectedItems]
  )

  const totalIncludedCount = includedItems.length
  const estimatedWeight = useMemo(
    () => includedItems.reduce((sum: number, item: OrderLineItem) => sum + (deliveryQuantities[item.id] ?? 0) * 2.5, 0),
    [includedItems, deliveryQuantities]
  )

  const formattedDate = useMemo(() => {
    if (!deliveryDate) return '-'
    return new Date(deliveryDate + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }, [deliveryDate])

  const mutation = useMutation({
    mutationFn: () =>
      scheduleDelivery({
        data: {
          orderId,
          deliveryDate,
          deliveryWindow,
          fulfillmentMode,
          items: includedItems.map((item: OrderLineItem) => ({
            itemId: item.id,
            quantity: deliveryQuantities[item.id] ?? item.quantity,
          })),
          driverNotes: driverNotes.trim() || undefined,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getOrderDetail'] })
      queryClient.invalidateQueries({ queryKey: ['getDeliverySchedule'] })
      queryClient.invalidateQueries({ queryKey: ['getOrderBoard'] })
      onOpenChange(false)
    },
  })

  const canSchedule = totalIncludedCount > 0 && !!deliveryDate && !mutation.isPending

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <Modal className="w-full max-w-lg">
        <Dialog
          className="rounded-2xl border border-black/[0.06] bg-white/90 p-6 shadow-2xl outline-none dark:border-white/[0.06] dark:bg-black/90"
          isKeyboardDismissDisabled
        >
          {({ close }) => (
            <div className="flex flex-col gap-5">
              {/* Header */}
              <div>
                <Heading slot="title" className="text-[15px] font-semibold">
                  Schedule Delivery
                </Heading>
                <p className="mt-1 text-[12px] text-black/40 dark:text-white/40">
                  {customerName}
                </p>
              </div>

              {/* Delivery date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-black/35 dark:text-white/35">
                  Delivery date
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full border-b border-black/[0.04] bg-transparent py-1.5 font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums outline-none transition-colors
                    focus:border-black/[0.12] dark:border-white/[0.04] dark:focus:border-white/[0.12]"
                />
              </div>

              {/* Delivery window */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-black/35 dark:text-white/35">
                  Delivery window
                </label>
                <PillGroup
                  aria-label="Delivery window"
                  value={deliveryWindow}
                  onChange={(v) => setDeliveryWindow(v)}
                >
                  {DELIVERY_WINDOWS.map((w) => (
                    <Pill key={w.value} value={w.value} mono>
                      {w.label}
                    </Pill>
                  ))}
                </PillGroup>
              </div>

              {/* Fulfillment mode */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-black/35 dark:text-white/35">
                  Fulfillment mode
                </label>
                <PillGroup
                  aria-label="Fulfillment mode"
                  value={fulfillmentMode}
                  onChange={(v) => setFulfillmentMode(v as typeof fulfillmentMode)}
                >
                  {FULFILLMENT_MODES.map((m) => (
                    <Pill key={m.value} value={m.value}>
                      {m.label}
                    </Pill>
                  ))}
                </PillGroup>
              </div>

              {/* Items checklist */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-black/35 dark:text-white/35">
                  Items to include
                </label>
                <div className="flex flex-col gap-0.5 rounded-lg border border-black/[0.04] dark:border-white/[0.04] p-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors data-[hovered]:bg-black/[0.02] dark:data-[hovered]:bg-white/[0.02]"
                    >
                      <Checkbox
                        isSelected={!!selectedItems[item.id]}
                        onChange={(checked) =>
                          setSelectedItems((prev: Record<string, boolean>) => ({ ...prev, [item.id]: checked }))
                        }
                        className="group flex items-center"
                        aria-label={`Include ${item.productName}`}
                      >
                        <div className="flex size-4 items-center justify-center rounded border border-black/[0.12] transition-colors
                          group-data-[selected]:border-[#2563EB] group-data-[selected]:bg-[#2563EB]
                          dark:border-white/[0.12]">
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            fill="none"
                            className="opacity-0 group-data-[selected]:opacity-100"
                          >
                            <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </Checkbox>
                      <span className="flex-1 truncate text-[13px]">{item.productName}</span>
                      <span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-black/40 dark:text-white/40">
                        {item.quantity}
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={item.quantity}
                        value={deliveryQuantities[item.id] ?? item.quantity}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(item.quantity, Number(e.target.value) || 1))
                          setDeliveryQuantities((prev: Record<string, number>) => ({ ...prev, [item.id]: val }))
                        }}
                        disabled={!selectedItems[item.id]}
                        className="w-16 rounded border border-black/[0.06] bg-transparent px-2 py-0.5 text-end font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums outline-none transition-colors
                          focus:border-[#2563EB]/50 disabled:opacity-30
                          dark:border-white/[0.06]"
                        aria-label={`Delivery quantity for ${item.productName}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Driver notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-black/35 dark:text-white/35">
                  Driver notes
                </label>
                <UnderlineTextArea
                  value={driverNotes}
                  onChange={setDriverNotes}
                  placeholder="Optional instructions for the driver..."
                  label="Driver notes"
                  rows={2}
                />
              </div>

              {/* Summary */}
              <div className="flex items-center gap-4 rounded-lg bg-black/[0.02] px-3 py-2.5 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-black/35 dark:text-white/35">Items</span>
                  <span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums">
                    {totalIncludedCount}
                  </span>
                </div>
                <div className="h-6 w-px bg-black/[0.06] dark:bg-white/[0.06]" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-black/35 dark:text-white/35">Est. weight</span>
                  <span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums">
                    {new Intl.NumberFormat('en-EG').format(Math.round(estimatedWeight))} kg
                  </span>
                </div>
                <div className="h-6 w-px bg-black/[0.06] dark:bg-white/[0.06]" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-black/35 dark:text-white/35">Date</span>
                  <span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums">
                    {formattedDate}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <AriaButton
                  className="rounded-lg px-4 py-2 text-[13px] text-black/50 outline-none
                    data-[hovered]:bg-black/[0.04] dark:text-white/50 dark:data-[hovered]:bg-white/[0.04]"
                  onPress={close}
                >
                  Cancel
                </AriaButton>
                <AriaButton
                  className="rounded-lg bg-[#2563EB] px-4 py-2 text-[13px] font-medium text-white outline-none
                    data-[hovered]:bg-[#2563EB]/90 data-[disabled]:opacity-40"
                  isDisabled={!canSchedule}
                  onPress={() => mutation.mutate()}
                >
                  {mutation.isPending ? 'Scheduling...' : 'Schedule'}
                </AriaButton>
              </div>
            </div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
