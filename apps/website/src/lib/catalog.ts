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
	productFamily: z.array(z.string()).optional(),
	productType: z.array(z.string()).optional(),
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
	productFamilies: PublicProductFamily[]
}

interface PublicProductFamily {
	slug: string
	name: string
	name_ar: string
	productTypes: PublicProductType[]
}

interface PublicProductType {
	slug: string
	name: string
	name_ar: string
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
	'category_slug',
	'category_name',
	'category_name_ar',
	'subcategory',
	'subcategory_ar',
	'product_family_slug',
	'product_family_name',
	'product_family_name_ar',
	'product_type_slug',
	'product_type_name',
	'product_type_name_ar',
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
	const terms = search
		.split(',')
		.map((term) =>
			term
				.replace(/[%*()]/g, ' ')
				.replace(/\s+/g, ' ')
				.trim(),
		)
		.filter(Boolean)
	if (terms.length === 0) return null
	const fields = [
		'name',
		'name_ar',
		'sku',
		'category',
		'category_slug',
		'category_name',
		'category_name_ar',
		'subcategory',
		'subcategory_ar',
		'product_family_slug',
		'product_family_name',
		'product_family_name_ar',
		'product_type_slug',
		'product_type_name',
		'product_type_name_ar',
		'brand',
		'manufacturer',
		'description',
		'description_ar',
	]
	return terms
		.flatMap((term) => {
			const pattern = `*${term}*`
			return fields.map((field) => `${field}.ilike.${pattern}`)
		})
		.join(',')
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

function publicFamiliesByCategory(rows: unknown[]) {
	const byCategory = new Map<string, Map<string, PublicProductFamily>>()
	for (const row of rows as Array<Record<string, string | null>>) {
		const categorySlug = row.category_slug
		const familySlug = row.product_family_slug
		const typeSlug = row.product_type_slug
		if (!categorySlug || !familySlug || !typeSlug) continue
		let families = byCategory.get(categorySlug)
		if (!families) {
			families = new Map()
			byCategory.set(categorySlug, families)
		}
		let family = families.get(familySlug)
		if (!family) {
			family = {
				slug: familySlug,
				name: row.product_family_name ?? familySlug,
				name_ar:
					row.product_family_name_ar ?? row.product_family_name ?? familySlug,
				productTypes: [],
			}
			families.set(familySlug, family)
		}
		if (!family.productTypes.some((type) => type.slug === typeSlug)) {
			family.productTypes.push({
				slug: typeSlug,
				name: row.product_type_name ?? typeSlug,
				name_ar: row.product_type_name_ar ?? row.product_type_name ?? typeSlug,
			})
		}
	}

	return new Map(
		[...byCategory].map(([categorySlug, families]) => [
			categorySlug,
			[...families.values()]
				.map((family) => ({
					...family,
					productTypes: [...family.productTypes].sort((left, right) =>
						left.name.localeCompare(right.name),
					),
				}))
				.sort((left, right) => left.name.localeCompare(right.name)),
		]),
	)
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
			return []
		}

		const categories = (categoryRows ?? []).filter(
			(category) => typeof category.slug === 'string' && category.slug.length,
		)
		const slugs = categories.map((category) => category.slug)
		const imageByCategory = new Map<string, string>()

		if (slugs.length > 0) {
			const { data: productRows, error: productError } = await client
				.from('catalog_product_hierarchy')
				.select('category, category_slug, image_urls')
				.eq('is_active', true)
				.neq('availability_status', 'hidden')
				.in('category_slug', slugs)
				.order('name', { ascending: true })
				.limit(slugs.length * 12)

			if (productError) {
				logWebsiteServerError(
					'website.catalog.public_catalog.supabase_error',
					productError,
				)
				return categories.map((category) => ({
					slug: category.slug,
					name: category.name,
					name_ar: category.name_ar ?? '',
					description: category.description ?? '',
					description_ar: category.description_ar ?? '',
					imageUrl: category.image_url ?? null,
				}))
			}

			for (const product of productRows ?? []) {
				if (
					typeof product.category_slug !== 'string' ||
					imageByCategory.has(product.category_slug)
				) {
					continue
				}
				const imageUrl = Array.isArray(product.image_urls)
					? product.image_urls.find((url) => typeof url === 'string' && url)
					: null
				if (imageUrl) imageByCategory.set(product.category_slug, imageUrl)
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
			.from('catalog_product_hierarchy')
			.select(PUBLIC_COLUMNS, { count: 'exact' })
			.eq('is_active', true)
			.neq('availability_status', 'hidden')

		const categories = input.category ?? []
		if (categories.length) query = query.in('category_slug', categories)
		const productFamilies = input.productFamily ?? []
		if (productFamilies.length) {
			query = query.in('product_family_slug', productFamilies)
		}
		const productTypes = input.productType ?? []
		if (productTypes.length) query = query.in('product_type_slug', productTypes)
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
				query = query.order('category_name')
				break
			case 'availability':
				query = query.order('availability_status')
				break
		}

		const offset = (input.page - 1) * input.limit
		query = query.range(offset, offset + input.limit - 1)

		const hierarchyQuery = client
			.from('catalog_product_hierarchy')
			.select(
				'category_slug, product_family_slug, product_family_name, product_family_name_ar, product_type_slug, product_type_name, product_type_name_ar',
			)
			.eq('is_active', true)
			.neq('availability_status', 'hidden')

		const [productResult, categoryResult, hierarchyResult] = await Promise.all([
			query,
			categoriesQuery,
			hierarchyQuery,
		])
		const { data, error, count } = productResult
		const categoryRows = categoryResult.error ? [] : categoryResult.data
		const hierarchyRows = hierarchyResult.error ? [] : hierarchyResult.data

		if (error) {
			logWebsiteServerError(
				'website.catalog.public_catalog.supabase_error',
				error,
			)
			throw new Error('Website catalog failed to load')
		}
		if (categoryResult.error) {
			logWebsiteServerError(
				'website.catalog.categories.supabase_error',
				categoryResult.error,
			)
		}
		if (hierarchyResult.error) {
			logWebsiteServerError(
				'website.catalog.categories.supabase_error',
				hierarchyResult.error,
			)
		}
		const categoriesBySlug = publicCategoryMap(
			(categoryRows ?? []) as PublicCategoryRow[],
		)
		const familiesByCategory = publicFamiliesByCategory(hierarchyRows ?? [])

		// Supabase row shape matches PublicProduct — PUBLIC_COLUMNS is the guard.
		return {
			categories: (categoryRows ?? []).map((category) => ({
				slug: category.slug,
				name: category.name,
				name_ar: category.name_ar ?? '',
				description: category.description ?? '',
				description_ar: category.description_ar ?? '',
				imageUrl: category.image_url ?? null,
				productFamilies: familiesByCategory.get(category.slug) ?? [],
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
			.from('catalog_product_hierarchy')
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
			typeof product.category_slug === 'string'
				? product.category_slug
				: typeof product.category === 'string'
					? product.category
					: null
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
