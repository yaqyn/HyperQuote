import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { RFQ } from '../../types/sales'
import { calculatePriorityScore } from '../../types/sales'
import { db, hoursSince } from '../db/db'

// ─── Projection helpers ──────────────────────────────────

/**
 * The outdated-prices warning only makes sense BEFORE a quote is built.
 * Once an RFQ is evaluated, its prices are locked into the quote — the
 * report carries those snapshots, not live supplier_prices.
 */
const PRE_QUOTE_STATUSES = new Set([
	'submitted',
	'assigned',
	'awaiting_clarification',
])

function hasOutdatedPrices(rfqId: string): boolean {
	const rfq = db.rfqs.get(rfqId)
	if (!rfq) return false
	if (!PRE_QUOTE_STATUSES.has(rfq.status)) return false

	// Once the rep starts a draft we trust their working set — items they
	// removed should stop counting against freshness, items they kept become
	// the new staleness check. Falls back to the original RFQ item list when
	// no draft exists yet (still in the inbox, not opened).
	const drafts = db.quotes
		.forRfq(rfqId)
		.filter((q) => q.status !== 'accepted' && q.status !== 'declined')
	const slugs =
		drafts.length > 0
			? drafts.flatMap((q) => q.items.map((i) => i.productSlug))
			: rfq.items.map((i) => i.productSlug)

	if (slugs.length === 0) return false
	for (const slug of slugs) {
		const primary = db.supplierPrices.primaryForProduct(slug)
		if (!primary) return true
		if (hoursSince(primary.lastQuotedAt) >= 24) return true
	}
	return false
}

/** Shape every DB row into the RFQ surface type the UI expects. */
function projectRfq(row: ReturnType<typeof db.rfqs.list>[number]): RFQ {
	const ageHours = Math.max(0, hoursSince(row.createdAt))
	const previewItems = row.items
		.slice(0, 3)
		.map((i) => db.products.findBySlug(i.productSlug)?.name)
		.filter((n): n is string => !!n)

	return {
		id: row.id,
		customerName: row.customerName,
		customerTier: row.customerTier,
		estimatedValue: row.estimatedValue,
		priorityScore: calculatePriorityScore(
			row.customerTier,
			row.estimatedValue,
			ageHours,
			row.deliveryUrgency,
		),
		lineItemCount: row.items.length,
		status: row.status,
		assignedRep: row.assignedRep,
		createdAt: row.createdAt,
		slaDeadline: row.slaDeadline,
		deliveryUrgency: row.deliveryUrgency,
		previewItems,
		deliveryCity: row.deliveryCity,
		contactName: row.contactName,
		hasOutdatedPrices: hasOutdatedPrices(row.id),
	}
}

// ─── Server Functions ─────────────────────────────────────

export const getRFQQueue = createServerFn({ method: 'GET' })
	.inputValidator(
		z.object({
			status: z.string().optional(),
			assignedTo: z.string().optional(),
			page: z.number().default(1),
			limit: z.number().default(50),
		}),
	)
	.handler(async ({ data: input }) => {
		// Revert any saved orders whose timer has expired
		const now = Date.now()
		for (const rfq of db.rfqs.list()) {
			if (
				rfq.status === 'saved' &&
				rfq.savedUntil &&
				new Date(rfq.savedUntil).getTime() <= now
			) {
				rfq.status = 'submitted'
				rfq.savedUntil = null
			}
		}
		const rows = db.rfqs.list()
		let rfqs = rows.map(projectRfq)
		if (input.status) rfqs = rfqs.filter((r) => r.status === input.status)
		if (input.assignedTo)
			rfqs = rfqs.filter((r) => r.assignedRep === input.assignedTo)
		rfqs.sort((a, b) => b.priorityScore - a.priorityScore)
		const start = (input.page - 1) * input.limit
		const responseAges = rows
			.filter((rfq) => rfq.assignedRep !== null)
			.map((rfq) => hoursSince(rfq.createdAt))
		const avgResponseTime =
			responseAges.length > 0
				? Math.round(
						(responseAges.reduce((sum, age) => sum + age, 0) /
							responseAges.length) *
							10,
					) / 10
				: 0
		return {
			rfqs: rfqs.slice(start, start + input.limit),
			total: rfqs.length,
			avgResponseTime,
		}
	})

export const declineRFQ = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			rfqId: z.string(),
			reason: z.enum([
				'outside_service_area',
				'cannot_source',
				'customer_blacklisted',
			]),
			note: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		db.rfqs.updateStatus(data.rfqId, 'declined')
		db.orderReports.ensureForRfq(data.rfqId)
		db.orderReports.markCanceled(data.rfqId, data.reason, data.note ?? null)
		return {
			success: true,
			rfqId: data.rfqId,
			status: 'declined' as const,
			reason: data.reason,
			note: data.note ?? null,
			declinedAt: new Date().toISOString(),
		}
	})

/**
 * Save/hold an RFQ for later. Changes status to 'saved'.
 * After `returnInMinutes`, a real system would schedule a job to revert to 'submitted'.
 * Action is recorded in the order report.
 */
export const saveRFQForLater = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			rfqId: z.string(),
			returnInMinutes: z.number(),
		}),
	)
	.handler(async ({ data }) => {
		const rfq = db.rfqs.get(data.rfqId)
		if (rfq) {
			rfq.status = 'saved'
			rfq.savedUntil = new Date(
				Date.now() + data.returnInMinutes * 60_000,
			).toISOString()
		}
		db.orderReports.ensureForRfq(data.rfqId)
		return {
			success: true,
			rfqId: data.rfqId,
			status: 'saved' as const,
			returnsAt: rfq?.savedUntil ?? null,
		}
	})
