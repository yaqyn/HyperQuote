import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
	PipelineDeal,
	PipelineStage,
	PipelineStageId,
} from '../../types/sales'
import { db, hoursSince, type QuoteRow, type RfqRow } from '../db/db'

/**
 * Sales pipeline projection — every deal is derived from live RFQ + quote
 * rows in db. No hardcoded deals, no hardcoded reps, no hardcoded customer
 * names. Mapping from RFQ status → pipeline stage is the single source of
 * truth for how work flows through sales.
 */

const STAGE_NAMES: Record<PipelineStageId, string> = {
	rfq_received: 'RFQ Received',
	reviewing: 'Reviewing',
	sourcing: 'Sourcing',
	quoting: 'Quoting',
	sent: 'Sent to Customer',
	negotiating: 'Negotiating',
	closing: 'Closing',
	won: 'Won',
	lost_expired: 'Lost / Expired',
}

const STAGE_ORDER: PipelineStageId[] = [
	'rfq_received',
	'reviewing',
	'sourcing',
	'quoting',
	'sent',
	'negotiating',
	'closing',
	'won',
	'lost_expired',
]

// Base win probability by pipeline stage. Adjusted by age + customer tier below.
const STAGE_WIN_PROB: Record<PipelineStageId, number> = {
	rfq_received: 25,
	reviewing: 40,
	sourcing: 50,
	quoting: 55,
	sent: 60,
	negotiating: 65,
	closing: 85,
	won: 100,
	lost_expired: 0,
}

function rfqStatusToStage(status: string): PipelineStageId {
	switch (status) {
		case 'submitted':
		case 'assigned':
			return 'rfq_received'
		case 'reviewing':
			return 'reviewing'
		case 'quoting':
			return 'quoting'
		case 'quoted':
			return 'sent'
		case 'negotiating':
			return 'negotiating'
		case 'awaiting_clarification':
			return 'reviewing'
		case 'declined':
		case 'expired':
			return 'lost_expired'
		default:
			return 'rfq_received'
	}
}

function quoteStatusToStage(status: string): PipelineStageId {
	switch (status) {
		case 'draft':
		case 'internal_review':
			return 'quoting'
		case 'pending_approval':
		case 'approved':
			return 'quoting'
		case 'sent':
		case 'viewed':
			return 'sent'
		case 'negotiating':
		case 'revised':
			return 'negotiating'
		case 'accepted':
			return 'won'
		case 'declined':
		case 'expired':
			return 'lost_expired'
		default:
			return 'sent'
	}
}

function ageColor(daysInStage: number): 'green' | 'yellow' | 'red' {
	if (daysInStage < 3) return 'green'
	if (daysInStage < 7) return 'yellow'
	return 'red'
}

function buildDeals(): PipelineDeal[] {
	const deals: PipelineDeal[] = []

	// One deal per RFQ that hasn't been quoted yet.
	const rfqsQuoted = new Set(db.quotes.list().map((q) => q.rfqId))
	for (const rfq of db.rfqs.list()) {
		if (
			rfqsQuoted.has(rfq.id) &&
			rfq.status !== 'declined' &&
			rfq.status !== 'expired'
		)
			continue
		const stage = rfqStatusToStage(rfq.status)
		const ageHours = Math.max(0, hoursSince(rfq.createdAt))
		const daysInStage = Math.max(0, Math.floor(ageHours / 24))
		deals.push({
			id: `deal-rfq-${rfq.id}`,
			customerName: rfq.customerName,
			customerTier: rfq.customerTier,
			dealValue: rfq.estimatedValue,
			stage,
			daysInStage,
			winProbability: Math.max(
				5,
				STAGE_WIN_PROB[stage] - Math.floor(daysInStage / 3) * 5,
			),
			assignedRep: rfq.assignedRep ?? '—',
			statusText:
				stage === 'rfq_received'
					? 'Awaiting triage'
					: stage === 'reviewing'
						? 'Under review'
						: stage === 'lost_expired'
							? 'Declined/expired'
							: 'In progress',
			color: ageColor(daysInStage),
		})
	}

	// One deal per quote (overrides RFQ once a quote exists).
	for (const quote of db.quotes.list()) {
		const customer = db.customers.get(quote.customerId)
		if (!customer) continue
		const rfq = db.rfqs.get(quote.rfqId)
		const stage = quoteStatusToStage(quote.status)
		const value = quote.items.reduce((s, i) => s + i.sellPrice * i.quantity, 0)
		const anchor = quote.sentAt ?? new Date().toISOString()
		const ageHours = Math.max(0, hoursSince(anchor))
		const daysInStage = Math.max(0, Math.floor(ageHours / 24))
		deals.push({
			id: `deal-quote-${quote.id}`,
			customerName: customer.companyName,
			customerTier: customer.tier,
			dealValue: value,
			stage,
			daysInStage,
			winProbability: Math.max(
				stage === 'won' ? 100 : stage === 'lost_expired' ? 0 : 5,
				STAGE_WIN_PROB[stage] - Math.floor(daysInStage / 3) * 5,
			),
			assignedRep: rfq?.assignedRep ?? customer.assignedSalesRep ?? '—',
			statusText:
				stage === 'sent'
					? 'Awaiting customer'
					: stage === 'negotiating'
						? 'Negotiating terms'
						: stage === 'won'
							? 'Converted to order'
							: stage === 'lost_expired'
								? 'Lost'
								: 'In progress',
			color: ageColor(daysInStage),
		})
	}

	return deals
}

function summarize(deals: PipelineDeal[]): PipelineStage[] {
	return STAGE_ORDER.map((id) => {
		const stageDeals = deals.filter((d) => d.stage === id)
		return {
			id,
			name: STAGE_NAMES[id],
			dealCount: stageDeals.length,
			totalValue: stageDeals.reduce((sum, d) => sum + d.dealValue, 0),
		}
	})
}

// ─── Server Functions ─────────────────────────────────────

const getSalesPipeline = createServerFn({ method: 'GET' })
	.inputValidator(
		z.object({
			filters: z
				.object({
					rep: z.string().optional(),
					customer: z.string().optional(),
					valueRange: z.object({ min: z.number(), max: z.number() }).optional(),
					ageRange: z.object({ min: z.number(), max: z.number() }).optional(),
				})
				.optional(),
		}),
	)
	.handler(async ({ data }) => {
		let deals = buildDeals()
		const filters = data.filters
		if (filters?.rep) deals = deals.filter((d) => d.assignedRep === filters.rep)
		if (filters?.customer) {
			const q = filters.customer.toLowerCase()
			deals = deals.filter((d) => d.customerName.toLowerCase().includes(q))
		}
		if (filters?.valueRange) {
			const { min, max } = filters.valueRange
			deals = deals.filter((d) => d.dealValue >= min && d.dealValue <= max)
		}
		if (filters?.ageRange) {
			const { min, max } = filters.ageRange
			deals = deals.filter((d) => d.daysInStage >= min && d.daysInStage <= max)
		}
		return { stages: summarize(deals), deals }
	})

/** Reverse map: pipeline stage → underlying status on the rfq or quote row. */
const STAGE_TO_RFQ_STATUS: Record<string, RfqRow['status'] | null> = {
	rfq_received: 'submitted',
	reviewing: 'reviewing',
	sourcing: 'reviewing',
	quoting: 'quoting',
	sent: 'quoted',
	negotiating: 'negotiating',
	closing: 'quoted',
	won: null, // handled on the quote, not the rfq
	lost_expired: 'declined',
}
const STAGE_TO_QUOTE_STATUS: Record<string, QuoteRow['status'] | null> = {
	rfq_received: null,
	reviewing: null,
	sourcing: null,
	quoting: 'draft',
	sent: 'sent',
	negotiating: 'negotiating',
	closing: 'pending_approval',
	won: 'accepted',
	lost_expired: 'declined',
}

const moveDealStage = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ dealId: z.string(), toStage: z.string() }))
	.handler(async ({ data }) => {
		// Deal ids are prefixed `deal-rfq-` or `deal-quote-` by buildDeals.
		const fromStage = 'unknown'
		if (data.dealId.startsWith('deal-rfq-')) {
			const rfqId = data.dealId.replace('deal-rfq-', '')
			const newStatus = STAGE_TO_RFQ_STATUS[data.toStage]
			if (newStatus) db.rfqs.updateStatus(rfqId, newStatus)
		} else if (data.dealId.startsWith('deal-quote-')) {
			const quoteId = data.dealId.replace('deal-quote-', '')
			const newStatus = STAGE_TO_QUOTE_STATUS[data.toStage]
			if (newStatus) db.quotes.updateStatus(quoteId, newStatus)
		}
		return {
			success: true,
			dealId: data.dealId,
			fromStage,
			toStage: data.toStage,
			movedAt: new Date().toISOString(),
		}
	})

export const markAsWon = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({ quoteId: z.string(), customerPONumber: z.string().optional() }),
	)
	.handler(async ({ data }) => {
		// Flip the quote's status — everything downstream derives from it.
		const quote = db.quotes.updateStatus(data.quoteId, 'accepted')
		if (!quote) return { success: false as const, error: 'Quote not found' }
		// Freeze totalDue from current items at the moment of acceptance, and
		// seed payment state so the finance inbox immediately surfaces it as
		// "unpaid". Finance records the first 50% partial here before the order
		// can flow into the Inventory Orders tab.
		const frozenTotal =
			Math.round(
				quote.items.reduce((s, i) => s + i.sellPrice * i.quantity, 0) * 100,
			) / 100
		db.quotes.update(data.quoteId, {
			customerPoNumber: data.customerPONumber ?? quote.customerPoNumber ?? null,
			totalDue: frozenTotal,
			amountPaid: 0,
			paymentStatus: 'unpaid',
			partialPaidAt: null,
			fullPaidAt: null,
			partialProofUrl: null,
			fullProofUrl: null,
		})
		// Ensure the underlying RFQ has been walked forward — if the rep jumped
		// straight from reviewing to won without an explicit send, pull the RFQ
		// up to 'quoted' so the pipeline view and RFQ inbox are consistent.
		const rfq = db.rfqs.get(quote.rfqId)
		const forward = new Set(['quoted', 'negotiating', 'declined', 'expired'])
		if (rfq && !forward.has(rfq.status)) {
			db.rfqs.updateStatus(quote.rfqId, 'quoted')
		}
		return {
			success: true,
			orderId: quote.id,
			orderNumber: quote.quoteNumber,
		}
	})

export const markAsLost = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			quoteId: z.string(),
			lossReason: z.string(),
			competitorName: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const quote = db.quotes.updateStatus(data.quoteId, 'declined')
		if (!quote) return { success: false as const, error: 'Quote not found' }

		// Walk the RFQ forward to 'declined' so every panel downstream sees
		// the closed state consistently. Skip if the rfq is already on a
		// terminal bucket.
		const rfq = db.rfqs.get(quote.rfqId)
		if (rfq && rfq.status !== 'declined' && rfq.status !== 'expired') {
			db.rfqs.updateStatus(quote.rfqId, 'declined')
		}

		// Stamp the living document so the report viewer tells the whole
		// story including competitor + reason.
		db.orderReports.ensureForRfq(quote.rfqId)
		db.orderReports.markCanceled(
			quote.rfqId,
			data.lossReason,
			data.competitorName ?? null,
		)

		// If the order had already been approved for warehouse, release the
		// reserved stock back to available so inventory isn't phantom-locked.
		const report = db.orderReports.forRfq(quote.rfqId)
		if (report?.sections.inventory_orders) {
			for (const i of quote.items) {
				db.stock.release(i.productSlug, i.quantity)
			}
		}

		return { success: true as const }
	})

export const convertQuoteToOrder = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({ quoteId: z.string(), poNumber: z.string().optional() }),
	)
	.handler(async ({ data }) => {
		// Status flip — accepting a quote is the signal. Downstream panels
		// watch for `status === 'accepted'` and pick up the order from there.
		db.quotes.updateStatus(data.quoteId, 'accepted')
		const accepted = db.quotes.get(data.quoteId)
		if (accepted) {
			// Freeze totalDue + seed payment state so Finance can collect the
			// first partial before Inventory Orders surfaces it.
			const frozenTotal =
				Math.round(
					accepted.items.reduce((s, i) => s + i.sellPrice * i.quantity, 0) *
						100,
				) / 100
			db.quotes.update(data.quoteId, {
				totalDue: frozenTotal,
				amountPaid: 0,
				paymentStatus: 'unpaid',
				partialPaidAt: null,
				fullPaidAt: null,
				partialProofUrl: null,
				fullProofUrl: null,
			})
		}
		if (data.poNumber)
			db.quotes.update(data.quoteId, { customerPoNumber: data.poNumber })
		const quote = db.quotes.get(data.quoteId) ?? db.quotes.list()[0]
		const orderId = `ord-${Date.now()}`
		const orderNumber = `SO-2026-${String(Math.floor(Math.random() * 90000) + 10000).padStart(5, '0')}`
		const now = new Date()
		const deliveryDate = (daysOut: number) =>
			new Date(now.getTime() + daysOut * 86_400_000).toISOString().split('T')[0]

		// Group the quote's items by their primary supplier to auto-generate POs.
		const bySupplier = new Map<
			string,
			{ items: string[]; total: number; leadTime: number }
		>()
		for (const item of quote.items) {
			const product = db.products.findBySlug(item.productSlug)
			const price = db.supplierPrices.primaryForProduct(item.productSlug)
			if (!product || !price) continue
			const entry = bySupplier.get(price.supplierName) ?? {
				items: [],
				total: 0,
				leadTime: price.leadTimeDays,
			}
			entry.items.push(product.name)
			entry.total += price.rawCost * item.quantity
			entry.leadTime = Math.max(entry.leadTime, price.leadTimeDays)
			bySupplier.set(price.supplierName, entry)
		}

		const purchaseOrders = Array.from(bySupplier.entries()).map(
			([supplierName, info]) => ({
				poNumber: `PO-2026-${String(Math.floor(Math.random() * 90000) + 10000).padStart(5, '0')}`,
				supplierName,
				items: info.items,
				total: Math.round(info.total),
				status: 'pending_confirmation' as const,
			}),
		)

		const deliverySchedule = quote.items.flatMap((item) => {
			const product = db.products.findBySlug(item.productSlug)
			const price = db.supplierPrices.primaryForProduct(item.productSlug)
			if (!product) return []
			return [
				{
					item: product.name,
					scheduledDate: deliveryDate(price?.leadTimeDays ?? 3),
					status: 'scheduled' as const,
				},
			]
		})

		const subtotal = quote.items.reduce(
			(s, i) => s + i.sellPrice * i.quantity,
			0,
		)
		const vatAmount = Math.round(subtotal * 14) / 100

		return {
			orderId,
			orderNumber,
			quoteId: data.quoteId,
			customerPoNumber: data.poNumber ?? null,
			status: 'confirmed',
			createdAt: now.toISOString(),
			purchaseOrders,
			deliverySchedule,
			proformaInvoice: {
				invoiceNumber: `PI-2026-${String(Math.floor(Math.random() * 90000) + 10000).padStart(5, '0')}`,
				subtotal,
				vatRate: 14,
				vatAmount,
				total: subtotal + vatAmount,
				dueDate: deliveryDate(30),
				status: 'generated' as const,
			},
			notifications: [
				{ recipient: 'operations_team', channel: 'internal', status: 'sent' },
				{ recipient: 'warehouse', channel: 'internal', status: 'sent' },
				{ recipient: 'customer', channel: 'portal', status: 'sent' },
				{ recipient: 'customer', channel: 'email', status: 'sent' },
			],
		}
	})

// ─── Negotiation History ──────────────────────────────────

type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue }

interface NegotiationEvent {
	id: string
	type: string
	timestamp: string
	actor: string
	description: string
	amount: number | null
	isInternal: boolean
	metadata: { [key: string]: JsonValue } | null
}

function buildNegotiationEvents(quoteId: string): NegotiationEvent[] {
	const quote = db.quotes.get(quoteId)
	if (!quote) return []
	const customer = db.customers.get(quote.customerId)
	const customerName = customer?.companyName ?? 'Customer'
	const rfq = db.rfqs.get(quote.rfqId)
	const rep = rfq?.assignedRep ?? customer?.assignedSalesRep ?? 'Sales rep'
	const total = quote.items.reduce((s, i) => s + i.sellPrice * i.quantity, 0)

	const events: NegotiationEvent[] = []
	if (quote.sentAt) {
		events.push({
			id: `neg-sent-${quote.id}`,
			type: 'quote_sent',
			timestamp: quote.sentAt,
			actor: rep,
			description: `Quote ${quote.quoteNumber} sent to ${customerName}`,
			amount: total,
			isInternal: false,
			metadata: quote.sentVia ? { method: quote.sentVia } : null,
		})
	}
	if (quote.status === 'accepted') {
		events.push({
			id: `neg-accepted-${quote.id}`,
			type: 'quote_accepted',
			timestamp: quote.sentAt ?? quote.validUntil,
			actor: customerName,
			description: `${customerName} accepted the quote`,
			amount: total,
			isInternal: false,
			metadata: null,
		})
	}
	if (quote.status === 'declined') {
		events.push({
			id: `neg-declined-${quote.id}`,
			type: 'quote_declined',
			timestamp: quote.sentAt ?? quote.validUntil,
			actor: customerName,
			description: `${customerName} declined the quote`,
			amount: null,
			isInternal: false,
			metadata: null,
		})
	}
	return events.sort(
		(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
	)
}

export const getNegotiationHistory = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ quoteId: z.string() }))
	.handler(async ({ data }) => {
		return { events: buildNegotiationEvents(data.quoteId) }
	})
