import { createServerFn } from '@tanstack/react-start'

interface UrgentItemsBreakdown {
  unassignedRfqs: number
  expiringQuotes: number
  pendingApprovals: number
  problemDeliveries: number
  overdueInvoices: number
  slaBreaches: number
}

interface UrgentItemsResult {
  total: number
  breakdown: UrgentItemsBreakdown
}

// Each helper will query real DB tables when Supabase is connected:
// - quote_requests (unassigned > 30 min)
// - quotes (expiring within 24h)
// - approvals (pending for this user)
// - deliveries (red status)
// - invoices (> 60 days overdue, finance role only)
// - sla_tracking (active breaches)

async function countUnassignedRfqs(): Promise<number> {
  // TODO: query quote_requests WHERE assigned_to IS NULL AND created_at < NOW() - INTERVAL '30 minutes'
  return 0
}

async function countExpiringQuotes(): Promise<number> {
  // TODO: query quotes WHERE expires_at < NOW() + INTERVAL '24 hours' AND status = 'active'
  return 0
}

async function countPendingApprovals(): Promise<number> {
  // TODO: query approvals WHERE status = 'pending' AND approver_id = current_user
  return 0
}

async function countProblemDeliveries(): Promise<number> {
  // TODO: query deliveries WHERE status = 'problem' OR status = 'delayed'
  return 0
}

async function countOverdueInvoices(): Promise<number> {
  // TODO: query invoices WHERE due_date < NOW() - INTERVAL '60 days' AND status != 'paid' (finance role only)
  return 0
}

async function countSlaBreaches(): Promise<number> {
  // TODO: query sla_tracking WHERE breached = true AND resolved_at IS NULL
  return 0
}

export const getUrgentItems = createServerFn({ method: 'GET' }).handler(
  async (): Promise<UrgentItemsResult> => {
    const [
      unassignedRfqs,
      expiringQuotes,
      pendingApprovals,
      problemDeliveries,
      overdueInvoices,
      slaBreaches,
    ] = await Promise.all([
      countUnassignedRfqs(),
      countExpiringQuotes(),
      countPendingApprovals(),
      countProblemDeliveries(),
      countOverdueInvoices(),
      countSlaBreaches(),
    ])

    const breakdown: UrgentItemsBreakdown = {
      unassignedRfqs,
      expiringQuotes,
      pendingApprovals,
      problemDeliveries,
      overdueInvoices,
      slaBreaches,
    }

    const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0)

    return { total, breakdown }
  },
)
