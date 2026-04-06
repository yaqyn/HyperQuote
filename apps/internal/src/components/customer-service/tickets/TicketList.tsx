import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getTicketQueue } from '../../../lib/server/customer-service'
import { useCustomerServiceStore } from '../../../stores/customer-service'
import { SLA_CONFIG } from '../../../types/customer-service'
import type { TicketPriority, TicketStatus } from '../../../types/customer-service'

const PRIORITY_BADGE: Record<TicketPriority, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-[#2563EB]/10 text-[#2563EB]',
  low: 'bg-black/5 text-black/60 dark:bg-white/5 dark:text-white/60',
}

const STATUS_BADGE: Record<TicketStatus, string> = {
  new: 'bg-[#2563EB]/10 text-[#2563EB]',
  open: 'bg-[#2563EB]/10 text-[#2563EB]',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  awaiting_customer: 'bg-black/5 text-black/60 dark:bg-white/5 dark:text-white/60',
  awaiting_internal: 'bg-black/5 text-black/60 dark:bg-white/5 dark:text-white/60',
  awaiting_supplier: 'bg-black/5 text-black/60 dark:bg-white/5 dark:text-white/60',
  escalated: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-black/5 text-black/40 dark:bg-white/5 dark:text-white/40',
  reopened: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
}

/**
 * Ticket list — table view of all CS tickets.
 * Columns: #, Customer, Subject, Priority, Status, Assigned, SLA Countdown, Created.
 * Click row -> drill into TicketDetail.
 */
export function TicketList() {
  const { t } = useTranslation('customer-service')
  const setSelectedTicketId = useCustomerServiceStore((s) => s.setSelectedTicketId)

  const { data: tickets } = useQuery({
    queryKey: ['cs', 'tickets'],
    queryFn: () => getTicketQueue(),
    staleTime: 15_000,
  })

  if (!tickets) {
    return (
      <div className="p-6 text-center text-black/40 dark:text-white/40">
        Loading...
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
        <table className="w-full text-sm" role="grid">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
              <th className="px-4 py-3 text-start text-xs font-medium text-black/50 dark:text-white/50">
                {t('tickets.number', '#')}
              </th>
              <th className="px-4 py-3 text-start text-xs font-medium text-black/50 dark:text-white/50">
                {t('tickets.customer', 'Customer')}
              </th>
              <th className="px-4 py-3 text-start text-xs font-medium text-black/50 dark:text-white/50">
                {t('tickets.subject', 'Subject')}
              </th>
              <th className="px-4 py-3 text-start text-xs font-medium text-black/50 dark:text-white/50">
                {t('tickets.priority', 'Priority')}
              </th>
              <th className="px-4 py-3 text-start text-xs font-medium text-black/50 dark:text-white/50">
                {t('tickets.status', 'Status')}
              </th>
              <th className="px-4 py-3 text-start text-xs font-medium text-black/50 dark:text-white/50">
                {t('tickets.assignedTo', 'Assigned To')}
              </th>
              <th className="px-4 py-3 text-start text-xs font-medium text-black/50 dark:text-white/50">
                {t('tickets.slaCountdown', 'SLA')}
              </th>
              <th className="px-4 py-3 text-start text-xs font-medium text-black/50 dark:text-white/50">
                {t('tickets.created', 'Created')}
              </th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => {
              const sla = computeSLA(ticket.createdAt, ticket.priority, ticket.slaDeadline)

              return (
                <tr
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className="border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                  role="row"
                >
                  <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs">
                    {ticket.number}
                  </td>
                  <td className="px-4 py-3 text-sm">{ticket.customerName}</td>
                  <td className="px-4 py-3 text-sm max-w-xs truncate">{ticket.subject}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE[ticket.priority]}`}>
                      {t(`priority.${ticket.priority}`, ticket.priority)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[ticket.status]}`}>
                      {t(`status.${statusToI18nKey(ticket.status)}`, ticket.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-black/60 dark:text-white/60">
                    {ticket.assignedAgent ?? t('tickets.unassigned', 'Unassigned')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-xs font-medium ${sla.color}`}>
                      {sla.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/50 dark:text-white/50">
                    {formatRelativeTime(ticket.createdAt)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────

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
