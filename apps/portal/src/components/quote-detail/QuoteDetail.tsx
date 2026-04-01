import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import type { Quote } from '../../types/quote'
import { QuoteHeader } from './QuoteHeader'
import { QuoteTimeline } from './QuoteTimeline'
import { LineItemsTable } from './LineItemsTable'
import { SubtotalsSection } from './SubtotalsSection'
import { QuoteActionBar } from './QuoteActionBar'

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

  const showPricing = !EARLY_STATUSES.has(quote.status)
  const showActions = quote.status === 'sent'

  // Empty state: no items and not in early status
  if (!quote || (quote.items.length === 0 && showPricing)) {
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

      {/* Line items -- only visible after quote is sent */}
      {showPricing && <LineItemsTable items={quote.items} />}

      {/* Subtotals -- same visibility as line items */}
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

      {/* Action bar -- only when status is 'sent' */}
      {showActions && (
        <QuoteActionBar
          status={quote.status}
          onAccept={() => {}}
          onCounter={() => {}}
          onPartial={() => {}}
          onDecline={() => {}}
        />
      )}
    </div>
  )
}
