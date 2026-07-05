/**
 * Portal market server functions backed by Supabase products.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getAuthenticatedSupabase } from './_supabase'
import {
	DEFAULT_PUBLIC_PRODUCT_SEARCH_FIELDS,
	publicProductSearchFilter,
} from './product-search-filter'

interface ProductSpec {
	label: string
	labelAr: string
	value: string
	valueAr: string
}

export interface MarketProduct {
	id: string
	slug: string
	name: string
	nameAr: string
	description: string
	descriptionAr: string
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
	weightKg: number | null
	priceRangeMin: number | null
	priceRangeMax: number | null
	availabilityStatus: 'available' | 'low_stock' | 'out_of_stock'
	imageUrl: string
	specs: ProductSpec[]
}

export interface MarketCategory {
	slug: string
	name: string
	nameAr: string
	description: string
	descriptionAr: string
	imageUrl: string
	productFamilies: MarketProductFamily[]
}

export interface MarketProductFamily {
	slug: string
	name: string
	nameAr: string
	productTypes: MarketProductType[]
}

export interface MarketProductType {
	slug: string
	name: string
	nameAr: string
}

interface MarketProductsResponse {
	products: MarketProduct[]
	nextPage: number | null
	total: number
}

interface MarketCategoriesResponse {
	categories: MarketCategory[]
}

const getMarketProductsInput = z.object({
	search: z.string().optional(),
	category: z.string().optional(),
	productFamily: z.string().optional(),
	productType: z.string().optional(),
	page: z.number().int().min(1).default(1),
	limit: z.number().int().min(1).max(50).default(20),
})

const MARKET_PRODUCT_SEARCH_FIELDS = [
	...DEFAULT_PUBLIC_PRODUCT_SEARCH_FIELDS,
	'brand',
	'manufacturer',
	'description',
	'description_ar',
] as const

function specEntries(value: unknown): Array<{ label: string; value: string }> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return []

	return Object.entries(value).flatMap(([key, rawValue]) => {
		if (rawValue == null || rawValue === '') return []
		const label = key
			.replace(/_/g, ' ')
			.replace(/\b\w/g, (letter) => letter.toUpperCase())
		return [{ label, value: String(rawValue) }]
	})
}

function specsFrom(enValue: unknown, arValue: unknown): ProductSpec[] {
	const enEntries = specEntries(enValue)
	const arEntries = specEntries(arValue)
	const length = Math.max(enEntries.length, arEntries.length)

	return Array.from({ length }).flatMap((_, index) => {
		const en = enEntries[index]
		const ar = arEntries[index]
		if (!en && !ar) return []
		return [
			{
				label: en?.label ?? ar?.label ?? '',
				labelAr: ar?.label ?? en?.label ?? '',
				value: en?.value ?? ar?.value ?? '',
				valueAr: ar?.value ?? en?.value ?? '',
			},
		]
	})
}

function firstImageUrl(imageUrls: string[] | null | undefined): string {
	return imageUrls?.find((url) => typeof url === 'string' && url.trim()) ?? ''
}

export const getMarketProducts = createServerFn({ method: 'POST' })
	.inputValidator(getMarketProductsInput)
	.handler(async ({ data: input }): Promise<MarketProductsResponse> => {
		const page = input.page ?? 1
		const limit = input.limit ?? 20

		const { supabase } = await getAuthenticatedSupabase()

		let query = supabase
			.from('catalog_product_hierarchy')
			.select(
				'id, slug, name, name_ar, description, description_ar, category, category_slug, category_name, category_name_ar, category_image_url, product_family_slug, product_family_name, product_family_name_ar, product_type_slug, product_type_name, product_type_name_ar, subcategory, subcategory_ar, unit_of_measure, unit_of_measure_ar, weight_kg, price_range_min, price_range_max, availability_status, image_urls, specifications, specifications_ar',
				{ count: 'exact' },
			)
			.eq('is_active', true)
			.neq('availability_status', 'hidden')

		if (input.search) {
			const searchFilter = publicProductSearchFilter(
				input.search,
				MARKET_PRODUCT_SEARCH_FIELDS,
			)
			if (searchFilter) query = query.or(searchFilter)
		}

		if (input.category) {
			const categories = input.category
				.split(',')
				.map((category) => category.trim())
			query = query.in('category_slug', categories)
		}
		if (input.productFamily) {
			const productFamilies = input.productFamily
				.split(',')
				.map((productFamily) => productFamily.trim())
			query = query.in('product_family_slug', productFamilies)
		}
		if (input.productType) {
			const productTypes = input.productType
				.split(',')
				.map((productType) => productType.trim())
			query = query.in('product_type_slug', productTypes)
		}

		const start = (page - 1) * limit
		query = query.order('name').range(start, start + limit - 1)

		const [
			{ data, error, count },
			{ data: categoryRows, error: categoryError },
		] = await Promise.all([
			query,
			supabase
				.from('categories')
				.select('slug, name, name_ar, description, description_ar, image_url')
				.eq('is_active', true),
		])
		if (error) throw new Error(error.message)
		if (categoryError) throw new Error(categoryError.message)

		const categoriesBySlug = new Map(
			(categoryRows ?? []).map((category) => [category.slug, category]),
		)

		const total = count ?? 0
		const hasMore = start + limit < total

		return {
			products: (data ?? []).map((product): MarketProduct => {
				const category = product.category
				const categoryRow = categoriesBySlug.get(
					product.category_slug ?? category,
				)
				return {
					id: product.id,
					slug: product.slug,
					name: product.name,
					nameAr: product.name_ar,
					description: product.description ?? '',
					descriptionAr: product.description_ar ?? '',
					category,
					categoryName: product.category_name ?? categoryRow?.name ?? category,
					categoryNameAr:
						product.category_name_ar ??
						product.category_name ??
						categoryRow?.name_ar ??
						categoryRow?.name ??
						category,
					productFamily: product.product_family_slug ?? category,
					productFamilyName:
						product.product_family_name ?? product.category_name ?? category,
					productFamilyNameAr:
						product.product_family_name_ar ??
						product.product_family_name ??
						product.category_name_ar ??
						category,
					productType:
						product.product_type_slug ?? product.subcategory ?? category,
					productTypeName:
						product.product_type_name ?? product.subcategory ?? category,
					productTypeNameAr:
						product.product_type_name_ar ??
						product.product_type_name ??
						product.subcategory_ar ??
						category,
					subcategory: product.subcategory ?? '',
					subcategoryAr: product.subcategory_ar ?? product.subcategory ?? '',
					unitOfMeasure: product.unit_of_measure,
					unitOfMeasureAr: product.unit_of_measure_ar,
					weightKg: product.weight_kg,
					priceRangeMin: product.price_range_min,
					priceRangeMax: product.price_range_max,
					availabilityStatus:
						product.availability_status === 'hidden'
							? 'out_of_stock'
							: product.availability_status,
					imageUrl:
						firstImageUrl(product.image_urls) ||
						product.category_image_url ||
						categoryRow?.image_url ||
						'',
					specs: specsFrom(product.specifications, product.specifications_ar),
				}
			}),
			nextPage: hasMore ? page + 1 : null,
			total,
		}
	})

export const getMarketCategories = createServerFn({
	method: 'GET',
}).handler(async (): Promise<MarketCategoriesResponse> => {
	const { supabase } = await getAuthenticatedSupabase()
	const { data, error } = await supabase
		.from('categories')
		.select('slug, name, name_ar, description, description_ar, image_url')
		.eq('is_active', true)
		.order('name', { ascending: true })

	if (error) throw new Error(error.message)

	const { data: hierarchyRows, error: hierarchyError } = await supabase
		.from('catalog_product_hierarchy')
		.select(
			'category_slug, product_family_slug, product_family_name, product_family_name_ar, product_type_slug, product_type_name, product_type_name_ar',
		)
		.eq('is_active', true)
		.neq('availability_status', 'hidden')
	if (hierarchyError) throw new Error(hierarchyError.message)

	const familiesByCategory = new Map<string, Map<string, MarketProductFamily>>()
	for (const row of hierarchyRows ?? []) {
		const categorySlug = row.category_slug
		const familySlug = row.product_family_slug
		const typeSlug = row.product_type_slug
		if (!categorySlug || !familySlug || !typeSlug) continue
		let families = familiesByCategory.get(categorySlug)
		if (!families) {
			families = new Map()
			familiesByCategory.set(categorySlug, families)
		}
		let family = families.get(familySlug)
		if (!family) {
			family = {
				slug: familySlug,
				name: row.product_family_name ?? familySlug,
				nameAr:
					row.product_family_name_ar ?? row.product_family_name ?? familySlug,
				productTypes: [],
			}
			families.set(familySlug, family)
		}
		if (!family.productTypes.some((type) => type.slug === typeSlug)) {
			family.productTypes.push({
				slug: typeSlug,
				name: row.product_type_name ?? typeSlug,
				nameAr: row.product_type_name_ar ?? row.product_type_name ?? typeSlug,
			})
		}
	}

	return {
		categories: (data ?? []).map(
			(category): MarketCategory => ({
				slug: category.slug,
				name: category.name,
				nameAr: category.name_ar ?? '',
				description: category.description ?? '',
				descriptionAr: category.description_ar ?? '',
				imageUrl: category.image_url ?? '',
				productFamilies: [
					...(familiesByCategory.get(category.slug)?.values() ?? []),
				]
					.map((family) => ({
						...family,
						productTypes: [...family.productTypes].sort((left, right) =>
							left.name.localeCompare(right.name),
						),
					}))
					.sort((left, right) => left.name.localeCompare(right.name)),
			}),
		),
	}
})
