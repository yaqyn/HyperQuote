import {
	BROAD_CATEGORIES,
	BROAD_CATEGORY_IMAGES,
	type BroadCategory,
	getBroadCategory,
} from '@hyperquote/types'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db, hoursSince } from '../db/db'

// ─── Types ────────────────────────────────────────────────

export type StockStatus = 'healthy' | 'low' | 'critical' | 'out'

export interface StockProductView {
	slug: string
	name: string
	sku: string
	unit: string
	image: string
	broadCategory: BroadCategory
	subcategory: string
	/** Physical on-hand qty including reserved. */
	stockLevel: number
	/** Qty locked by approved-but-not-delivered orders. */
	reservedLevel: number
	/** Physical minus reserved — what sales can promise to new orders. */
	availableLevel: number
	lowStockThreshold: number
	stockRatio: number // availableLevel / lowStockThreshold
	status: StockStatus
	primarySupplierName: string
	primaryRawCost: number
	supplierCount: number
	pendingDealCount: number
}

interface StockCategorySummary {
	id: BroadCategory
	image: string
	totalCount: number
	healthyCount: number
	lowCount: number
	criticalCount: number
	outCount: number
}

export interface StockSupplierOffer {
	rowId: string
	supplierName: string
	tier: string
	phone: string | null
	rawCost: number
	leadTimeDays: number
	minOrderQty: number
	lastQuotedAtHoursAgo: number
	isPrimary: boolean
	rating: number
}

interface RefillProductDetail {
	slug: string
	name: string
	sku: string
	unit: string
	stockLevel: number
	lowStockThreshold: number
	status: StockStatus
	suggestedQty: number
	suppliers: StockSupplierOffer[]
}

// ─── Helpers ──────────────────────────────────────────────

function statusFor(level: number, threshold: number): StockStatus {
	if (level <= 0) return 'out'
	const ratio = threshold > 0 ? level / threshold : 1
	if (ratio < 0.25) return 'critical'
	if (ratio < 1) return 'low'
	return 'healthy'
}

function buildView(slug: string): StockProductView | null {
	const product = db.products.findBySlug(slug)
	if (!product) return null
	const stockRow = db.stock.forProduct(slug)
	const stockLevel = stockRow?.stockLevel ?? 0
	const reservedLevel = stockRow?.reservedLevel ?? 0
	const lowStockThreshold = stockRow?.lowStockThreshold ?? 0
	const availableLevel = Math.max(0, stockLevel - reservedLevel)
	// Status + gauge read `availableLevel` so reserved stock counts as
	// unavailable — sales can't promise what procurement has already sold.
	const ratio = lowStockThreshold > 0 ? availableLevel / lowStockThreshold : 1
	const status = statusFor(availableLevel, lowStockThreshold)
	const broad = getBroadCategory(product.category)
	const primary = db.supplierPrices.primaryForProduct(slug)
	const suppliers = db.supplierPrices.forProduct(slug)
	const pendingDeals = db.deals
		.forProduct(slug)
		.filter(
			(d) =>
				d.status === 'pending_finance' || d.status === 'approved_by_finance',
		)

	return {
		slug: product.slug,
		name: product.name,
		sku: product.sku,
		unit: product.unit_of_measure,
		image: BROAD_CATEGORY_IMAGES[broad],
		broadCategory: broad,
		subcategory: product.subcategory,
		stockLevel,
		reservedLevel,
		availableLevel,
		lowStockThreshold,
		stockRatio: ratio,
		status,
		primarySupplierName: primary?.supplierName ?? '—',
		primaryRawCost: primary?.rawCost ?? 0,
		supplierCount: suppliers.length,
		pendingDealCount: pendingDeals.length,
	}
}

// ─── Server functions ────────────────────────────────────

export const getStockOverview = createServerFn({ method: 'GET' })
	.inputValidator(z.object({}))
	.handler(async () => {
		const products = db.products
			.list()
			.map((p) => buildView(p.slug))
			.filter((p): p is StockProductView => p !== null)

		const totals = products.reduce(
			(acc, p) => {
				acc.total += 1
				acc[p.status] += 1
				return acc
			},
			{ total: 0, healthy: 0, low: 0, critical: 0, out: 0 },
		)

		const categories: StockCategorySummary[] = BROAD_CATEGORIES.map((id) => {
			const inCat = products.filter((p) => p.broadCategory === id)
			return {
				id,
				image: BROAD_CATEGORY_IMAGES[id],
				totalCount: inCat.length,
				healthyCount: inCat.filter((p) => p.status === 'healthy').length,
				lowCount: inCat.filter((p) => p.status === 'low').length,
				criticalCount: inCat.filter((p) => p.status === 'critical').length,
				outCount: inCat.filter((p) => p.status === 'out').length,
			}
		})

		return { products, totals, categories }
	})

export const getRefillProductDetail = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ slug: z.string() }))
	.handler(async ({ data }) => {
		const product = db.products.findBySlug(data.slug)
		if (!product) return null
		const stockRow = db.stock.forProduct(data.slug)
		const stockLevel = stockRow?.stockLevel ?? 0
		const lowStockThreshold = stockRow?.lowStockThreshold ?? 0
		const status = statusFor(stockLevel, lowStockThreshold)

		// A reasonable default refill quantity — enough to bring the stock back
		// to ~200% of the low-stock threshold. Gives procurement a ceiling that
		// covers the next ~month of runoff without over-ordering.
		const suggestedQty = Math.max(
			lowStockThreshold * 2 - stockLevel,
			lowStockThreshold,
		)

		const suppliers: StockSupplierOffer[] = db.supplierPrices
			.forProduct(data.slug)
			.map((row) => {
				const registry = db.suppliers.get(row.supplierName)
				return {
					rowId: row.id,
					supplierName: row.supplierName,
					tier: registry?.tier ?? 'approved',
					phone: registry?.phone ?? null,
					rawCost: row.rawCost,
					leadTimeDays: row.leadTimeDays,
					minOrderQty: row.minOrderQty,
					lastQuotedAtHoursAgo: Math.round(hoursSince(row.lastQuotedAt)),
					isPrimary: row.isPrimary,
					rating: registry?.rating ?? 0,
				}
			})
			.sort((a, b) => {
				// Primary first, then cheapest, then fastest lead time.
				if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
				if (a.rawCost !== b.rawCost) return a.rawCost - b.rawCost
				return a.leadTimeDays - b.leadTimeDays
			})

		return {
			slug: product.slug,
			name: product.name,
			sku: product.sku,
			unit: product.unit_of_measure,
			stockLevel,
			lowStockThreshold,
			status,
			suggestedQty: Math.round(suggestedQty),
			suppliers,
		} satisfies RefillProductDetail
	})

export const createDeal = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			supplierName: z.string(),
			items: z
				.array(
					z.object({
						productSlug: z.string(),
						agreedQty: z.number().positive(),
						agreedRawCost: z.number().nonnegative(),
					}),
				)
				.min(1),
			notes: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		// For every item: flip the supplier's listed price to the agreed
		// cost — the call IS the new quote. Stock is NOT touched here; it
		// only increments when the warehouse physically receives the items
		// via recordReceivingAttempt. Optimistic stock was lying to sales.
		for (const item of data.items) {
			const row = db.supplierPrices
				.forProduct(item.productSlug)
				.find((p) => p.supplierName === data.supplierName)
			if (!row) {
				return {
					success: false as const,
					error: `${data.supplierName} doesn't carry ${item.productSlug}`,
				}
			}
			db.supplierPrices.updateCost(row.id, item.agreedRawCost)
		}

		// Deals start in pending_finance — finance reviews the full order
		// (every item in the list) and signs off before warehouse receives.
		const deal = db.deals.insert({
			supplierName: data.supplierName,
			items: data.items.map((i) => ({
				productSlug: i.productSlug,
				agreedQty: i.agreedQty,
				agreedRawCost: i.agreedRawCost,
			})),
			status: 'pending_finance',
			notes: data.notes ?? null,
		})

		return {
			success: true as const,
			dealId: deal.id,
			supplierName: deal.supplierName,
			itemCount: data.items.length,
		}
	})
