import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Button, TextField, TextArea } from 'react-aria-components'
import { motion, AnimatePresence } from 'motion/react'
import { BookOpen } from 'lucide-react'
import { getTicketDetail } from '../../../lib/server/customer-service'
import { useCustomerServiceStore } from '../../../stores/customer-service'
import { KnowledgeBase } from '../knowledge-base/KnowledgeBase'
import type { TicketStatus, TicketActivity } from '../../../types/customer-service'

/**
 * Ticket Detail — "The Thread"
 * Chat-style view. Messages alternate: customer left (light bg), agent right (blue tint).
 * Reply input at bottom. Collapsible sidebar: customer info, ticket metadata, linked orders.
 */
export function TicketDetail() {
  const { t } = useTranslation('customer-service')
  const selectedTicketId = useCustomerServiceStore((s) => s.selectedTicketId)
  const setSelectedTicketId = useCustomerServiceStore((s) => s.setSelectedTicketId)
  const kbPanelOpen = useCustomerServiceStore((s) => s.kbPanelOpen)
  const setKbPanelOpen = useCustomerServiceStore((s) => s.setKbPanelOpen)
  const [replyText, setReplyText] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const { data: ticket } = useQuery({
    queryKey: ['cs', 'ticket-detail', selectedTicketId],
    queryFn: () => getTicketDetail(),
    staleTime: 15_000,
    enabled: !!selectedTicketId,
  })

  if (!ticket) {
    return (
      <div className="p-5 text-center text-[var(--color-text-subtle)]">
        Loading...
      </div>
    )
  }

  // Separate messages (comments) from status changes
  const messages = ticket.activities.filter((a) => a.type === 'comment' || a.type === 'note')
  const statusChanges = ticket.activities.filter((a) => a.type !== 'comment' && a.type !== 'note')

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-[var(--color-border)]">
        <Button
          onPress={() => setSelectedTicketId(null)}
          className="text-[var(--color-primary)] text-sm cursor-pointer hover:underline outline-none"
        >
          &larr; {t('tickets.back', 'Back')}
        </Button>

        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-semibold text-[var(--color-text)]">
          {ticket.number}
        </span>

        <span className="text-sm text-[var(--color-text)] font-medium truncate flex-1">
          {ticket.subject}
        </span>

        {/* Priority + Status */}
        <span className={`w-2 h-2 rounded-full shrink-0 ${priorityDot(ticket.priority)}`} />
        <span className="text-xs text-[var(--color-text-muted)]">
          {t(`status.${statusToI18nKey(ticket.status)}`, ticket.status)}
        </span>

        <Button
          onPress={() => setKbPanelOpen(!kbPanelOpen)}
          aria-label={t('tickets.knowledgeBase', 'Knowledge Base')}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-pointer outline-none transition-colors ${
            kbPanelOpen
              ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
              : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
          }`}
        >
          <BookOpen size={14} strokeWidth={1.5} />
          KB
        </Button>

        <Button
          onPress={() => setSidebarOpen(!sidebarOpen)}
          className="text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-text)] cursor-pointer outline-none"
        >
          {sidebarOpen ? 'Hide info' : 'Show info'}
        </Button>
      </div>

      {/* Main content: chat + sidebar */}
      <div className="flex-1 flex min-h-0">
        {/* Chat thread */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Description at top */}
          {ticket.description && (
            <div className="px-5 py-3 border-b border-[var(--color-border)]/50">
              <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-1">
                {t('tickets.description', 'Description')}
              </div>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{ticket.description}</p>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {/* Status changes as compact inline notes */}
            {statusChanges.length > 0 && (
              <div className="space-y-1 mb-4">
                {statusChanges.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-2 text-xs text-[var(--color-text-subtle)]">
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                      {formatActivityTime(activity.timestamp)}
                    </span>
                    <span>{activity.author} {activity.content}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Chat bubbles */}
            {messages.map((msg) => {
              const isAgent = msg.type === 'note' || !msg.isInternal === false
              const isInternal = msg.isInternal

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                      isInternal
                        ? 'bg-amber-500/10 border border-amber-500/20'
                        : isAgent
                          ? 'bg-[var(--color-primary)]/10'
                          : 'bg-black/[0.04] dark:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-[var(--color-text)]">{msg.author}</span>
                      {isInternal && (
                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          {t('tickets.internalNotes', 'Internal')}
                        </span>
                      )}
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-[var(--color-text-subtle)] ms-auto">
                        {formatActivityTime(msg.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{msg.content}</p>
                  </div>
                </motion.div>
              )
            })}

            {messages.length === 0 && (
              <div className="py-8 text-center text-sm text-[var(--color-text-subtle)]">
                No messages yet
              </div>
            )}
          </div>

          {/* Reply input */}
          <div className="shrink-0 border-t border-[var(--color-border)] px-5 py-3 flex gap-2 items-end">
            <TextField
              aria-label={t('tickets.replyPlaceholder', 'Type your reply...')}
              value={replyText}
              onChange={setReplyText}
              className="flex-1"
            >
              <TextArea
                placeholder={t('tickets.replyPlaceholder', 'Type your reply...')}
                rows={1}
                className="w-full rounded-xl border border-[var(--color-border)] bg-transparent px-4 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none resize-none
                  focus:ring-1 focus:ring-[var(--color-primary)]/40"
              />
            </TextField>
            <Button
              onPress={() => {
                console.log('[CS] Send reply:', replyText)
                setReplyText('')
              }}
              className="shrink-0 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white cursor-pointer hover:opacity-90 transition-opacity outline-none"
            >
              {t('tickets.send', 'Send')}
            </Button>
          </div>
        </div>

        {/* Knowledge Base panel (slide-in) */}
        <AnimatePresence>
          {kbPanelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-[320px] shrink-0 border-s border-[var(--color-border)] overflow-y-auto"
            >
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
                    {t('tickets.knowledgeBase', 'Knowledge Base')}
                  </span>
                  <Button
                    onPress={() => setKbPanelOpen(false)}
                    className="text-[11px] text-[var(--color-text-subtle)] hover:text-[var(--color-text)] cursor-pointer outline-none"
                  >
                    {t('tickets.close', 'Close')}
                  </Button>
                </div>
                <KnowledgeBase />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar (collapsible) */}
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-[280px] shrink-0 border-s border-[var(--color-border)] overflow-y-auto"
          >
            <div className="p-4 space-y-5">
              {/* Customer */}
              <SidebarSection label={t('tickets.customer', 'Customer')}>
                <p className="text-sm font-medium text-[var(--color-text)]">{ticket.customerName}</p>
              </SidebarSection>

              {/* Assigned */}
              <SidebarSection label={t('tickets.assignedTo', 'Assigned To')}>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {ticket.assignedAgent ?? t('tickets.unassigned', 'Unassigned')}
                </p>
              </SidebarSection>

              {/* Linked Orders */}
              {ticket.linkedOrders.length > 0 && (
                <SidebarSection label={t('tickets.linkedOrders', 'Linked Orders')}>
                  <div className="space-y-1">
                    {ticket.linkedOrders.map((id) => (
                      <div key={id} className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm text-[var(--color-primary)]">
                        {id}
                      </div>
                    ))}
                  </div>
                </SidebarSection>
              )}

              {/* Linked Quotes */}
              {ticket.linkedQuotes.length > 0 && (
                <SidebarSection label={t('tickets.linkedQuotes', 'Linked Quotes')}>
                  <div className="space-y-1">
                    {ticket.linkedQuotes.map((id) => (
                      <div key={id} className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm text-[var(--color-primary)]">
                        {id}
                      </div>
                    ))}
                  </div>
                </SidebarSection>
              )}

              {/* Linked Invoices */}
              {ticket.linkedInvoices.length > 0 && (
                <SidebarSection label={t('tickets.linkedInvoices', 'Linked Invoices')}>
                  <div className="space-y-1">
                    {ticket.linkedInvoices.map((id) => (
                      <div key={id} className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm text-[var(--color-primary)]">
                        {id}
                      </div>
                    ))}
                  </div>
                </SidebarSection>
              )}

              {/* Attachments */}
              {ticket.attachments.length > 0 && (
                <SidebarSection label={t('tickets.attachments', 'Attachments')}>
                  <div className="flex flex-wrap gap-1.5">
                    {ticket.attachments.map((url, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-primary)] cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                      >
                        Attachment {idx + 1}
                      </span>
                    ))}
                  </div>
                </SidebarSection>
              )}

              {/* Sub-tickets */}
              {ticket.subTickets.length > 0 && (
                <SidebarSection label={t('tickets.subTickets', 'Sub-Tickets')}>
                  <div className="space-y-2">
                    {ticket.subTickets.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${statusColor(sub.status)}`} />
                        <span className="text-xs text-[var(--color-text)] truncate flex-1">{sub.subject}</span>
                        <span className="text-[10px] text-[var(--color-text-subtle)]">{sub.department}</span>
                      </div>
                    ))}
                  </div>
                </SidebarSection>
              )}

              {/* Actions */}
              <div className="pt-3 border-t border-[var(--color-border)] space-y-2">
                <Button
                  onPress={() => console.log('[CS] Escalate ticket')}
                  className="w-full rounded-lg border border-red-200 dark:border-red-800/50 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors outline-none text-center"
                >
                  {t('tickets.escalate', 'Escalate')}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────

function SidebarSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-1.5">
        {label}
      </div>
      {children}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────

function priorityDot(priority: string): string {
  const map: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-amber-500',
    medium: 'bg-[var(--color-primary)]',
    low: 'bg-black/20 dark:bg-white/20',
  }
  return map[priority] ?? 'bg-black/20 dark:bg-white/20'
}

function statusColor(status: TicketStatus): string {
  const map: Record<string, string> = {
    resolved: 'bg-green-500',
    closed: 'bg-black/20 dark:bg-white/20',
    escalated: 'bg-red-500',
  }
  return map[status] ?? 'bg-[var(--color-primary)]'
}

function statusToI18nKey(status: TicketStatus): string {
  const map: Record<TicketStatus, string> = {
    new: 'new',
    open: 'open',
    in_progress: 'inProgress',
    awaiting_customer: 'awaitingCustomer',
    awaiting_internal: 'awaitingInternal',
    awaiting_supplier: 'awaitingSupplier',
    escalated: 'escalated',
    resolved: 'resolved',
    closed: 'closed',
    reopened: 'reopened',
  }
  return map[status]
}

function formatActivityTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / (1000 * 60))
  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return new Date(iso).toLocaleDateString()
}
