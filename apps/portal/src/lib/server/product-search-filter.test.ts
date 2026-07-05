import { describe, expect, it } from 'vitest'
import { publicProductSearchFilter } from './product-search-filter'

describe('publicProductSearchFilter', () => {
	it('searches hierarchy slugs, labels, and final product fields', () => {
		const filter = publicProductSearchFilter('ezz-steel')

		expect(filter).toContain('category_slug.ilike.*ezz-steel*')
		expect(filter).toContain('product_family_slug.ilike.*ezz-steel*')
		expect(filter).toContain('product_type_slug.ilike.*ezz-steel*')
		expect(filter).toContain('product_type_name.ilike.*ezz-steel*')
	})

	it('treats comma-separated values as separate searchable terms', () => {
		const filter = publicProductSearchFilter('Cement, Steel, 3m, ezz-steel')

		expect(filter).toContain('name.ilike.*Cement*')
		expect(filter).toContain('name.ilike.*Steel*')
		expect(filter).toContain('name.ilike.*3m*')
		expect(filter).toContain('name.ilike.*ezz-steel*')
	})
})
