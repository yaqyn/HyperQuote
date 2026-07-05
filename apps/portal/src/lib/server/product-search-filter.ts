export const DEFAULT_PUBLIC_PRODUCT_SEARCH_FIELDS = [
	'name',
	'name_ar',
	'sku',
	'category',
	'category_name',
	'category_name_ar',
	'subcategory',
	'subcategory_ar',
	'product_family_name',
	'product_family_name_ar',
	'product_type_name',
	'product_type_name_ar',
] as const

export function publicProductSearchFilter(
	search: string,
	fields: readonly string[] = DEFAULT_PUBLIC_PRODUCT_SEARCH_FIELDS,
): string | null {
	const term = search
		.replace(/[,%*()]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
	if (!term) return null
	const pattern = `*${term}*`
	return fields.map((field) => `${field}.ilike.${pattern}`).join(',')
}
