import { useState } from 'react'
import { Dialog, DialogTrigger, Modal, ModalOverlay, Button, TextArea, Heading } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { FulfillmentOrder } from '../../../types/operations'

interface DragConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  order: FulfillmentOrder
  fromStage: string
  toStage: string
  onConfirm: (notes: string) => void
  isPending?: boolean
}

export function DragConfirmDialog({
  isOpen,
  onClose,
  order,
  fromStage,
  toStage,
  onConfirm,
  isPending,
}: DragConfirmDialogProps) {
  const { t } = useTranslation('internal')
  const [notes, setNotes] = useState('')

  const handleConfirm = () => {
    onConfirm(notes)
    setNotes('')
  }

  const handleClose = () => {
    setNotes('')
    onClose()
  }

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) handleClose() }}
      isDismissable={false}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <Modal className="w-full max-w-md">
        <Dialog
          aria-label={t('operations.kanban.confirmMove', 'Confirm Stage Move')}
          isKeyboardDismissDisabled
          className="rounded-2xl border border-black/10 bg-white/90 p-6 shadow-xl outline-none backdrop-blur-2xl dark:border-white/10 dark:bg-black/90"
        >
          <Heading slot="title" className="mb-4 text-lg font-semibold">
            {t('operations.kanban.confirmMoveTitle', 'Confirm Stage Move')}
          </Heading>

          <p className="mb-4 text-sm text-black/60 dark:text-white/60">
            {t('operations.kanban.confirmMoveDescription', 'Move {{orderNumber}} from {{fromStage}} to {{toStage}}?', {
              orderNumber: order.orderNumber,
              fromStage,
              toStage,
            })}
          </p>

          <div className="mb-4">
            <label className="mb-1 block text-xs text-black/50 dark:text-white/50">
              {t('operations.kanban.notes', 'Notes (optional)')}
            </label>
            <TextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('operations.kanban.notesPlaceholder', 'Add notes about this transition...')}
              className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#2563EB] dark:border-white/10"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              onPress={handleClose}
              className="rounded-lg px-4 py-2 text-sm text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/5"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onPress={handleConfirm}
              isDisabled={isPending}
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]/90 disabled:opacity-50"
            >
              {isPending
                ? t('common.updating', 'Updating...')
                : t('common.confirm', 'Confirm')}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
