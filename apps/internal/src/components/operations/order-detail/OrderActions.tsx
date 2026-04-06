import { useState } from 'react'
import { Button, Dialog, DialogTrigger, Modal, ModalOverlay, Heading, TextArea } from 'react-aria-components'
import { Calendar, Scissors, PauseCircle, XCircle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useOperationsStore } from '../../../stores/operations'
import { splitOrder, holdOrder, cancelOrder } from '../../../lib/server/operations-actions'

interface OrderActionsProps {
  orderId: string
}

/**
 * Floating action bar at bottom of order detail.
 * 4 buttons: Schedule Delivery, Split Delivery, Hold Order, Cancel Order.
 * Each destructive action has confirmation dialog with isKeyboardDismissDisabled.
 */
export function OrderActions({ orderId }: OrderActionsProps) {
  const setActiveTab = useOperationsStore((s) => s.setActiveTab)
  const queryClient = useQueryClient()

  const [holdReason, setHoldReason] = useState('')
  const [cancelReason, setCancelReason] = useState('')

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

  return (
    <div className="sticky bottom-0 flex gap-3 border-t border-[var(--color-border)] bg-[var(--color-card)] p-4">
      {/* Schedule Delivery -- navigates to delivery schedule tab */}
      <Button
        className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white
          outline-none data-[hovered]:bg-[#2563EB]/90 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 data-[focus-visible]:ring-offset-2"
        onPress={() => setActiveTab('delivery-schedule')}
      >
        <Calendar className="h-4 w-4" />
        Schedule Delivery
      </Button>

      {/* Split Delivery */}
      <DialogTrigger>
        <Button
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium
            outline-none data-[hovered]:bg-black/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
            dark:data-[hovered]:bg-white/10"
        >
          <Scissors className="h-4 w-4" />
          Split Delivery
        </Button>
        <ModalOverlay
          isDismissable
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <Modal className="w-full max-w-md">
            <Dialog
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 outline-none"
              isKeyboardDismissDisabled
            >
              {({ close }) => (
                <>
                  <Heading slot="title" className="text-base font-semibold mb-3">
                    Split Delivery
                  </Heading>
                  <p className="text-sm text-black/60 dark:text-white/60 mb-4">
                    This will split the order into multiple deliveries. Are you sure?
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button
                      className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm outline-none data-[hovered]:bg-black/5 dark:data-[hovered]:bg-white/10"
                      onPress={close}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white outline-none data-[hovered]:bg-[#2563EB]/90"
                      onPress={() => {
                        splitMutation.mutate()
                        close()
                      }}
                    >
                      Confirm Split
                    </Button>
                  </div>
                </>
              )}
            </Dialog>
          </Modal>
        </ModalOverlay>
      </DialogTrigger>

      {/* Hold Order */}
      <DialogTrigger>
        <Button
          className="inline-flex items-center gap-2 rounded-lg border border-yellow-300 px-4 py-2 text-sm font-medium text-yellow-700
            outline-none data-[hovered]:bg-yellow-50 data-[focus-visible]:ring-2 data-[focus-visible]:ring-yellow-500/50
            dark:border-yellow-700 dark:text-yellow-300 dark:data-[hovered]:bg-yellow-950/30"
        >
          <PauseCircle className="h-4 w-4" />
          Hold Order
        </Button>
        <ModalOverlay
          isDismissable
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <Modal className="w-full max-w-md">
            <Dialog
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 outline-none"
              isKeyboardDismissDisabled
            >
              {({ close }) => (
                <>
                  <Heading slot="title" className="text-base font-semibold mb-3">
                    Hold Order
                  </Heading>
                  <p className="text-sm text-black/60 dark:text-white/60 mb-3">
                    Provide a reason for placing this order on hold.
                  </p>
                  <TextArea
                    className="w-full rounded-lg border border-[var(--color-border)] bg-transparent p-3 text-sm outline-none focus:ring-2 focus:ring-[#2563EB]/50 resize-none"
                    rows={3}
                    placeholder="Reason for hold..."
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm outline-none data-[hovered]:bg-black/5 dark:data-[hovered]:bg-white/10"
                      onPress={close}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white outline-none data-[hovered]:bg-yellow-600"
                      onPress={() => {
                        holdMutation.mutate()
                        close()
                      }}
                      isDisabled={!holdReason.trim()}
                    >
                      Confirm Hold
                    </Button>
                  </div>
                </>
              )}
            </Dialog>
          </Modal>
        </ModalOverlay>
      </DialogTrigger>

      {/* Cancel Order */}
      <DialogTrigger>
        <Button
          className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700
            outline-none data-[hovered]:bg-red-50 data-[focus-visible]:ring-2 data-[focus-visible]:ring-red-500/50
            dark:border-red-700 dark:text-red-300 dark:data-[hovered]:bg-red-950/30"
        >
          <XCircle className="h-4 w-4" />
          Cancel Order
        </Button>
        <ModalOverlay
          isDismissable
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <Modal className="w-full max-w-md">
            <Dialog
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 outline-none"
              isKeyboardDismissDisabled
            >
              {({ close }) => (
                <>
                  <Heading slot="title" className="text-base font-semibold text-red-700 dark:text-red-400 mb-3">
                    Cancel Order
                  </Heading>
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 mb-3">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Warning: Cancellation may incur fees depending on fulfillment status. This action cannot be undone.
                    </p>
                  </div>
                  <TextArea
                    className="w-full rounded-lg border border-[var(--color-border)] bg-transparent p-3 text-sm outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                    rows={3}
                    placeholder="Reason for cancellation..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm outline-none data-[hovered]:bg-black/5 dark:data-[hovered]:bg-white/10"
                      onPress={close}
                    >
                      Keep Order
                    </Button>
                    <Button
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white outline-none data-[hovered]:bg-red-700"
                      onPress={() => {
                        cancelMutation.mutate()
                        close()
                      }}
                      isDisabled={!cancelReason.trim()}
                    >
                      Confirm Cancel
                    </Button>
                  </div>
                </>
              )}
            </Dialog>
          </Modal>
        </ModalOverlay>
      </DialogTrigger>
    </div>
  )
}
