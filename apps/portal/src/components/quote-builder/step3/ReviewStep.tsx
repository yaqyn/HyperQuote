/**
 * Step 3: Review & Submit.
 * Read-only summary of quote request with edit links back to relevant steps.
 * Submit opens elevated glass confirmation modal with GlassElevated.
 */
import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogTrigger,
  Modal,
  ModalOverlay,
  Button,
} from 'react-aria-components'
import { motion, AnimatePresence } from 'motion/react'
import { Pencil, FileText, Info } from 'lucide-react'
import { GlassElevated } from '@hyperquote/ui'
import { useQuoteBuilderStore } from '../../../stores/quote-builder'
import { useQuoteSubmit } from '../../../hooks/useQuoteSubmit'
import { getCustomerAddresses } from '../../../lib/server/addresses'

// ============================================================================
// Component
// ============================================================================

interface ReviewStepProps {
  onSubmitSuccess: (data: { requestId: string; reference: string }) => void
}

export function ReviewStep({ onSubmitSuccess }: ReviewStepProps) {
  const { t } = useTranslation('portal')

  const items = useQuoteBuilderStore((s) => s.items)
  const deliveryAddressId = useQuoteBuilderStore((s) => s.deliveryAddressId)
  const deliveryDate = useQuoteBuilderStore((s) => s.deliveryDate)
  const notes = useQuoteBuilderStore((s) => s.notes)
  const attachments = useQuoteBuilderStore((s) => s.attachments)
  const projectId = useQuoteBuilderStore((s) => s.projectId)
  const setStep = useQuoteBuilderStore((s) => s.setStep)

  const { submit, isSubmitting, error: submitError, data: submitData } = useQuoteSubmit()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  // Fetch addresses to display the selected one
  const { data: addresses = [] } = useQuery({
    queryKey: ['customerAddresses'],
    queryFn: () => getCustomerAddresses(),
    staleTime: 10 * 60 * 1000,
  })

  const selectedAddress = addresses.find((a) => a.id === deliveryAddressId)

  const handleConfirmSubmit = useCallback(() => {
    setSubmitAttempted(true)
    submit(undefined, {
      onSuccess: (data) => {
        setIsModalOpen(false)
        onSubmitSuccess(data)
      },
      onError: () => {
        setIsModalOpen(false)
      },
    })
  }, [submit, onSubmitSuccess])

  const sectionHeaderClass =
    'flex items-center justify-between mb-3'
  const editLinkClass =
    'flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline cursor-pointer outline-none'

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-6 py-4">
      {/* Info banner */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-info-bg,rgba(37,99,235,0.08))] text-[var(--color-info,#2563EB)]">
        <Info size={18} className="shrink-0 mt-0.5" />
        <p className="text-sm">
          {t(
            'quoteBuilder.reviewInfoBanner',
            "Prices are not shown here. We'll prepare a quote for you.",
          )}
        </p>
      </div>

      {/* Items section */}
      <section>
        <div className={sectionHeaderClass}>
          <h3 className="text-sm font-semibold text-[var(--color-text)]">
            {t('quoteBuilder.reviewItems', 'Items')} (
            <span className="font-mono">{items.length}</span>)
          </h3>
          <Button onPress={() => setStep(1)} className={editLinkClass}>
            <Pencil size={14} />
            {t('quoteBuilder.edit', 'Edit')}
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <th className="text-start px-3 py-2 font-medium text-[var(--color-text-muted)] text-xs w-10">
                  #
                </th>
                <th className="text-start px-3 py-2 font-medium text-[var(--color-text-muted)] text-xs">
                  {t('quoteBuilder.reviewProduct', 'Product')}
                </th>
                <th className="text-start px-3 py-2 font-medium text-[var(--color-text-muted)] text-xs w-20">
                  {t('quoteBuilder.reviewQty', 'Qty')}
                </th>
                <th className="text-start px-3 py-2 font-medium text-[var(--color-text-muted)] text-xs w-20">
                  {t('quoteBuilder.reviewUom', 'UOM')}
                </th>
                <th className="text-start px-3 py-2 font-medium text-[var(--color-text-muted)] text-xs">
                  {t('quoteBuilder.reviewNotes', 'Notes')}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--color-border)] last:border-0"
                >
                  <td className="px-3 py-2 font-mono text-[var(--color-text-muted)]">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-text)]">
                    {item.customerDescription}
                  </td>
                  <td className="px-3 py-2 font-mono text-[var(--color-text)]">
                    {item.quantity}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-text-muted)]">
                    {item.unitOfMeasure}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-text-muted)]">
                    {item.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Delivery details section */}
      <section>
        <div className={sectionHeaderClass}>
          <h3 className="text-sm font-semibold text-[var(--color-text)]">
            {t('quoteBuilder.reviewDelivery', 'Delivery Details')}
          </h3>
          <Button onPress={() => setStep(2)} className={editLinkClass}>
            <Pencil size={14} />
            {t('quoteBuilder.edit', 'Edit')}
          </Button>
        </div>
        <div className="space-y-2 p-3 rounded-lg bg-[var(--color-surface)]">
          {selectedAddress && (
            <div>
              <span className="text-xs text-[var(--color-text-muted)]">
                {t('quoteBuilder.reviewAddress', 'Address')}
              </span>
              <p className="text-sm text-[var(--color-text)]">
                {selectedAddress.label && (
                  <span className="font-medium">{selectedAddress.label} - </span>
                )}
                {selectedAddress.street}, {selectedAddress.area},{' '}
                {selectedAddress.city}, {selectedAddress.governorate}
                {selectedAddress.landmark && ` (${selectedAddress.landmark})`}
              </p>
            </div>
          )}
          {deliveryDate && (
            <div>
              <span className="text-xs text-[var(--color-text-muted)]">
                {t('quoteBuilder.reviewDate', 'Preferred Date')}
              </span>
              <p className="text-sm font-mono text-[var(--color-text)]">
                {deliveryDate}
              </p>
            </div>
          )}
          {notes && (
            <div>
              <span className="text-xs text-[var(--color-text-muted)]">
                {t('quoteBuilder.reviewNotes', 'Notes')}
              </span>
              <p className="text-sm text-[var(--color-text)]">{notes}</p>
            </div>
          )}
        </div>
      </section>

      {/* Attachments section */}
      {attachments.length > 0 && (
        <section>
          <div className={sectionHeaderClass}>
            <h3 className="text-sm font-semibold text-[var(--color-text)]">
              {t('quoteBuilder.reviewAttachments', 'Attachments')} (
              <span className="font-mono">{attachments.length}</span>)
            </h3>
            <Button onPress={() => setStep(2)} className={editLinkClass}>
              <Pencil size={14} />
              {t('quoteBuilder.edit', 'Edit')}
            </Button>
          </div>
          <div className="space-y-1">
            {attachments.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center gap-2 p-2 rounded-lg bg-[var(--color-surface)] text-sm text-[var(--color-text)]"
              >
                <FileText size={14} className="text-[var(--color-text-muted)]" />
                {file.name}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Error message */}
      {submitAttempted && submitError && (
        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
          {t('quoteBuilder.errorToast', 'Failed to submit. Please try again.')}
        </div>
      )}

      {/* Navigation + Submit */}
      <div className="flex flex-col items-center gap-3 pt-4 border-t border-[var(--color-border)]">
        <Button
          onPress={() => setStep(2)}
          className="h-10 px-4 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer self-start"
        >
          {t('quoteBuilder.back', 'Back')}
        </Button>

        {/* Submit triggers confirmation modal */}
        <DialogTrigger isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
          <Button className="w-full max-w-[400px] h-[52px] rounded-xl bg-[var(--color-primary)] text-white font-semibold text-base shadow-sm hover:opacity-90 transition-opacity cursor-pointer">
            {t('quoteBuilder.submitQuoteRequest', 'Submit Quote Request')}
          </Button>

          <ModalOverlay className="fixed inset-0 z-50 flex items-center justify-center" isKeyboardDismissDisabled>
            <motion.div
              className="fixed inset-0 bg-black/30 dark:bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />
            <Modal className="relative z-10 outline-none" isKeyboardDismissDisabled>
              <Dialog className="outline-none">
                {({ close }) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      damping: 20,
                    }}
                    className="w-[90vw] max-w-md p-6 rounded-xl backdrop-blur-2xl bg-[rgba(255,255,255,0.92)] dark:bg-[rgba(0,0,0,0.92)] shadow-lg"
                  >
                    {/* Confirmation content */}
                    <h2 className="text-lg font-semibold text-[var(--color-text)] mb-2">
                      {t(
                        'quoteBuilder.confirmTitle',
                        'Submit quote request for {{count}} items?',
                        { count: items.length },
                      ).replace(
                        String(items.length),
                        '',
                      )}
                      <span className="font-mono">{items.length}</span>
                      {' '}
                      {t('quoteBuilder.confirmTitleItems', 'items?')}
                    </h2>
                    <p className="text-sm text-[var(--color-text-muted)] mb-6">
                      {t(
                        'quoteBuilder.confirmSubtitle',
                        "We'll prepare your quote within 4 hours.",
                      )}
                    </p>

                    <div className="flex items-center gap-3 justify-end">
                      <Button
                        onPress={close}
                        isDisabled={isSubmitting}
                        className="h-10 px-4 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
                      >
                        {t('quoteBuilder.keepEditing', 'Keep Editing')}
                      </Button>
                      <Button
                        onPress={handleConfirmSubmit}
                        isDisabled={isSubmitting}
                        className="h-10 px-4 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting
                          ? t('quoteBuilder.submitting', 'Submitting...')
                          : t('quoteBuilder.confirmSubmit', 'Confirm & Submit')}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </Dialog>
            </Modal>
          </ModalOverlay>
        </DialogTrigger>
      </div>
    </div>
  )
}
