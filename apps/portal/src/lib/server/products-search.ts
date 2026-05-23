/**
 * Product search server function.
 * Search only safe public catalog fields.
 * Returns PUBLIC_COLUMNS only -- never cost fields.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getAuthenticatedSupabase } from './_supabase'
import { publicProductSearchFilter } from './product-search-filter'

// ============================================================================
// Public columns whitelist -- NEVER expose cost fields to clients
// ============================================================================

const PUBLIC_COLUMNS = [
	'id',
	'sku',
	'slug',
	'name',
	'name_ar',
	'category',
	'subcategory',
	'subcategory_ar',
	'unit_of_measure',
	'unit_of_measure_ar',
	'price_range_min',
	'price_range_max',
	'availability_status',
	'image_urls',
] as const

const PUBLIC_COLUMNS_SELECT = PUBLIC_COLUMNS.join(', ')

// ============================================================================
// Types
// ============================================================================

export interface ProductSearchResult {
	id: string
	sku: string
	slug: string
	name: string
	nameAr: string
	category: string
	categoryName: string
	categoryNameAr: string
	subcategory: string
	subcategoryAr: string
	unitOfMeasure: string
	unitOfMeasureAr: string
	priceRangeMin: number | null
	priceRangeMax: number | null
	availabilityStatus: string
	imageUrls: string[]
}

// ============================================================================
// Schema
// ============================================================================

const searchProductsInput = z.object({
	query: z.string().min(1),
	limit: z.number().int().min(1).max(100).optional(),
})

const getProductCatalogInput = z.object({
	limit: z.number().int().min(1).max(500).optional(),
	offset: z.number().int().min(0).optional(),
})

// ============================================================================
// Helper
// ============================================================================

function mapProduct(
	p: Record<string, unknown>,
	categoriesBySlug: Map<
		string,
		{ image_url: string | null; name: string; name_ar: string | null }
	>,
): ProductSearchResult {
	const category = p.category as string
	const categoryRow = categoriesBySlug.get(category)
	const imageUrls = (p.image_urls as string[] | null) ?? []
	const firstProductImage = imageUrls.find(
		(url) => typeof url === 'string' && url.trim(),
	)
	return {
		id: p.id as string,
		sku: p.sku as string,
		slug: p.slug as string,
		name: p.name as string,
		nameAr: p.name_ar as string,
		category,
		categoryName: categoryRow?.name ?? category,
		categoryNameAr: categoryRow?.name_ar ?? categoryRow?.name ?? category,
		subcategory: (p.subcategory as string | null) ?? '',
		subcategoryAr:
			(p.subcategory_ar as string | null) ??
			(p.subcategory as string | null) ??
			'',
		unitOfMeasure: p.unit_of_measure as string,
		unitOfMeasureAr: p.unit_of_measure_ar as string,
		priceRangeMin: (p.price_range_min as number) ?? null,
		priceRangeMax: (p.price_range_max as number) ?? null,
		availabilityStatus: p.availability_status as string,
		imageUrls: firstProductImage
			? imageUrls
			: categoryRow?.image_url
				? [categoryRow.image_url]
				: [],
	}
}

// ============================================================================

async function getCategoriesBySlug(
	supabase: Awaited<ReturnType<typeof getAuthenticatedSupabase>>['supabase'],
) {
	const { data, error } = await supabase
		.from('categories')
		.select('slug, name, name_ar, image_url')
		.eq('is_active', true)
	if (error) throw new Error(error.message)
	return new Map(
		(
			(data ?? []) as Array<{
				slug: string
				name: string
				name_ar: string | null
				image_url: string | null
			}>
		).map((category) => [
			category.slug,
			{
				image_url: category.image_url,
				name: category.name,
				name_ar: category.name_ar,
			},
		]),
	)
}

// ============================================================================
// searchProducts
// ============================================================================

export const searchProducts = createServerFn({ method: 'POST' })
	.inputValidator(searchProductsInput)
	.handler(async ({ data: input }): Promise<ProductSearchResult[]> => {
		const limit = input.limit ?? 20

		const { supabase } = await getAuthenticatedSupabase()
		const searchFilter = publicProductSearchFilter(input.query)

		const [{ data, error }, categoriesBySlug] = await Promise.all([
			(searchFilter
				? supabase
						.from('products')
						.select(PUBLIC_COLUMNS_SELECT)
						.or(searchFilter)
				: supabase.from('products').select(PUBLIC_COLUMNS_SELECT)
			)
				.eq('is_active', true)
				.neq('availability_status', 'hidden')
				.neq('availability_status', 'out_of_stock')
				.limit(limit),
			getCategoriesBySlug(supabase),
		])

		if (error) throw new Error(error.message)

		// data is typed via a wildcard column select, so it's widened to
		// `Record<string, unknown>[]` — safe to map here because mapProduct
		// only reads keys that are guaranteed by PUBLIC_COLUMNS.
		return ((data as unknown as Record<string, unknown>[] | null) ?? []).map(
			(product) => mapProduct(product, categoriesBySlug),
		)
	})

// ============================================================================
// getProductCatalog -- loads products for client-side fuse.js index
// ============================================================================

export const getProductCatalog = createServerFn({ method: 'POST' })
	.inputValidator(getProductCatalogInput)
	.handler(async ({ data: input }): Promise<ProductSearchResult[]> => {
		const limit = input.limit ?? 500
		const offset = input.offset ?? 0

		const { supabase } = await getAuthenticatedSupabase()

		const [{ data, error }, categoriesBySlug] = await Promise.all([
			supabase
				.from('products')
				.select(PUBLIC_COLUMNS_SELECT)
				.eq('is_active', true)
				.neq('availability_status', 'hidden')
				.neq('availability_status', 'out_of_stock')
				.order('name')
				.range(offset, offset + limit - 1),
			getCategoriesBySlug(supabase),
		])

		if (error) throw new Error(error.message)

		return ((data as unknown as Record<string, unknown>[] | null) ?? []).map(
			(product) => mapProduct(product, categoriesBySlug),
		)
	})
