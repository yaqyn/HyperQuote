import { useState } from 'react'
import { Dialog, Modal, ModalOverlay, Button, TextArea, Heading } from 'react-aria-components'
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

/** Map target stage to consequence description for the ops manager */
const STAGE_CONSEQUENCES: Record<string, string> = {
  'PO Placed': 'Procurement will be notified to place the purchase order.',
  'In Transit from Supplier': 'Order will be tracked for supplier shipment arrival.',
  'At Warehouse': 'Warehouse team will be notified for receiving and QC.',
  'Preparing / Loading': 'Warehouse will begin picking and loading for delivery.',
  'Out for Delivery': 'Customer will be notified with delivery tracking.',
  'Delivered': 'Order will be marked complete. Customer will receive delivery confirmation.',
}

/**
 * Clean modal for confirming stage transitions.
 * Shows what changes (current -> next stage). Confirm button prominent.
 */
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <Modal className="w-full max-w-md">
        <Dialog
          aria-label={t('operations.kanban.confirmMove', 'Confirm Stage Move')}
          isKeyboardDismissDisabled
          className="rounded-2xl border border-black/8 bg-white/95 p-6 shadow-xl outline-none dark:border-white/8 dark:bg-black/95"
        >
          <Heading slot="title" className="text-[15px] font-semibold mb-5">
            {t('operations.kanban.confirmMoveTitle', 'Confirm Stage Move')}
          </Heading>

          {/* Transition visualization */}
          <div className="flex items-center gap-3 mb-5 py-3 px-4 rounded-lg bg-black/[0.03] dark:bg-white/[0.03]">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium uppercase tracking-wider text-black/35 dark:text-white/35">From</span>
              <span className="text-[13px] font-medium">{fromStage}</span>
            </div>
            <span className="text-black/20 dark:text-white/20 text-[13px]">&rarr;</span>
            <div className="flex flex-col">
              <span className="text-[10px] font-medium uppercase tracking-wider text-black/35 dark:text-white/35">To</span>
              <span className="text-[13px] font-medium text-[#2563EB]">{toStage}</span>
            </div>
          </div>

          {/* Order reference */}
          <p className="text-[13px] text-black/50 dark:text-white/50 mb-3">
            <span className="font-[family-name:var(--font-geist-mono)]">{order.orderNumber}</span>
            {' '}&middot;{' '}
            {order.customerName}
          </p>

          {/* Consequence — what happens next */}
          {STAGE_CONSEQUENCES[toStage] && (
            <div className="mb-4 rounded-lg bg-[#2563EB]/[0.04] border border-[#2563EB]/[0.08] px-3 py-2.5">
              <p className="text-[12px] text-black/60 dark:text-white/60">
                <span className="font-medium text-[#2563EB]">What happens:</span>{' '}
                {STAGE_CONSEQUENCES[toStage]}
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="mb-5">
            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-black/35 dark:text-white/35">
              {t('operations.kanban.notes', 'Notes (optional)')}
            </label>
            <TextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('operations.kanban.notesPlaceholder', 'Add notes about this transition...')}
              className="w-full rounded-lg border border-black/8 dark:border-white/8 bg-transparent px-3 py-2 text-[13px] outline-none
                focus:border-[#2563EB]/50 transition-colors resize-none"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              onPress={handleClose}
              className="rounded-lg px-4 py-2 text-[13px] text-black/50 dark:text-white/50
                data-[hovered]:bg-black/[0.04] dark:data-[hovered]:bg-white/[0.04] outline-none"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onPress={handleConfirm}
              isDisabled={isPending}
              className="rounded-lg bg-[#2563EB] px-5 py-2 text-[13px] font-medium text-white
                data-[hovered]:bg-[#2563EB]/90 data-[disabled]:opacity-40 outline-none
                data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 data-[focus-visible]:ring-offset-2"
            >
              {isPending
                ? t('common.updating', 'Moving...')
                : `Move to ${toStage}`}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
