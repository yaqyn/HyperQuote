import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogTrigger,
  Modal,
  ModalOverlay,
  Heading,
} from 'react-aria-components'
import { AlertTriangle } from 'lucide-react'
import { markAsLost } from '../../../lib/server/sales-pipeline'

// ─── Types ──────────────────────────────────────────────────

const LOSS_REASONS = [
  'lost_to_competitor',
  'price_too_high',
  'project_cancelled',
  'no_response',
  'other',
] as const

type LossReason = (typeof LOSS_REASONS)[number]

// ─── Component ──────────────────────────────────────────────

interface MarkAsLostDialogProps {
  quoteId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function MarkAsLostDialog({
  quoteId,
  isOpen,
  onOpenChange,
  onSuccess,
}: MarkAsLostDialogProps) {
  const { t } = useTranslation('internal')
  const [reason, setReason] = useState<LossReason>('lost_to_competitor')
  const [competitorName, setCompetitorName] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      await markAsLost({
        data: {
          quoteId,
          lossReason: reason,
          competitorName: competitorName || undefined,
        },
      })
      onOpenChange(false)
      onSuccess?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <span />
      <ModalOverlay className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <Modal className="w-full max-w-md rounded-2xl bg-white/90 shadow-2xl backdrop-blur-2xl dark:bg-black/90">
          <Dialog isKeyboardDismissDisabled className="p-6 outline-none">
            {/* Header with small warning icon -- NOT red-themed */}
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="size-4 text-[var(--color-text-muted)]" />
              <Heading slot="title" className="text-[15px] font-semibold text-[var(--color-text)]">
                {t('sales.negotiation.markAsLost', 'Mark as Lost')}
              </Heading>
            </div>

            <div className="mt-5 space-y-4">
              {/* Reason */}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-text)]">
                  {t('sales.negotiation.lossReason', 'Reason')}
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as LossReason)}
                  className="w-full rounded-lg border border-black/[0.06] bg-transparent px-3 py-2 text-[13px] text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] dark:border-white/[0.06]"
                >
                  {LOSS_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {t(`sales.negotiation.lossReasons.${r}`, r.replace(/_/g, ' '))}
                    </option>
                  ))}
                </select>
              </div>

              {/* Competitor Name */}
              {reason === 'lost_to_competitor' && (
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-text)]">
                    {t('sales.negotiation.competitorName', 'Competitor')}
                  </label>
                  <input
                    type="text"
                    value={competitorName}
                    onChange={(e) => setCompetitorName(e.target.value)}
                    className="w-full rounded-lg border border-black/[0.06] bg-transparent px-3 py-2 text-[13px] text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] dark:border-white/[0.06]"
                    placeholder={t('sales.negotiation.competitorPlaceholder', 'e.g., Egyptian Steel Distribution')}
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-text)]">
                  {t('sales.negotiation.notes', 'Notes')}
                  <span className="ms-1 text-[11px] text-[var(--color-text-subtle)]">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-black/[0.06] bg-transparent px-3 py-2 text-[13px] text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] dark:border-white/[0.06]"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-full px-4 py-2 text-[13px] font-medium text-[var(--color-text-muted)] transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="rounded-full bg-[var(--color-text)] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[var(--color-text)]/90 disabled:opacity-40 dark:bg-white dark:text-black"
              >
                {isSubmitting
                  ? t('common.submitting', 'Submitting...')
                  : t('sales.negotiation.confirmLost', 'Confirm Lost')}
              </button>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  )
}
