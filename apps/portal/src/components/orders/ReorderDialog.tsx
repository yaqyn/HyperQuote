/**
 * Reorder confirmation dialog.
 * GlassElevated modal with Quick Submit and Edit First options.
 * isKeyboardDismissDisabled per accessibility contract.
 */
import {
  Dialog,
  Heading,
  Modal,
  ModalOverlay,
} from 'react-aria-components'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { submitReorder } from '../../lib/server/orders'
import { toast } from '../../lib/toast'

interface ReorderDialogProps {
  orderId: string
  orderRef: string
  itemCount: number
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function ReorderDialog({
  orderId,
  orderRef,
  itemCount,
  isOpen,
  onOpenChange,
}: ReorderDialogProps) {
  const { t } = useTranslation('portal')
  const navigate = useNavigate()
  const reorderMutation = useMutation({
    mutationFn: () => submitReorder({ data: { previousOrderId: orderId } }),
    onSuccess: () => {
      toast.success(t('orders.reorderSuccess', { ref: orderRef }))
      onOpenChange(false)
      navigate({ to: '/orders/new', search: { step: '2' } })
    },
  })

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <Modal isKeyboardDismissDisabled className="w-full max-w-md mx-4">
        <Dialog
          className="rounded-2xl bg-white/90 dark:bg-black/90 backdrop-blur-2xl p-6 outline-none shadow-xl"
          role="alertdialog"
        >
          {({ close }) => (
            <>
              <Heading
                slot="title"
                className="text-lg font-semibold text-[var(--color-text)] mb-4"
              >
                {t('orders.reorderConfirm', {
                  count: itemCount,
                  ref: orderRef,
                })}
              </Heading>

              <div className="flex gap-3 mt-6">
                <Button
                  onPress={() => {
                    onOpenChange(false)
                    navigate({
                      to: '/orders/new',
                      search: { reorder: orderId },
                    })
                  }}
                  className="flex-1 h-11 rounded-xl border border-[var(--color-primary)] text-[var(--color-primary)] text-sm font-medium cursor-pointer hover:bg-[var(--color-primary)]/5 transition-colors"
                >
                  {t('orders.editFirst')}
                </Button>

                <Button
                  onPress={() => reorderMutation.mutate()}
                  isDisabled={reorderMutation.isPending}
                  className="flex-1 h-11 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {reorderMutation.isPending
                    ? '...'
                    : t('orders.quickSubmit')}
                </Button>
              </div>
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
