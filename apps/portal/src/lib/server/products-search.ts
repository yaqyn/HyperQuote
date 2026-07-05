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
	'category_slug',
	'category_name',
	'category_name_ar',
	'category_image_url',
	'subcategory',
	'subcategory_ar',
	'product_family_slug',
	'product_family_name',
	'product_family_name_ar',
	'product_type_slug',
	'product_type_name',
	'product_type_name_ar',
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
	productFamily: string
	productFamilyName: string
	productFamilyNameAr: string
	productType: string
	productTypeName: string
	productTypeNameAr: string
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

function mapProduct(p: Record<string, unknown>): ProductSearchResult {
	const category = p.category as string
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
		categoryName: (p.category_name as string | null) ?? category,
		categoryNameAr:
			(p.category_name_ar as string | null) ??
			(p.category_name as string | null) ??
			category,
		productFamily:
			(p.product_family_slug as string | null) ??
			(p.category_slug as string | null) ??
			category,
		productFamilyName:
			(p.product_family_name as string | null) ??
			(p.category_name as string | null) ??
			category,
		productFamilyNameAr:
			(p.product_family_name_ar as string | null) ??
			(p.product_family_name as string | null) ??
			(p.category_name_ar as string | null) ??
			category,
		productType:
			(p.product_type_slug as string | null) ??
			(p.subcategory as string | null) ??
			category,
		productTypeName:
			(p.product_type_name as string | null) ??
			(p.subcategory as string | null) ??
			category,
		productTypeNameAr:
			(p.product_type_name_ar as string | null) ??
			(p.product_type_name as string | null) ??
			(p.subcategory_ar as string | null) ??
			category,
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
			: typeof p.category_image_url === 'string' && p.category_image_url
				? [p.category_image_url]
				: [],
	}
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

		const { data, error } = await (searchFilter
			? supabase
					.from('catalog_product_hierarchy')
					.select(PUBLIC_COLUMNS_SELECT)
					.or(searchFilter)
			: supabase.from('catalog_product_hierarchy').select(PUBLIC_COLUMNS_SELECT)
		)
			.eq('is_active', true)
			.neq('availability_status', 'hidden')
			.neq('availability_status', 'out_of_stock')
			.limit(limit)

		if (error) throw new Error(error.message)

		// data is typed via a wildcard column select, so it's widened to
		// `Record<string, unknown>[]` — safe to map here because mapProduct
		// only reads keys that are guaranteed by PUBLIC_COLUMNS.
		return ((data as unknown as Record<string, unknown>[] | null) ?? []).map(
			mapProduct,
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

		const { data, error } = await supabase
			.from('catalog_product_hierarchy')
			.select(PUBLIC_COLUMNS_SELECT)
			.eq('is_active', true)
			.neq('availability_status', 'hidden')
			.neq('availability_status', 'out_of_stock')
			.order('name')
			.range(offset, offset + limit - 1)

		if (error) throw new Error(error.message)

		return ((data as unknown as Record<string, unknown>[] | null) ?? []).map(
			mapProduct,
		)
	})
