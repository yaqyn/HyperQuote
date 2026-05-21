import { describe, expect, it } from 'vitest'
import {
	sanitizeDraftQuoteSnapshot,
	toDraftQuoteRequestItemPayloads,
} from '../lib/draft-quote-cart'

describe('draft quote cart recovery', () => {
	it('normalizes legacy local cart rows before save or submit', () => {
		const snapshot = sanitizeDraftQuoteSnapshot({
			globalNote: '  keep this note  ',
			items: [
				{
					productId: 'old-local-row',
					quantity: '2',
				},
			],
		})

		expect(snapshot.globalNote).toBe('keep this note')
		expect(snapshot.items).toEqual([
			{
				category: 'material',
				categoryName: 'material',
				categoryNameAr: 'مواد',
				imageUrl: '',
				name: 'Custom material',
				nameAr: 'مواد مخصصة',
				note: '',
				productId: 'old-local-row',
				quantity: 2,
				slug: 'old-local-row',
				unitOfMeasure: 'unit',
				unitOfMeasureAr: 'وحدة',
			},
		])

		expect(
			toDraftQuoteRequestItemPayloads(snapshot.items, { isArabic: false }),
		).toEqual([
			{
				customerDescription: 'Custom material',
				isUnmatched: true,
				matchConfidence: undefined,
				notes: undefined,
				productId: undefined,
				quantity: 2,
				sortOrder: 0,
				unitOfMeasure: 'unit',
				unitOfMeasureAr: 'وحدة',
			},
		])
	})

	it('keeps valid catalog lines linked for server revalidation', () => {
		const productId = '22222222-2222-4222-8222-222222222222'
		const snapshot = sanitizeDraftQuoteSnapshot({
			items: [
				{
					category: 'tree',
					categoryName: 'Tree',
					categoryNameAr: 'شجرة',
					imageUrl: 'wood.webp',
					name: 'Wood',
					nameAr: 'خشب',
					productId,
					quantity: 3,
					slug: 'wood',
					unitOfMeasure: 'piece',
					unitOfMeasureAr: 'قطعة',
				},
			],
		})

		expect(
			toDraftQuoteRequestItemPayloads(snapshot.items, { isArabic: true }),
		).toEqual([
			{
				customerDescription: 'خشب',
				isUnmatched: false,
				matchConfidence: 1,
				notes: undefined,
				productId,
				quantity: 3,
				sortOrder: 0,
				unitOfMeasure: 'piece',
				unitOfMeasureAr: 'قطعة',
			},
		])
	})

	it('keeps zero as an editable cart quantity but omits it from submit payloads', () => {
		const productId = '33333333-3333-4333-8333-333333333333'
		const snapshot = sanitizeDraftQuoteSnapshot({
			items: [
				{
					category: 'material',
					categoryName: 'Material',
					imageUrl: '',
					name: 'Editable zero',
					productId,
					quantity: 0,
					slug: 'editable-zero',
					unitOfMeasure: 'piece',
				},
			],
		})

		expect(snapshot.items[0]?.quantity).toBe(0)
		expect(
			toDraftQuoteRequestItemPayloads(snapshot.items, { isArabic: false }),
		).toEqual([])
	})
})
