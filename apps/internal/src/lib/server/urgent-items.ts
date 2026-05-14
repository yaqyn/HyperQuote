import { createServerFn } from '@tanstack/react-start'
import { db, hoursSince } from '../db/db'

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

async function countUnassignedRfqs(): Promise<number> {
	return db.rfqs
		.list()
		.filter(
			(rfq) => rfq.status === 'submitted' && hoursSince(rfq.createdAt) > 0.5,
		).length
}

async function countExpiringQuotes(): Promise<number> {
	const oneDayFromNow = Date.now() + 24 * 60 * 60 * 1000
	const activeStatuses = new Set(['sent', 'viewed', 'negotiating', 'revised'])
	return db.quotes
		.list()
		.filter(
			(quote) =>
				activeStatuses.has(quote.status) &&
				new Date(quote.validUntil).getTime() <= oneDayFromNow,
		).length
}

async function countPendingApprovals(): Promise<number> {
	return db.quotes.list().filter((quote) => quote.status === 'pending_approval')
		.length
}

async function countProblemDeliveries(): Promise<number> {
	return db.deals
		.list()
		.filter((deal) =>
			deal.receivingAttempts.some(
				(attempt) => attempt.rejectedSlugs.length > 0,
			),
		).length
}

async function countOverdueInvoices(): Promise<number> {
	return db.quotes
		.list()
		.filter(
			(quote) =>
				quote.paymentStatus !== 'paid' &&
				quote.sentAt !== null &&
				hoursSince(quote.sentAt) > 60 * 24,
		).length
}

async function countSlaBreaches(): Promise<number> {
	return db.conversations
		.list()
		.filter((conversation) => conversation.slaBreached).length
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
