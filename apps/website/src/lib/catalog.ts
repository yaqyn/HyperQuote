import { createSupabaseServerClient } from '@hyperquote/auth/server'
import {
	type BroadCategory,
	CATALOG_PRODUCTS,
	type CatalogProduct,
	getBroadCategory,
	getCategoryImage,
} from '@hyperquote/types'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'

// ============================================================================
// Public product shape — what the market pages actually consume.
// Matches PUBLIC_COLUMNS below plus an `image_urls` fallback for the mock.
// Specifications are serialization-safe primitives; TanStack Start's server-fn
// transport rejects nested `unknown`.
// ============================================================================

export type SpecValue = string | number | boolean | null
export interface PublicProduct
	extends Omit<CatalogProduct, 'specifications' | 'pictureUrl'> {
	specifications: Record<string, SpecValue>
	image_urls: string[]
}

// ============================================================================
// Input Schemas
// ============================================================================

const catalogInput = z.object({
	category: z.array(z.string()).optional(),
	availability: z.enum(['all', 'available', 'low_stock']).optional(),
	priceTier: z.array(z.enum(['budget', 'mid_range', 'premium'])).optional(),
	search: z.string().optional(),
	sort: z
		.enum(['relevance', 'name', 'category', 'availability'])
		.default('relevance'),
	page: z.number().int().min(1).default(1),
	limit: z.number().int().min(1).max(100).default(24),
})

const productBySlugInput = z.object({
	slug: z.string().min(1),
})

// ============================================================================
// Mock catalog — backed by the shared canonical product list
// (see packages/types/src/catalog.ts). When Supabase is wired up, this
// dev fallback is bypassed entirely.
// ============================================================================

const BROAD_EXPANSION: Record<BroadCategory, string[]> = {
	cement: ['cement', 'ready_mix_concrete'],
	steel: [
		'reinforcing_steel',
		'structural_steel',
		'aluminum_profiles',
		'hardware_fasteners',
		'pipes_pvc',
		'pipes_metal',
		'electrical_cable',
		'electrical_conduit',
	],
	aggregates: ['aggregates', 'sand', 'marble', 'granite'],
	bricks: ['bricks', 'blocks'],
	timber: ['lumber', 'plywood', 'insulation', 'waterproofing', 'roofing'],
	finishing: [
		'tiles_porcelain',
		'tiles_ceramic',
		'paint',
		'glass',
		'gypsum_board',
		'adhesives',
	],
}

function decorate(product: CatalogProduct): PublicProduct {
	return {
		...product,
		// CatalogProduct.specifications is Record<string, unknown>; the seed data
		// only ever holds primitives, so normalise to a serialization-safe shape.
		specifications: product.specifications as Record<string, SpecValue>,
		image_urls: [getCategoryImage(product.category)],
	}
}

// ============================================================================
// Public columns — NEVER include last_purchase_price or weighted_avg_cost
// ============================================================================

const PUBLIC_COLUMNS = [
	'id',
	'slug',
	'sku',
	'name',
	'name_ar',
	'description',
	'description_ar',
	'category',
	'subcategory',
	'brand',
	'manufacturer',
	'specifications',
	'unit_of_measure',
	'weight_kg',
	'price_range_min',
	'price_range_max',
	'price_tier',
	'availability_status',
	'image_urls',
	'tags',
	'is_stockable',
].join(', ')

function shouldUseMockCatalog() {
	const supabaseUrl = process.env.SUPABASE_URL
	if (!supabaseUrl) return true
	try {
		return new URL(supabaseUrl).hostname === 'placeholder.supabase.co'
	} catch {
		return supabaseUrl.includes('placeholder.supabase.co')
	}
}

// ============================================================================
// getPublicCatalog — paginated, filterable product listing
// ============================================================================

export const getPublicCatalog = createServerFn()
	.inputValidator(catalogInput)
	.handler(async ({ data: input }) => {
		// Dev fallback: use the shared catalog when no Supabase is configured.
		if (shouldUseMockCatalog()) {
			let filtered = CATALOG_PRODUCTS.map(decorate)

			if (input.category?.length) {
				const expandedCats = input.category.flatMap(
					(c) => BROAD_EXPANSION[c as BroadCategory] ?? [c],
				)
				filtered = filtered.filter((p) => expandedCats.includes(p.category))
			}
			if (input.availability && input.availability !== 'all') {
				filtered = filtered.filter(
					(p) => p.availability_status === input.availability,
				)
			}
			if (input.priceTier?.length) {
				const tiers = input.priceTier
				filtered = filtered.filter((p) => tiers.includes(p.price_tier))
			}
			if (input.search) {
				const q = input.search.toLowerCase()
				filtered = filtered.filter(
					(p) =>
						p.name.toLowerCase().includes(q) ||
						p.category.toLowerCase().includes(q) ||
						p.brand?.toLowerCase().includes(q),
				)
			}

			if (input.sort === 'name') {
				filtered.sort((a, b) => a.name.localeCompare(b.name))
			} else if (input.sort === 'category') {
				filtered.sort((a, b) =>
					getBroadCategory(a.category).localeCompare(
						getBroadCategory(b.category),
					),
				)
			} else if (input.sort === 'availability') {
				filtered.sort((a, b) =>
					a.availability_status.localeCompare(b.availability_status),
				)
			}
			return { items: filtered, total: filtered.length, hasMore: false }
		}

		// Production: use Supabase
		const request = getRequest()
		const { client } = createSupabaseServerClient({
			request,
			supabaseUrl: process.env.SUPABASE_URL ?? '',
			supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
		})

		let query = client
			.from('products')
			.select(PUBLIC_COLUMNS, { count: 'exact' })
			.eq('is_active', true)

		if (input.category?.length) query = query.in('category', input.category)
		if (input.availability && input.availability !== 'all')
			query = query.eq('availability_status', input.availability)
		if (input.priceTier?.length) query = query.in('price_tier', input.priceTier)
		if (input.search)
			query = query.textSearch('search_vector', input.search, {
				type: 'websearch',
			})

		switch (input.sort) {
			case 'name':
				query = query.order('name')
				break
			case 'category':
				query = query.order('category')
				break
			case 'availability':
				query = query.order('availability_status')
				break
		}

		const offset = (input.page - 1) * input.limit
		query = query.range(offset, offset + input.limit - 1)

		const { data, error, count } = await query

		if (error) {
			console.error('[getPublicCatalog] Supabase error:', error)
			return {
				items: [] as PublicProduct[],
				total: 0,
				hasMore: false,
			}
		}

		// Supabase row shape matches PublicProduct — PUBLIC_COLUMNS is the guard.
		return {
			items: (data ?? []) as unknown as PublicProduct[],
			total: count ?? 0,
			hasMore: (count ?? 0) > offset + input.limit,
		}
	})

// ============================================================================
// getProductBySlug — single product lookup
// ============================================================================

export const getProductBySlug = createServerFn()
	.inputValidator(productBySlugInput)
	.handler(async ({ data: input }) => {
		if (shouldUseMockCatalog()) {
			const found = CATALOG_PRODUCTS.find((p) => p.slug === input.slug)
			return found ? decorate(found) : null
		}

		const request = getRequest()
		const supabaseUrl = process.env.SUPABASE_URL ?? ''
		const { client } = createSupabaseServerClient({
			request,
			supabaseUrl,
			supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
		})

		const { data, error } = await client
			.from('products')
			.select(PUBLIC_COLUMNS)
			.eq('slug', input.slug)
			.eq('is_active', true)
			.single()

		if (error || !data) {
			if (error) console.error('[getProductBySlug] Supabase error:', error)
			return null
		}

		// Supabase row shape matches PublicProduct — PUBLIC_COLUMNS is the guard.
		return data as unknown as PublicProduct
	})
