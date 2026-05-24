import {
	createSupabaseServiceRoleClient,
	resolveSupabaseRuntimeConfig,
} from '@hyperquote/auth/server'
import type { CatalogProduct } from '@hyperquote/types'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { logWebsiteServerError } from './server-log'

// ============================================================================
// Public product shape — what the market pages actually consume.
// Specifications are serialization-safe primitives; TanStack Start's server-fn
// transport rejects nested `unknown`.
// ============================================================================

type SpecValue = string | number | boolean | null
export interface PublicProduct
	extends Omit<
		CatalogProduct,
		'specifications' | 'specifications_ar' | 'pictureUrl'
	> {
	specifications: Record<string, SpecValue>
	specifications_ar: Record<string, SpecValue>
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

const marketPreviewInput = z.object({
	limit: z.number().int().min(1).max(12).default(6),
})

export interface PublicMarketPreviewCategory {
	slug: string
	name: string
	name_ar: string
	description: string
	description_ar: string
	imageUrl: string | null
}

interface PublicCategoryRow {
	slug: string
	name: string
	name_ar: string | null
	description: string | null
	description_ar: string | null
	image_url: string | null
}

interface PublicCategory {
	slug: string
	name: string
	name_ar: string
	description: string
	description_ar: string
	imageUrl: string | null
}

export interface PublicCatalogResult {
	categories: PublicCategory[]
	items: PublicProduct[]
	total: number
	hasMore: boolean
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
	'subcategory_ar',
	'brand',
	'manufacturer',
	'specifications',
	'specifications_ar',
	'unit_of_measure',
	'unit_of_measure_ar',
	'weight_kg',
	'price_range_min',
	'price_range_max',
	'price_tier',
	'availability_status',
	'image_urls',
	'tags',
	'is_stockable',
].join(', ')

function publicProductSearchFilter(search: string): string | null {
	const term = search
		.replace(/[,%*()]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
	if (!term) return null
	const pattern = `*${term}*`
	return [
		`name.ilike.${pattern}`,
		`name_ar.ilike.${pattern}`,
		`sku.ilike.${pattern}`,
		`category.ilike.${pattern}`,
		`subcategory.ilike.${pattern}`,
		`subcategory_ar.ilike.${pattern}`,
		`brand.ilike.${pattern}`,
		`manufacturer.ilike.${pattern}`,
		`description.ilike.${pattern}`,
		`description_ar.ilike.${pattern}`,
	].join(',')
}

function getSupabaseConfig() {
	return resolveSupabaseRuntimeConfig(process.env)
}

async function getOptionalWebsiteCatalogClient() {
	const config = await getSupabaseConfig()
	if (!config) {
		return null
	}
	const client = await createSupabaseServiceRoleClient(process.env)
	if (!client) {
		return null
	}
	return client
}

async function getWebsiteCatalogClient() {
	const client = await getOptionalWebsiteCatalogClient()
	if (!client) {
		throw new Error('Supabase service role is required for website catalog')
	}
	return client
}

function firstImageUrl(imageUrls: unknown): string | null {
	if (!Array.isArray(imageUrls)) return null
	return imageUrls.find((url) => typeof url === 'string' && url.trim()) ?? null
}

function publicCategoryMap(categories: PublicCategoryRow[]) {
	return new Map(categories.map((category) => [category.slug, category]))
}

function withCategoryImageFallback(
	product: Record<string, unknown>,
	categoriesBySlug: Map<string, PublicCategoryRow>,
): PublicProduct {
	const categorySlug =
		typeof product.category === 'string' ? product.category : ''
	const categoryImage = categoriesBySlug.get(categorySlug)?.image_url ?? null
	const productImage = firstImageUrl(product.image_urls)
	return {
		...product,
		image_urls: productImage
			? (product.image_urls as string[])
			: categoryImage
				? [categoryImage]
				: [],
	} as unknown as PublicProduct
}

export const getPublicMarketPreviewCategories = createServerFn({
	method: 'POST',
})
	.inputValidator(marketPreviewInput)
	.handler(async ({ data: input }): Promise<PublicMarketPreviewCategory[]> => {
		const client = await getOptionalWebsiteCatalogClient()
		if (!client) return []

		const { data: categoryRows, error: categoryError } = await client
			.from('categories')
			.select('slug, name, name_ar, description, description_ar, image_url')
			.eq('is_active', true)
			.order('name', { ascending: true })
			.limit(input.limit)

		if (categoryError) {
			logWebsiteServerError(
				'website.catalog.categories.supabase_error',
				categoryError,
			)
			throw new Error('Website catalog categories failed to load')
		}

		const categories = (categoryRows ?? []).filter(
			(category) => typeof category.slug === 'string' && category.slug.length,
		)
		const slugs = categories.map((category) => category.slug)
		const imageByCategory = new Map<string, string>()

		if (slugs.length > 0) {
			const { data: productRows, error: productError } = await client
				.from('products')
				.select('category, image_urls')
				.eq('is_active', true)
				.neq('availability_status', 'hidden')
				.in('category', slugs)
				.order('name', { ascending: true })
				.limit(slugs.length * 12)

			if (productError) {
				logWebsiteServerError(
					'website.catalog.public_catalog.supabase_error',
					productError,
				)
				throw new Error('Website catalog preview failed to load')
			}

			for (const product of productRows ?? []) {
				if (
					typeof product.category !== 'string' ||
					imageByCategory.has(product.category)
				) {
					continue
				}
				const imageUrl = Array.isArray(product.image_urls)
					? product.image_urls.find((url) => typeof url === 'string' && url)
					: null
				if (imageUrl) imageByCategory.set(product.category, imageUrl)
			}
		}

		return categories.map((category) => ({
			slug: category.slug,
			name: category.name,
			name_ar: category.name_ar ?? '',
			description: category.description ?? '',
			description_ar: category.description_ar ?? '',
			imageUrl:
				category.image_url ?? imageByCategory.get(category.slug) ?? null,
		}))
	})

// ============================================================================
// getPublicCatalog — paginated, filterable product listing
// ============================================================================

export const getPublicCatalog = createServerFn({ method: 'POST' })
	.inputValidator(catalogInput)
	.handler(async ({ data: input }): Promise<PublicCatalogResult> => {
		const client = await getWebsiteCatalogClient()

		const categoriesQuery = client
			.from('categories')
			.select('slug, name, name_ar, description, description_ar, image_url')
			.eq('is_active', true)
			.order('name', { ascending: true })

		let query = client
			.from('products')
			.select(PUBLIC_COLUMNS, { count: 'exact' })
			.eq('is_active', true)
			.neq('availability_status', 'hidden')

		const categories = input.category ?? []
		if (categories.length) query = query.in('category', categories)
		if (input.availability && input.availability !== 'all') {
			query = query.neq('availability_status', 'out_of_stock')
		}
		if (input.priceTier?.length) query = query.in('price_tier', input.priceTier)
		if (input.search) {
			const searchFilter = publicProductSearchFilter(input.search)
			if (searchFilter) query = query.or(searchFilter)
		}

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

		const [
			{ data, error, count },
			{ data: categoryRows, error: categoryError },
		] = await Promise.all([query, categoriesQuery])

		if (error) {
			logWebsiteServerError(
				'website.catalog.public_catalog.supabase_error',
				error,
			)
			throw new Error('Website catalog failed to load')
		}
		if (categoryError) {
			logWebsiteServerError(
				'website.catalog.categories.supabase_error',
				categoryError,
			)
			throw new Error('Website catalog categories failed to load')
		}
		const categoriesBySlug = publicCategoryMap(
			(categoryRows ?? []) as PublicCategoryRow[],
		)

		// Supabase row shape matches PublicProduct — PUBLIC_COLUMNS is the guard.
		return {
			categories: (categoryRows ?? []).map((category) => ({
				slug: category.slug,
				name: category.name,
				name_ar: category.name_ar ?? '',
				description: category.description ?? '',
				description_ar: category.description_ar ?? '',
				imageUrl: category.image_url ?? null,
			})),
			items: ((data ?? []) as unknown as Record<string, unknown>[]).map(
				(product) => withCategoryImageFallback(product, categoriesBySlug),
			),
			total: count ?? 0,
			hasMore: (count ?? 0) > offset + input.limit,
		}
	})

// ============================================================================
// getProductBySlug — single product lookup
// ============================================================================

export const getProductBySlug = createServerFn({ method: 'POST' })
	.inputValidator(productBySlugInput)
	.handler(async ({ data: input }) => {
		const client = await getWebsiteCatalogClient()

		const { data, error } = await client
			.from('products')
			.select(PUBLIC_COLUMNS)
			.eq('slug', input.slug)
			.eq('is_active', true)
			.neq('availability_status', 'hidden')
			.single()

		if (error || !data) {
			if (error) {
				logWebsiteServerError(
					'website.catalog.product_by_slug.supabase_error',
					error,
				)
			}
			return null
		}
		const product = data as unknown as Record<string, unknown>
		const productImage = firstImageUrl(product.image_urls)
		if (productImage) return product as unknown as PublicProduct
		const categorySlug =
			typeof product.category === 'string' ? product.category : null
		if (!categorySlug) return withCategoryImageFallback(product, new Map())

		const { data: category, error: categoryError } = await client
			.from('categories')
			.select('slug, name, name_ar, description, description_ar, image_url')
			.eq('slug', categorySlug)
			.eq('is_active', true)
			.maybeSingle()

		if (categoryError) {
			logWebsiteServerError(
				'website.catalog.category_image.supabase_error',
				categoryError,
			)
		}

		return withCategoryImageFallback(
			product,
			publicCategoryMap(category ? [category as PublicCategoryRow] : []),
		)
	})
