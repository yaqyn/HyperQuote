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

	it('never emits text product ids as catalog product links', () => {
		const snapshot = sanitizeDraftQuoteSnapshot({
			items: [
				{
					category: 'lumber',
					name: 'Wood',
					productId: 'wood',
					quantity: 4,
					slug: 'wood',
					unitOfMeasure: 'piece',
				},
				{
					category: 'metal',
					id: 'metal',
					name: 'Metal',
					quantity: 2,
					unit: 'kg',
				},
			],
		})

		expect(snapshot.items.map((item) => item.productId)).toEqual([
			'wood',
			'metal',
		])
		expect(
			toDraftQuoteRequestItemPayloads(snapshot.items, { isArabic: false }),
		).toEqual([
			{
				customerDescription: 'Wood',
				isUnmatched: true,
				matchConfidence: undefined,
				notes: undefined,
				productId: undefined,
				quantity: 4,
				sortOrder: 0,
				unitOfMeasure: 'piece',
				unitOfMeasureAr: 'piece',
			},
			{
				customerDescription: 'Metal',
				isUnmatched: true,
				matchConfidence: undefined,
				notes: undefined,
				productId: undefined,
				quantity: 2,
				sortOrder: 1,
				unitOfMeasure: 'kg',
				unitOfMeasureAr: 'kg',
			},
		])
	})

	it('merges duplicate persisted catalog rows instead of fabricating product ids', () => {
		const productId = '22222222-2222-4222-8222-222222222222'
		const snapshot = sanitizeDraftQuoteSnapshot({
			items: [
				{
					category: 'material',
					name: 'Wood',
					productId,
					quantity: 2,
					unitOfMeasure: 'piece',
				},
				{
					category: 'material',
					name: 'Wood',
					productId,
					quantity: 3,
					unitOfMeasure: 'piece',
				},
			],
		})

		expect(snapshot.items).toHaveLength(1)
		expect(snapshot.items[0]?.productId).toBe(productId)
		expect(snapshot.items[0]?.quantity).toBe(5)
		expect(
			toDraftQuoteRequestItemPayloads(snapshot.items, { isArabic: false }),
		).toEqual([
			{
				customerDescription: 'Wood',
				isUnmatched: false,
				matchConfidence: 1,
				notes: undefined,
				productId,
				quantity: 5,
				sortOrder: 0,
				unitOfMeasure: 'piece',
				unitOfMeasureAr: 'piece',
			},
		])
	})

	it('stress merges many duplicate catalog rows under the same real product ids', () => {
		const woodProductId = '22222222-2222-4222-8222-222222222222'
		const steelProductId = '33333333-3333-4333-8333-333333333333'
		const snapshot = sanitizeDraftQuoteSnapshot({
			items: Array.from({ length: 120 }, (_, index) => {
				const isSteel = index % 3 === 0
				return {
					category: 'material',
					name: isSteel ? 'Steel' : 'Wood',
					note: index === 2 ? 'keep first useful note' : '',
					productId: isSteel ? steelProductId : woodProductId,
					quantity: '1',
					unitOfMeasure: 'piece',
				}
			}),
		})

		const wood = snapshot.items.find((item) => item.productId === woodProductId)
		const steel = snapshot.items.find(
			(item) => item.productId === steelProductId,
		)
		const payloads = toDraftQuoteRequestItemPayloads(snapshot.items, {
			isArabic: false,
		})

		expect(snapshot.items).toHaveLength(2)
		expect(wood?.quantity).toBe(80)
		expect(wood?.note).toBe('keep first useful note')
		expect(steel?.quantity).toBe(40)
		expect(payloads).toHaveLength(2)
		expect(payloads.every((item) => item.isUnmatched === false)).toBe(true)
		expect(payloads.map((item) => item.productId).sort()).toEqual(
			[steelProductId, woodProductId].sort(),
		)
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
