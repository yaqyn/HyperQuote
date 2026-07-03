import { describe, expect, it } from 'vitest'
import {
	draftProductIntentTerms,
	isOpenEndedCatalogSelectionRequest,
	productIntentTerms,
	productSearchTerm,
} from './portal-catalog-intent'

describe('portal catalog intent helpers', () => {
	it('keeps arbitrary chat text out of draft-write product ranking', () => {
		expect(draftProductIntentTerms('hello')).toEqual(['hello'])
		expect(draftProductIntentTerms('please make the draft now')).toEqual([])
		expect(productSearchTerm('hello')).toBe('hello')
	})

	it('keeps read-only product search broad without weakening draft writes', () => {
		expect(productIntentTerms('find glossy finish panels')).toEqual(
			expect.arrayContaining(['glossy', 'finish', 'panels']),
		)
		expect(draftProductIntentTerms('find glossy finish panels')).toEqual([
			'find',
			'glossy',
			'finish',
			'panels',
		])
	})

	it('keeps draft-write product terms literal', () => {
		expect(draftProductIntentTerms('tree house draft')).toEqual([
			'tree',
			'house',
		])
		expect(draftProductIntentTerms('just wood')).toEqual(['just', 'wood'])
		expect(draftProductIntentTerms('مسودة خشب')).toEqual(['مسوده', 'خشب'])
		expect(productSearchTerm('timber')).toBe('timber')
		expect(productSearchTerm('lumber')).toBe('lumber')
	})

	it('treats random catalog selection as open-ended but specific materials as targeted', () => {
		expect(isOpenEndedCatalogSelectionRequest('make me a random order')).toBe(
			true,
		)
		expect(isOpenEndedCatalogSelectionRequest('choose available catalog')).toBe(
			true,
		)
		expect(isOpenEndedCatalogSelectionRequest('suggest wood products')).toBe(
			false,
		)
		expect(isOpenEndedCatalogSelectionRequest('رشح خشب')).toBe(false)
	})
})
