import {
	type AvailabilityStatus,
	BROAD_CATEGORIES,
	type BroadCategory,
	getBroadCategory,
} from '@hyperquote/types'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { hoursSince } from '../db/types'
import { getInternalSupabaseClient } from './_supabase'

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
	goodStockThreshold: number
	stockRatio: number // availableLevel / goodStockThreshold
	status: StockStatus
	primarySupplierName: string
	primaryRawCost: number
	supplierCount: number
	pendingDealCount: number
	availability: AvailabilityStatus
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
	supplierId: string
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
	goodStockThreshold: number
	status: StockStatus
	suggestedQty: number
	suppliers: StockSupplierOffer[]
}

interface SupabaseStockProductRow {
	id: string
	slug: string
	sku: string
	name: string
	category: string
	subcategory: string | null
	unit_of_measure: string
	price_range_min: number | null
	price_range_max: number | null
	availability_status: AvailabilityStatus
	image_urls: string[] | null
}

interface SupabaseInventoryStockRow {
	product_id: string
	on_hand_quantity: number
	reserved_quantity: number
	available_quantity: number
	minimum_quantity: number
	good_quantity: number
}

interface SupabaseSupplierRow {
	id: string
	name: string
	phone: string | null
	status?: string
}

interface SupabaseSupplierLinkRow {
	id: string
	product_id: string
	supplier_id: string
	raw_cost: number
	lead_time_days: number
	min_order_qty: number
	is_primary: boolean
	last_quoted_at: string | null
	suppliers: SupabaseSupplierRow | SupabaseSupplierRow[] | null
}

interface SupabaseSupplierSpecialtyRow {
	id: string
	supplier_id: string
	category_slug: string
	product_slug: string | null
	suppliers: SupabaseSupplierRow | SupabaseSupplierRow[] | null
}

interface SupabaseRefillRequestRow {
	id: string
	product_id: string
	status: string
}

// ─── Helpers ──────────────────────────────────────────────

const STOCK_LOOKUP_CHUNK_SIZE = 50

function statusFor(
	level: number,
	lowThreshold: number,
	goodThreshold: number,
): StockStatus {
	if (level <= 0) return 'out'
	if (lowThreshold > 0 && level < lowThreshold) return 'critical'
	if (goodThreshold > 0 && level < goodThreshold) return 'low'
	return 'healthy'
}

function chunkArray<T>(values: T[], size: number): T[][] {
	const chunks: T[][] = []
	for (let index = 0; index < values.length; index += size) {
		chunks.push(values.slice(index, index + size))
	}
	return chunks
}

function firstRelation<T>(value: T | T[] | null): T | null {
	if (Array.isArray(value)) return value[0] ?? null
	return value
}

function supplierIsActive(
	supplier: SupabaseSupplierRow | null,
): supplier is SupabaseSupplierRow {
	return Boolean(supplier && supplier.status === 'active')
}

function specialtyMatchesProduct(
	specialty: SupabaseSupplierSpecialtyRow,
	product: Pick<SupabaseStockProductRow, 'category' | 'slug'>,
): boolean {
	return (
		specialty.category_slug === product.category &&
		(specialty.product_slug === null || specialty.product_slug === product.slug)
	)
}

function specialtySuppliersForProduct(
	specialties: SupabaseSupplierSpecialtyRow[],
	product: Pick<SupabaseStockProductRow, 'category' | 'slug'>,
	linkedSupplierIds = new Set<string>(),
): SupabaseSupplierRow[] {
	return specialties
		.filter((specialty) => specialtyMatchesProduct(specialty, product))
		.map((specialty) => firstRelation(specialty.suppliers))
		.filter(
			(supplier): supplier is SupabaseSupplierRow =>
				supplierIsActive(supplier) && !linkedSupplierIds.has(supplier.id),
		)
}

function activeSupplierLinksForProduct(
	links: SupabaseSupplierLinkRow[],
): SupabaseSupplierLinkRow[] {
	return links.filter((link) => {
		const supplier = firstRelation(link.suppliers)
		return supplierIsActive(supplier)
	})
}

function buildSupabaseStockView({
	product,
	stock,
	links,
	specialties,
	pendingDealCount,
}: {
	product: SupabaseStockProductRow
	stock: SupabaseInventoryStockRow | null
	links: SupabaseSupplierLinkRow[]
	specialties: SupabaseSupplierSpecialtyRow[]
	pendingDealCount: number
}): StockProductView {
	const stockLevel = Number(stock?.on_hand_quantity ?? 0)
	const reservedLevel = Number(stock?.reserved_quantity ?? 0)
	const availableLevel = Math.max(
		0,
		Number(stock?.available_quantity ?? stockLevel - reservedLevel),
	)
	const lowStockThreshold = Number(stock?.minimum_quantity ?? 0)
	const goodStockThreshold = Math.max(
		lowStockThreshold,
		Number(stock?.good_quantity ?? 0),
	)
	const ratio =
		goodStockThreshold > 0
			? availableLevel / goodStockThreshold
			: availableLevel > 0
				? 1
				: 0
	const status = statusFor(
		availableLevel,
		lowStockThreshold,
		goodStockThreshold,
	)
	const broad = getBroadCategory(product.category)
	const eligibleLinks = activeSupplierLinksForProduct(links)
	const primary =
		eligibleLinks.find((link) => link.is_primary) ?? eligibleLinks[0] ?? null
	const primarySupplier = firstRelation(primary?.suppliers ?? null)
	const linkedSupplierIds = new Set(
		eligibleLinks.map((link) => link.supplier_id),
	)
	const specialtySuppliers = specialtySuppliersForProduct(
		specialties,
		product,
		linkedSupplierIds,
	)
	const supplierIds = new Set([
		...linkedSupplierIds,
		...specialtySuppliers.map((supplier) => supplier.id),
	])

	return {
		slug: product.slug,
		name: product.name,
		sku: product.sku,
		unit: product.unit_of_measure,
		image: product.image_urls?.[0] ?? '',
		broadCategory: broad,
		subcategory: product.subcategory ?? product.category,
		stockLevel,
		reservedLevel,
		availableLevel,
		lowStockThreshold,
		goodStockThreshold,
		stockRatio: ratio,
		status,
		primarySupplierName:
			primarySupplier?.name ?? specialtySuppliers[0]?.name ?? '—',
		primaryRawCost: Number(
			primary?.raw_cost ??
				product.price_range_min ??
				product.price_range_max ??
				0,
		),
		supplierCount: supplierIds.size,
		pendingDealCount,
		availability: product.availability_status,
	}
}

async function getSupabaseStockOverview() {
	const auth = await getInternalSupabaseClient()

	const { data: productRows, error: productError } = await auth.client
		.from('products')
		.select(
			'id, slug, sku, name, category, subcategory, unit_of_measure, price_range_min, price_range_max, availability_status, image_urls',
		)
		.eq('is_active', true)
		.eq('is_stockable', true)
	if (productError) throw new Error(productError.message)

	const products = (productRows ?? []) as unknown as SupabaseStockProductRow[]
	const productIds = products.map((product) => product.id)

	if (productIds.length === 0) {
		return {
			products: [],
			totals: { total: 0, healthy: 0, low: 0, critical: 0, out: 0 },
			categories: BROAD_CATEGORIES.map((id) => ({
				id,
				image: '',
				totalCount: 0,
				healthyCount: 0,
				lowCount: 0,
				criticalCount: 0,
				outCount: 0,
			})),
		}
	}

	const productIdChunks = chunkArray(productIds, STOCK_LOOKUP_CHUNK_SIZE)
	const categoryChunks = chunkArray(
		Array.from(new Set(products.map((product) => product.category))),
		STOCK_LOOKUP_CHUNK_SIZE,
	)
	const stockRows: SupabaseInventoryStockRow[] = []
	const linkRows: SupabaseSupplierLinkRow[] = []
	const specialtyRows: SupabaseSupplierSpecialtyRow[] = []
	const refillRows: SupabaseRefillRequestRow[] = []

	for (const ids of productIdChunks) {
		const { data, error } = await auth.client
			.from('inventory_stock')
			.select(
				'product_id, on_hand_quantity, reserved_quantity, available_quantity, minimum_quantity, good_quantity',
			)
			.in('product_id', ids)
		if (error) throw new Error(error.message)
		stockRows.push(...((data ?? []) as unknown as SupabaseInventoryStockRow[]))
	}

	for (const ids of productIdChunks) {
		const { data, error } = await auth.client
			.from('supplier_product_links')
			.select(
				'id, product_id, supplier_id, raw_cost, lead_time_days, min_order_qty, is_primary, last_quoted_at, suppliers ( id, name, phone, status )',
			)
			.in('product_id', ids)
		if (error) throw new Error(error.message)
		linkRows.push(...((data ?? []) as unknown as SupabaseSupplierLinkRow[]))
	}

	for (const categories of categoryChunks) {
		const { data, error } = await auth.client
			.from('supplier_specialties')
			.select(
				'id, supplier_id, category_slug, product_slug, suppliers ( id, name, phone, status )',
			)
			.in('category_slug', categories)
		if (error) throw new Error(error.message)
		specialtyRows.push(
			...((data ?? []) as unknown as SupabaseSupplierSpecialtyRow[]),
		)
	}

	for (const ids of productIdChunks) {
		const { data, error } = await auth.client
			.from('refill_requests')
			.select('id, product_id, status')
			.in('product_id', ids)
			.in('status', [
				'finance_pending',
				'finance_approved',
				'warehouse_receiving',
			])
		if (error) throw new Error(error.message)
		refillRows.push(...((data ?? []) as unknown as SupabaseRefillRequestRow[]))
	}

	const stockByProduct = new Map<string, SupabaseInventoryStockRow>()
	for (const row of stockRows) {
		stockByProduct.set(row.product_id, row)
	}

	const linksByProduct = new Map<string, SupabaseSupplierLinkRow[]>()
	for (const link of linkRows) {
		const list = linksByProduct.get(link.product_id) ?? []
		list.push(link)
		linksByProduct.set(link.product_id, list)
	}

	const pendingDealCountByProduct = new Map<string, number>()
	for (const refill of refillRows) {
		pendingDealCountByProduct.set(
			refill.product_id,
			(pendingDealCountByProduct.get(refill.product_id) ?? 0) + 1,
		)
	}

	const presented = products.map((product) =>
		buildSupabaseStockView({
			product,
			stock: stockByProduct.get(product.id) ?? null,
			links: linksByProduct.get(product.id) ?? [],
			specialties: specialtyRows,
			pendingDealCount: pendingDealCountByProduct.get(product.id) ?? 0,
		}),
	)

	const totals = presented.reduce(
		(acc, product) => {
			acc.total += 1
			acc[product.status] += 1
			return acc
		},
		{ total: 0, healthy: 0, low: 0, critical: 0, out: 0 },
	)

	const categories: StockCategorySummary[] = BROAD_CATEGORIES.map((id) => {
		const inCat = presented.filter((product) => product.broadCategory === id)
		return {
			id,
			image: inCat.find((product) => product.image)?.image ?? '',
			totalCount: inCat.length,
			healthyCount: inCat.filter((product) => product.status === 'healthy')
				.length,
			lowCount: inCat.filter((product) => product.status === 'low').length,
			criticalCount: inCat.filter((product) => product.status === 'critical')
				.length,
			outCount: inCat.filter((product) => product.status === 'out').length,
		}
	})

	return { products: presented, totals, categories }
}

// ─── Server functions ────────────────────────────────────

export const getStockOverview = createServerFn({ method: 'POST' })
	.inputValidator(z.object({}))
	.handler(async () => {
		return getSupabaseStockOverview()
	})

export const setStockProductAvailability = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			slug: z.string(),
			availability: z.enum(['available', 'out_of_stock']),
		}),
	)
	.handler(async ({ data }) => {
		const auth = await getInternalSupabaseClient()
		const { data: product, error: productError } = await auth.client
			.from('products')
			.select('id')
			.eq('slug', data.slug)
			.eq('is_active', true)
			.eq('is_stockable', true)
			.maybeSingle()
		if (productError) throw new Error(productError.message)
		if (!product?.id) {
			return { success: false as const, error: 'Unknown stock item' }
		}

		const { error } = await auth.client.rpc(
			'inventory_set_product_availability',
			{
				p_availability: data.availability,
				p_product_id: product.id,
			},
		)
		if (error) throw new Error(error.message)

		return {
			success: true as const,
			availability: data.availability,
		}
	})

function presentSupabaseSupplierOffer(
	link: SupabaseSupplierLinkRow,
): StockSupplierOffer {
	const supplier = firstRelation(link.suppliers)
	const quotedAt = link.last_quoted_at ?? new Date(0).toISOString()
	return {
		rowId: link.id,
		supplierId: supplier?.id ?? link.supplier_id,
		supplierName: supplier?.name ?? '',
		tier: supplier?.status ?? '',
		phone: supplier?.phone ?? null,
		rawCost: Number(link.raw_cost),
		leadTimeDays: link.lead_time_days,
		minOrderQty: Number(link.min_order_qty),
		lastQuotedAtHoursAgo: Math.round(hoursSince(quotedAt)),
		isPrimary: link.is_primary,
		rating: 0,
	}
}

function presentSpecialtySupplierOffer({
	supplier,
	product,
}: {
	supplier: SupabaseSupplierRow
	product: SupabaseStockProductRow
}): StockSupplierOffer {
	return {
		rowId: `new:${supplier.id}`,
		supplierId: supplier.id,
		supplierName: supplier.name,
		tier: supplier.status ?? '',
		phone: supplier.phone ?? null,
		rawCost: Number(product.price_range_min ?? product.price_range_max ?? 0),
		leadTimeDays: 1,
		minOrderQty: 1,
		lastQuotedAtHoursAgo: Math.round(hoursSince(new Date(0).toISOString())),
		isPrimary: false,
		rating: 0,
	}
}

async function getSupabaseRefillProductDetail(slug: string) {
	const auth = await getInternalSupabaseClient()

	const { data: productData, error: productError } = await auth.client
		.from('products')
		.select(
			'id, slug, sku, name, category, unit_of_measure, price_range_min, price_range_max',
		)
		.eq('slug', slug)
		.eq('is_active', true)
		.maybeSingle()
	if (productError) throw new Error(productError.message)
	if (!productData) return null

	const product = productData as unknown as SupabaseStockProductRow
	const { data: stockData, error: stockError } = await auth.client
		.from('inventory_stock')
		.select(
			'product_id, on_hand_quantity, reserved_quantity, available_quantity, minimum_quantity, good_quantity',
		)
		.eq('product_id', product.id)
		.maybeSingle()
	if (stockError) throw new Error(stockError.message)

	const stock = stockData as unknown as SupabaseInventoryStockRow | null
	const stockLevel = Number(stock?.on_hand_quantity ?? 0)
	const availableLevel = Math.max(
		0,
		Number(
			stock?.available_quantity ??
				stockLevel - Number(stock?.reserved_quantity ?? 0),
		),
	)
	const lowStockThreshold = Number(stock?.minimum_quantity ?? 0)
	const goodStockThreshold = Math.max(
		lowStockThreshold,
		Number(stock?.good_quantity ?? 0),
	)
	const status = statusFor(
		availableLevel,
		lowStockThreshold,
		goodStockThreshold,
	)
	const suggestedQty = Math.max(
		lowStockThreshold * 2 - availableLevel,
		lowStockThreshold,
		goodStockThreshold,
		1,
	)

	const { data: linkRows, error: linkError } = await auth.client
		.from('supplier_product_links')
		.select(
			'id, product_id, supplier_id, raw_cost, lead_time_days, min_order_qty, is_primary, last_quoted_at, suppliers ( id, name, phone, status )',
		)
		.eq('product_id', product.id)
	if (linkError) throw new Error(linkError.message)

	const { data: specialtyRows, error: specialtyError } = await auth.client
		.from('supplier_specialties')
		.select(
			'id, supplier_id, category_slug, product_slug, suppliers ( id, name, phone, status )',
		)
		.eq('category_slug', product.category)
	if (specialtyError) throw new Error(specialtyError.message)

	const links = (linkRows ?? []) as unknown as SupabaseSupplierLinkRow[]
	const specialties = (specialtyRows ??
		[]) as unknown as SupabaseSupplierSpecialtyRow[]
	const eligibleLinks = activeSupplierLinksForProduct(links)
	const linkedSupplierIds = new Set(
		eligibleLinks.map((link) => link.supplier_id),
	)
	const specialtyOffers = specialtySuppliersForProduct(
		specialties,
		product,
		linkedSupplierIds,
	).map((supplier) => presentSpecialtySupplierOffer({ supplier, product }))

	const suppliers = [
		...eligibleLinks.map(presentSupabaseSupplierOffer),
		...specialtyOffers,
	].sort((a, b) => {
		if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
		if (a.rawCost !== b.rawCost) return a.rawCost - b.rawCost
		return a.leadTimeDays - b.leadTimeDays
	})

	return {
		slug: product.slug,
		name: product.name,
		sku: product.sku,
		unit: product.unit_of_measure,
		stockLevel: availableLevel,
		lowStockThreshold,
		goodStockThreshold,
		status,
		suggestedQty: Math.round(suggestedQty),
		suppliers,
	} satisfies RefillProductDetail
}

export const getRefillProductDetail = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ slug: z.string() }))
	.handler(async ({ data }) => {
		return getSupabaseRefillProductDetail(data.slug)
	})

export const createDeal = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			supplierName: z.string(),
			supplierId: z.string().uuid(),
			items: z
				.array(
					z.object({
						productSlug: z.string(),
						agreedQty: z.number().positive(),
						agreedRawCost: z.number().positive(),
					}),
				)
				.min(1),
			notes: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const auth = await getInternalSupabaseClient()
		const { data: supplier, error: supplierError } = await auth.client
			.from('suppliers')
			.select('id, name')
			.eq('id', data.supplierId)
			.eq('status', 'active')
			.maybeSingle()
		if (supplierError) throw new Error(supplierError.message)
		if (!supplier?.id) {
			return {
				success: false as const,
				error: `${data.supplierName} is not an active supplier`,
			}
		}

		const createdDealIds: string[] = []
		for (const item of data.items) {
			const { data: product, error: productError } = await auth.client
				.from('products')
				.select('id')
				.eq('slug', item.productSlug)
				.maybeSingle()
			if (productError) throw new Error(productError.message)
			if (!product?.id) {
				return {
					success: false as const,
					error: `Unknown product ${item.productSlug}`,
				}
			}

			const { data: refill, error: refillError } = await auth.client.rpc(
				'create_supplier_refill',
				{
					p_product_id: product.id,
					p_supplier_id: supplier.id,
					p_quantity: item.agreedQty,
					p_unit_cost: item.agreedRawCost,
					p_proof: {
						kind: 'supplier_refill',
						notes: data.notes?.trim() || null,
						supplier_name: supplier.name,
					},
				},
			)
			if (refillError) throw new Error(refillError.message)
			const refillId =
				typeof refill === 'object' &&
				refill !== null &&
				'id' in refill &&
				typeof refill.id === 'string'
					? refill.id
					: null
			if (refillId) createdDealIds.push(refillId)
		}

		return {
			success: true as const,
			dealId: createdDealIds[0] ?? '',
			supplierName: supplier.name,
			itemCount: data.items.length,
		}
	})
