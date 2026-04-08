import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { motion, AnimatePresence } from 'motion/react'
import { MessageCircle, AlertTriangle } from 'lucide-react'
import { getTicketQueue } from '../../../lib/server/customer-service'
import { useCustomerServiceStore } from '../../../stores/customer-service'
import { SLA_CONFIG } from '../../../types/customer-service'
import type { Ticket, TicketPriority, TicketStatus } from '../../../types/customer-service'

type FilterKey = 'all' | 'open' | 'waiting' | 'resolved'
type OwnerFilter = 'my' | 'unassigned' | 'all'
type ChannelFilter = 'all' | 'email' | 'whatsapp' | 'phone' | 'returns'

// Hardcoded current agent — replace with auth context
const CURRENT_AGENT = 'Sara Ahmed'

/**
 * Ticket List — "The Inbox"
 * Thread-preview list (like email). Sorted by SLA urgency (breached first, then closest to breaching).
 * Unassigned tickets have a distinct visual indicator. Quick filter: My Tickets | Unassigned | All.
 */
export function TicketList() {
  const { t } = useTranslation('customer-service')
  const setSelectedTicketId = useCustomerServiceStore((s) => s.setSelectedTicketId)
  const channelFilter = useCustomerServiceStore((s) => s.channelFilter)
  const setChannelFilter = useCustomerServiceStore((s) => s.setChannelFilter)
  const setCreateTicketOpen = useCustomerServiceStore((s) => s.setCreateTicketOpen)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('all')

  const { data: tickets } = useQuery({
    queryKey: ['cs', 'tickets'],
    queryFn: () => getTicketQueue(),
    staleTime: 15_000,
  })

  // Filter and sort tickets
  const filtered = useMemo(() => {
    if (!tickets) return []

    let result = tickets.filter((ticket) => {
      // Status filter
      switch (filter) {
        case 'open':
          if (!(ticket.status === 'new' || ticket.status === 'open' || ticket.status === 'in_progress')) return false
          break
        case 'waiting':
          if (!(ticket.status === 'awaiting_customer' || ticket.status === 'awaiting_internal' || ticket.status === 'awaiting_supplier')) return false
          break
        case 'resolved':
          if (!(ticket.status === 'resolved' || ticket.status === 'closed')) return false
          break
      }

      // Owner filter
      switch (ownerFilter) {
        case 'my':
          if (ticket.assignedAgent !== CURRENT_AGENT) return false
          break
        case 'unassigned':
          if (ticket.assignedAgent !== null) return false
          break
      }

      return true
    })

    // Sort by SLA urgency: breached first (most overdue at top), then closest to breaching
    result.sort((a, b) => {
      const aRemaining = new Date(a.slaDeadline).getTime() - Date.now()
      const bRemaining = new Date(b.slaDeadline).getTime() - Date.now()
      return aRemaining - bRemaining
    })

    return result
  }, [tickets, filter, ownerFilter])

  if (!tickets) {
    return (
      <div className="p-5 text-center text-[var(--color-text-subtle)]">
        Loading...
      </div>
    )
  }

  // Counts for owner filter badges
  const myCount = tickets.filter((t) => t.assignedAgent === CURRENT_AGENT && t.status !== 'resolved' && t.status !== 'closed').length
  const unassignedCount = tickets.filter((t) => t.assignedAgent === null && t.status !== 'resolved' && t.status !== 'closed').length

  const FILTERS: Array<{ key: FilterKey; label: string }> = [
    { key: 'all', label: t('tickets.filterAll', 'All') },
    { key: 'open', label: t('tickets.filterOpen', 'Open') },
    { key: 'waiting', label: t('tickets.filterWaiting', 'Waiting') },
    { key: 'resolved', label: t('tickets.filterResolved', 'Resolved') },
  ]

  const OWNER_FILTERS: Array<{ key: OwnerFilter; label: string; count?: number }> = [
    { key: 'my', label: t('tickets.myTickets', 'My Tickets'), count: myCount },
    { key: 'unassigned', label: t('tickets.unassigned', 'Unassigned'), count: unassignedCount },
    { key: 'all', label: t('tickets.allTickets', 'All') },
  ]

  return (
    <div className="p-5 space-y-4">
      {/* Owner filter row: My Tickets | Unassigned | All */}
      <div className="flex items-center gap-1">
        {OWNER_FILTERS.map((f) => (
          <Button
            key={f.key}
            onPress={() => setOwnerFilter(f.key)}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-medium cursor-pointer transition-all duration-150 outline-none flex items-center gap-1.5
              ${ownerFilter === f.key
                ? 'text-[var(--color-text)] bg-black/[0.06] dark:bg-white/[0.06]'
                : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
              }`}
          >
            {f.label}
            {f.count !== undefined && f.count > 0 && (
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] rounded-full bg-black/[0.08] dark:bg-white/[0.08] px-1.5 min-w-[18px] text-center">
                {f.count}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Status filter row + new ticket */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 flex-1">
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
        <Button
          onPress={() => setCreateTicketOpen(true)}
          className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-[13px] font-medium text-white cursor-pointer hover:opacity-90 transition-opacity outline-none"
        >
          {t('tickets.newTicket', 'New Ticket')}
        </Button>
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
            const isUnassigned = ticket.assignedAgent === null
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
                  ${isUnread ? 'border-s-2 border-s-[var(--color-primary)] ps-3.5' : ''}
                  ${isUnassigned ? 'bg-amber-500/[0.03] dark:bg-amber-500/[0.03]' : ''}`}
              >
                {/* Row 1: Subject + SLA countdown (prominent) */}
                <div className="flex items-center gap-3 mb-0.5">
                  <span className={`text-sm flex-1 truncate ${isUnread ? 'font-semibold text-[var(--color-text)]' : 'font-medium text-[var(--color-text)]'}`}>
                    {ticket.subject}
                  </span>

                  {/* SLA countdown — prominent pill */}
                  <span className={`shrink-0 flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold font-[family-name:var(--font-geist-mono)] tabular-nums ${sla.pillClass}`}>
                    {sla.breached && <AlertTriangle size={10} />}
                    {sla.label}
                  </span>
                </div>

                {/* Row 2: Customer + ticket # + priority dot + timestamp */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-text-muted)] truncate">
                    {ticket.customerName}
                  </span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-[var(--color-text-subtle)]">
                    {ticket.number}
                  </span>
                  <span className="flex-1" />

                  {/* Priority dot */}
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityDot(ticket.priority)}`} />

                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-subtle)] shrink-0">
                    {formatRelativeTime(ticket.createdAt)}
                  </span>
                </div>

                {/* Row 3: Agent assignment or unassigned badge */}
                <div className="mt-1 flex items-center gap-2">
                  {isUnassigned ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                      {t('tickets.unassigned', 'Unassigned')}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--color-text-subtle)] truncate">
                      {ticket.assignedAgent} — {t(`status.${statusToI18nKey(ticket.status)}`, ticket.status)}
                    </span>
                  )}
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
