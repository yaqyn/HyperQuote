import { useState } from 'react'
import { Button as AriaButton, Dialog, DialogTrigger, Modal, ModalOverlay, Heading, TextArea } from 'react-aria-components'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { splitOrder, holdOrder, cancelOrder } from '../../../lib/server/operations-actions'
import { getOrderDetail } from '../../../lib/server/operations-orders'
import { Button } from '../../ui'
import { ScheduleDeliveryDialog } from './ScheduleDeliveryDialog'

interface OrderActionsProps {
  orderId: string
}

/**
 * Contextual action buttons based on current status. Horizontal bar, relevant actions only.
 * Sticky bottom. Clean, no colored borders on buttons — blue primary, ghost secondary.
 */
export function OrderActions({ orderId }: OrderActionsProps) {
  const queryClient = useQueryClient()

  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [holdReason, setHoldReason] = useState('')
  const [cancelReason, setCancelReason] = useState('')

  // Uses same query key as OrderDetailView — returns cached data instantly
  const { data: order } = useQuery({
    queryKey: ['getOrderDetail', orderId],
    queryFn: () => getOrderDetail({ data: { orderId } }),
    staleTime: 30_000,
  })

  function invalidateQueries() {
    queryClient.invalidateQueries({ queryKey: ['getOrderDetail'] })
    queryClient.invalidateQueries({ queryKey: ['getOrderBoard'] })
  }

  const splitMutation = useMutation({
    mutationFn: () =>
      splitOrder({
        data: {
          orderId,
          splits: [{ itemIds: [], deliveryDate: new Date().toISOString() }],
        },
      }),
    onSuccess: () => invalidateQueries(),
  })

  const holdMutation = useMutation({
    mutationFn: () => holdOrder({ data: { orderId, reason: holdReason } }),
    onSuccess: () => {
      setHoldReason('')
      invalidateQueries()
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder({ data: { orderId, reason: cancelReason } }),
    onSuccess: () => {
      setCancelReason('')
      invalidateQueries()
    },
  })

  // Determine the primary (next logical) action based on order status
  const primaryAction = (() => {
    const status = order?.status
    switch (status) {
      case 'confirmed':
      case 'processing':
      case 'partially_fulfilled':
        return 'schedule' as const
      case 'on_hold':
        return 'schedule' as const // resume by scheduling
      default:
        return 'schedule' as const
    }
  })()

  const PRIMARY_LABELS: Record<string, { label: string; consequence: string }> = {
    schedule: {
      label: 'Schedule Delivery',
      consequence: 'Customer will be notified of the delivery date',
    },
  }

  const primary = PRIMARY_LABELS[primaryAction]

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-black/[0.06] dark:border-white/[0.06] bg-white/90 dark:bg-black/90 px-5 py-3">
      {/* Primary action — prominent */}
      <div className="flex items-center gap-3">
        <Button variant="primary" onPress={() => setScheduleOpen(true)}>
          {primary.label}
        </Button>
        <span className="text-[11px] text-black/35 dark:text-white/35">
          {primary.consequence}
        </span>
      </div>

      {/* Secondary actions — ghost/subtle, grouped */}
      <div className="flex items-center gap-1 pt-1 border-t border-black/[0.04] dark:border-white/[0.04]">
        {/* Split Delivery */}
        <DialogTrigger>
          <Button variant="ghost" className="text-[12px]">
            Split Delivery
          </Button>
          <ModalOverlay
            isDismissable
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          >
            <Modal className="w-full max-w-md">
              <Dialog
                className="rounded-2xl border border-black/8 bg-white/95 p-6 outline-none dark:border-white/8 dark:bg-black/95"
                isKeyboardDismissDisabled
              >
                {({ close }) => (
                  <>
                    <Heading slot="title" className="text-[15px] font-semibold mb-4">
                      Split Delivery
                    </Heading>
                    <p className="text-[13px] text-black/50 dark:text-white/50 mb-3">
                      This will split the order into multiple deliveries with separate tracking.
                    </p>
                    <div className="rounded-lg bg-[#2563EB]/[0.04] border border-[#2563EB]/[0.08] px-3 py-2.5 mb-5">
                      <p className="text-[12px] text-black/60 dark:text-white/60">
                        <span className="font-medium text-[#2563EB]">What happens:</span>{' '}
                        Each split will generate a separate delivery schedule. Customer receives one notification per delivery.
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <AriaButton
                        className="rounded-lg px-4 py-2 text-[13px] text-black/50 dark:text-white/50 outline-none
                          data-[hovered]:bg-black/[0.04] dark:data-[hovered]:bg-white/[0.04]"
                        onPress={close}
                      >
                        Cancel
                      </AriaButton>
                      <AriaButton
                        className="rounded-lg bg-[#2563EB] px-4 py-2 text-[13px] font-medium text-white outline-none
                          data-[hovered]:bg-[#2563EB]/90"
                        onPress={() => {
                          splitMutation.mutate()
                          close()
                        }}
                      >
                        Confirm Split
                      </AriaButton>
                    </div>
                  </>
                )}
              </Dialog>
            </Modal>
          </ModalOverlay>
        </DialogTrigger>

        {/* Hold Order */}
        <DialogTrigger>
          <Button variant="ghost" className="text-[12px] text-black/40 dark:text-white/40 data-[hovered]:text-black/60 dark:data-[hovered]:text-white/60">
            Hold
          </Button>
          <ModalOverlay
            isDismissable
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          >
            <Modal className="w-full max-w-md">
              <Dialog
                className="rounded-2xl border border-black/8 bg-white/95 p-6 outline-none dark:border-white/8 dark:bg-black/95"
                isKeyboardDismissDisabled
              >
                {({ close }) => (
                  <>
                    <Heading slot="title" className="text-[15px] font-semibold mb-4">
                      Hold Order
                    </Heading>
                    <p className="text-[13px] text-black/50 dark:text-white/50 mb-3">
                      Provide a reason for placing this order on hold.
                    </p>
                    <div className="rounded-lg bg-yellow-500/[0.06] border border-yellow-500/10 px-3 py-2.5 mb-3">
                      <p className="text-[12px] text-black/60 dark:text-white/60">
                        <span className="font-medium text-yellow-600">What happens:</span>{' '}
                        Order processing pauses. All teams are notified. SLA timers pause until resumed.
                      </p>
                    </div>
                    <TextArea
                      className="w-full rounded-lg border border-black/8 dark:border-white/8 bg-transparent p-3 text-[13px] outline-none
                        focus:border-[#2563EB]/50 resize-none transition-colors"
                      rows={2}
                      placeholder="Reason for hold..."
                      value={holdReason}
                      onChange={(e) => setHoldReason(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 mt-4">
                      <AriaButton
                        className="rounded-lg px-4 py-2 text-[13px] text-black/50 dark:text-white/50 outline-none
                          data-[hovered]:bg-black/[0.04] dark:data-[hovered]:bg-white/[0.04]"
                        onPress={close}
                      >
                        Cancel
                      </AriaButton>
                      <AriaButton
                        className="rounded-lg bg-yellow-500 px-4 py-2 text-[13px] font-medium text-white outline-none
                          data-[hovered]:bg-yellow-600 data-[disabled]:opacity-40"
                        onPress={() => {
                          holdMutation.mutate()
                          close()
                        }}
                        isDisabled={!holdReason.trim()}
                      >
                        Confirm Hold
                      </AriaButton>
                    </div>
                  </>
                )}
              </Dialog>
            </Modal>
          </ModalOverlay>
        </DialogTrigger>

        {/* Cancel Order — pushed to end */}
        <div className="flex-1" />
        <DialogTrigger>
          <Button variant="ghost" className="text-[12px] text-black/30 dark:text-white/30 data-[hovered]:text-red-600 dark:data-[hovered]:text-red-400">
            Cancel Order
          </Button>
          <ModalOverlay
            isDismissable
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          >
            <Modal className="w-full max-w-md">
              <Dialog
                className="rounded-2xl border border-black/8 bg-white/95 p-6 outline-none dark:border-white/8 dark:bg-black/95"
                isKeyboardDismissDisabled
              >
                {({ close }) => (
                  <>
                    <Heading slot="title" className="text-[15px] font-semibold text-red-600 dark:text-red-400 mb-4">
                      Cancel Order
                    </Heading>
                    <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3 mb-4">
                      <p className="text-[13px] text-red-600 dark:text-red-400">
                        <span className="font-medium">What happens:</span>{' '}
                        Cancellation may incur fees depending on fulfillment status. Customer will be notified. This action cannot be undone.
                      </p>
                    </div>
                    <TextArea
                      className="w-full rounded-lg border border-black/8 dark:border-white/8 bg-transparent p-3 text-[13px] outline-none
                        focus:border-red-500/50 resize-none transition-colors"
                      rows={2}
                      placeholder="Reason for cancellation..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 mt-4">
                      <AriaButton
                        className="rounded-lg px-4 py-2 text-[13px] text-black/50 dark:text-white/50 outline-none
                          data-[hovered]:bg-black/[0.04] dark:data-[hovered]:bg-white/[0.04]"
                        onPress={close}
                      >
                        Keep Order
                      </AriaButton>
                      <AriaButton
                        className="rounded-lg bg-red-600 px-4 py-2 text-[13px] font-medium text-white outline-none
                          data-[hovered]:bg-red-700 data-[disabled]:opacity-40"
                        onPress={() => {
                          cancelMutation.mutate()
                          close()
                        }}
                        isDisabled={!cancelReason.trim()}
                      >
                        Confirm Cancel
                      </AriaButton>
                    </div>
                  </>
                )}
              </Dialog>
            </Modal>
          </ModalOverlay>
        </DialogTrigger>
      </div>

      {/* Schedule Delivery Dialog */}
      {order && (
        <ScheduleDeliveryDialog
          orderId={orderId}
          items={order.items}
          customerName={order.customerName}
          isOpen={scheduleOpen}
          onOpenChange={setScheduleOpen}
        />
      )}
    </div>
  )
}
