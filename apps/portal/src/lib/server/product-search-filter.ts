export const DEFAULT_PUBLIC_PRODUCT_SEARCH_FIELDS = [
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
	'description',
	'description_ar',
] as const

function searchTerms(search: string): string[] {
	return search
		.split(',')
		.map((term) =>
			term
				.replace(/[%*()]/g, ' ')
				.replace(/\s+/g, ' ')
				.trim(),
		)
		.filter(Boolean)
}

export function publicProductSearchFilter(
	search: string,
	fields: readonly string[] = DEFAULT_PUBLIC_PRODUCT_SEARCH_FIELDS,
): string | null {
	const terms = searchTerms(search)
	if (terms.length === 0) return null
	return terms
		.flatMap((term) => {
			const pattern = `*${term}*`
			return fields.map((field) => `${field}.ilike.${pattern}`)
		})
		.join(',')
}
