import {
	BROAD_CATEGORIES,
	BROAD_CATEGORY_IMAGES,
	type BroadCategory,
} from '@hyperquote/types'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
	db,
	hoursSince,
	type SupplierPriceRow,
	type SupplierTier,
} from '../db/db'

export type { SupplierTier }

/**
 * Inventory panel server — every byte of state lives in db.ts.
 * This file is a thin projection layer: take rows out of db, derive
 * freshness / urgency / aggregates, return shapes the UI wants.
 */

type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue }

type JsonObject = { [key: string]: JsonValue }

/**
 * Narrow an untyped specs record to a JSON-serializable shape. Values that
 * aren't JSON-safe are dropped — in practice all db specs are primitives.
 */
function toJsonObject(
	value: Record<string, unknown> | null | undefined,
): JsonObject {
	const out: JsonObject = {}
	if (!value) return out
	for (const [k, v] of Object.entries(value)) {
		if (isJsonValue(v)) out[k] = v
	}
	return out
}

function isJsonValue(v: unknown): v is JsonValue {
	if (v === null) return true
	const t = typeof v
	if (t === 'string' || t === 'number' || t === 'boolean') return true
	if (Array.isArray(v)) return v.every(isJsonValue)
	if (t === 'object') {
		return Object.values(v as object).every(isJsonValue)
	}
	return false
}

// ─── Config ───────────────────────────────────────────────

const PROCUREMENT_BUFFER = 0.025

function bufferCost(raw: number): number {
	return Math.round(raw * (1 + PROCUREMENT_BUFFER) * 100) / 100
}

// ─── Derived types the UI speaks ──────────────────────────

export type FreshnessLevel = 'fresh' | 'aging' | 'stale'
export type PriceStatus = 'updated' | 'outdated'

/**
 * Product-level freshness. Items updated in the last 24h are fresh, 1-3d
 * aging, >3d stale. Aging and stale both report priceStatus="outdated" to
 * the sales side — the inventory UI separates them purely for tone of voice.
 */
function productFreshnessFor(lastUpdatedAt: string): {
	level: FreshnessLevel
	priceStatus: PriceStatus
} {
	const hours = hoursSince(lastUpdatedAt)
	if (hours < 24) return { level: 'fresh', priceStatus: 'updated' }
	if (hours < 72) return { level: 'aging', priceStatus: 'outdated' }
	return { level: 'stale', priceStatus: 'outdated' }
}

/** Supplier-level freshness uses a gentler cadence — suppliers re-quote on a weekly-ish beat. */
export type QuoteFreshness = 'confirmed' | 'reconfirm' | 'needs_quote'

function quoteFreshnessFor(lastQuotedAt: string): QuoteFreshness {
	const hours = hoursSince(lastQuotedAt)
	if (hours < 7 * 24) return 'confirmed'
	if (hours < 21 * 24) return 'reconfirm'
	return 'needs_quote'
}

// ─── Inventory overview ──────────────────────────────────

export interface InventoryProductView {
	slug: string
	name: string
	name_ar: string
	sku: string
	unit: string
	subcategory: string
	specifications: JsonObject
	brand: string | null
	image: string
	broadCategory: BroadCategory
	supplierName: string
	allSupplierNames: string[]
	rawCost: number
	supplierCost: number
	lastUpdatedAt: string
	hoursSinceUpdate: number
	freshness: FreshnessLevel
	priceStatus: PriceStatus
	recentlyOrdered: boolean
	pendingRequestCount: number
	pendingRequestedBy: string[]
	isUrgent: boolean
	availability: 'available' | 'low_stock' | 'out_of_stock'
}

export interface InventoryCategorySummary {
	id: BroadCategory
	image: string
	totalCount: number
	urgentCount: number
	outdatedCount: number
	pendingRequestCount: number
}

/**
 * Determines whether a product is "recently ordered" by checking if any
 * non-expired RFQ references it. This is derived, not stored, so seeding
 * a new RFQ in db automatically lights up the signal here.
 */
function isRecentlyOrderedSlug(slug: string): boolean {
	return db.rfqs
		.list()
		.filter((r) => r.status !== 'declined' && r.status !== 'expired')
		.some((r) => r.items.some((i) => i.productSlug === slug))
}

function buildInventoryProductView(slug: string): InventoryProductView | null {
	const product = db.products.findBySlug(slug)
	if (!product) return null
	const broad = db.products.broadCategoryFor(product)
	const primary = db.supplierPrices.primaryForProduct(slug)

	const lastUpdatedAt = primary?.lastQuotedAt ?? new Date(0).toISOString()
	const rawCost = primary?.rawCost ?? 0
	const { level, priceStatus } = productFreshnessFor(lastUpdatedAt)
	const pending = db.priceUpdateRequests.forProduct(slug)
	const recentlyOrdered = isRecentlyOrderedSlug(slug)
	const isUrgent =
		priceStatus === 'outdated' && (recentlyOrdered || pending.length > 0)

	return {
		slug: product.slug,
		name: product.name,
		name_ar: product.name_ar,
		sku: product.sku,
		unit: product.unit_of_measure,
		subcategory: product.subcategory,
		specifications: toJsonObject(product.specifications),
		brand: product.brand,
		image: BROAD_CATEGORY_IMAGES[broad],
		broadCategory: broad,
		supplierName: primary?.supplierName ?? '—',
		allSupplierNames: db.supplierPrices
			.forProduct(slug)
			.map((p) => p.supplierName),
		rawCost,
		supplierCost: bufferCost(rawCost),
		lastUpdatedAt,
		hoursSinceUpdate: hoursSince(lastUpdatedAt),
		freshness: level,
		priceStatus,
		recentlyOrdered,
		pendingRequestCount: pending.length,
		pendingRequestedBy: pending.map((r) => r.customerContext),
		isUrgent,
		availability: product.availability_status,
	}
}

export const getInventoryOverview = createServerFn({ method: 'GET' })
	.inputValidator(z.object({}))
	.handler(async () => {
		const products = db.products
			.list()
			.map((p) => buildInventoryProductView(p.slug))
			.filter((p): p is InventoryProductView => p !== null)

		const categories: InventoryCategorySummary[] = BROAD_CATEGORIES.map(
			(id) => {
				const members = products.filter((p) => p.broadCategory === id)
				return {
					id,
					image: BROAD_CATEGORY_IMAGES[id],
					totalCount: members.length,
					urgentCount: members.filter((p) => p.isUrgent).length,
					outdatedCount: members.filter((p) => p.priceStatus === 'outdated')
						.length,
					pendingRequestCount: members.reduce(
						(s, p) => s + p.pendingRequestCount,
						0,
					),
				}
			},
		)

		return {
			products,
			categories,
			totals: {
				total: products.length,
				urgent: products.filter((p) => p.isUrgent).length,
				outdated: products.filter((p) => p.priceStatus === 'outdated').length,
				fresh: products.filter((p) => p.freshness === 'fresh').length,
				pendingRequests: db.priceUpdateRequests.pending().length,
			},
		}
	})

// ─── Product detail + suppliers ──────────────────────────

export interface SupplierQuote {
	id: string
	name: string
	rawCost: number
	leadTimeDays: number
	minOrderQty: number
	lastQuotedAt: string
	hoursSinceQuote: number
	quoteFreshness: QuoteFreshness
	tier: SupplierTier
	paymentTerms: string
	notes: string | null
	isPrimary: boolean
}

function presentSupplierPrice(row: SupplierPriceRow): SupplierQuote {
	const reg = db.suppliers.get(row.supplierName)
	return {
		id: row.id,
		name: row.supplierName,
		rawCost: row.rawCost,
		leadTimeDays: row.leadTimeDays,
		minOrderQty: row.minOrderQty,
		lastQuotedAt: row.lastQuotedAt,
		hoursSinceQuote: hoursSince(row.lastQuotedAt),
		quoteFreshness: quoteFreshnessFor(row.lastQuotedAt),
		tier: reg?.tier ?? 'new',
		paymentTerms: reg?.paymentTerms ?? '—',
		notes: row.notes,
		isPrimary: row.isPrimary,
	}
}

export const getInventoryProductDetail = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ slug: z.string() }))
	.handler(async ({ data }) => {
		const product = db.products.findBySlug(data.slug)
		if (!product) return null
		const broad = db.products.broadCategoryFor(product)
		const pending = db.priceUpdateRequests.forProduct(product.slug)
		const primary = db.supplierPrices.primaryForProduct(product.slug)
		const rawCost = primary?.rawCost ?? 0
		const suppliers = db.supplierPrices
			.forProduct(product.slug)
			.map(presentSupplierPrice)

		return {
			slug: product.slug,
			name: product.name,
			name_ar: product.name_ar,
			description: product.description,
			description_ar: product.description_ar,
			sku: product.sku,
			brand: product.brand,
			manufacturer: product.manufacturer,
			specifications: toJsonObject(product.specifications),
			unit: product.unit_of_measure,
			weight_kg: product.weight_kg,
			tags: product.tags,
			broadCategory: broad,
			image: BROAD_CATEGORY_IMAGES[broad],
			pendingRequests: pending.map((r) => ({
				id: r.id,
				customerContext: r.customerContext,
				requestedAt: r.requestedAt,
			})),
			currentRawCost: rawCost,
			currentSupplierCost: bufferCost(rawCost),
			lastUpdatedAt: primary?.lastQuotedAt ?? null,
			suppliers,
		}
	})

// ─── Price mutations ──────────────────────────────────────

/**
 * Legacy slug-based primary update. Kept because the InventoryView card uses
 * it — click the price on the grid, it updates the primary row directly.
 */
export const updateInventoryPrice = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({ slug: z.string(), rawCost: z.number().nonnegative() }),
	)
	.handler(async ({ data }) => {
		const primary = db.supplierPrices.primaryForProduct(data.slug)
		if (!primary)
			return { success: false, error: 'No primary supplier' as const }
		const updated = db.supplierPrices.updateCost(primary.id, data.rawCost)
		db.priceUpdateRequests.resolveFor(data.slug)
		return {
			success: true,
			slug: data.slug,
			newRawCost: data.rawCost,
			newSupplierCost: bufferCost(data.rawCost),
			updatedAt: updated?.lastQuotedAt ?? new Date().toISOString(),
		}
	})

/** Update a supplier quote from the product-detail modal. */
export const updateSupplierQuote = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			slug: z.string(),
			supplierId: z.string(),
			rawCost: z.number().nonnegative(),
		}),
	)
	.handler(async ({ data }) => {
		const row = db.supplierPrices.getById(data.supplierId)
		if (!row) return { success: false, error: 'Unknown supplier row' as const }
		const updated = db.supplierPrices.updateCost(row.id, data.rawCost)
		if (updated?.isPrimary) {
			db.priceUpdateRequests.resolveFor(updated.productSlug)
		}
		return {
			success: true,
			supplier: updated ? presentSupplierPrice(updated) : null,
		}
	})

/** Same mutation, row-id key — used by the supplier profile "all quotes" editor. */
export const updateSupplierQuoteByRow = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			slug: z.string(),
			supplierRowId: z.string(),
			rawCost: z.number().nonnegative(),
		}),
	)
	.handler(async ({ data }) => {
		const row = db.supplierPrices.getById(data.supplierRowId)
		if (!row) return { success: false, error: 'Unknown supplier row' as const }
		const updated = db.supplierPrices.updateCost(row.id, data.rawCost)
		if (updated?.isPrimary) {
			db.priceUpdateRequests.resolveFor(updated.productSlug)
		}
		return { success: true }
	})

// ─── Sales → inventory price request queue ────────────────

export const requestInventoryPriceUpdate = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			rfqId: z.string().optional(),
			quoteId: z.string().optional(),
			items: z.array(
				z.object({
					productId: z.string(),
					productName: z.string(),
					supplierName: z.string().optional(),
				}),
			),
			note: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		let inserted = 0
		let skippedFresh = 0
		let skippedDuplicate = 0
		for (const item of data.items) {
			const product =
				db.products.findBySlug(item.productId) ??
				db.products.findByName(item.productName)
			if (!product) continue

			// Authoritative freshness gate — the client's form state can be
			// stale (quote builder loaded when the price was outdated, then
			// inventory updated it in the background). The server is the
			// source of truth, so re-check against live db.supplierPrices and
			// refuse to create a request for a currently-fresh product.
			const primary = db.supplierPrices.primaryForProduct(product.slug)
			const lastUpdatedAt = primary?.lastQuotedAt ?? new Date(0).toISOString()
			const { priceStatus } = productFreshnessFor(lastUpdatedAt)
			if (priceStatus === 'updated') {
				skippedFresh += 1
				continue
			}

			const existing = db.priceUpdateRequests.forProduct(product.slug)
			if (existing.length > 0) {
				skippedDuplicate += 1
				continue
			}
			db.priceUpdateRequests.insert(
				product.slug,
				item.supplierName ? `Sales rep (${item.supplierName})` : 'Sales rep',
				data.rfqId,
			)
			inserted += 1
		}
		return {
			success: true,
			requestedCount: inserted,
			skippedFresh,
			skippedDuplicate,
		}
	})

// ─── Outdated price summary (used by sales home card) ────

export const getOutdatedPricesSummary = createServerFn({ method: 'GET' })
	.inputValidator(z.object({}))
	.handler(async () => {
		type Aggregate = {
			productName: string
			specification: string
			unit: string
			supplierName: string
			supplierCost: number
			totalQuantity: number
			recentlyOrdered: boolean
			affectedRfqs: { rfqId: string; customerName: string; quantity: number }[]
		}
		const byProduct = new Map<string, Aggregate>()

		for (const rfq of db.rfqs.list()) {
			if (rfq.status === 'declined' || rfq.status === 'expired') continue
			for (const item of rfq.items) {
				const product = db.products.findBySlug(item.productSlug)
				if (!product) continue
				const primary = db.supplierPrices.primaryForProduct(item.productSlug)
				const lastUpdatedAt = primary?.lastQuotedAt ?? new Date(0).toISOString()
				const { priceStatus } = productFreshnessFor(lastUpdatedAt)
				if (priceStatus !== 'outdated') continue

				const existing = byProduct.get(item.productSlug)
				if (existing) {
					existing.totalQuantity += item.quantity
					existing.affectedRfqs.push({
						rfqId: rfq.id,
						customerName: rfq.customerName,
						quantity: item.quantity,
					})
				} else {
					byProduct.set(item.productSlug, {
						productName: product.name,
						specification: product.subcategory.replace(/_/g, ' '),
						unit: product.unit_of_measure,
						supplierName: primary?.supplierName ?? '—',
						supplierCost: bufferCost(primary?.rawCost ?? 0),
						totalQuantity: item.quantity,
						recentlyOrdered: true, // the RFQ is the demand signal
						affectedRfqs: [
							{
								rfqId: rfq.id,
								customerName: rfq.customerName,
								quantity: item.quantity,
							},
						],
					})
				}
			}
		}

		const items = Array.from(byProduct.values()).sort(
			(a, b) => b.affectedRfqs.length - a.affectedRfqs.length,
		)
		return {
			items,
			totalOutdated: items.length,
			totalUrgent: items.length, // everything surfaced here is urgent by definition
			affectedRfqCount: new Set(
				items.flatMap((i) => i.affectedRfqs.map((r) => r.rfqId)),
			).size,
			generatedAt: new Date().toISOString(),
		}
	})

// ─── Supplier profile ─────────────────────────────────────

export interface SupplierProfileQuote {
	supplierRowId: string
	productSlug: string
	productName: string
	productCategory: string
	unit: string
	rawCost: number
	lastQuotedAt: string
	quoteFreshness: QuoteFreshness
	isPrimary: boolean
}

export const getSupplierProfile = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ name: z.string() }))
	.handler(async ({ data }) => {
		const supplier = db.suppliers.get(data.name)
		const quotes: SupplierProfileQuote[] = db.supplierPrices
			.forSupplier(data.name)
			.map((row) => {
				const product = db.products.findBySlug(row.productSlug)
				return {
					supplierRowId: row.id,
					productSlug: row.productSlug,
					productName: product?.name ?? row.productSlug,
					productCategory: product
						? db.products.broadCategoryFor(product)
						: 'finishing',
					unit: product?.unit_of_measure ?? 'unit',
					rawCost: row.rawCost,
					lastQuotedAt: row.lastQuotedAt,
					quoteFreshness: quoteFreshnessFor(row.lastQuotedAt),
					isPrimary: row.isPrimary,
				}
			})
			.sort(
				(a, b) =>
					new Date(a.lastQuotedAt).getTime() -
					new Date(b.lastQuotedAt).getTime(),
			)

		return {
			supplier: supplier ?? {
				name: data.name,
				tier: 'new' as SupplierTier,
				paymentTerms: '—',
				phone: null,
				rating: 0,
				customBadges: [] as string[],
				joinedAt: new Date().toISOString(),
			},
			quoteCount: quotes.length,
			primaryForCount: quotes.filter((q) => q.isPrimary).length,
			staleCount: quotes.filter((q) => q.quoteFreshness === 'needs_quote')
				.length,
			reconfirmCount: quotes.filter((q) => q.quoteFreshness === 'reconfirm')
				.length,
			confirmedCount: quotes.filter((q) => q.quoteFreshness === 'confirmed')
				.length,
			quotes,
		}
	})

export const updateSupplierProfile = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			name: z.string(),
			tier: z.enum(['preferred', 'approved', 'conditional', 'new']).optional(),
			paymentTerms: z.string().optional(),
			addBadge: z.string().optional(),
			removeBadge: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		if (data.tier || data.paymentTerms) {
			db.suppliers.upsert(data.name, {
				...(data.tier ? { tier: data.tier } : {}),
				...(data.paymentTerms ? { paymentTerms: data.paymentTerms } : {}),
			})
		}
		if (data.addBadge) db.suppliers.addBadge(data.name, data.addBadge)
		if (data.removeBadge) db.suppliers.removeBadge(data.name, data.removeBadge)
		return { success: true, supplier: db.suppliers.get(data.name) }
	})

// ─── Top suppliers — call once, fix many ─────────────────

export interface TopSupplier {
	name: string
	tier: SupplierTier
	rating: number
	customBadges: string[]
	totalQuotes: number
	primaryFor: number
	outdatedQuotes: number
	urgentQuotes: number
	affectedCategories: string[]
	primaryForOutdatedCount: number
}

export const getTopSuppliers = createServerFn({ method: 'GET' })
	.inputValidator(
		z.object({ limit: z.number().int().min(1).max(20).default(5) }),
	)
	.handler(async ({ data }) => {
		// Use the SAME freshness signals as the inventory overview so this strip
		// stays in lock-step with the Urgent/Outdated stats. A row counts as:
		//   outdated  →  its product row shows priceStatus='outdated' (>24h)
		//   urgent    →  outdated AND (recently ordered OR has a pending request)
		const ranked: TopSupplier[] = db.suppliers
			.list()
			.map((supplier) => {
				const rows = db.supplierPrices.forSupplier(supplier.name)
				const categories = new Set<string>()
				let outdatedQuotes = 0
				let urgentQuotes = 0
				let primaryFor = 0
				let primaryForOutdatedCount = 0

				for (const row of rows) {
					const product = db.products.findBySlug(row.productSlug)
					if (!product) continue
					categories.add(db.products.broadCategoryFor(product))
					if (row.isPrimary) primaryFor += 1

					const { priceStatus } = productFreshnessFor(row.lastQuotedAt)
					const isOutdated = priceStatus === 'outdated'
					if (!isOutdated) continue

					outdatedQuotes += 1
					if (row.isPrimary) primaryForOutdatedCount += 1

					const pending = db.priceUpdateRequests.forProduct(
						row.productSlug,
					).length
					const recentlyOrdered = isRecentlyOrderedSlug(row.productSlug)
					if (pending > 0 || recentlyOrdered) urgentQuotes += 1
				}

				return {
					name: supplier.name,
					tier: supplier.tier,
					rating: supplier.rating,
					customBadges: supplier.customBadges,
					totalQuotes: rows.length,
					primaryFor,
					outdatedQuotes,
					urgentQuotes,
					affectedCategories: Array.from(categories).sort(),
					primaryForOutdatedCount,
				}
			})
			.filter((s) => s.outdatedQuotes > 0)
			.sort((a, b) => {
				if (a.urgentQuotes !== b.urgentQuotes)
					return b.urgentQuotes - a.urgentQuotes
				if (a.primaryForOutdatedCount !== b.primaryForOutdatedCount) {
					return b.primaryForOutdatedCount - a.primaryForOutdatedCount
				}
				return b.outdatedQuotes - a.outdatedQuotes
			})
			.slice(0, data.limit)

		return { suppliers: ranked }
	})
