/**
 * Support — data is the design.
 * Three ways to get help: WhatsApp, Chat, Ticket.
 * Ticket list as clean rows. Thread as text conversation (like chat).
 */
import { useState, useEffect, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { WindowShell } from '../../components/windows/WindowShell'
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
    } catch {}
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
      await fetchTickets()
      setView('list')
    } catch {} finally {
      setSubmitting(false)
    }
  }

  async function handleReply(message: string) {
    if (!selectedTicket) return
    setReplying(true)
    try {
      await replySupportTicket({ data: { ticketId: selectedTicket.id, message } })
      const result = await getTicketDetail({ data: { ticketId: selectedTicket.id } })
      setSelectedTicket(result.ticket)
      setReplies(result.replies)
    } catch {} finally {
      setReplying(false)
    }
  }

  return (
    <WindowShell title={t('support.windowTitle')}>
      <div className="py-8">
        <AnimatePresence mode="wait">
          {view === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="flex flex-col gap-12"
            >
              {/* Contact options — three text links, not cards */}
              <div className="flex items-center gap-8">
                <a
                  href="https://wa.me/201000000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  {t('support.whatsappOption')}
                </a>
                <span className="text-[var(--color-border)]" aria-hidden>·</span>
                <button
                  type="button"
                  className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  {t('support.chatOption')}
                </button>
                <span className="text-[var(--color-border)]" aria-hidden>·</span>
                <button
                  type="button"
                  onClick={() => setView('form')}
                  className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  {t('support.submitTicketOption')}
                </button>
              </div>

              {/* Tickets */}
              {loading ? (
                <div className="flex flex-col">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="py-5 border-b border-[var(--color-border)] animate-pulse">
                      <div className="h-3.5 w-48 bg-[var(--color-surface)] rounded-sm mb-2" />
                      <div className="h-2.5 w-32 bg-[var(--color-surface)] rounded-sm" />
                    </div>
                  ))}
                </div>
              ) : tickets.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm text-[var(--color-text)]">{t('support.emptyHeading')}</p>
                  <p className="text-sm text-[var(--color-text-subtle)] mt-1">{t('support.emptyBody')}</p>
                  <button
                    type="button"
                    onClick={() => setView('form')}
                    className="mt-6 h-9 px-5 rounded-lg bg-[#0F172A] text-white dark:bg-[#FAFAFA] dark:text-[#09090B] text-xs font-medium transition-opacity hover:opacity-80"
                  >
                    {t('support.submitTicketOption')}
                  </button>
                </div>
              ) : (
                <div>
                  <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--color-text-subtle)] mb-4 block">
                    {t('support.activeTickets')}
                  </span>
                  <TicketList tickets={tickets} onSelect={handleSelectTicket} />
                </div>
              )}
            </motion.div>
          )}

          {view === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <button
                type="button"
                onClick={() => setView('list')}
                className="text-[11px] text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] transition-colors mb-8"
              >
                {t('support.backToTickets')}
              </button>
              <TicketForm onSubmit={handleSubmitTicket} isSubmitting={submitting} />
            </motion.div>
          )}

          {view === 'thread' && selectedTicket && (
            <motion.div
              key="thread"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <TicketThread
                ticket={selectedTicket}
                replies={replies}
                onReply={handleReply}
                onBack={() => setView('list')}
                isReplying={replying}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </WindowShell>
  )
}
