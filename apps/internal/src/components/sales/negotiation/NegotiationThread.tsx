import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { addInternalNote } from '../../../lib/server/sales-activity'

// ─── Types ──────────────────────────────────────────────────

interface NegotiationEvent {
  id: string
  type: 'quote_sent' | 'counter_offer' | 'internal_note' | 'system_event'
  description: string
  timestamp: string
  isInternal: boolean
  metadata?: {
    method?: string
    proposedPrices?: { item: string; price: number }[]
    viewCount?: number
  }
}

// ─── Mock Data ──────────────────────────────────────────────

function getMockEvents(): NegotiationEvent[] {
  return [
    {
      id: 'ev-1',
      type: 'quote_sent',
      description: 'Quote QT-2026-00523 v1 sent via portal and email',
      timestamp: new Date(Date.now() - 7 * 86_400_000).toISOString(),
      isInternal: false,
      metadata: { method: 'portal + email' },
    },
    {
      id: 'ev-2',
      type: 'system_event',
      description: 'Quote viewed 3 times by customer',
      timestamp: new Date(Date.now() - 6 * 86_400_000).toISOString(),
      isInternal: false,
      metadata: { viewCount: 3 },
    },
    {
      id: 'ev-3',
      type: 'counter_offer',
      description: 'Customer counter-offer received: Steel Rebar at EGP 3,550/bundle, Cement at EGP 54/bag',
      timestamp: new Date(Date.now() - 5 * 86_400_000).toISOString(),
      isInternal: false,
      metadata: {
        proposedPrices: [
          { item: 'Steel Rebar 16mm', price: 3_550 },
          { item: 'Portland Cement', price: 54 },
        ],
      },
    },
    {
      id: 'ev-4',
      type: 'internal_note',
      description: 'Customer is comparing with competitor quote from Egyptian Steel. Their price is ~EGP 3,480 for rebar. We can match at EGP 3,600 with volume commitment.',
      timestamp: new Date(Date.now() - 4.5 * 86_400_000).toISOString(),
      isInternal: true,
    },
    {
      id: 'ev-5',
      type: 'quote_sent',
      description: 'Revised quote v2 sent via portal',
      timestamp: new Date(Date.now() - 4 * 86_400_000).toISOString(),
      isInternal: false,
      metadata: { method: 'portal' },
    },
    {
      id: 'ev-6',
      type: 'system_event',
      description: 'Quote expiring in 2 days',
      timestamp: new Date(Date.now() - 1 * 86_400_000).toISOString(),
      isInternal: false,
    },
  ]
}

// ─── Component ──────────────────────────────────────────────

interface NegotiationThreadProps {
  quoteId: string
}

export function NegotiationThread({ quoteId }: NegotiationThreadProps) {
  const { t } = useTranslation('internal')
  const [events, setEvents] = useState(getMockEvents)
  const [noteText, setNoteText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleAddNote() {
    if (!noteText.trim() || isSubmitting) return
    setIsSubmitting(true)

    try {
      const result = await addInternalNote({
        data: { entityType: 'quote', entityId: quoteId, note: noteText },
      })

      setEvents((prev) => [
        ...prev,
        {
          id: result.noteId,
          type: 'internal_note' as const,
          description: noteText,
          timestamp: new Date().toISOString(),
          isInternal: true,
        },
      ])
      setNoteText('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="border-t border-black/[0.06] dark:border-white/[0.06]">
      <div className="border-b border-black/[0.06] px-5 py-3 dark:border-white/[0.06]">
        <h3 className="text-[13px] font-semibold text-[var(--color-text)]">
          {t('sales.negotiation.thread', 'Negotiation Thread')}
        </h3>
      </div>

      {/* Chat-bubble style messages */}
      <div className="max-h-80 space-y-3 overflow-y-auto px-5 py-4">
        {events.map((event) => {
          // Internal notes = our side (end-aligned), external = customer side (start-aligned)
          const isOurs = event.isInternal || event.type === 'quote_sent'

          return (
            <div
              key={event.id}
              className={[
                'flex',
                isOurs ? 'justify-end' : 'justify-start',
              ].join(' ')}
            >
              <div
                className={[
                  'max-w-[75%] rounded-xl px-4 py-2.5',
                  isOurs
                    ? 'rounded-ee-sm bg-black/[0.04] dark:bg-white/[0.06]'
                    : 'rounded-es-sm border border-black/[0.06] dark:border-white/[0.06]',
                ].join(' ')}
              >
                <p className="text-[13px] leading-relaxed text-[var(--color-text)]">
                  {event.description}
                </p>

                <div className="mt-1.5 flex items-center gap-2">
                  {event.isInternal && (
                    <span className="rounded bg-black/[0.04] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)] dark:bg-white/[0.04]">
                      Internal
                    </span>
                  )}
                  <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
                    {new Date(event.timestamp).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Note */}
      <div className="flex gap-2 border-t border-black/[0.06] px-5 py-3 dark:border-white/[0.06]">
        <input
          type="text"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleAddNote()
            }
          }}
          placeholder={t('sales.negotiation.addNotePlaceholder', 'Add internal note...')}
          className="flex-1 rounded-full border border-black/[0.06] bg-transparent px-4 py-2 text-[13px] text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] dark:border-white/[0.06]"
        />
        <button
          type="button"
          onClick={handleAddNote}
          disabled={!noteText.trim() || isSubmitting}
          className="shrink-0 rounded-full bg-[var(--color-primary)] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-40"
        >
          {t('sales.negotiation.addNote', 'Send')}
        </button>
      </div>
    </div>
  )
}
