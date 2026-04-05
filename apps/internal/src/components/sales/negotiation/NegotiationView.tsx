import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogTrigger, Modal, ModalOverlay, Heading } from 'react-aria-components'
import { markAsLost } from '../../../lib/server/sales-pipeline'
import { VersionTimeline } from './VersionTimeline'
import { SideBySideComparison } from './SideBySideComparison'
import { NegotiationThread } from './NegotiationThread'

// ─── Loss Reason Dialog ──────────────────────────────────────

const LOSS_REASONS = [
  'lost_to_competitor',
  'price_too_high',
  'project_cancelled',
  'no_response',
  'other',
] as const

type LossReason = (typeof LOSS_REASONS)[number]

function MarkAsLostDialog({
  quoteId,
  onClose,
}: {
  quoteId: string
  onClose: () => void
}) {
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
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 space-y-4">
      <Heading slot="title" className="text-lg font-semibold">
        {t('sales.negotiation.markAsLost', 'Mark as Lost')}
      </Heading>

      <div className="space-y-3">
        <label className="block text-sm font-medium">
          {t('sales.negotiation.lossReason', 'Reason')}
        </label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as LossReason)}
          className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-sm"
        >
          {LOSS_REASONS.map((r) => (
            <option key={r} value={r}>
              {t(`sales.negotiation.lossReasons.${r}`, r.replace(/_/g, ' '))}
            </option>
          ))}
        </select>

        {reason === 'lost_to_competitor' && (
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('sales.negotiation.competitorName', 'Competitor Name')}
            </label>
            <input
              type="text"
              value={competitorName}
              onChange={(e) => setCompetitorName(e.target.value)}
              className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-sm"
              placeholder={t('sales.negotiation.competitorPlaceholder', 'e.g., Egyptian Steel Distribution')}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">
            {t('sales.negotiation.notes', 'Notes (optional)')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          {t('common.cancel', 'Cancel')}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg disabled:opacity-40 hover:bg-red-700 transition-colors"
        >
          {isSubmitting
            ? t('common.submitting', 'Submitting...')
            : t('sales.negotiation.confirmLost', 'Confirm Lost')}
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────

interface NegotiationViewProps {
  quoteId: string
  onReviseQuote?: () => void
  onMarkAsWon?: () => void
  onBack?: () => void
}

export function NegotiationView({
  quoteId,
  onReviseQuote,
  onMarkAsWon,
  onBack,
}: NegotiationViewProps) {
  const { t } = useTranslation('internal')
  const [selectedVersions, setSelectedVersions] = useState<[string, string]>([
    `${quoteId}-v1`,
    quoteId,
  ])
  const [showLostDialog, setShowLostDialog] = useState(false)

  function handleSelectVersion(versionId: string) {
    setSelectedVersions((prev) => {
      // If already selected, deselect (keep the other)
      if (prev.includes(versionId)) {
        return prev
      }
      // Replace the older selection (slot A) with current slot B, put new in slot B
      return [prev[1], versionId]
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Back button */}
      {onBack && (
        <div className="px-4 py-2 border-b border-black/10 dark:border-white/10">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-[#2563EB] hover:underline"
          >
            {t('sales.negotiation.backToPipeline', 'Back to Pipeline')}
          </button>
        </div>
      )}

      {/* Version Timeline */}
      <VersionTimeline
        quoteId={quoteId}
        selectedVersions={selectedVersions}
        onSelectVersion={handleSelectVersion}
      />

      {/* Main Content: Comparison (60%) + What-If Calculator placeholder (40%) */}
      <div className="flex-1 flex min-h-0">
        <div className="w-[60%] flex flex-col overflow-hidden">
          <SideBySideComparison
            versionAId={selectedVersions[0]}
            versionBId={selectedVersions[1]}
          />
        </div>
        <div className="w-[40%] border-s border-black/10 dark:border-white/10 flex items-center justify-center">
          <p className="text-sm text-black/40 dark:text-white/40">
            {t('sales.negotiation.whatIfCalculator', 'What-If Calculator')}
          </p>
        </div>
      </div>

      {/* Negotiation Thread */}
      <NegotiationThread quoteId={quoteId} />

      {/* Actions Bar */}
      <div className="px-4 py-3 border-t border-black/10 dark:border-white/10 flex items-center gap-3">
        <button
          type="button"
          onClick={onReviseQuote}
          className="px-4 py-2 text-sm font-medium border border-black/20 dark:border-white/20 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          {t('sales.negotiation.actions.reviseQuote', 'Revise Quote')}
        </button>
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium border border-black/20 dark:border-white/20 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          {t('sales.negotiation.actions.acceptCounter', 'Accept Customer Counter')}
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onMarkAsWon}
          className="px-4 py-2 text-sm font-medium bg-[#2563EB] text-white rounded-lg hover:bg-[#2563EB]/90 transition-colors"
        >
          {t('sales.negotiation.actions.markAsWon', 'Mark as Won')}
        </button>

        <DialogTrigger isOpen={showLostDialog} onOpenChange={setShowLostDialog}>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            {t('sales.negotiation.actions.markAsLost', 'Mark as Lost')}
          </button>
          <ModalOverlay
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          >
            <Modal className="backdrop-blur-2xl bg-white/90 dark:bg-black/90 rounded-2xl shadow-2xl w-full max-w-md">
              <Dialog className="outline-none">
                <MarkAsLostDialog
                  quoteId={quoteId}
                  onClose={() => setShowLostDialog(false)}
                />
              </Dialog>
            </Modal>
          </ModalOverlay>
        </DialogTrigger>
      </div>
    </div>
  )
}
