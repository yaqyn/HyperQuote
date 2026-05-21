import { createServerFn } from '@tanstack/react-start'
import { getInternalSupabaseClient } from './_supabase'

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

async function counted(
	query: PromiseLike<{
		count: number | null
		error: { message: string } | null
	}>,
): Promise<number> {
	const { count, error } = await query
	if (error) throw new Error(error.message)
	return count ?? 0
}

export const getUrgentItems = createServerFn({ method: 'GET' }).handler(
	async (): Promise<UrgentItemsResult> => {
		const { client } = await getInternalSupabaseClient()
		const now = new Date().toISOString()
		const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
		const overdue = new Date(
			Date.now() - 60 * 24 * 60 * 60 * 1000,
		).toISOString()

		const [
			unassignedRfqs,
			expiringQuotes,
			pendingApprovals,
			problemDeliveries,
			overdueInvoices,
			slaBreaches,
		] = await Promise.all([
			counted(
				client
					.from('quote_requests')
					.select('id', { count: 'exact', head: true })
					.eq('status', 'submitted')
					.lte('eligible_at', now),
			),
			counted(
				client
					.from('quotes')
					.select('id', { count: 'exact', head: true })
					.in('status', ['sent', 'viewed', 'negotiating', 'revised'])
					.lte('valid_until', tomorrow),
			),
			counted(
				client
					.from('approvals')
					.select('id', { count: 'exact', head: true })
					.eq('status', 'pending'),
			),
			counted(
				client
					.from('deliveries')
					.select('id', { count: 'exact', head: true })
					.eq('status', 'rejected'),
			),
			counted(
				client
					.from('orders')
					.select('id', { count: 'exact', head: true })
					.neq('status', 'delivered')
					.lte('created_at', overdue),
			),
			counted(
				client
					.from('support_tickets')
					.select('id', { count: 'exact', head: true })
					.eq('status', 'open')
					.lte('created_at', overdue),
			),
		])

		const breakdown: UrgentItemsBreakdown = {
			unassignedRfqs,
			expiringQuotes,
			pendingApprovals,
			problemDeliveries,
			overdueInvoices,
			slaBreaches,
		}
		const total = Object.values(breakdown).reduce(
			(sum, value) => sum + value,
			0,
		)

		return { total, breakdown }
	},
)
