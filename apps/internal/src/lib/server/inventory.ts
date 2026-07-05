import {
	type AvailabilityStatus,
	BROAD_CATEGORIES,
	type BroadCategory,
	getBroadCategory,
} from '@hyperquote/types'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { hoursSince, type JsonObject, type SupplierTier } from '../db/types'
import { getInternalSupabaseClient } from './_supabase'
import { toJsonObject } from './json'

/**
 * Inventory panel server. Supabase owns inventory, supplier pricing, and price
 * request state; this file only projects those rows into UI view models.
 */

// ─── Config ───────────────────────────────────────────────

const PROCUREMENT_BUFFER = 0.025
const INVENTORY_LOOKUP_CHUNK_SIZE = 50
const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string | undefined): value is string {
	return Boolean(value && UUID_RE.test(value))
}

function chunkArray<T>(values: T[], size: number): T[][] {
	const chunks: T[][] = []
	for (let index = 0; index < values.length; index += size) {
		chunks.push(values.slice(index, index + size))
	}
	return chunks
}

function bufferCost(raw: number): number {
	return Math.round(raw * (1 + PROCUREMENT_BUFFER) * 100) / 100
}

function hierarchyPathLabel(parts: Array<string | null | undefined>) {
	const labels: string[] = []
	const seen = new Set<string>()
	for (const part of parts) {
		const label = part?.trim()
		if (!label) continue
		const normalized = label.toLowerCase()
		if (seen.has(normalized)) continue
		seen.add(normalized)
		labels.push(label)
	}
	return labels.join(' / ')
}

const priceProofSchema = z.object({
	kind: z.literal('document'),
	fileName: z.string().trim().min(1),
	proofPath: z.string().trim().min(1),
})

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
	const evidence = `Document: ${proof.fileName.trim()}`
	return `Price proof · ${oldCost.toFixed(2)} -> ${newCost.toFixed(2)} EGP · ${delta} · ${evidence}`
}

function priceProofPath(proof: PriceProofInput): string {
	return proof.proofPath.trim()
}

// ─── Derived types the UI speaks ──────────────────────────

type FreshnessLevel = 'fresh' | 'aging' | 'stale'
type PriceStatus = 'updated' | 'outdated'

/**
 * Sell-price freshness. Primary supplier quote time is authoritative; product
 * updated_at is only a fallback for products that do not have a supplier quote.
 */
function productFreshnessFor(lastQuotedOrFallbackAt: string): {
	level: FreshnessLevel
	priceStatus: PriceStatus
} {
	const hours = hoursSince(lastQuotedOrFallbackAt)
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
	categoryPath: string
	categoryPathAr: string
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

interface SupabaseInventoryProductRow {
	id: string
	slug: string
	sku: string
	name: string
	name_ar: string
	category: string
	category_name: string | null
	category_name_ar: string | null
	product_family_name: string | null
	product_family_name_ar: string | null
	product_type_name: string | null
	product_type_name_ar: string | null
	subcategory: string | null
	specifications: JsonObject | null
	brand: string | null
	unit_of_measure: string
	weight_kg: number | null
	price_range_min: number | null
	price_range_max: number | null
	availability_status: AvailabilityStatus
	image_urls: string[] | null
	updated_at: string
}

interface SupabaseSupplierRow {
	id: string
	name: string
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
	notes: string | null
	suppliers: SupabaseSupplierRow | SupabaseSupplierRow[] | null
}

interface SupabaseSupplierSpecialtyRow {
	id: string
	supplier_id: string
	category_slug: string
	product_slug: string | null
	suppliers: SupabaseSupplierRow | SupabaseSupplierRow[] | null
}

interface SupabasePriceRequestRow {
	id: string
	product_id: string
	quote_request_id: string | null
	reason: string
	status: string
	created_at: string
	quote_requests:
		| {
				request_number: string
				customers:
					| { company_name: string; contact_name: string }
					| { company_name: string; contact_name: string }[]
					| null
		  }
		| Array<{
				request_number: string
				customers:
					| { company_name: string; contact_name: string }
					| { company_name: string; contact_name: string }[]
					| null
		  }>
		| null
}

interface InventoryContactEmployeeRow {
	id: string
	full_name: string
	phone: string | null
	status: string
	employee_roles: Array<{ role: string }> | null
	employee_panel_permissions: Array<{
		can_read: boolean
		panel: string
	}> | null
}

interface InventoryPresenceContactRow {
	employee_id: string
	last_seen_at: string
	employees: InventoryContactEmployeeRow | InventoryContactEmployeeRow[] | null
}

export interface InventoryPriceUpdateContact {
	available: boolean
	name: string
	phone: string | null
}

function firstRelation<T>(value: T | T[] | null): T | null {
	if (Array.isArray(value)) return value[0] ?? null
	return value
}

function canHandleInventoryPriceRequest(
	employee: InventoryContactEmployeeRow | null,
): employee is InventoryContactEmployeeRow {
	if (!employee || employee.status !== 'active') return false
	const hasInventoryRole = (employee.employee_roles ?? []).some(
		(row) => row.role === 'inventory',
	)
	const hasInventoryPanel = (employee.employee_panel_permissions ?? []).some(
		(row) => row.panel === 'inventory' && row.can_read,
	)
	return hasInventoryRole || hasInventoryPanel
}

function presentInventoryContact(
	employee: InventoryContactEmployeeRow,
	available: boolean,
): InventoryPriceUpdateContact {
	const phone = employee.phone?.trim() || null
	return {
		available,
		name: employee.full_name,
		phone,
	}
}

async function findInventoryPriceUpdateContact(
	auth: Awaited<ReturnType<typeof getInternalSupabaseClient>>,
): Promise<InventoryPriceUpdateContact | null> {
	const onlineCutoff = new Date(Date.now() - 2 * 60_000).toISOString()
	const { data: presenceRows, error: presenceError } = await auth.client
		.from('employee_presence')
		.select(`
			employee_id,
			last_seen_at,
			employees (
				id,
				full_name,
				phone,
				status,
				employee_roles ( role ),
				employee_panel_permissions ( panel, can_read )
			)
		`)
		.eq('status', 'online')
		.eq('active_panel', 'inventory')
		.gte('last_seen_at', onlineCutoff)
		.order('last_seen_at', { ascending: false })
		.limit(10)
	if (presenceError) throw new Error(presenceError.message)

	for (const row of (presenceRows ??
		[]) as unknown as InventoryPresenceContactRow[]) {
		const employee = firstRelation(row.employees)
		if (canHandleInventoryPriceRequest(employee)) {
			return presentInventoryContact(employee, true)
		}
	}

	const { data: employeeRows, error: employeeError } = await auth.client
		.from('employees')
		.select(`
			id,
			full_name,
			phone,
			status,
			employee_roles ( role ),
			employee_panel_permissions ( panel, can_read )
		`)
		.eq('status', 'active')
		.order('full_name', { ascending: true })
		.limit(50)
	if (employeeError) throw new Error(employeeError.message)

	const employees = (employeeRows ??
		[]) as unknown as InventoryContactEmployeeRow[]
	const withPhone = employees.find(
		(employee) =>
			canHandleInventoryPriceRequest(employee) &&
			Boolean(employee.phone?.trim()),
	)
	if (withPhone) return presentInventoryContact(withPhone, false)

	const fallback = employees.find(canHandleInventoryPriceRequest)
	return fallback ? presentInventoryContact(fallback, false) : null
}

function buildPendingContext(request: SupabasePriceRequestRow): string {
	const quoteRequest = firstRelation(request.quote_requests)
	const customer = firstRelation(quoteRequest?.customers ?? null)
	const reference = quoteRequest?.request_number ?? 'sales request'
	return customer?.company_name
		? `${reference} · ${customer.company_name}`
		: reference
}

function presentSupabaseSupplierLink(
	row: SupabaseSupplierLinkRow,
): SupplierQuote {
	const supplier = firstRelation(row.suppliers)
	return {
		id: row.id,
		name: supplier?.name ?? 'Supplier',
		rawCost: Number(row.raw_cost),
		leadTimeDays: row.lead_time_days,
		minOrderQty: Number(row.min_order_qty),
		lastQuotedAt: row.last_quoted_at ?? new Date(0).toISOString(),
		hoursSinceQuote: hoursSince(
			row.last_quoted_at ?? new Date(0).toISOString(),
		),
		quoteFreshness: quoteFreshnessFor(
			row.last_quoted_at ?? new Date(0).toISOString(),
		),
		tier: 'new',
		paymentTerms: '—',
		notes: row.notes,
		isPrimary: row.is_primary,
	}
}

interface SupabaseBatchSupplierProductRow {
	id: string
	product_id: string
	supplier_id: string
	raw_cost: number
	last_quoted_at: string | null
	products:
		| {
				id: string
				slug: string
				name: string
				sku: string
				unit_of_measure: string
				category: string
				is_active: boolean
				availability_status: AvailabilityStatus
		  }
		| Array<{
				id: string
				slug: string
				name: string
				sku: string
				unit_of_measure: string
				category: string
				is_active: boolean
				availability_status: AvailabilityStatus
		  }>
		| null
	suppliers:
		| {
				id: string
				name: string
				status: string
		  }
		| Array<{
				id: string
				name: string
				status: string
		  }>
		| null
}

interface SupabaseBatchProductRow {
	id: string
	slug: string
	name: string
	sku: string
	unit_of_measure: string
	category: string
	price_range_min: number | null
	price_range_max: number | null
	is_active: boolean
	availability_status: AvailabilityStatus
}

interface SupplierBatchPriceProduct {
	linkId: string
	productId: string
	slug: string
	name: string
	sku: string
	unit: string
	rawCost: number
	lastQuotedAt: string | null
}

export interface SupplierBatchPriceOption {
	supplierId: string
	supplierName: string
	products: SupplierBatchPriceProduct[]
}

function presentFallbackSupplier(
	supplier: SupabaseSupplierRow,
	rawCost: number,
): SupplierQuote {
	const quotedAt = new Date(0).toISOString()
	return {
		id: `new:${supplier.id}`,
		name: supplier.name,
		rawCost,
		leadTimeDays: 1,
		minOrderQty: 1,
		lastQuotedAt: quotedAt,
		hoursSinceQuote: hoursSince(quotedAt),
		quoteFreshness: quoteFreshnessFor(quotedAt),
		tier: 'new',
		paymentTerms: '—',
		notes: null,
		isPrimary: false,
	}
}

function supplierIsActive(
	supplier: SupabaseSupplierRow | null,
): supplier is SupabaseSupplierRow {
	return Boolean(supplier && supplier.status === 'active')
}

function specialtyMatchesProduct(
	specialty: SupabaseSupplierSpecialtyRow,
	product: Pick<SupabaseInventoryProductRow, 'category' | 'slug'>,
): boolean {
	return (
		specialty.category_slug === product.category &&
		(specialty.product_slug === null || specialty.product_slug === product.slug)
	)
}

function matchingSupplierIdsForProduct(
	specialties: SupabaseSupplierSpecialtyRow[],
	product: Pick<SupabaseInventoryProductRow, 'category' | 'slug'>,
): Set<string> {
	const ids = new Set<string>()
	for (const specialty of specialties) {
		if (!specialtyMatchesProduct(specialty, product)) continue
		const supplier = firstRelation(specialty.suppliers)
		if (supplierIsActive(supplier)) ids.add(specialty.supplier_id)
	}
	return ids
}

function supplierQuotesForProduct({
	links,
	specialties,
	product,
	rawCost,
}: {
	links: SupabaseSupplierLinkRow[]
	specialties: SupabaseSupplierSpecialtyRow[]
	product: Pick<SupabaseInventoryProductRow, 'category' | 'slug'>
	rawCost: number
}): SupplierQuote[] {
	const eligibleSupplierIds = matchingSupplierIdsForProduct(
		specialties,
		product,
	)
	const activeLinks = links.filter((link) => {
		const supplier = firstRelation(link.suppliers)
		return supplierIsActive(supplier)
	})
	const linkedSupplierIds = new Set(activeLinks.map((link) => link.supplier_id))
	const specialtyQuotes = specialties
		.filter(
			(specialty) =>
				specialtyMatchesProduct(specialty, product) &&
				eligibleSupplierIds.has(specialty.supplier_id),
		)
		.map((specialty) => firstRelation(specialty.suppliers))
		.filter(
			(supplier): supplier is SupabaseSupplierRow =>
				supplierIsActive(supplier) && !linkedSupplierIds.has(supplier.id),
		)
		.map((supplier) => presentFallbackSupplier(supplier, rawCost))

	return [
		...activeLinks.map(presentSupabaseSupplierLink),
		...specialtyQuotes,
	].sort((a, b) => {
		if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
		if (a.rawCost !== b.rawCost) return a.rawCost - b.rawCost
		return a.name.localeCompare(b.name)
	})
}

async function getSupabaseInventoryOverview() {
	const auth = await getInternalSupabaseClient()

	const { data: productRows, error: productError } = await auth.client
		.from('catalog_product_hierarchy')
		.select(
			'id, slug, sku, name, name_ar, category, category_name, category_name_ar, product_family_name, product_family_name_ar, product_type_name, product_type_name_ar, subcategory, specifications, brand, unit_of_measure, weight_kg, price_range_min, price_range_max, availability_status, image_urls, updated_at',
		)
		.eq('is_active', true)
	if (productError) throw new Error(productError.message)

	const productIds = (productRows ?? []).map((product) => product.id)
	if (productIds.length === 0) {
		return {
			products: [],
			categories: BROAD_CATEGORIES.map((id) => ({
				id,
				image: '',
				totalCount: 0,
				urgentCount: 0,
				outdatedCount: 0,
				pendingRequestCount: 0,
			})),
			totals: {
				total: 0,
				urgent: 0,
				outdated: 0,
				fresh: 0,
				pendingRequests: 0,
			},
		}
	}

	const productIdChunks = chunkArray(productIds, INVENTORY_LOOKUP_CHUNK_SIZE)
	const categoryChunks = chunkArray(
		Array.from(
			new Set(
				((productRows ?? []) as unknown as SupabaseInventoryProductRow[]).map(
					(product) => product.category,
				),
			),
		),
		INVENTORY_LOOKUP_CHUNK_SIZE,
	)
	const linkRows: SupabaseSupplierLinkRow[] = []
	const specialtyRows: SupabaseSupplierSpecialtyRow[] = []
	const requestRows: SupabasePriceRequestRow[] = []

	for (const ids of productIdChunks) {
		const { data, error } = await auth.client
			.from('supplier_product_links')
			.select(
				'id, product_id, supplier_id, raw_cost, lead_time_days, min_order_qty, is_primary, last_quoted_at, notes, suppliers ( id, name, status )',
			)
			.in('product_id', ids)
		if (error) throw new Error(error.message)
		linkRows.push(...((data ?? []) as unknown as SupabaseSupplierLinkRow[]))
	}

	for (const categories of categoryChunks) {
		const { data, error } = await auth.client
			.from('supplier_specialties')
			.select(
				'id, supplier_id, category_slug, product_slug, suppliers ( id, name, status )',
			)
			.in('category_slug', categories)
		if (error) throw new Error(error.message)
		specialtyRows.push(
			...((data ?? []) as unknown as SupabaseSupplierSpecialtyRow[]),
		)
	}

	for (const ids of productIdChunks) {
		const { data, error } = await auth.client
			.from('price_update_requests')
			.select(`
				id,
				product_id,
				quote_request_id,
				reason,
				status,
				created_at,
				quote_requests (
					request_number,
					customers (
						company_name,
						contact_name
					)
				)
			`)
			.in('product_id', ids)
			.eq('status', 'pending')
		if (error) throw new Error(error.message)
		requestRows.push(...((data ?? []) as unknown as SupabasePriceRequestRow[]))
	}

	const linksByProduct = new Map<string, SupabaseSupplierLinkRow[]>()
	for (const link of linkRows) {
		const list = linksByProduct.get(link.product_id) ?? []
		list.push(link)
		linksByProduct.set(link.product_id, list)
	}

	const requestsByProduct = new Map<string, SupabasePriceRequestRow[]>()
	for (const request of requestRows) {
		const list = requestsByProduct.get(request.product_id) ?? []
		list.push(request)
		requestsByProduct.set(request.product_id, list)
	}

	const products: InventoryProductView[] = (
		(productRows ?? []) as unknown as SupabaseInventoryProductRow[]
	).map((product) => {
		const links = linksByProduct.get(product.id) ?? []
		const pending = requestsByProduct.get(product.id) ?? []
		const fallbackRawCost = Number(
			product.price_range_min ?? product.price_range_max ?? 0,
		)
		const supplierQuotes = supplierQuotesForProduct({
			links,
			specialties: specialtyRows,
			product,
			rawCost: fallbackRawCost,
		})
		const primaryQuote =
			supplierQuotes.find((quote) => quote.isPrimary) ??
			supplierQuotes[0] ??
			null
		const rawCost = primaryQuote?.rawCost ?? fallbackRawCost
		const lastUpdatedAt =
			primaryQuote?.lastQuotedAt ??
			product.updated_at ??
			new Date(0).toISOString()
		const { level, priceStatus } = productFreshnessFor(lastUpdatedAt)
		const broad = getBroadCategory(product.category)
		const categoryPath = hierarchyPathLabel([
			product.category_name ?? product.category,
			product.product_family_name,
			product.product_type_name,
		])
		const categoryPathAr = hierarchyPathLabel([
			product.category_name_ar ?? product.category_name ?? product.category,
			product.product_family_name_ar ?? product.product_family_name,
			product.product_type_name_ar ?? product.product_type_name,
		])
		const isUrgent = priceStatus === 'outdated' || pending.length > 0
		return {
			slug: product.slug,
			name: product.name,
			name_ar: product.name_ar,
			sku: product.sku,
			unit: product.unit_of_measure,
			categoryPath,
			categoryPathAr,
			subcategory:
				product.product_type_name ?? product.subcategory ?? product.category,
			specifications: toJsonObject(product.specifications ?? {}),
			brand: product.brand,
			image: product.image_urls?.[0] ?? '',
			broadCategory: broad,
			supplierName: primaryQuote?.name ?? '—',
			allSupplierNames: supplierQuotes.map((quote) => quote.name),
			rawCost,
			supplierCost: bufferCost(rawCost),
			lastUpdatedAt,
			hoursSinceUpdate: hoursSince(lastUpdatedAt),
			freshness: level,
			priceStatus,
			recentlyOrdered: pending.length > 0,
			pendingRequestCount: pending.length,
			pendingRequestedBy: pending.map(buildPendingContext),
			isUrgent,
			availability: product.availability_status,
		}
	})

	const categories: InventoryCategorySummary[] = BROAD_CATEGORIES.map((id) => {
		const members = products.filter((p) => p.broadCategory === id)
		return {
			id,
			image: members.find((product) => product.image)?.image ?? '',
			totalCount: members.length,
			urgentCount: members.filter((p) => p.isUrgent).length,
			outdatedCount: members.filter((p) => p.priceStatus === 'outdated').length,
			pendingRequestCount: members.reduce(
				(sum, product) => sum + product.pendingRequestCount,
				0,
			),
		}
	})

	return {
		products,
		categories,
		totals: {
			total: products.length,
			urgent: products.filter((p) => p.isUrgent).length,
			outdated: products.filter((p) => p.priceStatus === 'outdated').length,
			fresh: products.filter((p) => p.freshness === 'fresh').length,
			pendingRequests: products.reduce(
				(sum, product) => sum + product.pendingRequestCount,
				0,
			),
		},
	}
}

export const getInventoryOverview = createServerFn({ method: 'POST' })
	.inputValidator(z.object({}))
	.handler(async () => {
		return getSupabaseInventoryOverview()
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

async function getSupabaseInventoryProductDetail(slug: string) {
	const auth = await getInternalSupabaseClient()

	const { data: productData, error: productError } = await auth.client
		.from('catalog_product_hierarchy')
		.select(
			'id, slug, sku, name, name_ar, description, description_ar, category, category_name, category_name_ar, product_family_name, product_family_name_ar, product_type_name, product_type_name_ar, subcategory, brand, manufacturer, specifications, unit_of_measure, weight_kg, tags, price_range_min, price_range_max, image_urls, updated_at',
		)
		.eq('slug', slug)
		.maybeSingle()
	if (productError) throw new Error(productError.message)
	if (!productData) return null

	const product = productData as unknown as SupabaseInventoryProductRow & {
		description: string | null
		description_ar: string | null
		manufacturer: string | null
		tags: string[]
	}

	const { data: linkRows, error: linkError } = await auth.client
		.from('supplier_product_links')
		.select(
			'id, product_id, supplier_id, raw_cost, lead_time_days, min_order_qty, is_primary, last_quoted_at, notes, suppliers ( id, name, status )',
		)
		.eq('product_id', product.id)
	if (linkError) throw new Error(linkError.message)

	const { data: specialtyRows, error: specialtyError } = await auth.client
		.from('supplier_specialties')
		.select(
			'id, supplier_id, category_slug, product_slug, suppliers ( id, name, status )',
		)
		.eq('category_slug', product.category)
	if (specialtyError) throw new Error(specialtyError.message)

	const { data: requestRows, error: requestError } = await auth.client
		.from('price_update_requests')
		.select(`
			id,
			product_id,
			quote_request_id,
			reason,
			status,
			created_at,
			quote_requests (
				request_number,
				customers (
					company_name,
					contact_name
				)
			)
		`)
		.eq('product_id', product.id)
		.eq('status', 'pending')
	if (requestError) throw new Error(requestError.message)

	const links = (linkRows ?? []) as unknown as SupabaseSupplierLinkRow[]
	const fallbackRawCost = Number(
		product.price_range_min ?? product.price_range_max ?? 0,
	)
	const suppliers = supplierQuotesForProduct({
		links,
		specialties: (specialtyRows ??
			[]) as unknown as SupabaseSupplierSpecialtyRow[],
		product,
		rawCost: fallbackRawCost,
	})
	const primary =
		suppliers.find((supplier) => supplier.isPrimary) ?? suppliers[0]
	const rawCost = primary?.rawCost ?? fallbackRawCost

	const broad = getBroadCategory(product.category)
	const categoryPath = hierarchyPathLabel([
		product.category_name ?? product.category,
		product.product_family_name,
		product.product_type_name,
	])
	const categoryPathAr = hierarchyPathLabel([
		product.category_name_ar ?? product.category_name ?? product.category,
		product.product_family_name_ar ?? product.product_family_name,
		product.product_type_name_ar ?? product.product_type_name,
	])
	return {
		productId: product.id,
		slug: product.slug,
		name: product.name,
		name_ar: product.name_ar,
		description: product.description,
		description_ar: product.description_ar,
		sku: product.sku,
		brand: product.brand,
		manufacturer: product.manufacturer,
		specifications: toJsonObject(product.specifications ?? {}),
		unit: product.unit_of_measure,
		weight_kg: product.weight_kg,
		tags: product.tags ?? [],
		broadCategory: broad,
		categoryPath,
		categoryPathAr,
		image: product.image_urls?.[0] ?? '',
		pendingRequests: (
			(requestRows ?? []) as unknown as SupabasePriceRequestRow[]
		).map((request) => ({
			id: request.id,
			customerContext: buildPendingContext(request),
			requestedAt: request.created_at,
		})),
		currentRawCost: rawCost,
		currentSupplierCost: bufferCost(rawCost),
		lastUpdatedAt:
			primary?.lastQuotedAt ?? product.updated_at ?? new Date(0).toISOString(),
		priceStatus: productFreshnessFor(
			primary?.lastQuotedAt ?? product.updated_at ?? new Date(0).toISOString(),
		).priceStatus,
		suppliers,
	}
}

export const getInventoryProductDetail = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ slug: z.string() }))
	.handler(async ({ data }) => {
		return getSupabaseInventoryProductDetail(data.slug)
	})

// ─── Price mutations ──────────────────────────────────────

export const getSupplierBatchPriceOptions = createServerFn({
	method: 'GET',
}).handler(async (): Promise<SupplierBatchPriceOption[]> => {
	const auth = await getInternalSupabaseClient()
	const { data, error } = await auth.client
		.from('supplier_product_links')
		.select(`
				id,
				product_id,
				supplier_id,
				raw_cost,
				last_quoted_at,
				products (
					id,
					slug,
					name,
					sku,
					unit_of_measure,
					category,
					is_active,
					availability_status
				),
				suppliers (
					id,
					name,
					status
				)
			`)
		.order('last_quoted_at', { ascending: true, nullsFirst: true })
	if (error) throw new Error(error.message)

	const [
		{ data: specialtyRows, error: specialtyError },
		{ data: catalogRows, error: catalogError },
	] = await Promise.all([
		auth.client
			.from('supplier_specialties')
			.select(
				'id, supplier_id, category_slug, product_slug, suppliers ( id, name, status )',
			),
		auth.client
			.from('products')
			.select(
				'id, slug, name, sku, unit_of_measure, category, price_range_min, price_range_max, is_active, availability_status',
			)
			.eq('is_active', true)
			.neq('availability_status', 'hidden'),
	])
	if (specialtyError) throw new Error(specialtyError.message)
	if (catalogError) throw new Error(catalogError.message)

	const catalogProducts = (catalogRows ??
		[]) as unknown as SupabaseBatchProductRow[]
	const specialties = (specialtyRows ??
		[]) as unknown as SupabaseSupplierSpecialtyRow[]
	const grouped = new Map<string, SupplierBatchPriceOption>()
	const linkedSupplierProducts = new Set<string>()
	for (const row of (data ??
		[]) as unknown as SupabaseBatchSupplierProductRow[]) {
		const product = firstRelation(row.products)
		const supplier = firstRelation(row.suppliers)
		if (!product || !supplier || supplier.status !== 'active') continue
		if (!product.is_active || product.availability_status === 'hidden') continue
		linkedSupplierProducts.add(`${supplier.id}:${product.id}`)
		const current =
			grouped.get(supplier.id) ??
			({
				supplierId: supplier.id,
				supplierName: supplier.name,
				products: [],
			} satisfies SupplierBatchPriceOption)
		current.products.push({
			linkId: row.id,
			productId: product.id,
			slug: product.slug,
			name: product.name,
			sku: product.sku,
			unit: product.unit_of_measure,
			rawCost: Number(row.raw_cost),
			lastQuotedAt: row.last_quoted_at,
		})
		grouped.set(supplier.id, current)
	}

	for (const specialty of specialties) {
		const supplier = firstRelation(specialty.suppliers)
		if (!supplierIsActive(supplier)) continue
		const current =
			grouped.get(supplier.id) ??
			({
				supplierId: supplier.id,
				supplierName: supplier.name,
				products: [],
			} satisfies SupplierBatchPriceOption)

		for (const product of catalogProducts) {
			if (
				specialty.category_slug !== product.category ||
				(specialty.product_slug !== null &&
					specialty.product_slug !== product.slug)
			) {
				continue
			}
			const key = `${supplier.id}:${product.id}`
			if (linkedSupplierProducts.has(key)) continue
			linkedSupplierProducts.add(key)
			current.products.push({
				linkId: `new:${supplier.id}:${product.id}`,
				productId: product.id,
				slug: product.slug,
				name: product.name,
				sku: product.sku,
				unit: product.unit_of_measure,
				rawCost: Number(
					product.price_range_min ?? product.price_range_max ?? 0,
				),
				lastQuotedAt: null,
			})
		}
		grouped.set(supplier.id, current)
	}

	return Array.from(grouped.values())
		.map((supplier) => ({
			...supplier,
			products: supplier.products.sort((a, b) => a.name.localeCompare(b.name)),
		}))
		.filter((supplier) => supplier.products.length >= 2)
		.sort((a, b) => a.supplierName.localeCompare(b.supplierName))
})

function formatBatchPriceProofNote({
	proof,
	updatedCount,
}: {
	proof: PriceProofInput
	updatedCount: number
}): string {
	const evidence = `Document: ${proof.fileName.trim()}`
	return `Supplier batch price proof · ${updatedCount} items · ${evidence}`
}

export const updateSupplierQuoteBatch = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			supplierId: z.string().uuid(),
			updates: z
				.array(
					z.object({
						productId: z.string().uuid(),
						rawCost: z.number().positive(),
					}),
				)
				.min(2),
			proof: priceProofSchema,
		}),
	)
	.handler(async ({ data }) => {
		const auth = await getInternalSupabaseClient()
		if (!auth) {
			return { success: false, error: 'Supabase is required for batch prices' }
		}
		const proofNote = formatBatchPriceProofNote({
			proof: data.proof,
			updatedCount: data.updates.length,
		})
		const { error } = await auth.client.rpc(
			'inventory_update_supplier_prices',
			{
				p_notes: proofNote,
				p_proof_path: priceProofPath(data.proof),
				p_supplier_id: data.supplierId,
				p_updates: data.updates.map((update) => ({
					product_id: update.productId,
					new_price: update.rawCost,
				})),
			},
		)
		if (error) throw new Error(error.message)
		return { success: true, updatedCount: data.updates.length }
	})

export const markProductPriceOutdated = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ slug: z.string() }))
	.handler(async ({ data }) => {
		const auth = await getInternalSupabaseClient()
		const { data: product, error: productError } = await auth.client
			.from('products')
			.select('id')
			.eq('slug', data.slug)
			.eq('is_active', true)
			.maybeSingle()
		if (productError) throw new Error(productError.message)
		if (!product?.id) {
			return { success: false as const, error: 'Unknown product row' }
		}

		const { error } = await auth.client.rpc('inventory_mark_price_outdated', {
			p_product_id: product.id,
		})
		if (error) throw new Error(error.message)

		return { success: true as const }
	})

/** Update a supplier quote from the product-detail modal. */
export const updateSupplierQuote = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			slug: z.string(),
			supplierId: z.string(),
			rawCost: z.number().positive(),
			proof: priceProofSchema,
		}),
	)
	.handler(async ({ data }) => {
		const auth = await getInternalSupabaseClient()
		const { data: product, error: productError } = await auth.client
			.from('products')
			.select('id, price_range_min')
			.eq('slug', data.slug)
			.maybeSingle()
		if (productError) throw new Error(productError.message)
		if (!product?.id) {
			return { success: false, error: 'Unknown product row' as const }
		}

		const supplierId = data.supplierId.startsWith('new:')
			? data.supplierId.slice(4)
			: null
		const linkId = supplierId ? null : data.supplierId
		let resolvedSupplierId = supplierId
		let oldCost = Number(product.price_range_min ?? 0)

		if (linkId) {
			const { data: link, error: linkError } = await auth.client
				.from('supplier_product_links')
				.select('supplier_id, raw_cost')
				.eq('id', linkId)
				.eq('product_id', product.id)
				.maybeSingle()
			if (linkError) throw new Error(linkError.message)
			if (!link?.supplier_id) {
				return { success: false, error: 'Unknown supplier row' as const }
			}
			resolvedSupplierId = link.supplier_id
			oldCost = Number(link.raw_cost ?? oldCost)
		}

		if (!resolvedSupplierId) {
			return { success: false, error: 'Unknown supplier row' as const }
		}

		const proofNote = formatPriceProofNote({
			proof: data.proof,
			oldCost,
			newCost: data.rawCost,
		})
		const { data: updated, error } = await auth.client.rpc(
			'inventory_update_price',
			{
				p_product_id: product.id,
				p_supplier_id: resolvedSupplierId,
				p_new_price: data.rawCost,
				p_proof_path: priceProofPath(data.proof),
				p_notes: proofNote,
			},
		)
		if (error) throw new Error(error.message)
		return {
			success: true,
			supplier: updated
				? ({
						id: data.supplierId,
						name: '',
						rawCost: data.rawCost,
						leadTimeDays: 1,
						minOrderQty: 1,
						lastQuotedAt: new Date().toISOString(),
						hoursSinceQuote: 0,
						quoteFreshness: 'confirmed',
						tier: 'new',
						paymentTerms: '—',
						notes: proofNote,
						isPrimary: true,
					} satisfies SupplierQuote)
				: null,
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
		const auth = await getInternalSupabaseClient()
		if (!isUuid(data.rfqId)) {
			return {
				success: false,
				requestedCount: 0,
				skippedFresh: 0,
				skippedDuplicate: 0,
				inventoryContact: null,
				error: 'Supabase quote request is required',
			}
		}

		let inserted = 0
		let skippedDuplicate = 0
		const inventoryContact = await findInventoryPriceUpdateContact(auth)
		for (const item of data.items) {
			let productQuery = auth.client.from('products').select('id')
			productQuery = isUuid(item.productId)
				? productQuery.eq('id', item.productId)
				: productQuery.eq('slug', item.productId)
			const { data: product, error: productError } =
				await productQuery.maybeSingle()
			if (productError) throw new Error(productError.message)
			if (!product?.id) continue

			const { data: beforeRows, error: beforeError } = await auth.client
				.from('price_update_requests')
				.select('id')
				.eq('product_id', product.id)
				.eq('quote_request_id', data.rfqId)
				.eq('status', 'pending')
				.limit(1)
			if (beforeError) throw new Error(beforeError.message)

			const { error } = await auth.client.rpc('request_price_update', {
				p_product_id: product.id,
				p_order_id: data.rfqId,
				p_reason:
					data.note ?? `Sales requested fresh price for ${item.productName}`,
			})
			if (error) throw new Error(error.message)
			if ((beforeRows ?? []).length > 0) skippedDuplicate += 1
			else inserted += 1
		}
		return {
			success: true,
			requestedCount: inserted,
			skippedFresh: 0,
			skippedDuplicate,
			inventoryContact,
		}
	})
