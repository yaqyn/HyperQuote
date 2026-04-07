import { useState } from 'react'
import { Button, Dialog, DialogTrigger, Modal, ModalOverlay, Heading, TextArea } from 'react-aria-components'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useOperationsStore } from '../../../stores/operations'
import { splitOrder, holdOrder, cancelOrder } from '../../../lib/server/operations-actions'

interface OrderActionsProps {
  orderId: string
}

/**
 * Contextual action buttons based on current status. Horizontal bar, relevant actions only.
 * Sticky bottom. Clean, no colored borders on buttons — blue primary, ghost secondary.
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
    <div className="sticky bottom-0 flex items-center gap-2 border-t border-black/[0.06] dark:border-white/[0.06] bg-white/90 dark:bg-black/90 backdrop-blur-xl px-5 py-3">
      {/* Schedule Delivery — primary */}
      <Button
        className="rounded-lg bg-[#2563EB] px-4 py-2 text-[13px] font-medium text-white outline-none
          data-[hovered]:bg-[#2563EB]/90 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 data-[focus-visible]:ring-offset-2"
        onPress={() => setActiveTab('operations')}
      >
        Schedule Delivery
      </Button>

      {/* Split Delivery */}
      <DialogTrigger>
        <Button
          className="rounded-lg px-4 py-2 text-[13px] font-medium text-black/60 dark:text-white/60 outline-none
            data-[hovered]:bg-black/[0.04] dark:data-[hovered]:bg-white/[0.04]
            data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/40"
        >
          Split Delivery
        </Button>
        <ModalOverlay
          isDismissable
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <Modal className="w-full max-w-md">
            <Dialog
              className="rounded-2xl border border-black/8 bg-white/95 p-6 outline-none backdrop-blur-2xl dark:border-white/8 dark:bg-black/95"
              isKeyboardDismissDisabled
            >
              {({ close }) => (
                <>
                  <Heading slot="title" className="text-[15px] font-semibold mb-4">
                    Split Delivery
                  </Heading>
                  <p className="text-[13px] text-black/50 dark:text-white/50 mb-5">
                    This will split the order into multiple deliveries. Are you sure?
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button
                      className="rounded-lg px-4 py-2 text-[13px] text-black/50 dark:text-white/50 outline-none
                        data-[hovered]:bg-black/[0.04] dark:data-[hovered]:bg-white/[0.04]"
                      onPress={close}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="rounded-lg bg-[#2563EB] px-4 py-2 text-[13px] font-medium text-white outline-none
                        data-[hovered]:bg-[#2563EB]/90"
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
          className="rounded-lg px-4 py-2 text-[13px] font-medium text-yellow-700 dark:text-yellow-400 outline-none
            data-[hovered]:bg-yellow-500/8 data-[focus-visible]:ring-2 data-[focus-visible]:ring-yellow-500/30"
        >
          Hold
        </Button>
        <ModalOverlay
          isDismissable
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <Modal className="w-full max-w-md">
            <Dialog
              className="rounded-2xl border border-black/8 bg-white/95 p-6 outline-none backdrop-blur-2xl dark:border-white/8 dark:bg-black/95"
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
                  <TextArea
                    className="w-full rounded-lg border border-black/8 dark:border-white/8 bg-transparent p-3 text-[13px] outline-none
                      focus:border-[#2563EB]/50 resize-none transition-colors"
                    rows={2}
                    placeholder="Reason for hold..."
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      className="rounded-lg px-4 py-2 text-[13px] text-black/50 dark:text-white/50 outline-none
                        data-[hovered]:bg-black/[0.04] dark:data-[hovered]:bg-white/[0.04]"
                      onPress={close}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="rounded-lg bg-yellow-500 px-4 py-2 text-[13px] font-medium text-white outline-none
                        data-[hovered]:bg-yellow-600 data-[disabled]:opacity-40"
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

      {/* Cancel Order — pushed to end */}
      <div className="flex-1" />
      <DialogTrigger>
        <Button
          className="rounded-lg px-4 py-2 text-[13px] font-medium text-red-600 dark:text-red-400 outline-none
            data-[hovered]:bg-red-500/8 data-[focus-visible]:ring-2 data-[focus-visible]:ring-red-500/30"
        >
          Cancel Order
        </Button>
        <ModalOverlay
          isDismissable
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <Modal className="w-full max-w-md">
            <Dialog
              className="rounded-2xl border border-black/8 bg-white/95 p-6 outline-none backdrop-blur-2xl dark:border-white/8 dark:bg-black/95"
              isKeyboardDismissDisabled
            >
              {({ close }) => (
                <>
                  <Heading slot="title" className="text-[15px] font-semibold text-red-600 dark:text-red-400 mb-4">
                    Cancel Order
                  </Heading>
                  <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3 mb-4">
                    <p className="text-[13px] text-red-600 dark:text-red-400">
                      Cancellation may incur fees depending on fulfillment status. This action cannot be undone.
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
                    <Button
                      className="rounded-lg px-4 py-2 text-[13px] text-black/50 dark:text-white/50 outline-none
                        data-[hovered]:bg-black/[0.04] dark:data-[hovered]:bg-white/[0.04]"
                      onPress={close}
                    >
                      Keep Order
                    </Button>
                    <Button
                      className="rounded-lg bg-red-600 px-4 py-2 text-[13px] font-medium text-white outline-none
                        data-[hovered]:bg-red-700 data-[disabled]:opacity-40"
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
