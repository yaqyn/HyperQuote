import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { ActivityEvent, SalesAnalytics } from '../../types/sales'
import { db, hoursSince } from '../db/db'

/**
 * Sales activity + analytics projections. Every event and every top-N
 * aggregate is derived live from db — no hardcoded customer or product
 * names remain here. When richer activity data lands (orders table,
 * payments table), it plugs into the same builders.
 */

// ─── Activity feed ────────────────────────────────────────

function buildActivityFeed(): ActivityEvent[] {
	const events: ActivityEvent[] = []

	// RFQ-driven events
	for (const rfq of db.rfqs.list()) {
		const ageHours = hoursSince(rfq.createdAt)
		if (rfq.status === 'submitted' || rfq.status === 'assigned') {
			events.push({
				id: `evt-rfq-${rfq.id}`,
				type: 'rfq_new',
				description: `New RFQ received from ${rfq.customerName}`,
				timestamp: rfq.createdAt,
				entityType: 'rfq',
				entityId: rfq.id,
				actionLabel: 'Open RFQ',
				actionUrl: `/internal/sales/rfq/${rfq.id}`,
			})
		} else if (rfq.status === 'awaiting_clarification' && ageHours < 24) {
			events.push({
				id: `evt-rfq-clar-${rfq.id}`,
				type: 'clarification_sent',
				description: `Clarification requested from ${rfq.customerName} on ${rfq.id}`,
				timestamp: rfq.createdAt,
				entityType: 'rfq',
				entityId: rfq.id,
				actionLabel: 'Open RFQ',
				actionUrl: `/internal/sales/rfq/${rfq.id}`,
			})
		} else if (rfq.status === 'declined') {
			events.push({
				id: `evt-rfq-declined-${rfq.id}`,
				type: 'rfq_declined',
				description: `RFQ ${rfq.id} declined — ${rfq.customerName}`,
				timestamp: rfq.createdAt,
				entityType: 'rfq',
				entityId: rfq.id,
				actionLabel: null,
				actionUrl: null,
			})
		}
	}

	// Quote-driven events
	for (const quote of db.quotes.list()) {
		const customer = db.customers.get(quote.customerId)
		const customerName = customer?.companyName ?? 'customer'
		if (quote.status === 'sent' && quote.sentAt) {
			events.push({
				id: `evt-quote-sent-${quote.id}`,
				type: 'quote_sent',
				description: `Quote ${quote.quoteNumber} sent to ${customerName}${quote.sentVia ? ` via ${quote.sentVia}` : ''}`,
				timestamp: quote.sentAt,
				entityType: 'quote',
				entityId: quote.id,
				actionLabel: 'Open Quote',
				actionUrl: `/internal/sales/quote-builder/${quote.id}`,
			})
		}
		if (quote.status === 'accepted' && quote.sentAt) {
			const total = quote.items.reduce(
				(s, i) => s + i.sellPrice * i.quantity,
				0,
			)
			events.push({
				id: `evt-quote-won-${quote.id}`,
				type: 'quote_won',
				description: `Quote ${quote.quoteNumber} won — ${customerName} (EGP ${total.toLocaleString('en-EG')})`,
				timestamp: quote.sentAt,
				entityType: 'quote',
				entityId: quote.id,
				actionLabel: 'View Order',
				actionUrl: '/internal/sales/pipeline',
			})
		}
		if (quote.status === 'declined' && quote.sentAt) {
			events.push({
				id: `evt-quote-lost-${quote.id}`,
				type: 'quote_lost',
				description: `Quote ${quote.quoteNumber} lost — ${customerName}`,
				timestamp: quote.sentAt,
				entityType: 'quote',
				entityId: quote.id,
				actionLabel: null,
				actionUrl: null,
			})
		}
	}

	// Price update request events — ties sales ↔ inventory
	for (const req of db.priceUpdateRequests.pending()) {
		const product = db.products.findBySlug(req.productSlug)
		events.push({
			id: `evt-pur-${req.id}`,
			type: 'price_update_requested',
			description: `Price update requested for ${product?.name ?? req.productSlug} · ${req.customerContext}`,
			timestamp: req.requestedAt,
			entityType: 'price_request',
			entityId: req.id,
			actionLabel: 'Open inventory',
			actionUrl: '/internal/procurement',
		})
	}

	return events.sort(
		(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
	)
}

// ─── Analytics ────────────────────────────────────────────

function buildSalesAnalytics(): SalesAnalytics {
	// Revenue + order count — derived from accepted/sent quotes
	const billable = db.quotes
		.list()
		.filter((q) => q.status === 'accepted' || q.status === 'sent')
	const revenue = billable.reduce(
		(sum, q) => sum + q.items.reduce((s, i) => s + i.sellPrice * i.quantity, 0),
		0,
	)
	const orderCount = billable.length
	const avgOrderValue = orderCount > 0 ? Math.round(revenue / orderCount) : 0

	// Top products — rolled up from quote items
	const productTotals = new Map<
		string,
		{ name: string; revenue: number; quantity: number }
	>()
	for (const q of billable) {
		for (const item of q.items) {
			const product = db.products.findBySlug(item.productSlug)
			if (!product) continue
			const entry = productTotals.get(item.productSlug) ?? {
				name: product.name,
				revenue: 0,
				quantity: 0,
			}
			entry.revenue += item.sellPrice * item.quantity
			entry.quantity += item.quantity
			productTotals.set(item.productSlug, entry)
		}
	}
	const topProducts = Array.from(productTotals.values())
		.sort((a, b) => b.revenue - a.revenue)
		.slice(0, 5)

	// Top customers — derived from lifetime value in the customers table
	const topCustomers = db.customers
		.list()
		.map((c) => ({
			name: c.companyName,
			revenue: c.lifetimeValue,
			orderCount: c.orderCount,
		}))
		.sort((a, b) => b.revenue - a.revenue)
		.slice(0, 5)

	// Pipeline counts from live RFQ statuses
	const stageMap: Record<string, { count: number; value: number }> = {}
	for (const rfq of db.rfqs.list()) {
		const stageLabel =
			rfq.status === 'submitted' || rfq.status === 'assigned'
				? 'RFQ Received'
				: rfq.status === 'reviewing'
					? 'Reviewing'
					: rfq.status === 'quoting'
						? 'Quoting'
						: rfq.status === 'quoted'
							? 'Sent'
							: rfq.status === 'negotiating'
								? 'Negotiating'
								: rfq.status === 'awaiting_clarification'
									? 'On Hold'
									: null
		if (!stageLabel) continue
		const entry = stageMap[stageLabel] ?? { count: 0, value: 0 }
		entry.count += 1
		entry.value += rfq.estimatedValue
		stageMap[stageLabel] = entry
	}
	const pipelineByStage = Object.entries(stageMap).map(([stage, v]) => ({
		stage,
		count: v.count,
		value: v.value,
	}))

	return {
		revenue,
		orderCount,
		avgOrderValue,
		topProducts,
		topCustomers,
		pipelineByStage,
		conversionRates: [], // richer conversion analytics ship when funnel events are tracked
	}
}

// ─── Server Functions ─────────────────────────────────────

const getActivityFeed = createServerFn({ method: 'GET' })
	.inputValidator(
		z.object({
			filters: z.object({ type: z.string().optional() }).optional(),
			page: z.number().default(1),
			limit: z.number().default(20),
		}),
	)
	.handler(async ({ data }) => {
		let events = buildActivityFeed()
		const filterType = data.filters?.type
		if (filterType) events = events.filter((e) => e.type === filterType)
		const start = (data.page - 1) * data.limit
		return {
			activities: events.slice(start, start + data.limit),
			total: events.length,
		}
	})

export const addInternalNote = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			entityType: z.string(),
			entityId: z.string(),
			note: z.string().min(1),
		}),
	)
	.handler(async () => {
		return { noteId: `note-${Date.now()}` }
	})

const getSalesAnalytics = createServerFn({ method: 'GET' })
	.inputValidator(
		z.object({
			period: z.enum(['week', 'month', 'quarter', 'year']),
			groupBy: z.enum(['rep', 'customer', 'product', 'category']).optional(),
		}),
	)
	.handler(async () => {
		return buildSalesAnalytics()
	})
