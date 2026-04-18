import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { PaymentStatus } from '../db/db'
import { db, hoursSince } from '../db/db'

/**
 * Finance inbox — the dual-pipeline view.
 *
 * Customer side: every accepted quote is a row. paymentStatus flows
 * `unpaid → partial → paid`. `partial` is a state, not a step — it
 * sticks on the order while the rest of the pipeline advances. Delivered
 * + partial rows are the urgent chase-the-customer list.
 *
 * Supplier side: every deal (refill call) is a row. Same state machine.
 * Deals can't advance to the warehouse until the first partial posts.
 *
 * Transitions are enforced on the server — the UI can't force a
 * backwards transition and every mutation requires a non-empty proofUrl
 * (anti-scam + anti-fat-finger).
 */

const PARTIAL_FRACTION = 0.5 as const

export interface FinanceOrderView {
	quoteId: string
	quoteNumber: string
	rfqId: string
	customerId: string
	customerName: string
	customerTier: string
	customerPoNumber: string | null
	acceptedAt: string
	acceptedHoursAgo: number
	deliveryAddress: string
	deliveryCity: string
	totalDue: number
	amountPaid: number
	remainingDue: number
	paymentStatus: PaymentStatus
	partialPaidAt: string | null
	fullPaidAt: string | null
	partialProofUrl: string | null
	fullProofUrl: string | null
	itemCount: number
	currentStage: string
	isDelivered: boolean
}

export interface FinanceDealItemView {
	productSlug: string
	productName: string
	sku: string
	unit: string
	agreedQty: number
	agreedRawCost: number
	lineTotal: number
}

export interface FinanceDealView {
	dealId: string
	supplierName: string
	items: FinanceDealItemView[]
	itemCount: number
	/** Headline product for the row view — first item in the list. */
	headlineProductName: string
	totalDue: number
	amountPaid: number
	remainingDue: number
	paymentStatus: PaymentStatus
	partialPaidAt: string | null
	fullPaidAt: string | null
	partialProofUrl: string | null
	fullProofUrl: string | null
	createdAt: string
	createdHoursAgo: number
}

interface FinanceInboxTotals {
	customerUnpaid: number
	customerPartial: number
	customerPaid: number
	supplierUnpaid: number
	supplierPartial: number
	supplierPaid: number
	totalOutstanding: number
	deliveredPartialCount: number
}

// ─── Builders ─────────────────────────────────────────────

function buildFinanceOrder(quoteId: string): FinanceOrderView | null {
	const quote = db.quotes.get(quoteId)
	if (!quote) return null
	if (quote.status !== 'accepted') return null
	const rfq = db.rfqs.get(quote.rfqId)
	const customer = db.customers.get(quote.customerId)
	const report = db.orderReports.forRfq(quote.rfqId)
	const stage = report?.currentStage ?? 'evaluated'
	const acceptedAt = quote.sentAt ?? new Date().toISOString()
	const remaining = Math.max(0, quote.totalDue - quote.amountPaid)
	return {
		quoteId: quote.id,
		quoteNumber: quote.quoteNumber,
		rfqId: quote.rfqId,
		customerId: quote.customerId,
		customerName:
			rfq?.customerName ?? customer?.companyName ?? 'Unknown customer',
		customerTier: rfq?.customerTier ?? customer?.tier ?? 'new',
		customerPoNumber: quote.customerPoNumber,
		acceptedAt,
		acceptedHoursAgo: Math.round(hoursSince(acceptedAt)),
		deliveryAddress: rfq?.deliveryAddress ?? customer?.address ?? '',
		deliveryCity: rfq?.deliveryCity ?? '',
		totalDue: Math.round(quote.totalDue * 100) / 100,
		amountPaid: Math.round(quote.amountPaid * 100) / 100,
		remainingDue: Math.round(remaining * 100) / 100,
		paymentStatus: quote.paymentStatus,
		partialPaidAt: quote.partialPaidAt,
		fullPaidAt: quote.fullPaidAt,
		partialProofUrl: quote.partialProofUrl,
		fullProofUrl: quote.fullProofUrl,
		itemCount: quote.items.length,
		currentStage: stage,
		isDelivered: stage === 'delivered',
	}
}

function buildFinanceDeal(dealId: string): FinanceDealView | null {
	const deal = db.deals.list().find((d) => d.id === dealId)
	if (!deal) return null
	const remaining = Math.max(0, deal.totalDue - deal.amountPaid)
	const items: FinanceDealItemView[] = deal.items.map((i) => {
		const product = db.products.findBySlug(i.productSlug)
		return {
			productSlug: i.productSlug,
			productName: product?.name ?? i.productSlug,
			sku: product?.sku ?? '',
			unit: product?.unit_of_measure ?? '',
			agreedQty: i.agreedQty,
			agreedRawCost: i.agreedRawCost,
			lineTotal: Math.round(i.agreedQty * i.agreedRawCost * 100) / 100,
		}
	})
	return {
		dealId: deal.id,
		supplierName: deal.supplierName,
		items,
		itemCount: items.length,
		headlineProductName: items[0]?.productName ?? '—',
		totalDue: Math.round(deal.totalDue * 100) / 100,
		amountPaid: Math.round(deal.amountPaid * 100) / 100,
		remainingDue: Math.round(remaining * 100) / 100,
		paymentStatus: deal.paymentStatus,
		partialPaidAt: deal.partialPaidAt,
		fullPaidAt: deal.fullPaidAt,
		partialProofUrl: deal.partialProofUrl,
		fullProofUrl: deal.fullProofUrl,
		createdAt: deal.createdAt,
		createdHoursAgo: Math.round(hoursSince(deal.createdAt)),
	}
}

// ─── Queries ──────────────────────────────────────────────

export const getFinanceInbox = createServerFn({ method: 'GET' })
	.inputValidator(z.object({}))
	.handler(async () => {
		const customerOrders = db.quotes
			.list()
			.filter((q) => q.status === 'accepted')
			.map((q) => buildFinanceOrder(q.id))
			.filter((o): o is FinanceOrderView => o !== null)

		const supplierDeals = db.deals
			.list()
			.map((d) => buildFinanceDeal(d.id))
			.filter((d): d is FinanceDealView => d !== null)

		const totals: FinanceInboxTotals = {
			customerUnpaid: customerOrders.filter((o) => o.paymentStatus === 'unpaid')
				.length,
			customerPartial: customerOrders.filter(
				(o) => o.paymentStatus === 'partial',
			).length,
			customerPaid: customerOrders.filter((o) => o.paymentStatus === 'paid')
				.length,
			supplierUnpaid: supplierDeals.filter((d) => d.paymentStatus === 'unpaid')
				.length,
			supplierPartial: supplierDeals.filter(
				(d) => d.paymentStatus === 'partial',
			).length,
			supplierPaid: supplierDeals.filter((d) => d.paymentStatus === 'paid')
				.length,
			totalOutstanding:
				Math.round(
					(customerOrders.reduce((s, o) => s + o.remainingDue, 0) +
						supplierDeals.reduce((s, d) => s + d.remainingDue, 0)) *
						100,
				) / 100,
			deliveredPartialCount: customerOrders.filter(
				(o) => o.paymentStatus === 'partial' && o.isDelivered,
			).length,
		}

		return { customerOrders, supplierDeals, totals }
	})

// ─── Mutations ────────────────────────────────────────────

const mutationInput = z.object({
	quoteId: z.string().optional(),
	dealId: z.string().optional(),
	proofUrl: z.string().min(1),
})

function canAdvance(from: PaymentStatus, to: PaymentStatus): boolean {
	if (from === 'paid') return false
	if (from === 'partial' && to !== 'paid') return false
	// Unpaid can walk either to partial (50%) or jump straight to paid
	// (100%) — finance may collect the full amount in one shot.
	if (from === 'unpaid' && to !== 'partial' && to !== 'paid') return false
	return true
}

export const recordOrderPartialPayment = createServerFn({ method: 'POST' })
	.inputValidator(mutationInput)
	.handler(async ({ data }) => {
		if (!data.quoteId)
			return { success: false as const, error: 'quoteId required' }
		if (!data.proofUrl.trim()) {
			return { success: false as const, error: 'Proof of payment required' }
		}
		const quote = db.quotes.get(data.quoteId)
		if (!quote) return { success: false as const, error: 'Quote not found' }
		if (!canAdvance(quote.paymentStatus, 'partial')) {
			return {
				success: false as const,
				error: `Cannot move ${quote.paymentStatus} → partial`,
			}
		}
		const partialAmount =
			Math.round(quote.totalDue * PARTIAL_FRACTION * 100) / 100
		const updated = db.quotes.update(quote.id, {
			paymentStatus: 'partial',
			amountPaid: partialAmount,
			partialPaidAt: new Date().toISOString(),
			partialProofUrl: data.proofUrl.trim(),
		})
		if (!updated) return { success: false as const, error: 'Update failed' }

		// Stamp the living document with a finance_partial section.
		db.orderReports.ensureForRfq(quote.rfqId)
		db.orderReports.appendSection(quote.rfqId, 'finance_partial', {
			recordedAt: updated.partialPaidAt,
			amount: partialAmount,
			proofUrl: updated.partialProofUrl,
		})

		return {
			success: true as const,
			quoteId: quote.id,
			amountPaid: partialAmount,
		}
	})

export const recordOrderFullPayment = createServerFn({ method: 'POST' })
	.inputValidator(mutationInput)
	.handler(async ({ data }) => {
		if (!data.quoteId)
			return { success: false as const, error: 'quoteId required' }
		if (!data.proofUrl.trim()) {
			return { success: false as const, error: 'Proof of payment required' }
		}
		const quote = db.quotes.get(data.quoteId)
		if (!quote) return { success: false as const, error: 'Quote not found' }
		if (!canAdvance(quote.paymentStatus, 'paid')) {
			return {
				success: false as const,
				error: `Cannot move ${quote.paymentStatus} → paid`,
			}
		}
		const updated = db.quotes.update(quote.id, {
			paymentStatus: 'paid',
			amountPaid: Math.round(quote.totalDue * 100) / 100,
			fullPaidAt: new Date().toISOString(),
			fullProofUrl: data.proofUrl.trim(),
		})
		if (!updated) return { success: false as const, error: 'Update failed' }

		db.orderReports.ensureForRfq(quote.rfqId)
		db.orderReports.appendSection(quote.rfqId, 'finance_full', {
			recordedAt: updated.fullPaidAt,
			amount: updated.totalDue,
			proofUrl: updated.fullProofUrl,
		})

		return { success: true as const, quoteId: quote.id }
	})

// ─── Finance-side cancellation ───────────────────────────

const cancelInput = z.object({
	quoteId: z.string().optional(),
	dealId: z.string().optional(),
	reason: z.string().min(3),
	note: z.string().optional(),
})

/**
 * Cancel a customer order from the Finance panel. Walks rfq.status →
 * 'declined', flips quote.status → 'declined', stamps the living
 * document via markCanceled, and releases any reserved inventory back
 * to available. Blocks if the order is already fully paid — finance
 * refunds have to go through an explicit refund flow, not a cancel.
 */
export const cancelOrderFromFinance = createServerFn({ method: 'POST' })
	.inputValidator(cancelInput)
	.handler(async ({ data }) => {
		if (!data.quoteId)
			return { success: false as const, error: 'quoteId required' }
		const quote = db.quotes.get(data.quoteId)
		if (!quote) return { success: false as const, error: 'Quote not found' }
		if (quote.paymentStatus === 'paid') {
			return {
				success: false as const,
				error: 'Cannot cancel a fully paid order. Use the refund workflow.',
			}
		}

		// Release reserved stock if the order had already been approved
		// for warehouse. Finance cancels an in-flight order → inventory
		// gets its capacity back.
		const report = db.orderReports.forRfq(quote.rfqId)
		if (report?.sections.inventory_orders) {
			for (const i of quote.items) {
				db.stock.release(i.productSlug, i.quantity)
			}
		}

		db.quotes.updateStatus(quote.id, 'declined')
		const rfq = db.rfqs.get(quote.rfqId)
		if (rfq && rfq.status !== 'declined' && rfq.status !== 'expired') {
			db.rfqs.updateStatus(quote.rfqId, 'declined')
		}
		db.orderReports.ensureForRfq(quote.rfqId)
		db.orderReports.markCanceled(quote.rfqId, data.reason, data.note ?? null)

		return { success: true as const, quoteId: quote.id }
	})

/**
 * Cancel a supplier deal from the Finance panel. Walks the deal into
 * a terminal state and releases any reserved obligations. Deals are
 * the supplier-side pipeline, so cancellation simply marks the deal
 * as closed and records why.
 */
export const cancelDealFromFinance = createServerFn({ method: 'POST' })
	.inputValidator(cancelInput)
	.handler(async ({ data }) => {
		if (!data.dealId)
			return { success: false as const, error: 'dealId required' }
		const deal = db.deals.list().find((d) => d.id === data.dealId)
		if (!deal) return { success: false as const, error: 'Deal not found' }
		if (deal.paymentStatus === 'paid') {
			return {
				success: false as const,
				error: 'Cannot cancel a fully paid deal. Use the refund workflow.',
			}
		}
		// No markCanceled equivalent for deals; record by flipping status
		// and stamping a note. Schema is intentionally minimal for now.
		db.deals.updateStatus(deal.id, 'closed')
		const row = db.deals.list().find((d) => d.id === deal.id)
		if (row) {
			row.notes = `[canceled] ${data.reason}${data.note ? ` — ${data.note}` : ''}`
		}
		return { success: true as const, dealId: deal.id }
	})

function updateDeal(
	dealId: string,
	patch: Partial<{
		paymentStatus: PaymentStatus
		amountPaid: number
		partialPaidAt: string | null
		fullPaidAt: string | null
		partialProofUrl: string | null
		fullProofUrl: string | null
	}>,
) {
	// db.deals has no `update` accessor — the existing surface mutates in
	// place via updateStatus. We write through the raw row reference here
	// since the deals table is a plain array and the row is shared state.
	const row = db.deals.list().find((d) => d.id === dealId)
	if (!row) return undefined
	Object.assign(row, patch)
	return row
}

export const recordDealPartialPayment = createServerFn({ method: 'POST' })
	.inputValidator(mutationInput)
	.handler(async ({ data }) => {
		if (!data.dealId)
			return { success: false as const, error: 'dealId required' }
		if (!data.proofUrl.trim()) {
			return { success: false as const, error: 'Proof of payment required' }
		}
		const deal = db.deals.list().find((d) => d.id === data.dealId)
		if (!deal) return { success: false as const, error: 'Deal not found' }
		if (!canAdvance(deal.paymentStatus, 'partial')) {
			return {
				success: false as const,
				error: `Cannot move ${deal.paymentStatus} → partial`,
			}
		}
		const partialAmount =
			Math.round(deal.totalDue * PARTIAL_FRACTION * 100) / 100
		updateDeal(deal.id, {
			paymentStatus: 'partial',
			amountPaid: partialAmount,
			partialPaidAt: new Date().toISOString(),
			partialProofUrl: data.proofUrl.trim(),
		})
		// Advance deal pipeline so warehouse can now see it.
		if (deal.status === 'pending_finance') {
			db.deals.updateStatus(deal.id, 'approved_by_finance')
		}
		return {
			success: true as const,
			dealId: deal.id,
			amountPaid: partialAmount,
		}
	})

export const recordDealFullPayment = createServerFn({ method: 'POST' })
	.inputValidator(mutationInput)
	.handler(async ({ data }) => {
		if (!data.dealId)
			return { success: false as const, error: 'dealId required' }
		if (!data.proofUrl.trim()) {
			return { success: false as const, error: 'Proof of payment required' }
		}
		const deal = db.deals.list().find((d) => d.id === data.dealId)
		if (!deal) return { success: false as const, error: 'Deal not found' }
		if (!canAdvance(deal.paymentStatus, 'paid')) {
			return {
				success: false as const,
				error: `Cannot move ${deal.paymentStatus} → paid`,
			}
		}
		updateDeal(deal.id, {
			paymentStatus: 'paid',
			amountPaid: Math.round(deal.totalDue * 100) / 100,
			fullPaidAt: new Date().toISOString(),
			fullProofUrl: data.proofUrl.trim(),
		})
		return { success: true as const, dealId: deal.id }
	})
