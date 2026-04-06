import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { getTicketDetail } from '../../../lib/server/customer-service'
import { useCustomerServiceStore } from '../../../stores/customer-service'
import type { TicketStatus, TicketActivity } from '../../../types/customer-service'

const STATUS_STEPS: TicketStatus[] = [
  'open',
  'in_progress',
  'awaiting_customer',
  'awaiting_internal',
  'resolved',
  'closed',
]

const ALL_STATUSES: TicketStatus[] = [
  'new', 'open', 'in_progress', 'awaiting_customer', 'awaiting_internal',
  'awaiting_supplier', 'escalated', 'resolved', 'closed', 'reopened',
]

const PRIORITY_BADGE: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-[#2563EB]/10 text-[#2563EB]',
  low: 'bg-black/5 text-black/60 dark:bg-white/5 dark:text-white/60',
}

const STATUS_BADGE: Record<string, string> = {
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

function statusToI18nKey(status: TicketStatus): string {
  const map: Record<TicketStatus, string> = {
    new: 'new', open: 'open', in_progress: 'inProgress',
    awaiting_customer: 'awaitingCustomer', awaiting_internal: 'awaitingInternal',
    awaiting_supplier: 'awaitingSupplier', escalated: 'escalated',
    resolved: 'resolved', closed: 'closed', reopened: 'reopened',
  }
  return map[status]
}

/**
 * Ticket detail — full view of a single ticket.
 * Header with number/subject/priority/status, 6-step status stepper,
 * left side description + response thread, right sidebar customer info + links,
 * activity timeline, sub-tickets.
 */
export function TicketDetail() {
  const { t } = useTranslation('customer-service')
  const selectedTicketId = useCustomerServiceStore((s) => s.selectedTicketId)
  const setSelectedTicketId = useCustomerServiceStore((s) => s.setSelectedTicketId)

  const { data: ticket } = useQuery({
    queryKey: ['cs', 'ticket-detail', selectedTicketId],
    queryFn: () => getTicketDetail(),
    staleTime: 15_000,
    enabled: !!selectedTicketId,
  })

  if (!ticket) {
    return (
      <div className="p-6 text-center text-black/40 dark:text-white/40">
        Loading...
      </div>
    )
  }

  const currentStepIdx = STATUS_STEPS.indexOf(ticket.status)

  return (
    <div className="p-6 space-y-6">
      {/* Back button */}
      <Button
        onPress={() => setSelectedTicketId(null)}
        className="text-sm text-[#2563EB] hover:underline cursor-pointer"
      >
        &larr; {t('tickets.back', 'Back to Tickets')}
      </Button>

      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <h2 className="font-[family-name:var(--font-geist-mono)] tabular-nums text-lg font-semibold">
          {ticket.number}
        </h2>
        <h3 className="text-lg">{ticket.subject}</h3>
        <div className="flex gap-2 ms-auto">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_BADGE[ticket.priority] ?? ''}`}>
            {t(`priority.${ticket.priority}`, ticket.priority)}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[ticket.status] ?? ''}`}>
            {t(`status.${statusToI18nKey(ticket.status)}`, ticket.status)}
          </span>
        </div>
      </div>

      {/* Status stepper — visual 6-step flow */}
      <div className="flex items-center gap-1 overflow-x-auto py-2">
        {STATUS_STEPS.map((step, idx) => {
          const isComplete = currentStepIdx >= 0 && idx <= currentStepIdx
          const isCurrent = idx === currentStepIdx

          return (
            <div key={step} className="flex items-center">
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  isCurrent
                    ? 'bg-[#2563EB] text-white'
                    : isComplete
                      ? 'bg-[#2563EB]/10 text-[#2563EB]'
                      : 'bg-black/5 text-black/40 dark:bg-white/5 dark:text-white/40'
                }`}
              >
                {isComplete && !isCurrent && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
                {t(`status.${statusToI18nKey(step)}`, step)}
              </div>
              {idx < STATUS_STEPS.length - 1 && (
                <div className={`w-4 h-px mx-0.5 ${isComplete ? 'bg-[#2563EB]' : 'bg-black/10 dark:bg-white/10'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Main content: left side + right sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <section className="rounded-xl border border-black/10 dark:border-white/10 p-4">
            <h4 className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase mb-2">
              {t('tickets.description', 'Description')}
            </h4>
            <p className="text-sm leading-relaxed">{ticket.description}</p>
          </section>

          {/* Attachments */}
          {ticket.attachments.length > 0 && (
            <section className="rounded-xl border border-black/10 dark:border-white/10 p-4">
              <h4 className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase mb-2">
                {t('tickets.attachments', 'Attachments')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {ticket.attachments.map((url, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] px-3 py-2 text-xs text-[#2563EB]"
                  >
                    Attachment {idx + 1}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Response thread */}
          <section className="rounded-xl border border-black/10 dark:border-white/10 p-4">
            <h4 className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase mb-3">
              {t('tickets.activityTimeline', 'Activity Timeline')}
            </h4>
            <div className="space-y-3">
              {ticket.activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} t={t} />
              ))}
            </div>
          </section>

          {/* Sub-tickets */}
          {ticket.subTickets.length > 0 && (
            <section className="rounded-xl border border-black/10 dark:border-white/10 p-4">
              <h4 className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase mb-3">
                {t('tickets.subTickets', 'Sub-Tickets')}
              </h4>
              <div className="space-y-2">
                {ticket.subTickets.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-3 rounded-lg border border-black/5 dark:border-white/5 px-3 py-2"
                  >
                    <span className="rounded-full bg-[#2563EB]/10 px-2 py-0.5 text-xs font-medium text-[#2563EB]">
                      {sub.department}
                    </span>
                    <span className="text-sm flex-1">{sub.subject}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[sub.status] ?? ''}`}>
                      {t(`status.${statusToI18nKey(sub.status)}`, sub.status)}
                    </span>
                    <span className="text-xs text-black/40 dark:text-white/40">
                      {sub.assignedAgent ?? t('tickets.unassigned', 'Unassigned')}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Customer info */}
          <div className="rounded-xl border border-black/10 dark:border-white/10 p-4">
            <h4 className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase mb-2">
              {t('tickets.customer', 'Customer')}
            </h4>
            <p className="text-sm font-medium">{ticket.customerName}</p>
          </div>

          {/* Assigned agent */}
          <div className="rounded-xl border border-black/10 dark:border-white/10 p-4">
            <h4 className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase mb-2">
              {t('tickets.assignedTo', 'Assigned To')}
            </h4>
            <p className="text-sm">{ticket.assignedAgent ?? t('tickets.unassigned', 'Unassigned')}</p>
          </div>

          {/* Linked orders */}
          {ticket.linkedOrders.length > 0 && (
            <div className="rounded-xl border border-black/10 dark:border-white/10 p-4">
              <h4 className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase mb-2">
                {t('tickets.linkedOrders', 'Linked Orders')}
              </h4>
              <div className="space-y-1">
                {ticket.linkedOrders.map((id) => (
                  <div key={id} className="text-sm font-[family-name:var(--font-geist-mono)] tabular-nums text-[#2563EB]">
                    {id}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked quotes */}
          {ticket.linkedQuotes.length > 0 && (
            <div className="rounded-xl border border-black/10 dark:border-white/10 p-4">
              <h4 className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase mb-2">
                {t('tickets.linkedQuotes', 'Linked Quotes')}
              </h4>
              <div className="space-y-1">
                {ticket.linkedQuotes.map((id) => (
                  <div key={id} className="text-sm font-[family-name:var(--font-geist-mono)] tabular-nums text-[#2563EB]">
                    {id}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked invoices */}
          {ticket.linkedInvoices.length > 0 && (
            <div className="rounded-xl border border-black/10 dark:border-white/10 p-4">
              <h4 className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase mb-2">
                {t('tickets.linkedInvoices', 'Linked Invoices')}
              </h4>
              <div className="space-y-1">
                {ticket.linkedInvoices.map((id) => (
                  <div key={id} className="text-sm font-[family-name:var(--font-geist-mono)] tabular-nums text-[#2563EB]">
                    {id}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <Button
              onPress={() => console.log('[CS] Respond to ticket')}
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]/90 cursor-pointer text-center"
            >
              {t('tickets.respond', 'Respond')}
            </Button>
            <Button
              onPress={() => console.log('[CS] Escalate ticket')}
              className="rounded-lg border border-red-200 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 cursor-pointer text-center"
            >
              {t('tickets.escalate', 'Escalate')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────

function ActivityItem({
  activity,
  t,
}: {
  activity: TicketActivity
  t: (key: string, fallback?: string) => string
}) {
  const bgClass = activity.isInternal
    ? 'bg-amber-50/60 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-800/30'
    : 'bg-white/60 dark:bg-black/60 border-black/5 dark:border-white/5'

  const iconMap: Record<TicketActivity['type'], string> = {
    status_change: 'S',
    comment: 'C',
    note: 'N',
    assignment: 'A',
    escalation: 'E',
  }

  return (
    <div className={`rounded-lg border px-4 py-3 ${bgClass}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold">
          {iconMap[activity.type]}
        </span>
        <span className="text-xs font-medium">{activity.author}</span>
        {activity.isInternal && (
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
            {t('tickets.internalNotes', 'Internal')}
          </span>
        )}
        <span className="text-xs text-black/40 dark:text-white/40 font-[family-name:var(--font-geist-mono)] tabular-nums ms-auto">
          {formatActivityTime(activity.timestamp)}
        </span>
      </div>
      <p className="text-sm text-black/70 dark:text-white/70">{activity.content}</p>
    </div>
  )
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
