import {
	type BroadCategory,
	type CatalogProduct,
	getBroadCategory,
} from '@hyperquote/types'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
	FreshnessIndicator,
	MarginThresholds,
	Quote,
	QuoteItem,
} from '../../types/sales'
import { db, hoursSince } from '../db/db'

// Re-exported so every sales UI that already imports from here keeps working
// while the canonical definitions live in inventory.ts.
export {
	getOutdatedPricesSummary,
	requestInventoryPriceUpdate,
} from './inventory'

// ─── Config ───────────────────────────────────────────────

const PROCUREMENT_BUFFER = 0.025

function bufferCost(rawCost: number): number {
	return Math.round(rawCost * (1 + PROCUREMENT_BUFFER) * 100) / 100
}

/** Maps broad catalog categories to the sales pricing_rules buckets. */
function marginCategoryFor(product: CatalogProduct): string {
	if (product.category === 'waterproofing' || product.category === 'roofing')
		return 'roofing'
	const broad: BroadCategory = getBroadCategory(product.category)
	const map: Record<BroadCategory, string> = {
		cement: 'cement_concrete',
		aggregates: 'cement_concrete',
		bricks: 'cement_concrete',
		steel: 'steel_rebar',
		timber: 'lumber_timber',
		finishing: 'specialty_custom',
	}
	return map[broad]
}

const MARGIN_THRESHOLDS: MarginThresholds[] = [
	{ productCategory: 'cement_concrete', target: 20, floor: 14, absoluteMin: 8 },
	{ productCategory: 'steel_rebar', target: 15, floor: 10, absoluteMin: 6 },
	{ productCategory: 'lumber_timber', target: 18, floor: 12, absoluteMin: 8 },
	{ productCategory: 'roofing', target: 25, floor: 18, absoluteMin: 12 },
	{
		productCategory: 'specialty_custom',
		target: 38,
		floor: 25,
		absoluteMin: 15,
	},
]

// ─── Derived freshness helpers ────────────────────────────

function freshnessFor(lastUpdatedAt: string): FreshnessIndicator {
	const hours = hoursSince(lastUpdatedAt)
	if (hours < 24) return 'fresh'
	if (hours < 72) return 'aging'
	return 'stale'
}

function isRecentlyOrderedSlug(slug: string): boolean {
	return db.rfqs
		.list()
		.filter((r) => r.status !== 'declined' && r.status !== 'expired')
		.some((r) => r.items.some((i) => i.productSlug === slug))
}

// ─── Quote builder data ───────────────────────────────────

function buildSuggestedProduct(
	slug: string,
	quantity: number,
	rfqId: string,
	index: number,
) {
	const product = db.products.findBySlug(slug)
	if (!product) return null
	const primary = db.supplierPrices.primaryForProduct(slug)
	const lastUpdatedAt = primary?.lastQuotedAt ?? new Date(0).toISOString()
	const freshness = primary
		? freshnessFor(lastUpdatedAt)
		: ('missing' as FreshnessIndicator)
	const priceStatus = freshness === 'fresh' ? 'updated' : 'outdated'
	return {
		id: `sp-${rfqId}-${index + 1}`,
		productName: product.name,
		specification: product.subcategory.replace(/_/g, ' '),
		supplierName: primary?.supplierName ?? '',
		supplierCost: bufferCost(primary?.rawCost ?? 0),
		quantity,
		unit: product.unit_of_measure,
		freshness,
		priceStatus,
		recentlyOrdered: isRecentlyOrderedSlug(slug),
		lastQuotedAt: lastUpdatedAt,
		category: marginCategoryFor(product),
	}
}

function buildQuoteBuilderData(rfqId: string) {
	const rfq = db.rfqs.get(rfqId)
	const customer = rfq ? db.customers.findByName(rfq.customerName) : undefined

	// If a draft quote already exists for this rfq, hydrate from it so
	// saved margins/quantities aren't silently overwritten by the RFQ rebuild.
	const existingDraft = db.quotes
		.forRfq(rfqId)
		.filter((q) => q.status === 'draft')
		.slice(-1)[0]

	const suggestedProducts = existingDraft
		? existingDraft.items
				.map((item, i) => {
					const base = buildSuggestedProduct(
						item.productSlug,
						item.quantity,
						rfqId,
						i,
					)
					if (!base) return null
					return {
						...base,
						marginPercent: item.marginPercent,
						sellPrice: item.sellPrice,
					}
				})
				.filter((p): p is NonNullable<typeof p> => p !== null)
		: rfq
			? rfq.items
					.map((item, i) =>
						buildSuggestedProduct(item.productSlug, item.quantity, rfqId, i),
					)
					.filter((p): p is NonNullable<typeof p> => p !== null)
			: []

	// Real stock lookup per product — Quote builder uses this to drive the
	// "warehouse" source option with live availability, no mocks. Keyed by
	// both slug and display name so the client can hit it from either side.
	const stockBySlug: Record<
		string,
		{ available: number; physical: number; reserved: number }
	> = {}
	const stockByName: Record<
		string,
		{ available: number; physical: number; reserved: number }
	> = {}
	const relevantSlugs = new Set<string>()
	if (rfq) for (const i of rfq.items) relevantSlugs.add(i.productSlug)
	if (existingDraft)
		for (const i of existingDraft.items) relevantSlugs.add(i.productSlug)
	for (const slug of relevantSlugs) {
		const row = db.stock.forProduct(slug)
		const physical = row?.stockLevel ?? 0
		const reserved = row?.reservedLevel ?? 0
		const entry = {
			physical,
			reserved,
			available: Math.max(0, physical - reserved),
		}
		stockBySlug[slug] = entry
		const product = db.products.findBySlug(slug)
		if (product) stockByName[product.name] = entry
	}

	// Real supplier directory pulled from db.suppliers so the sourcing menu
	// search is backed by actual rows. Scores/categories derive from existing
	// supplier data (rating, custom badges) — no hardcoded supplier list.
	const suppliers = db.suppliers.list().map((s) => ({
		id: s.name, // name is the stable key in the mock DB
		name: s.name,
		tier:
			s.tier === 'preferred'
				? 'Preferred'
				: s.tier === 'approved'
					? 'Approved'
					: s.tier === 'conditional'
						? 'Conditional'
						: 'New',
		score: Math.round(s.rating * 20), // rating is 0-5, score is 0-100
		// Category keywords derived from the actual products they supply —
		// one entry per unique broad category slug.
		categories: Array.from(
			new Set(
				db.supplierPrices
					.forSupplier(s.name)
					.map((sp) => db.products.findBySlug(sp.productSlug))
					.filter((p): p is NonNullable<typeof p> => p !== null)
					.map((p) => db.products.broadCategoryFor(p).toLowerCase()),
			),
		),
	}))

	return {
		rfqId,
		rfqStatus: rfq?.status ?? ('submitted' as const),
		quoteStatus: existingDraft?.status ?? ('draft' as const),
		customer: {
			// Empty-not-fake: if there's no resolved customer the builder shows
			// empty headers and the rep fills them in — we never render a
			// placeholder string that looks real.
			name: rfq?.customerName ?? customer?.companyName ?? '',
			tier: rfq?.customerTier ?? customer?.tier ?? ('new' as const),
			contactName: rfq?.contactName ?? customer?.contactName ?? '',
			phone: customer?.phone ?? '',
			email: customer?.email ?? '',
			company: customer?.companyName ?? rfq?.customerName ?? '',
		},
		// Draft overrides win over the RFQ fallback, so a rep's edit survives
		// a reload; if neither is set, we fall back to the customer's address.
		deliveryAddress:
			existingDraft?.deliveryAddress ??
			rfq?.deliveryAddress ??
			customer?.address ??
			'',
		deliveryCity:
			existingDraft?.deliveryCity ?? rfq?.deliveryCity ?? customer?.city ?? '',
		deliveryDate: existingDraft?.deliveryDate ?? '',
		deliveryWindow: existingDraft?.deliveryWindow ?? '',
		specialInstructions: existingDraft?.specialInstructions ?? '',
		paymentTerms: existingDraft?.paymentTerms ?? '',
		earlyPaymentDiscount: existingDraft?.earlyPaymentDiscount ?? '',
		coverNote: existingDraft?.coverNote ?? '',
		customerCredit: {
			creditLimit: customer?.creditLimit ?? 0,
			currentExposure: customer?.currentExposure ?? 0,
			availableCredit:
				(customer?.creditLimit ?? 0) - (customer?.currentExposure ?? 0),
			paymentHistory: customer?.paymentHistory ?? ('good' as const),
		},
		suggestedProducts,
		recentPrices: suggestedProducts.map((p) => ({
			productName: p.productName,
			supplierCost: p.supplierCost,
			freshness: p.freshness,
			lastQuotedAt: p.lastQuotedAt,
		})),
		stockBySlug,
		stockByName,
		suppliers,
		marginThresholds: MARGIN_THRESHOLDS,
	}
}

// ─── Persisted quote read (for PDF preview etc.) ──────────

function getMockQuote(quoteId: string): Quote {
	const row = db.quotes.get(quoteId) ?? db.quotes.list()[0]
	const _customer = db.customers.get(row.customerId)
	const items: QuoteItem[] = row.items
		.map((i): QuoteItem | null => {
			const product = db.products.findBySlug(i.productSlug)
			const primary = db.supplierPrices.primaryForProduct(i.productSlug)
			if (!product) return null
			const supplierCost = bufferCost(primary?.rawCost ?? 0)
			const lineTotal = Math.round(i.sellPrice * i.quantity * 100) / 100
			const freshness = primary
				? freshnessFor(primary.lastQuotedAt)
				: ('missing' as FreshnessIndicator)
			return {
				id: `qi-${i.productSlug}`,
				productName: product.name,
				specification: product.subcategory.replace(/_/g, ' '),
				quantity: i.quantity,
				unit: product.unit_of_measure,
				supplierCost,
				marginPercent: i.marginPercent,
				sellPrice: i.sellPrice,
				lineTotal,
				freshnessIndicator: freshness,
				priceStatus: freshness === 'fresh' ? 'updated' : 'outdated',
				recentlyOrdered: isRecentlyOrderedSlug(i.productSlug),
				supplierName: primary?.supplierName ?? '',
				customerCounterPrice: null,
			}
		})
		.filter((x): x is QuoteItem => x !== null)

	const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0)
	const vatAmount = Math.round(subtotal * 14) / 100

	return {
		id: row.id,
		rfqId: row.rfqId,
		quoteNumber: row.quoteNumber,
		version: row.version,
		status: row.status,
		items,
		subtotal,
		vatAmount,
		total: subtotal + vatAmount,
		validUntil: row.validUntil,
		marginPercent: row.marginPercent,
		sentAt: row.sentAt,
		sentVia: row.sentVia,
		scheduledSendAt: null,
		previousVersionId: row.previousVersionId,
		customerPoNumber: row.customerPoNumber,
	}
}

// ─── Server Functions ─────────────────────────────────────

export const createQuote = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			rfqId: z.string(),
			customerId: z.string().optional(),
			lines: z.array(
				z.object({
					productSlug: z.string(),
					quantity: z.number().positive(),
					marginPercent: z.number(),
					sellPrice: z.number().nonnegative(),
				}),
			),
			validUntil: z.string(),
			terms: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const rfq = db.rfqs.get(data.rfqId)
		const customer = data.customerId
			? db.customers.get(data.customerId)
			: rfq
				? db.customers.findByName(rfq.customerName)
				: undefined
		const avgMargin =
			data.lines.reduce((sum, l) => sum + l.marginPercent, 0) /
			Math.max(1, data.lines.length)

		const row = db.quotes.insert({
			quoteNumber: `QT-2026-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
			rfqId: data.rfqId,
			customerId: customer?.id ?? 'cust-unknown',
			version: 1,
			status: 'draft',
			marginPercent: Math.round(avgMargin * 10) / 10,
			sentAt: null,
			validUntil: data.validUntil,
			sentVia: null,
			customerPoNumber: null,
			previousVersionId: null,
			items: data.lines.map((l) => ({
				productSlug: l.productSlug,
				quantity: l.quantity,
				marginPercent: l.marginPercent,
				sellPrice: l.sellPrice,
			})),
		})
		return { quoteId: row.id }
	})

export const saveQuoteDraft = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			quoteId: z.string().optional(),
			rfqId: z.string(),
			customerId: z.string().optional(),
			lineItems: z.array(
				z.object({
					id: z.string().optional(),
					productSlug: z.string().optional(),
					productName: z.string(),
					specification: z.string(),
					quantity: z.number().positive(),
					unit: z.string(),
					supplierCost: z.number().nonnegative(),
					marginPercent: z.number(),
					sellPrice: z.number().nonnegative(),
				}),
			),
			// Every field below is a user-typed override of the defaults inherited
			// from the source RFQ / customer. Null = leave the DB row alone,
			// empty string = explicit clear.
			deliveryAddress: z.string().nullable().optional(),
			deliveryCity: z.string().nullable().optional(),
			deliveryDate: z.string().nullable().optional(),
			deliveryWindow: z.string().nullable().optional(),
			specialInstructions: z.string().nullable().optional(),
			paymentTerms: z.string().nullable().optional(),
			earlyPaymentDiscount: z.string().nullable().optional(),
			coverNote: z.string().nullable().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const items = data.lineItems
			.map((li) => {
				const slug =
					li.productSlug ?? db.products.findByName(li.productName)?.slug
				if (!slug) return null
				return {
					productSlug: slug,
					quantity: li.quantity,
					marginPercent: li.marginPercent,
					sellPrice: li.sellPrice,
				}
			})
			.filter((x): x is NonNullable<typeof x> => x !== null)

		const avgMargin =
			items.length > 0
				? Math.round(
						(items.reduce((s, i) => s + i.marginPercent, 0) / items.length) *
							10,
					) / 10
				: 0

		// Build a patch from only the fields the caller actually sent, so the
		// caller can autosave incrementally without clobbering existing values.
		const overridesPatch: Partial<
			Pick<
				import('../db/db').QuoteRow,
				| 'deliveryAddress'
				| 'deliveryCity'
				| 'deliveryDate'
				| 'deliveryWindow'
				| 'specialInstructions'
				| 'paymentTerms'
				| 'earlyPaymentDiscount'
				| 'coverNote'
			>
		> = {}
		if (data.deliveryAddress !== undefined)
			overridesPatch.deliveryAddress = data.deliveryAddress
		if (data.deliveryCity !== undefined)
			overridesPatch.deliveryCity = data.deliveryCity
		if (data.deliveryDate !== undefined)
			overridesPatch.deliveryDate = data.deliveryDate
		if (data.deliveryWindow !== undefined)
			overridesPatch.deliveryWindow = data.deliveryWindow
		if (data.specialInstructions !== undefined)
			overridesPatch.specialInstructions = data.specialInstructions
		if (data.paymentTerms !== undefined)
			overridesPatch.paymentTerms = data.paymentTerms
		if (data.earlyPaymentDiscount !== undefined)
			overridesPatch.earlyPaymentDiscount = data.earlyPaymentDiscount
		if (data.coverNote !== undefined) overridesPatch.coverNote = data.coverNote

		// 1. Update by explicit quoteId if the row exists
		if (data.quoteId) {
			const existing = db.quotes.get(data.quoteId)
			if (existing) {
				db.quotes.update(data.quoteId, {
					items,
					marginPercent: avgMargin,
					...overridesPatch,
				})
				return { quoteId: existing.id }
			}
		}

		// 2. Update an existing draft for this RFQ if one is already on file
		const drafts = db.quotes
			.forRfq(data.rfqId)
			.filter((q) => q.status === 'draft')
		if (drafts.length > 0) {
			const row = drafts[drafts.length - 1]
			db.quotes.update(row.id, {
				items,
				marginPercent: avgMargin,
				...overridesPatch,
			})
			return { quoteId: row.id }
		}

		// 3. Otherwise insert a fresh draft row
		const rfq = db.rfqs.get(data.rfqId)
		const customer = data.customerId
			? db.customers.get(data.customerId)
			: rfq
				? db.customers.findByName(rfq.customerName)
				: undefined

		const row = db.quotes.insert({
			quoteNumber: `QT-2026-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
			rfqId: data.rfqId,
			customerId: customer?.id ?? 'cust-unknown',
			version: 1,
			status: 'draft',
			marginPercent: avgMargin,
			sentAt: null,
			validUntil: new Date(Date.now() + 14 * 86_400_000).toISOString(),
			sentVia: null,
			customerPoNumber: null,
			previousVersionId: null,
			items,
			...overridesPatch,
		})
		return { quoteId: row.id }
	})

export const getQuoteBuilderData = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ rfqId: z.string() }))
	.handler(async ({ data }) => {
		return buildQuoteBuilderData(data.rfqId)
	})

export const requestApproval = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			quoteId: z.string(),
			approverRole: z.enum(['sales_manager', 'vp_sales', 'ceo']),
			justification: z.string().optional(),
			urgencyNote: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		// Flip quote into pending_approval; approver info tracked separately later.
		db.quotes.updateStatus(data.quoteId, 'pending_approval')
		return { approvalId: `appr-${Date.now()}` }
	})

export const approveQuote = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			approvalId: z.string(),
			quoteId: z.string().optional(),
			notes: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		// If a quoteId is provided, flip it into approved status so sending
		// downstream is unblocked.
		if (data.quoteId) {
			db.quotes.updateStatus(data.quoteId, 'approved')
		}
		return { success: true }
	})

export const previewQuotePDF = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ quoteId: z.string() }))
	.handler(async ({ data }) => {
		return { quote: getMockQuote(data.quoteId), pdfUrl: null as string | null }
	})

// ─── Product Catalog (consumed by the quote builder search menu) ──

export const getProductCatalog = createServerFn({ method: 'GET' })
	.inputValidator(z.object({}))
	.handler(async () => {
		return {
			products: db.products.list().map((product) => {
				const primary = db.supplierPrices.primaryForProduct(product.slug)
				const lastUpdatedAt = primary?.lastQuotedAt ?? new Date(0).toISOString()
				const freshness = primary
					? freshnessFor(lastUpdatedAt)
					: ('missing' as FreshnessIndicator)
				return {
					id: product.id,
					name: product.name,
					specification: product.subcategory.replace(/_/g, ' '),
					unit: product.unit_of_measure,
					category: product.category,
					supplierCost: bufferCost(primary?.rawCost ?? 0),
					freshness,
					priceStatus:
						freshness === 'fresh'
							? ('updated' as const)
							: ('outdated' as const),
					recentlyOrdered: isRecentlyOrderedSlug(product.slug),
					supplierName: primary?.supplierName ?? '',
				}
			}),
		}
	})
