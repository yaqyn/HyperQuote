import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getTicketQueue } from '../../../lib/server/customer-service'
import { getWhatsAppInbox, getReturnsClaims } from '../../../lib/server/customer-service'
import type { TicketPriority } from '../../../types/customer-service'

// ─── Glass panel wrapper ────────────────────────────────

function GlassPanel({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-5 ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * CS Home view — overview dashboard with 4 glass panels.
 * Open tickets by priority, unread WhatsApp, SLA status, active returns.
 */
export function CSHome() {
  const { t } = useTranslation('customer-service')

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
      <div className="p-6 text-center text-black/40 dark:text-white/40">
        Loading...
      </div>
    )
  }

  // Compute ticket counts by priority
  const openTickets = tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed')
  const priorityCounts: Record<TicketPriority, number> = {
    critical: openTickets.filter((t) => t.priority === 'critical').length,
    high: openTickets.filter((t) => t.priority === 'high').length,
    medium: openTickets.filter((t) => t.priority === 'medium').length,
    low: openTickets.filter((t) => t.priority === 'low').length,
  }

  // Oldest ticket age
  const oldestTicket = openTickets.length > 0
    ? openTickets.reduce((oldest, ticket) =>
        new Date(ticket.createdAt) < new Date(oldest.createdAt) ? ticket : oldest
      )
    : null
  const oldestAgeHours = oldestTicket
    ? Math.round((Date.now() - new Date(oldestTicket.createdAt).getTime()) / (1000 * 60 * 60))
    : 0

  // WhatsApp unread count
  const unreadCount = conversations.filter((c) => c.unread).length

  // Active returns/claims count
  const activeClaimsCount = returnsClaims.claims.filter((c) => c.status !== 'settled').length
  const activeReturnsCount = returnsClaims.returns.filter((r) => r.status !== 'credit_issued').length

  // SLA mock percentages (computed dynamically from ticket data)
  const totalOpen = openTickets.length || 1
  const breachedCount = openTickets.filter((t) => new Date(t.slaDeadline) < new Date()).length
  const atRiskCount = openTickets.filter((t) => {
    const deadline = new Date(t.slaDeadline).getTime()
    const now = Date.now()
    const remaining = deadline - now
    const total = deadline - new Date(t.createdAt).getTime()
    return remaining > 0 && remaining / total < 0.2
  }).length
  const onTrackCount = totalOpen - breachedCount - atRiskCount
  const onTrackPct = Math.round((onTrackCount / totalOpen) * 100)
  const atRiskPct = Math.round((atRiskCount / totalOpen) * 100)
  const breachedPct = Math.round((breachedCount / totalOpen) * 100)

  const PRIORITY_COLORS: Record<TicketPriority, string> = {
    critical: 'text-red-600 dark:text-red-400',
    high: 'text-orange-600 dark:text-orange-400',
    medium: 'text-[#2563EB]',
    low: 'text-black/50 dark:text-white/50',
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* 1. Open tickets by priority */}
        <GlassPanel>
          <h3 className="text-sm font-semibold mb-4">
            {t('home.openTickets', 'Open Tickets')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {(['critical', 'high', 'medium', 'low'] as TicketPriority[]).map((priority) => (
              <div key={priority}>
                <div className="text-xs text-black/50 dark:text-white/50 mb-1">
                  {t(`priority.${priority}`, priority)}
                </div>
                <div className={`text-2xl font-[family-name:var(--font-geist-mono)] tabular-nums ${PRIORITY_COLORS[priority]}`}>
                  {priorityCounts[priority]}
                </div>
              </div>
            ))}
          </div>
          {oldestTicket && (
            <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/10 text-xs text-black/50 dark:text-white/50">
              {t('home.oldestAge', 'Oldest')}:{' '}
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                {oldestAgeHours}h
              </span>
            </div>
          )}
        </GlassPanel>

        {/* 2. Unread WhatsApp */}
        <GlassPanel>
          <h3 className="text-sm font-semibold mb-4">
            {t('home.unreadWhatsApp', 'Unread WhatsApp')}
          </h3>
          <div className="text-4xl font-[family-name:var(--font-geist-mono)] tabular-nums text-[#2563EB]">
            {unreadCount}
          </div>
          <div className="mt-2 text-xs text-black/50 dark:text-white/50">
            {t('whatsapp.conversations', 'Conversations')}:{' '}
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
              {conversations.length}
            </span>
          </div>
        </GlassPanel>

        {/* 3. SLA Status */}
        <GlassPanel>
          <h3 className="text-sm font-semibold mb-4">
            {t('home.slaStatus', 'SLA Status')}
          </h3>
          <div className="flex gap-6">
            <div>
              <div className="text-xs text-black/50 dark:text-white/50 mb-1">
                {t('home.onTrack', 'On Track')}
              </div>
              <div className="text-2xl font-[family-name:var(--font-geist-mono)] tabular-nums text-green-600 dark:text-green-400">
                {onTrackPct}%
              </div>
            </div>
            <div>
              <div className="text-xs text-black/50 dark:text-white/50 mb-1">
                {t('home.atRisk', 'At Risk')}
              </div>
              <div className="text-2xl font-[family-name:var(--font-geist-mono)] tabular-nums text-amber-600 dark:text-amber-400">
                {atRiskPct}%
              </div>
            </div>
            <div>
              <div className="text-xs text-black/50 dark:text-white/50 mb-1">
                {t('home.breached', 'Breached')}
              </div>
              <div className="text-2xl font-[family-name:var(--font-geist-mono)] tabular-nums text-red-600 dark:text-red-400">
                {breachedPct}%
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* 4. Active Returns / Claims */}
        <GlassPanel>
          <h3 className="text-sm font-semibold mb-4">
            {t('home.activeReturns', 'Active Returns')}
          </h3>
          <div className="flex gap-6">
            <div>
              <div className="text-xs text-black/50 dark:text-white/50 mb-1">
                {t('returns.damageClaims', 'Damage Claims')}
              </div>
              <div className="text-2xl font-[family-name:var(--font-geist-mono)] tabular-nums">
                {activeClaimsCount}
              </div>
            </div>
            <div>
              <div className="text-xs text-black/50 dark:text-white/50 mb-1">
                {t('returns.returnRequests', 'Return Requests')}
              </div>
              <div className="text-2xl font-[family-name:var(--font-geist-mono)] tabular-nums">
                {activeReturnsCount}
              </div>
            </div>
          </div>
          {/* FIRST ORDER concept: flag damage claims where customer.total_orders <= 1
              This would be implemented when real customer data is available from the database.
              First-time customer damage claims should be handled with extra care to ensure retention. */}
        </GlassPanel>
      </div>
    </div>
  )
}
