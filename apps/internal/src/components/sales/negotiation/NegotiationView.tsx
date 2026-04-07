import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { VersionTimeline } from './VersionTimeline'
import { SideBySideComparison } from './SideBySideComparison'
import { WhatIfCalculator } from './WhatIfCalculator'
import { ConvertToOrderDialog } from './ConvertToOrderDialog'
import { NegotiationThread } from './NegotiationThread'
import { MarkAsLostDialog } from './MarkAsLostDialog'

// ─── Main Component ─────────────────────────────────────────

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
  const [showConvertDialog, setShowConvertDialog] = useState(false)

  function handleSelectVersion(versionId: string) {
    setSelectedVersions((prev) => {
      if (prev.includes(versionId)) return prev
      return [prev[1], versionId]
    })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Back */}
      {onBack && (
        <div className="border-b border-black/[0.06] px-5 py-2.5 dark:border-white/[0.06]">
          <button
            type="button"
            onClick={onBack}
            className="text-[13px] text-[var(--color-primary)] transition-colors hover:underline"
          >
            {t('sales.negotiation.backToPipeline', 'Back to Pipeline')}
          </button>
        </div>
      )}

      {/* Split layout: Timeline (narrow left) + Content (right) */}
      <div className="flex min-h-0 flex-1">
        {/* Version Timeline — vertical thread on the left */}
        <div className="w-[280px] shrink-0 overflow-y-auto border-e border-black/[0.06] dark:border-white/[0.06]">
          <VersionTimeline
            quoteId={quoteId}
            selectedVersions={selectedVersions}
            onSelectVersion={handleSelectVersion}
          />
        </div>

        {/* Main content area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Comparison + What-If */}
          <div className="flex min-h-0 flex-1">
            <div className="flex w-[60%] flex-col overflow-hidden">
              <SideBySideComparison
                versionAId={selectedVersions[0]}
                versionBId={selectedVersions[1]}
              />
            </div>
            <div className="w-[40%] overflow-hidden border-s border-black/[0.06] dark:border-white/[0.06]">
              <WhatIfCalculator
                quoteId={quoteId}
                onApplyMargins={onReviseQuote}
              />
            </div>
          </div>

          {/* Negotiation Thread */}
          <NegotiationThread quoteId={quoteId} />
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center gap-2 border-t border-black/[0.06] px-5 py-3 dark:border-white/[0.06]">
        <button
          type="button"
          onClick={onReviseQuote}
          className="rounded-full border border-black/[0.06] px-4 py-1.5 text-[13px] font-medium text-[var(--color-text)] transition-colors hover:bg-black/[0.02] dark:border-white/[0.06] dark:hover:bg-white/[0.02]"
        >
          {t('sales.negotiation.actions.reviseQuote', 'Revise Quote')}
        </button>
        <button
          type="button"
          className="rounded-full border border-black/[0.06] px-4 py-1.5 text-[13px] font-medium text-[var(--color-text)] transition-colors hover:bg-black/[0.02] dark:border-white/[0.06] dark:hover:bg-white/[0.02]"
        >
          {t('sales.negotiation.actions.acceptCounter', 'Accept Counter')}
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setShowConvertDialog(true)}
          className="rounded-full bg-[var(--color-primary)] px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[var(--color-primary)]/90"
        >
          {t('sales.negotiation.actions.markAsWon', 'Mark as Won')}
        </button>

        <button
          type="button"
          onClick={() => setShowLostDialog(true)}
          className="rounded-full bg-[var(--color-text)] px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[var(--color-text)]/90 dark:bg-white dark:text-black"
        >
          {t('sales.negotiation.actions.markAsLost', 'Mark as Lost')}
        </button>
      </div>

      {/* Dialogs */}
      <ConvertToOrderDialog
        quoteId={quoteId}
        isOpen={showConvertDialog}
        onOpenChange={setShowConvertDialog}
        onSuccess={(orderNumber) => {
          onMarkAsWon?.()
        }}
      />

      <MarkAsLostDialog
        quoteId={quoteId}
        isOpen={showLostDialog}
        onOpenChange={setShowLostDialog}
      />
    </div>
  )
}
