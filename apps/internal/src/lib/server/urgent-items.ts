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

type UrgentItemsClient = Awaited<
	ReturnType<typeof getInternalSupabaseClient>
>['client']

type UrgentItemsPanel = 'sales' | 'finance' | 'dispatch' | 'customer_service'

async function canReadPanel(
	client: UrgentItemsClient,
	panel: UrgentItemsPanel,
): Promise<boolean> {
	const { data, error } = await client.rpc('can_access_panel', {
		required_panel: panel,
		write_required: false,
	})
	if (error) throw new Error(error.message)
	return data === true
}

async function countedWhen(
	allowed: boolean,
	query: () => Parameters<typeof counted>[0],
): Promise<number> {
	return allowed ? counted(query()) : 0
}

export const getUrgentItems = createServerFn({ method: 'GET' }).handler(
	async (): Promise<UrgentItemsResult> => {
		const { client } = await getInternalSupabaseClient({
			activeEmployeeOnly: true,
		})
		const now = new Date().toISOString()
		const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
		const overdue = new Date(
			Date.now() - 60 * 24 * 60 * 60 * 1000,
		).toISOString()
		const [canReadSales, canReadFinance, canReadDispatch, canReadSupport] =
			await Promise.all([
				canReadPanel(client, 'sales'),
				canReadPanel(client, 'finance'),
				canReadPanel(client, 'dispatch'),
				canReadPanel(client, 'customer_service'),
			])

		const [
			unassignedRfqs,
			expiringQuotes,
			pendingApprovals,
			problemDeliveries,
			overdueInvoices,
			slaBreaches,
		] = await Promise.all([
			countedWhen(canReadSales, () =>
				client
					.from('quote_requests')
					.select('id', { count: 'exact', head: true })
					.eq('status', 'submitted')
					.lte('eligible_at', now),
			),
			countedWhen(canReadSales, () =>
				client
					.from('quotes')
					.select('id', { count: 'exact', head: true })
					.in('status', ['sent', 'viewed', 'negotiating', 'revised'])
					.lte('valid_until', tomorrow),
			),
			countedWhen(canReadFinance, () =>
				client
					.from('approvals')
					.select('id', { count: 'exact', head: true })
					.eq('status', 'pending'),
			),
			countedWhen(canReadDispatch, () =>
				client
					.from('deliveries')
					.select('id', { count: 'exact', head: true })
					.eq('status', 'rejected'),
			),
			countedWhen(canReadFinance, () =>
				client
					.from('orders')
					.select('id', { count: 'exact', head: true })
					.neq('status', 'delivered')
					.lte('created_at', overdue),
			),
			countedWhen(canReadSupport, () =>
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
