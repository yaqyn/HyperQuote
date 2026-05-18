import {
	type AvailabilityStatus,
	BROAD_CATEGORIES,
	BROAD_CATEGORY_IMAGES,
	type BroadCategory,
} from '@hyperquote/types'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
	db,
	hoursSince,
	type JsonObject,
	type SupplierPriceRow,
	type SupplierTier,
} from '../db/db'
import { PRICE_PROOF_ESSAY_MIN } from '../inputs'
import { toJsonObject } from './json'

/**
 * Inventory panel server — every byte of state lives in db.ts.
 * This file is a thin projection layer: take rows out of db, derive
 * freshness / urgency / aggregates, return shapes the UI wants.
 */

// ─── Config ───────────────────────────────────────────────

const PROCUREMENT_BUFFER = 0.025

function bufferCost(raw: number): number {
	return Math.round(raw * (1 + PROCUREMENT_BUFFER) * 100) / 100
}

const priceProofSchema = z.discriminatedUnion('kind', [
	z.object({
		kind: z.literal('pdf'),
		fileName: z
			.string()
			.trim()
			.min(1)
			.regex(/\.pdf$/i),
	}),
	z.object({
		kind: z.literal('essay'),
		text: z.string().trim().min(PRICE_PROOF_ESSAY_MIN),
	}),
])

export type PriceProofInput = z.infer<typeof priceProofSchema>

function formatPriceProofNote({
	proof,
	oldCost,
	newCost,
}: {
	proof: PriceProofInput
	oldCost: number
	newCost: number
}): string {
	const delta =
		oldCost > 0
			? `${(((newCost - oldCost) / oldCost) * 100).toFixed(1)}%`
			: 'new'
	const evidence =
		proof.kind === 'pdf'
			? `PDF: ${proof.fileName.trim()}`
			: `Essay: ${proof.text.trim()}`
	return `Price proof · ${oldCost.toFixed(2)} -> ${newCost.toFixed(2)} EGP · ${delta} · ${evidence}`
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
	availability: AvailabilityStatus
}

interface InventoryCategorySummary {
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

interface SupplierQuote {
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

/** Update a supplier quote from the product-detail modal. */
export const updateSupplierQuote = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			slug: z.string(),
			supplierId: z.string(),
			rawCost: z.number().nonnegative(),
			proof: priceProofSchema,
		}),
	)
	.handler(async ({ data }) => {
		const row = db.supplierPrices.getById(data.supplierId)
		if (!row) return { success: false, error: 'Unknown supplier row' as const }
		const proofNote = formatPriceProofNote({
			proof: data.proof,
			oldCost: row.rawCost,
			newCost: data.rawCost,
		})
		const updated = db.supplierPrices.updateCost(
			row.id,
			data.rawCost,
			proofNote,
		)
		if (updated?.isPrimary) {
			db.priceUpdateRequests.resolveFor(updated.productSlug)
		}
		return {
			success: true,
			supplier: updated ? presentSupplierPrice(updated) : null,
		}
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
