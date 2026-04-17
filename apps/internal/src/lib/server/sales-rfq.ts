import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
	CustomerSnapshot,
	RFQ,
	RFQDetail,
	RFQItem,
} from '../../types/sales'
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
	for (const item of rfq.items) {
		const primary = db.supplierPrices.primaryForProduct(item.productSlug)
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
		let rfqs = db.rfqs.list().map(projectRfq)
		if (input.status) rfqs = rfqs.filter((r) => r.status === input.status)
		if (input.assignedTo)
			rfqs = rfqs.filter((r) => r.assignedRep === input.assignedTo)
		rfqs.sort((a, b) => b.priorityScore - a.priorityScore)
		const start = (input.page - 1) * input.limit
		return {
			rfqs: rfqs.slice(start, start + input.limit),
			total: rfqs.length,
			avgResponseTime: 2.3, // derived metric placeholder — wire real stat when analytics pipeline ships
		}
	})

export const getRFQDetail = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ rfqId: z.string() }))
	.handler(async ({ data }) => {
		const row = db.rfqs.get(data.rfqId) ?? db.rfqs.list()[0]
		const customerRow = db.customers.findByName(row.customerName)

		const customer: CustomerSnapshot = {
			id: customerRow?.id ?? 'cust-unknown',
			name: row.customerName,
			tier: row.customerTier,
			orderCount: customerRow?.orderCount ?? 0,
			lifetimeValue: customerRow?.lifetimeValue ?? 0,
			avgMargin: customerRow?.avgMargin ?? 0,
			paymentHistory: customerRow?.paymentHistory ?? 'good',
			creditLimit: customerRow?.creditLimit ?? 0,
			currentExposure: customerRow?.currentExposure ?? 0,
			availableCredit:
				(customerRow?.creditLimit ?? 0) - (customerRow?.currentExposure ?? 0),
		}

		const items: RFQItem[] = row.items
			.map((item) => {
				const product = db.products.findBySlug(item.productSlug)
				if (!product) return null
				return {
					id: `item-${item.productSlug}`,
					productName: product.name,
					specification: product.subcategory.replace(/_/g, ' '),
					quantity: item.quantity,
					unit: product.unit_of_measure,
					customerDescription: product.description.slice(0, 80),
				} satisfies RFQItem
			})
			.filter((x): x is RFQItem => x !== null)

		// Similar quotes — pulled from the quotes table, filtered to this customer.
		const similarQuotes = customerRow
			? db.quotes
					.forCustomer(customerRow.id)
					.slice(0, 3)
					.map((q) => {
						const total = q.items.reduce(
							(s, i) => s + i.sellPrice * i.quantity,
							0,
						)
						return {
							id: q.id,
							quoteNumber: q.quoteNumber,
							marginPercent: q.marginPercent,
							outcome: (q.status === 'accepted'
								? 'won'
								: q.status === 'declined'
									? 'lost'
									: 'lost') as 'won' | 'lost',
							value: total,
						}
					})
			: []

		const detail: RFQDetail = {
			...projectRfq(row),
			items,
			customer,
			deliveryRequirements: {
				address: row.deliveryAddress,
				requestedDate: new Date(
					Date.now() + row.deliveryUrgency * 86_400_000,
				).toISOString(),
				deliveryType: 'Jobsite Delivery',
				specialInstructions: '',
			},
			attachments: [],
			aiInsights: undefined,
			similarQuotes,
		}
		return detail
	})

export const requestClarification = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			rfqId: z.string(),
			questions: z.array(
				z.object({
					type: z.enum([
						'material_spec_ambiguous',
						'quantity_unclear',
						'delivery_access',
						'no_date',
						'mixed_units',
						'missing_attachment',
					]),
					freeText: z.string().optional(),
				}),
			),
		}),
	)
	.handler(async ({ data }) => {
		db.rfqs.updateStatus(data.rfqId, 'awaiting_clarification')
		const now = new Date().toISOString()
		return {
			success: true,
			rfqId: data.rfqId,
			status: 'awaiting_clarification' as const,
			questionsCount: data.questions.length,
			updatedAt: now,
			scheduledFollowUp: new Date(Date.now() + 48 * 3_600_000).toISOString(),
			scheduledArchive: new Date(Date.now() + 7 * 86_400_000).toISOString(),
			notificationsSent: ['portal', 'email', 'whatsapp'],
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
			rfq.savedUntil = new Date(Date.now() + 10_000).toISOString() // DEV: 10s. Production: data.returnInMinutes * 60_000
		}
		db.orderReports.ensureForRfq(data.rfqId)
		return {
			success: true,
			rfqId: data.rfqId,
			status: 'saved' as const,
			returnsAt: rfq?.savedUntil ?? null,
		}
	})

/**
 * Evaluate an RFQ — marks it as quoted. The quote has been built and sent.
 * Action is recorded in the order report.
 */
export const evaluateRFQ = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ rfqId: z.string() }))
	.handler(async ({ data }) => {
		db.rfqs.updateStatus(data.rfqId, 'quoted')
		db.orderReports.ensureForRfq(data.rfqId)
		return {
			success: true,
			rfqId: data.rfqId,
			status: 'quoted' as const,
			evaluatedAt: new Date().toISOString(),
		}
	})

export const reassignRFQ = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ rfqId: z.string(), toUserId: z.string() }))
	.handler(async ({ data }) => {
		const rep = db.salesReps.get(data.toUserId)
		if (rep) {
			db.rfqs.assign(data.rfqId, rep.name)
			return { success: true, assigneeName: rep.name }
		}
		return { success: false, assigneeName: 'Unknown' }
	})

/**
 * Auto-assign walks a deterministic rule chain:
 * account owner → territory → specialization → value escalation → capacity.
 * Every input (reps, customers) comes from the DB.
 */
export const autoAssignRFQ = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ rfqId: z.string() }))
	.handler(async ({ data }) => {
		const CAPACITY_THRESHOLD = 10
		const VALUE_ESCALATION_THRESHOLD = 500_000

		const reps = db.salesReps.list()
		const rfq = db.rfqs.get(data.rfqId)
		if (!rfq || reps.length === 0) {
			return {
				success: false as const,
				assignedTo: 'Unknown',
				assignedToId: '',
				assignmentReason: 'round_robin' as const,
			}
		}
		const customer = db.customers.findByName(rfq.customerName)

		type AssignmentReason =
			| 'account_owner'
			| 'territory'
			| 'round_robin'
			| 'specialization'
			| 'value_escalation'
			| 'capacity_rebalance'

		let assignedRep = reps[0]
		let reason: AssignmentReason = 'round_robin'

		// Step 1 — account owner
		if (customer?.assignedSalesRep) {
			const owner = db.salesReps.findByName(customer.assignedSalesRep)
			if (owner && owner.activeRfqs < CAPACITY_THRESHOLD) {
				assignedRep = owner
				reason = 'account_owner'
			}
		}

		// Step 2 — territory
		if (reason !== 'account_owner') {
			const city = rfq.deliveryCity.toLowerCase()
			const territoryRep = reps.find(
				(r) =>
					r.territories.some((t) => city.includes(t)) &&
					r.activeRfqs < CAPACITY_THRESHOLD,
			)
			if (territoryRep) {
				assignedRep = territoryRep
				reason = 'territory'
			}
		}

		// Step 3 — round robin
		if (reason !== 'account_owner' && reason !== 'territory') {
			const available = reps.filter((r) => r.activeRfqs < CAPACITY_THRESHOLD)
			if (available.length > 0) {
				assignedRep = available.reduce((min, r) =>
					r.activeRfqs < min.activeRfqs ? r : min,
				)
				reason = 'round_robin'
			}
		}

		// Step 4 — specialization
		const broadCats = new Set(
			rfq.items
				.map((i) => db.products.findBySlug(i.productSlug))
				.filter((p): p is NonNullable<typeof p> => !!p)
				.map((p) => db.products.broadCategoryFor(p)),
		)
		const specialist = reps.find(
			(r) =>
				r.specialization.some((s) => broadCats.has(s as never)) &&
				r.activeRfqs < CAPACITY_THRESHOLD,
		)
		if (specialist) {
			assignedRep = specialist
			reason = 'specialization'
		}

		// Step 5 — value escalation
		if (rfq.estimatedValue > VALUE_ESCALATION_THRESHOLD) {
			const seniorRep = reps.find(
				(r) => r.role === 'senior' && r.activeRfqs < CAPACITY_THRESHOLD,
			)
			if (seniorRep) {
				assignedRep = seniorRep
				reason = 'value_escalation'
			}
		}

		// Step 6 — capacity throttle
		if (assignedRep.activeRfqs >= CAPACITY_THRESHOLD) {
			const fallback = reps
				.filter((r) => r.activeRfqs < CAPACITY_THRESHOLD)
				.sort((a, b) => a.activeRfqs - b.activeRfqs)[0]
			if (fallback) {
				assignedRep = fallback
				reason = 'capacity_rebalance'
			}
		}

		db.rfqs.assign(data.rfqId, assignedRep.name)

		return {
			success: true as const,
			assignedTo: assignedRep.name,
			assignedToId: assignedRep.id,
			assignmentReason: reason,
		}
	})
