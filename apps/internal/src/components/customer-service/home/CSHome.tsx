import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { getTicketQueue } from '../../../lib/server/customer-service'
import { getWhatsAppInbox, getReturnsClaims } from '../../../lib/server/customer-service'
import { useCustomerServiceStore } from '../../../stores/customer-service'
import type { TicketPriority } from '../../../types/customer-service'

/**
 * CS Home — "The Queue"
 * Live stats strip + priority queue of tickets sorted by urgency.
 * Data is the design. No glass panels, no cards — raw data, large mono numbers.
 */
export function CSHome() {
  const { t } = useTranslation('customer-service')
  const setActiveTab = useCustomerServiceStore((s) => s.setActiveTab)
  const setSelectedTicketId = useCustomerServiceStore((s) => s.setSelectedTicketId)

  const { data: tickets } = useQuery({
    queryKey: ['cs', 'tickets'],
    queryFn: () => getTicketQueue(),
    staleTime: 15_000,
  })

  const { data: conversations } = useQuery({
    queryKey: ['cs', 'whatsapp'],
    queryFn: () => getWhatsAppInbox(),
    staleTime: 15_000,
  })

  const { data: returnsClaims } = useQuery({
    queryKey: ['cs', 'returns-claims'],
    queryFn: () => getReturnsClaims(),
    staleTime: 15_000,
  })

  if (!tickets || !conversations || !returnsClaims) {
    return (
      <div className="p-5 text-center text-[var(--color-text-subtle)]">
        Loading...
      </div>
    )
  }

  // Compute stats
  const openTickets = tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed')

  // Avg response time (mock from SLA data)
  const avgResponseMin = openTickets.length > 0
    ? Math.round(
        openTickets.reduce((sum, t) => {
          const age = Date.now() - new Date(t.createdAt).getTime()
          return sum + age / (1000 * 60)
        }, 0) / openTickets.length,
      )
    : 0

  // Resolution rate
  const resolvedCount = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length
  const resolutionRate = tickets.length > 0 ? Math.round((resolvedCount / tickets.length) * 100) : 0

  // Active returns
  const activeReturnsCount =
    returnsClaims.claims.filter((c) => c.status !== 'settled').length +
    returnsClaims.returns.filter((r) => r.status !== 'credit_issued').length

  // Priority queue — sorted by urgency (critical first, then by SLA deadline)
  const priorityOrder: Record<TicketPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  const queue = [...openTickets].sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (pDiff !== 0) return pDiff
    return new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime()
  })

  const stats = [
    {
      label: t('home.openTickets', 'Open Tickets'),
      value: openTickets.length,
      color: openTickets.length > 0 ? 'text-[var(--color-text)]' : 'text-[var(--color-text-subtle)]',
    },
    {
      label: t('home.avgResponse', 'Avg Response'),
      value: avgResponseMin > 60 ? `${Math.round(avgResponseMin / 60)}h` : `${avgResponseMin}m`,
      color: 'text-[var(--color-text)]',
    },
    {
      label: t('home.resolutionRate', 'Resolution Rate'),
      value: `${resolutionRate}%`,
      color: resolutionRate >= 80 ? 'text-green-600 dark:text-green-400' : 'text-[var(--color-text)]',
    },
    {
      label: t('home.activeReturns', 'Active Returns'),
      value: activeReturnsCount,
      color: activeReturnsCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--color-text-subtle)]',
    },
  ]

  return (
    <div className="p-5 space-y-6">
      {/* Stats strip */}
      <div className="flex items-baseline gap-8 border-b border-[var(--color-border)] pb-5">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-1">
              {stat.label}
            </div>
            <div className={`text-3xl font-[family-name:var(--font-geist-mono)] tabular-nums ${stat.color}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Priority queue */}
      <div>
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-3">
          {t('home.priorityQueue', 'Priority Queue')}
        </div>

        <div className="flex flex-col">
          <AnimatePresence mode="popLayout">
            {queue.map((ticket) => {
              const sla = computeSLA(ticket.slaDeadline)
              const isUnresponded = ticket.status === 'new' || ticket.status === 'open'

              return (
                <motion.button
                  key={ticket.id}
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  onClick={() => {
                    setSelectedTicketId(ticket.id)
                    setActiveTab('conversations')
                  }}
                  className={`group flex items-center gap-4 px-3 py-2.5 -mx-3 rounded-lg cursor-pointer transition-colors
                    hover:bg-black/[0.03] dark:hover:bg-white/[0.03]
                    ${isUnresponded ? 'border-s-2 border-[var(--color-primary)] ps-2.5' : 'border-s-2 border-transparent ps-2.5'}`}
                >
                  {/* Ticket number */}
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-subtle)] w-16 shrink-0 text-start">
                    {ticket.number}
                  </span>

                  {/* Customer */}
                  <span className="text-sm text-[var(--color-text-muted)] w-32 shrink-0 truncate text-start">
                    {ticket.customerName}
                  </span>

                  {/* Subject */}
                  <span className="text-sm text-[var(--color-text)] flex-1 truncate text-start">
                    {ticket.subject}
                  </span>

                  {/* Age */}
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-subtle)] w-12 shrink-0 text-end">
                    {formatAge(ticket.createdAt)}
                  </span>

                  {/* SLA countdown */}
                  <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-xs font-medium w-14 shrink-0 text-end ${sla.color}`}>
                    {sla.label}
                  </span>

                  {/* Status dot */}
                  <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot(ticket.priority)}`} />
                </motion.button>
              )
            })}
          </AnimatePresence>

          {queue.length === 0 && (
            <div className="py-12 text-center text-sm text-[var(--color-text-subtle)]">
              {t('home.allClear', 'All clear — no open tickets')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────

function statusDot(priority: TicketPriority): string {
  const map: Record<TicketPriority, string> = {
    critical: 'bg-red-500',
    high: 'bg-amber-500',
    medium: 'bg-[var(--color-primary)]',
    low: 'bg-black/20 dark:bg-white/20',
  }
  return map[priority]
}

function computeSLA(slaDeadline: string): { label: string; color: string } {
  const remaining = new Date(slaDeadline).getTime() - Date.now()

  if (remaining <= 0) {
    const breachedMin = Math.abs(Math.round(remaining / (1000 * 60)))
    return {
      label: breachedMin >= 60 ? `-${Math.round(breachedMin / 60)}h` : `-${breachedMin}m`,
      color: 'text-red-600 dark:text-red-400',
    }
  }

  const remainingMin = Math.round(remaining / (1000 * 60))
  const color = remainingMin > 120
    ? 'text-green-600 dark:text-green-400'
    : remainingMin > 30
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400'

  if (remainingMin >= 60) {
    const h = Math.floor(remainingMin / 60)
    const m = remainingMin % 60
    return { label: m > 0 ? `${h}h ${m}m` : `${h}h`, color }
  }
  return { label: `${remainingMin}m`, color }
}

function formatAge(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / (1000 * 60))
  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d`
}
