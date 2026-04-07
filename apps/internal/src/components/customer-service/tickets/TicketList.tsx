import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { motion, AnimatePresence } from 'motion/react'
import { MessageCircle } from 'lucide-react'
import { getTicketQueue } from '../../../lib/server/customer-service'
import { useCustomerServiceStore } from '../../../stores/customer-service'
import { SLA_CONFIG } from '../../../types/customer-service'
import type { TicketPriority, TicketStatus } from '../../../types/customer-service'

type FilterKey = 'all' | 'open' | 'waiting' | 'resolved'
type ChannelFilter = 'all' | 'email' | 'whatsapp' | 'phone' | 'returns'

/**
 * Ticket List — "The Inbox"
 * Thread-preview list (like email). Each ticket: subject (bold) + customer name
 * + preview of last message (truncated, muted) + timestamp (mono) + status dot.
 * Unread tickets: blue left accent.
 */
export function TicketList() {
  const { t } = useTranslation('customer-service')
  const setSelectedTicketId = useCustomerServiceStore((s) => s.setSelectedTicketId)
  const channelFilter = useCustomerServiceStore((s) => s.channelFilter)
  const setChannelFilter = useCustomerServiceStore((s) => s.setChannelFilter)
  const [filter, setFilter] = useState<FilterKey>('all')

  const { data: tickets } = useQuery({
    queryKey: ['cs', 'tickets'],
    queryFn: () => getTicketQueue(),
    staleTime: 15_000,
  })

  if (!tickets) {
    return (
      <div className="p-5 text-center text-[var(--color-text-subtle)]">
        Loading...
      </div>
    )
  }

  // Filter
  const filtered = tickets.filter((ticket) => {
    switch (filter) {
      case 'open':
        return ticket.status === 'new' || ticket.status === 'open' || ticket.status === 'in_progress'
      case 'waiting':
        return ticket.status === 'awaiting_customer' || ticket.status === 'awaiting_internal' || ticket.status === 'awaiting_supplier'
      case 'resolved':
        return ticket.status === 'resolved' || ticket.status === 'closed'
      default:
        return true
    }
  })

  const FILTERS: Array<{ key: FilterKey; label: string }> = [
    { key: 'all', label: t('tickets.filterAll', 'All') },
    { key: 'open', label: t('tickets.filterOpen', 'Open') },
    { key: 'waiting', label: t('tickets.filterWaiting', 'Waiting') },
    { key: 'resolved', label: t('tickets.filterResolved', 'Resolved') },
  ]

  return (
    <div className="p-5 space-y-4">
      {/* Filter pills */}
      <div className="flex items-center gap-1">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            onPress={() => setFilter(f.key)}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-medium cursor-pointer transition-all duration-150 outline-none
              ${filter === f.key
                ? 'text-[var(--color-text)] bg-black/[0.06] dark:bg-white/[0.06]'
                : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
              }`}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Channel filter pills */}
      <div className="flex items-center gap-1">
        {([
          { key: 'all' as ChannelFilter, label: t('tickets.channelAll', 'All') },
          { key: 'email' as ChannelFilter, label: t('tickets.channelEmail', 'Email') },
          { key: 'whatsapp' as ChannelFilter, label: t('tickets.channelWhatsApp', 'WhatsApp') },
          { key: 'phone' as ChannelFilter, label: t('tickets.channelPhone', 'Phone') },
          { key: 'returns' as ChannelFilter, label: t('tickets.channelReturns', 'Returns') },
        ]).map((ch) => (
          <Button
            key={ch.key}
            onPress={() => setChannelFilter(ch.key)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium cursor-pointer transition-all duration-150 outline-none
              ${channelFilter === ch.key
                ? 'text-[var(--color-text)] bg-black/[0.06] dark:bg-white/[0.06]'
                : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
              }`}
          >
            {ch.key === 'whatsapp' && <MessageCircle size={11} className="inline me-1 -mt-px" />}
            {ch.label}
          </Button>
        ))}
      </div>

      {/* Thread list */}
      <div className="flex flex-col">
        <AnimatePresence mode="popLayout">
          {filtered.map((ticket) => {
            const isUnread = ticket.status === 'new' || ticket.status === 'open'
            const sla = computeSLA(ticket.createdAt, ticket.priority, ticket.slaDeadline)

            return (
              <motion.button
                key={ticket.id}
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                onClick={() => setSelectedTicketId(ticket.id)}
                className={`group w-full text-start px-4 py-3 border-b border-[var(--color-border)]/50 cursor-pointer transition-colors
                  hover:bg-black/[0.02] dark:hover:bg-white/[0.02]
                  ${isUnread ? 'border-s-2 border-s-[var(--color-primary)] ps-3.5' : ''}`}
              >
                {/* Row 1: Subject + timestamp */}
                <div className="flex items-baseline gap-3 mb-0.5">
                  <span className={`text-sm flex-1 truncate ${isUnread ? 'font-semibold text-[var(--color-text)]' : 'font-medium text-[var(--color-text)]'}`}>
                    {ticket.subject}
                  </span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-subtle)] shrink-0">
                    {formatRelativeTime(ticket.createdAt)}
                  </span>
                </div>

                {/* Row 2: Customer + ticket # + status dot + SLA */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-text-muted)] truncate">
                    {ticket.customerName}
                  </span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-[var(--color-text-subtle)]">
                    {ticket.number}
                  </span>
                  <span className="flex-1" />

                  {/* SLA */}
                  <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] font-medium ${sla.color}`}>
                    {sla.label}
                  </span>

                  {/* Priority dot */}
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityDot(ticket.priority)}`} />
                </div>

                {/* Row 3: Preview text (muted) */}
                <div className="mt-1 text-xs text-[var(--color-text-subtle)] truncate">
                  {ticket.assignedAgent
                    ? `${ticket.assignedAgent} — ${t(`status.${statusToI18nKey(ticket.status)}`, ticket.status)}`
                    : t('tickets.unassigned', 'Unassigned')}
                </div>
              </motion.button>
            )
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-[var(--color-text-subtle)]">
            {t('tickets.noTickets', 'No tickets match this filter')}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────

function priorityDot(priority: TicketPriority): string {
  const map: Record<TicketPriority, string> = {
    critical: 'bg-red-500',
    high: 'bg-amber-500',
    medium: 'bg-[var(--color-primary)]',
    low: 'bg-black/20 dark:bg-white/20',
  }
  return map[priority]
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
  createdAt: string,
  priority: TicketPriority,
  slaDeadline: string,
): { label: string; color: string } {
  const deadline = new Date(slaDeadline).getTime()
  const now = Date.now()
  const remaining = deadline - now
  const total = SLA_CONFIG[priority].resolution * 60 * 1000

  if (remaining <= 0) {
    const breachedMin = Math.abs(Math.round(remaining / (1000 * 60)))
    if (breachedMin >= 60) {
      return { label: `-${Math.round(breachedMin / 60)}h`, color: 'text-red-600 dark:text-red-400' }
    }
    return { label: `-${breachedMin}m`, color: 'text-red-600 dark:text-red-400' }
  }

  const pct = remaining / total
  const remainingMin = Math.round(remaining / (1000 * 60))

  let color: string
  if (pct > 0.5) {
    color = 'text-green-600 dark:text-green-400'
  } else if (pct > 0.1) {
    color = 'text-amber-600 dark:text-amber-400'
  } else {
    color = 'text-red-600 dark:text-red-400'
  }

  if (remainingMin >= 60) {
    const hours = Math.floor(remainingMin / 60)
    const mins = remainingMin % 60
    return { label: mins > 0 ? `${hours}h ${mins}m` : `${hours}h`, color }
  }
  return { label: `${remainingMin}m`, color }
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / (1000 * 60))
  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}
