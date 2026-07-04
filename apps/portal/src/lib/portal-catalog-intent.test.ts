import { describe, expect, it } from 'vitest'
import {
	draftProductIntentTerms,
	isBroadCatalogReadRequest,
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

	it('detects broad catalog read questions without treating targeted product text as broad', () => {
		for (const message of [
			'products?',
			'what products do you have?',
			'what materials do you carry?',
			'show me the catalog',
			'منتجات؟',
		]) {
			expect(isBroadCatalogReadRequest(message), message).toBe(true)
		}

		for (const message of [
			'hey, how are you?',
			'whatshu got?',
			'find 42.5 cement products',
			'suggest wood products',
		]) {
			expect(isBroadCatalogReadRequest(message), message).toBe(false)
		}
	})
})
