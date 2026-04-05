import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { addInternalNote } from '../../../lib/server/sales-activity'

// ─── Types ───────────────────────────────────────────────────

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

// ─── Mock Data ───────────────────────────────────────────────

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

// ─── Event Icon ──────────────────────────────────────────────

function EventIcon({ type, isInternal }: { type: NegotiationEvent['type']; isInternal: boolean }) {
  if (isInternal) {
    // Lock icon for internal notes
    return (
      <div className="w-7 h-7 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black/60 dark:text-white/60">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
    )
  }

  const iconMap: Record<NegotiationEvent['type'], string> = {
    quote_sent: 'M22 2L11 13 M22 2l-7 20-4-9-9-4z',
    counter_offer: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    internal_note: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
    system_event: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2',
  }

  return (
    <div className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black/40 dark:text-white/40">
        <path d={iconMap[type]} />
      </svg>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────

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
    <div className="border-t border-black/10 dark:border-white/10">
      <div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
        <h3 className="text-sm font-semibold">
          {t('sales.negotiation.thread', 'Negotiation Timeline')}
        </h3>
      </div>

      <div className="px-4 py-3 space-y-3 max-h-80 overflow-y-auto">
        {events.map((event) => (
          <div
            key={event.id}
            className={[
              'flex items-start gap-3 py-2',
              event.isInternal ? 'bg-black/[0.02] dark:bg-white/[0.02] -mx-2 px-2 rounded-lg' : '',
            ].join(' ')}
          >
            <EventIcon type={event.type} isInternal={event.isInternal} />
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-relaxed">{event.description}</p>
              {event.isInternal && (
                <span className="inline-block mt-1 text-[10px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
                  Internal Only
                </span>
              )}
            </div>
            <span className="text-[11px] font-mono text-black/40 dark:text-white/40 shrink-0">
              {new Date(event.timestamp).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        ))}
      </div>

      {/* Add Note Input */}
      <div className="px-4 py-3 border-t border-black/10 dark:border-white/10 flex gap-2">
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
          className="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2563EB] transition-colors"
        />
        <button
          type="button"
          onClick={handleAddNote}
          disabled={!noteText.trim() || isSubmitting}
          className="px-4 py-2 text-sm font-medium bg-[#2563EB] text-white rounded-lg disabled:opacity-40 hover:bg-[#2563EB]/90 transition-colors"
        >
          {t('sales.negotiation.addNote', 'Add Note')}
        </button>
      </div>
    </div>
  )
}
