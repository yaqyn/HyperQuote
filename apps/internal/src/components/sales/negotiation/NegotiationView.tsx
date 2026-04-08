import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogTrigger,
  Modal,
  ModalOverlay,
  Heading,
} from 'react-aria-components'
import { Button } from '../../ui'
import { markAsWon } from '../../../lib/server/sales-pipeline'
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
  const [showAcceptCounterDialog, setShowAcceptCounterDialog] = useState(false)
  const [isAcceptingCounter, setIsAcceptingCounter] = useState(false)
  const [whatIfExpanded, setWhatIfExpanded] = useState(false)

  async function handleAcceptCounter() {
    setIsAcceptingCounter(true)
    try {
      await markAsWon({ data: { quoteId } })
      setShowAcceptCounterDialog(false)
      onMarkAsWon?.()
    } finally {
      setIsAcceptingCounter(false)
    }
  }

  function handleSelectVersion(versionId: string) {
    setSelectedVersions((prev: [string, string]) => {
      if (prev.includes(versionId)) return prev
      return [prev[1], versionId]
    })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top bar: Back + Actions — actions at the TOP, not buried */}
      <div className="shrink-0 border-b border-black/[0.06] px-5 py-3 dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-[13px] text-[var(--color-primary)] transition-colors hover:underline me-3"
            >
              {t('sales.negotiation.backToPipeline', 'Back to Pipeline')}
            </button>
          )}

          <Button
            variant="primary"
            onPress={() => setShowConvertDialog(true)}
          >
            {t('sales.negotiation.actions.markAsWon', 'Mark as Won')}
          </Button>

          <Button
            variant="outline"
            onPress={() => setShowAcceptCounterDialog(true)}
          >
            {t('sales.negotiation.actions.acceptCounter', 'Accept Counter')}
          </Button>

          <Button
            variant="outline"
            onPress={onReviseQuote}
          >
            {t('sales.negotiation.actions.reviseQuote', 'Revise Quote')}
          </Button>

          <div className="flex-1" />

          <Button
            variant="ghost"
            onPress={() => setShowLostDialog(true)}
          >
            {t('sales.negotiation.actions.markAsLost', 'Mark as Lost')}
          </Button>
        </div>
      </div>

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
          {/* Comparison + collapsible What-If */}
          <div className="flex min-h-0 flex-1">
            <div className={`flex flex-col overflow-hidden ${whatIfExpanded ? 'w-[60%]' : 'flex-1'}`}>
              <SideBySideComparison
                versionAId={selectedVersions[0]}
                versionBId={selectedVersions[1]}
              />
            </div>
            {whatIfExpanded ? (
              <div className="w-[40%] overflow-hidden border-s border-black/[0.06] dark:border-white/[0.06]">
                <WhatIfCalculator
                  quoteId={quoteId}
                  onApplyMargins={onReviseQuote}
                />
              </div>
            ) : (
              <div className="shrink-0 border-s border-black/[0.06] dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setWhatIfExpanded(true)}
                  className="h-full px-3 text-[11px] font-medium text-[var(--color-primary)] transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] [writing-mode:vertical-rl] rotate-180"
                >
                  {t('sales.negotiation.whatIfCalculator', 'What-If Calculator')}
                </button>
              </div>
            )}
          </div>

          {/* Negotiation Thread */}
          <NegotiationThread quoteId={quoteId} />
        </div>
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

      {/* Accept Counter Confirmation Dialog */}
      <DialogTrigger isOpen={showAcceptCounterDialog} onOpenChange={setShowAcceptCounterDialog}>
        <span />
        <ModalOverlay className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Modal className="w-full max-w-md rounded-2xl bg-white/90 shadow-2xl backdrop-blur-2xl dark:bg-black/90">
            <Dialog isKeyboardDismissDisabled className="p-6 outline-none">
              <Heading slot="title" className="text-[15px] font-semibold text-[var(--color-text)]">
                {t('sales.negotiation.acceptCounter.title', 'Accept Counter-Offer')}
              </Heading>
              <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-text-subtle)]">
                {t(
                  'sales.negotiation.acceptCounter.description',
                  "Accept the customer's counter-offer? This will update the quote with the counter-offer terms.",
                )}
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onPress={() => setShowAcceptCounterDialog(false)}
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  variant="primary"
                  onPress={handleAcceptCounter}
                  isDisabled={isAcceptingCounter}
                  className="flex items-center gap-2"
                >
                  {isAcceptingCounter && (
                    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                  {t('sales.negotiation.acceptCounter.confirm', 'Accept & Update Quote')}
                </Button>
              </div>
            </Dialog>
          </Modal>
        </ModalOverlay>
      </DialogTrigger>
    </div>
  )
}
