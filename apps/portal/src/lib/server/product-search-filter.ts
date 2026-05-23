export const DEFAULT_PUBLIC_PRODUCT_SEARCH_FIELDS = [
	'name',
	'name_ar',
	'sku',
	'category',
	'subcategory',
	'subcategory_ar',
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
