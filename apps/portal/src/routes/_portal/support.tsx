import { useState, useEffect, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { MessageCircle, MessageSquare, TicketPlus } from 'lucide-react'
import { Button } from 'react-aria-components'
import { WindowShell } from '../../components/windows/WindowShell'
import { FloatingAIButton } from '../../components/windows/FloatingAIButton'
import { TicketList } from '../../components/support/TicketList'
import { TicketForm } from '../../components/support/TicketForm'
import { TicketThread } from '../../components/support/TicketThread'
import {
  getTickets,
  getTicketDetail,
  submitSupportTicket,
  replySupportTicket,
} from '../../lib/server/support'
import type { Ticket, TicketReply } from '../../types/support'

export const Route = createFileRoute('/_portal/support')({
  component: SupportWindow,
})

type SupportView = 'list' | 'form' | 'thread'

function SupportWindow() {
  const { t } = useTranslation('portal')
  const [view, setView] = useState<SupportView>('list')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [replying, setReplying] = useState(false)

  // Thread state
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [replies, setReplies] = useState<TicketReply[]>([])

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getTickets({ data: { page: 1, limit: 20 } })
      setTickets(result.tickets)
    } catch {
      setTickets([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  async function handleSelectTicket(ticketId: string) {
    try {
      const result = await getTicketDetail({ data: { ticketId } })
      setSelectedTicket(result.ticket)
      setReplies(result.replies)
      setView('thread')
    } catch {
      // Error handled silently
    }
  }

  async function handleSubmitTicket(data: {
    subject: string
    category: 'order_issue' | 'delivery_problem' | 'billing' | 'account' | 'other'
    message: string
    orderId?: string
  }) {
    setSubmitting(true)
    try {
      await submitSupportTicket({ data })
      // Refresh tickets and go back to list
      await fetchTickets()
      setView('list')
    } catch {
      // Error handled silently
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReply(message: string) {
    if (!selectedTicket) return
    setReplying(true)
    try {
      await replySupportTicket({
        data: { ticketId: selectedTicket.id, message },
      })
      // Refresh thread
      const result = await getTicketDetail({
        data: { ticketId: selectedTicket.id },
      })
      setSelectedTicket(result.ticket)
      setReplies(result.replies)
    } catch {
      // Error handled silently
    } finally {
      setReplying(false)
    }
  }

  return (
    <>
      <WindowShell title={t('support.windowTitle')}>
        <div className="flex flex-col gap-6">
          {/* Contact method cards -- always visible in list view */}
          {view === 'list' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* WhatsApp (primary) */}
                <a
                  href="https://wa.me/201000000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 rounded-xl border-2 border-[var(--color-primary)] p-4 hover:bg-[var(--color-primary)]/5 transition-colors"
                >
                  <MessageCircle
                    size={24}
                    className="text-[var(--color-primary)]"
                  />
                  <span className="text-sm font-medium text-[var(--color-primary)]">
                    {t('support.whatsappOption')}
                  </span>
                </a>

                {/* In-app chat */}
                <Button
                  onPress={() => {
                    // Navigate to canvas with chat open -- deferred to when chat routing is wired
                  }}
                  className="flex flex-col items-center gap-2 rounded-xl border border-[var(--color-border)] p-4 hover:bg-[var(--color-surface)] transition-colors cursor-pointer outline-none"
                >
                  <MessageSquare
                    size={24}
                    className="text-[var(--color-text)]"
                  />
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {t('support.chatOption')}
                  </span>
                </Button>

                {/* Submit ticket */}
                <Button
                  onPress={() => setView('form')}
                  className="flex flex-col items-center gap-2 rounded-xl border border-[var(--color-border)] p-4 hover:bg-[var(--color-surface)] transition-colors cursor-pointer outline-none"
                >
                  <TicketPlus
                    size={24}
                    className="text-[var(--color-text)]"
                  />
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {t('support.submitTicketOption')}
                  </span>
                </Button>
              </div>

              {/* Ticket list */}
              {loading ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={`skeleton-${i}`}
                      className="h-16 rounded-xl bg-[var(--color-surface)] animate-pulse"
                    />
                  ))}
                </div>
              ) : tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <p className="text-lg font-semibold text-[var(--color-text)]">
                    {t('support.emptyHeading')}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {t('support.emptyBody')}
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">
                    {t('support.activeTickets')}
                  </h3>
                  <TicketList
                    tickets={tickets}
                    onSelect={handleSelectTicket}
                  />
                </div>
              )}
            </>
          )}

          {/* Ticket form view */}
          {view === 'form' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Button
                  onPress={() => setView('list')}
                  className="text-sm text-[var(--color-primary)] hover:underline cursor-pointer outline-none"
                >
                  {t('support.backToTickets')}
                </Button>
              </div>
              <h3 className="text-base font-semibold text-[var(--color-text)] mb-4">
                {t('support.newTicketHeading')}
              </h3>
              <TicketForm
                onSubmit={handleSubmitTicket}
                isSubmitting={submitting}
              />
            </div>
          )}

          {/* Ticket thread view */}
          {view === 'thread' && selectedTicket && (
            <TicketThread
              ticket={selectedTicket}
              replies={replies}
              onReply={handleReply}
              onBack={() => setView('list')}
              isReplying={replying}
            />
          )}
        </div>
      </WindowShell>
      <FloatingAIButton />
    </>
  )
}
