import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import type {
  Quote,
  DeclineReason,
  RejectReason,
  CounterOfferPayload,
  PartialResponsePayload,
} from '../../types/quote'
import { useQuoteActionsStore } from '../../stores/quote-actions'
import {
  acceptQuote,
  rejectQuote,
  submitCounterOffer,
  submitPartialResponse,
} from '../../lib/server/quotes'
import { toast } from '../../lib/toast'
import { QuoteHeader } from './QuoteHeader'
import { QuoteTimeline } from './QuoteTimeline'
import { LineItemsTable } from './LineItemsTable'
import { SubtotalsSection } from './SubtotalsSection'
import { QuoteActionBar } from './QuoteActionBar'
import { AcceptConfirmModal } from './AcceptConfirmModal'
import { DeclineModal } from './DeclineModal'
import { ConfettiEffect } from './ConfettiEffect'
import { VersionHistory } from './VersionHistory'
import { VersionComparisonModal } from './VersionComparisonModal'
import { CounterOfferPanel } from './CounterOfferPanel'
import { FloatingChangesBar } from './FloatingChangesBar'
import { PartialAcceptControls } from './PartialAcceptControls'
import { PartialSummaryBar } from './PartialSummaryBar'

interface QuoteDetailProps {
  quote: Quote
}

/** Statuses where prices are NOT yet visible to the customer */
const EARLY_STATUSES = new Set([
  'draft',
  'internal_review',
  'pending_approval',
  'approved',
])

export function QuoteDetail({ quote }: QuoteDetailProps) {
  const { t } = useTranslation('portal')
  const navigate = useNavigate()
  const store = useQuoteActionsStore()
  const mode = useQuoteActionsStore((s) => s.mode)

  const [showAcceptModal, setShowAcceptModal] = useState(false)
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [showVersionCompare, setShowVersionCompare] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const showPricing = !EARLY_STATUSES.has(quote.status)
  const showActions = quote.status === 'sent'

  // Reset Zustand store on unmount
  useEffect(() => {
    return () => {
      useQuoteActionsStore.getState().reset()
    }
  }, [])

  // -- Mutations --

  const acceptMutation = useMutation({
    mutationFn: () => acceptQuote({ data: { quoteId: quote.id } }),
    onSuccess: (result) => {
      setShowConfetti(true)
      setShowAcceptModal(false)
      toast.success(t('quoteDetail.acceptSuccess'))
      navigate({ to: '/orders/$quoteId', params: { quoteId: quote.id } })
    },
  })

  const declineMutation = useMutation({
    mutationFn: (vars: { reason?: DeclineReason; notes?: string }) =>
      rejectQuote({ data: { quoteId: quote.id, reason: vars.reason, notes: vars.notes } }),
    onSuccess: () => {
      setShowDeclineModal(false)
      toast.success(t('quoteDetail.declineSuccess'))
      navigate({ to: '/orders' })
    },
  })

  const counterMutation = useMutation({
    mutationFn: () => {
      const s = useQuoteActionsStore.getState()
      const payload: CounterOfferPayload = {
        quoteId: quote.id,
        counterType: s.mode === 'counter-total' ? 'total' : 'per_line',
        totalDiscount: s.mode === 'counter-total' ? (s.totalDiscount ?? undefined) : undefined,
        lineItems: s.mode === 'counter-per-line'
          ? Object.entries(s.modifiedPrices).map(([itemId, newPrice]) => ({
              itemId,
              newPrice,
              newQuantity: s.modifiedQuantities[itemId],
            }))
          : undefined,
        selfPickup: s.selfPickup || undefined,
        notes: s.counterNotes || undefined,
      }
      return submitCounterOffer({ data: payload })
    },
    onSuccess: () => {
      useQuoteActionsStore.getState().reset()
      toast.success(t('quoteDetail.counterSuccess'))
    },
  })

  const partialMutation = useMutation({
    mutationFn: () => {
      const s = useQuoteActionsStore.getState()
      const payload: PartialResponsePayload = {
        quoteId: quote.id,
        lineResponses: Object.entries(s.lineDecisions).map(([itemId, decision]) => ({
          itemId,
          decision: decision as 'accepted' | 'rejected' | 'negotiate',
          rejectReason: s.rejectReasons[itemId] as RejectReason | undefined,
          negotiatedPrice: s.negotiatedPrices[itemId],
        })),
      }
      return submitPartialResponse({ data: payload })
    },
    onSuccess: () => {
      useQuoteActionsStore.getState().reset()
      toast.success(t('quoteDetail.submitPartialResponse'))
    },
  })

  // Empty state
  if (!quote || (quote.items.length === 0 && showPricing)) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Link
          to="/orders"
          className="flex items-center gap-2 text-sm text-[var(--color-primary)] hover:underline w-fit"
        >
          <ArrowLeft size={16} className="rtl:rotate-180" />
          {t('quoteDetail.backToOrders')}
        </Link>
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <p className="text-lg font-semibold text-[var(--color-text)]">
            {t('quoteDetail.emptyHeading')}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {t('quoteDetail.emptyBody')}
          </p>
        </div>
      </div>
    )
  }

  const isCounterMode = mode === 'counter-total' || mode === 'counter-per-line'
  const isPartialMode = mode === 'partial'

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Back link */}
      <Link
        to="/orders"
        className="flex items-center gap-2 text-sm text-[var(--color-primary)] hover:underline w-fit"
      >
        <ArrowLeft size={16} className="rtl:rotate-180" />
        {t('quoteDetail.backToOrders')}
      </Link>

      {/* Header */}
      <QuoteHeader
        reference={quote.quoteNumber}
        status={quote.status}
        createdAt={quote.createdAt}
        validUntil={quote.validUntil}
        daysRemaining={quote.daysRemaining}
        assignedRepName={quote.assignedRepName}
        assignedRepPhone={quote.assignedRepPhone}
      />

      {/* Timeline */}
      <QuoteTimeline steps={quote.timeline} />

      {/* Counter-offer panel */}
      {isCounterMode && (
        <CounterOfferPanel
          items={quote.items}
          originalSubtotal={quote.subtotal}
          originalTotal={quote.total}
        />
      )}

      {/* Line items */}
      {showPricing && (
        <LineItemsTable
          items={quote.items}
          editable={mode === 'counter-per-line'}
          onPriceChange={(itemId, price) => store.setItemPrice(itemId, price)}
          partialMode={isPartialMode}
          renderPartialControls={(item) => <PartialAcceptControls item={item} />}
        />
      )}

      {/* Subtotals */}
      {showPricing && (
        <SubtotalsSection
          subtotal={quote.subtotal}
          deliveryFee={quote.deliveryFee}
          taxAmount={quote.taxAmount}
          total={quote.total}
          paymentTerms={quote.paymentTerms}
          validUntil={quote.validUntil}
        />
      )}

      {/* Version history */}
      {quote.versions.length > 1 && (
        <VersionHistory
          versions={quote.versions}
          currentVersionId={quote.id}
          onCompare={() => setShowVersionCompare(true)}
        />
      )}

      {/* Action bar (view mode only) */}
      {showActions && mode === 'view' && (
        <QuoteActionBar
          status={quote.status}
          onAccept={() => setShowAcceptModal(true)}
          onCounter={() => store.setMode('counter-total')}
          onPartial={() => store.setMode('partial')}
          onDecline={() => setShowDeclineModal(true)}
          isAccepting={acceptMutation.isPending}
        />
      )}

      {/* Floating changes bar (counter per-line mode) */}
      {mode === 'counter-per-line' && (
        <FloatingChangesBar
          onDiscard={() => store.reset()}
          onSubmit={() => counterMutation.mutate()}
          isPending={counterMutation.isPending}
        />
      )}

      {/* Counter-offer total mode submit */}
      {mode === 'counter-total' && (
        <div className="sticky bottom-0 z-30 bg-[var(--color-surface)] border-t border-[var(--color-border)] p-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => store.reset()}
            className="border border-[var(--color-border)] text-[var(--color-text)] h-10 px-4 rounded-lg cursor-pointer text-sm"
          >
            {t('quoteDetail.discard')}
          </button>
          <button
            type="button"
            onClick={() => counterMutation.mutate()}
            disabled={counterMutation.isPending}
            className="bg-[var(--color-primary)] text-white h-10 px-6 rounded-lg cursor-pointer font-semibold text-sm disabled:opacity-50"
          >
            {t('quoteDetail.submitCounterOffer')}
          </button>
        </div>
      )}

      {/* Partial summary bar */}
      {isPartialMode && (
        <PartialSummaryBar
          onSubmit={() => partialMutation.mutate()}
          isPending={partialMutation.isPending}
          totalItems={quote.items.length}
        />
      )}

      {/* Modals */}
      <AcceptConfirmModal
        isOpen={showAcceptModal}
        onClose={() => setShowAcceptModal(false)}
        onConfirm={() => acceptMutation.mutate()}
        total={quote.total}
        paymentTerms={quote.paymentTerms}
        isPending={acceptMutation.isPending}
      />
      <DeclineModal
        isOpen={showDeclineModal}
        onClose={() => setShowDeclineModal(false)}
        onConfirm={(reason, notes) => declineMutation.mutate({ reason, notes })}
        isPending={declineMutation.isPending}
      />
      <VersionComparisonModal
        isOpen={showVersionCompare}
        onClose={() => setShowVersionCompare(false)}
        versions={quote.versions}
      />
      <ConfettiEffect isActive={showConfetti} />
    </div>
  )
}
