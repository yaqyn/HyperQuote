import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, TextField, TextArea } from 'react-aria-components'
import { motion, AnimatePresence } from 'motion/react'
import { BookOpen, AlertTriangle } from 'lucide-react'
import { getTicketDetail, escalateTicket, respondToTicket, resolveTicket, assignTicket } from '../../../lib/server/customer-service'
import { useCustomerServiceStore } from '../../../stores/customer-service'
import { KnowledgeBase } from '../knowledge-base/KnowledgeBase'
import { SLA_CONFIG } from '../../../types/customer-service'
import type { TicketStatus, TicketPriority, TicketActivity, SubTicket } from '../../../types/customer-service'

// Hardcoded current agent — replace with auth context
const CURRENT_AGENT = 'Sara Ahmed'

/**
 * Ticket Detail — "The Thread"
 * Reply input at the TOP (most common action for a CS agent handling 30+ tickets/day).
 * SLA timer prominent in header. Customer vs agent messages visually distinct.
 * Action buttons: Reply (primary) -> Assign -> Escalate -> Resolve.
 * Unassigned tickets show a prominent "Claim Ticket" button.
 */
export function TicketDetail() {
  const { t } = useTranslation('customer-service')
  const selectedTicketId = useCustomerServiceStore((s) => s.selectedTicketId)
  const setSelectedTicketId = useCustomerServiceStore((s) => s.setSelectedTicketId)
  const kbPanelOpen = useCustomerServiceStore((s) => s.kbPanelOpen)
  const setKbPanelOpen = useCustomerServiceStore((s) => s.setKbPanelOpen)
  const setAssignDialogOpen = useCustomerServiceStore((s) => s.setAssignDialogOpen)
  const [replyText, setReplyText] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: ticket } = useQuery({
    queryKey: ['cs', 'ticket-detail', selectedTicketId],
    queryFn: () => getTicketDetail({ data: { ticketId: selectedTicketId! } }),
    staleTime: 15_000,
    enabled: !!selectedTicketId,
  })

  const replyMutation = useMutation({
    mutationFn: () => respondToTicket(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs', 'ticket-detail', selectedTicketId] })
      setReplyText('')
    },
  })

  const escalateMutation = useMutation({
    mutationFn: () => escalateTicket(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs'] })
    },
  })

  const resolveMutation = useMutation({
    mutationFn: () => resolveTicket({ data: { ticketId: selectedTicketId!, resolution: 'resolved' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs'] })
    },
  })

  const claimMutation = useMutation({
    mutationFn: () => assignTicket({ data: { ticketId: selectedTicketId!, agentName: CURRENT_AGENT } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs'] })
    },
  })

  if (!ticket) {
    return (
      <div className="p-5 text-center text-[var(--color-text-subtle)]">
        Loading...
      </div>
    )
  }

  const isUnassigned = ticket.assignedAgent === null
  const sla = computeSLA(ticket.priority, ticket.slaDeadline)

  // Separate messages (comments) from status changes
  const messages = ticket.activities.filter((a: TicketActivity) => a.type === 'comment' || a.type === 'note')
  const statusChanges = ticket.activities.filter((a: TicketActivity) => a.type !== 'comment' && a.type !== 'note')

  return (
    <div className="flex flex-col h-full">
      {/* Header bar with SLA timer */}
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

        {/* SLA timer — prominent in header */}
        <span className={`shrink-0 flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-semibold font-[family-name:var(--font-geist-mono)] tabular-nums ${sla.pillClass}`}>
          {sla.breached && <AlertTriangle size={12} />}
          {sla.label}
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
          {sidebarOpen ? t('tickets.hideInfo', 'Hide info') : t('tickets.showInfo', 'Show info')}
        </Button>
      </div>

      {/* Main content: chat + sidebar */}
      <div className="flex-1 flex min-h-0">
        {/* Chat thread */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Claim ticket banner for unassigned tickets */}
          {isUnassigned && (
            <div className="shrink-0 flex items-center gap-3 px-5 py-3 bg-amber-500/[0.06] border-b border-amber-500/20">
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400 flex-1">
                {t('tickets.unassignedBanner', 'This ticket is unassigned')}
              </span>
              <Button
                onPress={() => claimMutation.mutate()}
                isDisabled={claimMutation.isPending}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-1.5 text-sm font-semibold text-white cursor-pointer hover:opacity-90 transition-opacity outline-none disabled:opacity-40 disabled:cursor-default"
              >
                {claimMutation.isPending
                  ? t('tickets.claiming', 'Claiming...')
                  : t('tickets.claimTicket', 'Claim Ticket')}
              </Button>
            </div>
          )}

          {/* Reply input at the TOP — most common action */}
          <div className={`shrink-0 border-b px-5 py-3 ${isInternalNote ? 'border-amber-500/30 bg-amber-500/[0.03]' : 'border-[var(--color-border)]'}`}>
            {/* Reply / Internal Note toggle */}
            <div className="flex items-center gap-1 mb-2">
              <Button
                onPress={() => setIsInternalNote(false)}
                className={`rounded-md px-2.5 py-1 text-[12px] font-medium cursor-pointer transition-all outline-none
                  ${!isInternalNote
                    ? 'text-[var(--color-text)] bg-black/[0.06] dark:bg-white/[0.06]'
                    : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)]'
                  }`}
              >
                {t('tickets.reply', 'Reply')}
              </Button>
              <Button
                onPress={() => setIsInternalNote(true)}
                className={`rounded-md px-2.5 py-1 text-[12px] font-medium cursor-pointer transition-all outline-none
                  ${isInternalNote
                    ? 'text-amber-700 dark:text-amber-400 bg-amber-500/10'
                    : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)]'
                  }`}
              >
                {t('tickets.internalNote', 'Internal Note')}
              </Button>
            </div>

            <div className="flex gap-2 items-end">
              <TextField
                aria-label={isInternalNote
                  ? t('tickets.notePlaceholder', 'Add an internal note...')
                  : t('tickets.replyPlaceholder', 'Type your reply...')}
                value={replyText}
                onChange={setReplyText}
                className="flex-1"
              >
                <TextArea
                  placeholder={isInternalNote
                    ? t('tickets.notePlaceholder', 'Add an internal note...')
                    : t('tickets.replyPlaceholder', 'Type your reply...')}
                  rows={2}
                  className={`w-full rounded-xl border bg-transparent px-4 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none resize-none
                    focus:ring-1 ${isInternalNote
                      ? 'border-amber-500/30 focus:ring-amber-500/30'
                      : 'border-[var(--color-border)] focus:ring-[var(--color-primary)]/40'
                    }`}
                />
              </TextField>
              <Button
                onPress={() => replyMutation.mutate()}
                isDisabled={!replyText.trim() || replyMutation.isPending}
                className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium text-white cursor-pointer hover:opacity-90 transition-opacity outline-none disabled:opacity-40 disabled:cursor-default
                  ${isInternalNote ? 'bg-amber-600' : 'bg-[var(--color-primary)]'}`}
              >
                {replyMutation.isPending
                  ? '...'
                  : isInternalNote
                    ? t('tickets.addNote', 'Add Note')
                    : t('tickets.send', 'Send')}
              </Button>
            </div>

            {/* Action buttons row: Assign -> Escalate -> Resolve */}
            <div className="flex items-center gap-2 mt-2">
              <Button
                onPress={() => setAssignDialogOpen(true)}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-text)] cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors outline-none"
              >
                {t('tickets.assignTicket', 'Assign')}
              </Button>
              <Button
                onPress={() => escalateMutation.mutate()}
                isDisabled={escalateMutation.isPending || ticket.status === 'escalated'}
                className="rounded-lg border border-red-200 dark:border-red-800/50 px-3 py-1.5 text-[12px] font-medium text-red-600 dark:text-red-400 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors outline-none disabled:opacity-40 disabled:cursor-default"
              >
                {escalateMutation.isPending
                  ? t('tickets.escalating', 'Escalating...')
                  : t('tickets.escalate', 'Escalate')}
              </Button>
              <Button
                onPress={() => resolveMutation.mutate()}
                isDisabled={resolveMutation.isPending || ticket.status === 'resolved' || ticket.status === 'closed'}
                className="rounded-lg border border-green-200 dark:border-green-800/50 px-3 py-1.5 text-[12px] font-medium text-green-600 dark:text-green-400 cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors outline-none disabled:opacity-40 disabled:cursor-default"
              >
                {resolveMutation.isPending
                  ? t('tickets.resolving', 'Resolving...')
                  : t('tickets.resolve', 'Resolve')}
              </Button>
            </div>
          </div>

          {/* Description */}
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
                {statusChanges.map((activity: TicketActivity) => (
                  <div key={activity.id} className="flex items-center gap-2 text-xs text-[var(--color-text-subtle)]">
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                      {formatActivityTime(activity.timestamp)}
                    </span>
                    <span>{activity.author} {activity.content}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Chat bubbles — customer left, agent right, internal notes distinct */}
            {messages.map((msg: TicketActivity) => {
              const isCustomer = !msg.isInternal && msg.type === 'comment'
              const isInternal = msg.isInternal || msg.type === 'note'
              const isAgent = !isCustomer && !isInternal

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                      isInternal
                        ? 'bg-amber-500/10 border border-amber-500/20 border-dashed'
                        : isCustomer
                          ? 'bg-black/[0.04] dark:bg-white/[0.04]'
                          : 'bg-[var(--color-primary)]/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {isCustomer && (
                        <span className="text-[10px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider">
                          Customer
                        </span>
                      )}
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
                    {ticket.linkedOrders.map((id: string) => (
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
                    {ticket.linkedQuotes.map((id: string) => (
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
                    {ticket.linkedInvoices.map((id: string) => (
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
                    {ticket.attachments.map((url: string, idx: number) => (
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
                    {ticket.subTickets.map((sub: SubTicket) => (
                      <div key={sub.id} className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${statusColor(sub.status)}`} />
                        <span className="text-xs text-[var(--color-text)] truncate flex-1">{sub.subject}</span>
                        <span className="text-[10px] text-[var(--color-text-subtle)]">{sub.department}</span>
                      </div>
                    ))}
                  </div>
                </SidebarSection>
              )}
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

function computeSLA(
  priority: TicketPriority,
  slaDeadline: string,
): { label: string; pillClass: string; breached: boolean } {
  const deadline = new Date(slaDeadline).getTime()
  const now = Date.now()
  const remaining = deadline - now
  const total = SLA_CONFIG[priority].resolution * 60 * 1000

  if (remaining <= 0) {
    const breachedMin = Math.abs(Math.round(remaining / (1000 * 60)))
    const label = breachedMin >= 60 ? `BREACHED -${Math.round(breachedMin / 60)}h` : `BREACHED -${breachedMin}m`
    return { label, pillClass: 'bg-red-500/15 text-red-700 dark:text-red-400', breached: true }
  }

  const pct = remaining / total
  const remainingMin = Math.round(remaining / (1000 * 60))

  let pillClass: string
  if (pct > 0.5) {
    pillClass = 'bg-green-500/10 text-green-700 dark:text-green-400'
  } else if (pct > 0.1) {
    pillClass = 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
  } else {
    pillClass = 'bg-red-500/15 text-red-700 dark:text-red-400'
  }

  let label: string
  if (remainingMin >= 60) {
    const hours = Math.floor(remainingMin / 60)
    const mins = remainingMin % 60
    label = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  } else {
    label = `${remainingMin}m`
  }

  return { label, pillClass, breached: false }
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
