import {
	type BroadCategory,
	type CatalogProduct,
	getBroadCategory,
} from '@hyperquote/types'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { FreshnessIndicator, MarginThresholds } from '../../types/sales'
import { db, hoursSince } from '../db/db'

// Re-exported so every sales UI that already imports from here keeps working
// while the canonical definitions live in inventory.ts.
export { requestInventoryPriceUpdate } from './inventory'

// ─── Config ───────────────────────────────────────────────

const PROCUREMENT_BUFFER = 0.025
type QuoteBuilderCurrency = 'EGP' | 'USD' | 'EUR' | 'SAR'
const QUOTE_BUILDER_FOREIGN_CURRENCIES: Array<
	Exclude<QuoteBuilderCurrency, 'EGP'>
> = ['USD', 'EUR', 'SAR']
const EXCHANGE_RATE_SOURCE_URL = 'https://open.er-api.com/v6/latest/EGP'
const EXCHANGE_RATE_SOURCE_NAME = ''

interface QuoteBuilderExchangeRates {
	baseCurrency: 'EGP'
	rates: Record<QuoteBuilderCurrency, number | null>
	updatedAt: string | null
	source: string
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

async function getQuoteBuilderExchangeRates(): Promise<QuoteBuilderExchangeRates> {
	const rates: Record<QuoteBuilderCurrency, number | null> = {
		EGP: 1,
		USD: null,
		EUR: null,
		SAR: null,
	}

	try {
		const response = await fetch(EXCHANGE_RATE_SOURCE_URL)
		if (!response.ok) {
			return {
				baseCurrency: 'EGP',
				rates,
				updatedAt: null,
				source: EXCHANGE_RATE_SOURCE_NAME,
			}
		}

		const payload: unknown = await response.json()
		if (!isUnknownRecord(payload) || !isUnknownRecord(payload.rates)) {
			return {
				baseCurrency: 'EGP',
				rates,
				updatedAt: null,
				source: EXCHANGE_RATE_SOURCE_NAME,
			}
		}

		for (const currency of QUOTE_BUILDER_FOREIGN_CURRENCIES) {
			const apiRate = payload.rates[currency]
			if (
				typeof apiRate === 'number' &&
				Number.isFinite(apiRate) &&
				apiRate > 0
			) {
				rates[currency] = Math.round((1 / apiRate) * 10_000) / 10_000
			}
		}

		return {
			baseCurrency: 'EGP',
			rates,
			updatedAt:
				typeof payload.time_last_update_utc === 'string'
					? payload.time_last_update_utc
					: null,
			source: EXCHANGE_RATE_SOURCE_NAME,
		}
	} catch {
		return {
			baseCurrency: 'EGP',
			rates,
			updatedAt: null,
			source: EXCHANGE_RATE_SOURCE_NAME,
		}
	}
}

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
		productSlug: product.slug,
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

async function buildQuoteBuilderData(rfqId: string) {
	const rfq = db.rfqs.get(rfqId)
	const customer = rfq ? db.customers.findByName(rfq.customerName) : undefined
	const exchangeRates = await getQuoteBuilderExchangeRates()

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
		exchangeRates,
	}
}

// ─── Server Functions ─────────────────────────────────────

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
		const overridesPatch: Parameters<typeof db.quotes.update>[1] = {}
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
		return await buildQuoteBuilderData(data.rfqId)
	})

export const getSalesApprovers = createServerFn({ method: 'GET' })
	.inputValidator(z.object({}))
	.handler(async () => {
		return {
			approvers: db.employees.list().map((e) => ({
				id: e.id,
				name: e.name,
			})),
		}
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
					slug: product.slug,
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
