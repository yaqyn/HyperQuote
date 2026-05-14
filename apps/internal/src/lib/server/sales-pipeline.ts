import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db/db'

/**
 * Sales pipeline mutations still back negotiation outcomes. The old pipeline
 * board projection was removed with the dormant sales surfaces.
 */

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
