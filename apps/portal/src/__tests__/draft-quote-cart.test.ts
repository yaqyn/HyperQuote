import {
	createQuoteCartSync,
	type getQuoteCartSnapshot,
	type QuoteCartItem,
	type QuoteCartState,
	type QuoteCartStoreApi,
	type RemoteQuoteCartSnapshot,
} from '@hyperquote/quote-cart'
import { describe, expect, it } from 'vitest'
import {
	sanitizeDraftQuoteSnapshot,
	toDraftQuoteRequestItemPayloads,
} from '../lib/draft-quote-cart'

describe('draft quote cart recovery', () => {
	it('purges legacy fake local cart rows before save or submit', () => {
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
		expect(snapshot.items).toEqual([])

		expect(
			toDraftQuoteRequestItemPayloads(snapshot.items, { isArabic: false }),
		).toEqual([])
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

	it('drops text product ids instead of emitting unmatched quote lines', () => {
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

		expect(snapshot.items).toEqual([])
		expect(
			toDraftQuoteRequestItemPayloads(snapshot.items, { isArabic: false }),
		).toEqual([])
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

	it('pushes a local authenticated cart when no remote cart exists yet', async () => {
		const productId = '22222222-2222-4222-8222-222222222222'
		const item = cartItem({ productId, quantity: 6 })
		const memory = createMemoryQuoteCartStore({
			globalNote: 'roof framing',
			items: [item],
		})
		const savedSnapshots: ReturnType<typeof getQuoteCartSnapshot>[] = []
		const controller = createQuoteCartSync({
			adapter: {
				load: async () => null,
				save: async (snapshot) => {
					savedSnapshots.push(snapshot)
					return {
						...snapshot,
						updatedAt: '2026-05-23T10:00:00.000Z',
						version: 1,
					}
				},
			},
			broadcast: false,
			intervalMs: 60_000,
			source: 'website',
			store: memory.store,
		})

		await controller.pull()
		controller.stop()

		expect(savedSnapshots.length).toBeGreaterThan(0)
		expect(savedSnapshots.at(-1)).toMatchObject({
			globalNote: 'roof framing',
			items: [{ productId, quantity: 6 }],
		})
	})

	it('applies the server-sanitized cart after remote save', async () => {
		const keptProductId = '22222222-2222-4222-8222-222222222222'
		const droppedProductId = '33333333-3333-4333-8333-333333333333'
		const memory = createMemoryQuoteCartStore({
			globalNote: '',
			items: [
				cartItem({ productId: keptProductId, quantity: 2 }),
				cartItem({ productId: droppedProductId, quantity: 9 }),
			],
		})
		const remote: RemoteQuoteCartSnapshot = {
			globalNote: '',
			items: [cartItem({ productId: keptProductId, quantity: 2 })],
			updatedAt: '2026-05-23T10:01:00.000Z',
			version: 2,
		}
		const controller = createQuoteCartSync({
			adapter: {
				load: async () => null,
				save: async () => remote,
			},
			broadcast: false,
			intervalMs: 60_000,
			source: 'portal',
			store: memory.store,
		})

		memory.store.setState({
			items: [
				cartItem({ productId: keptProductId, quantity: 2 }),
				cartItem({ productId: droppedProductId, quantity: 10 }),
			],
		})
		await controller.pull()
		controller.stop()

		expect(memory.getState().items).toHaveLength(1)
		expect(memory.getState().items[0]?.productId).toBe(keptProductId)
	})

	it('applies a newer empty remote cart instead of restoring stale local items', async () => {
		const productId = '22222222-2222-4222-8222-222222222222'
		const memory = createMemoryQuoteCartStore({
			globalNote: 'old note',
			items: [cartItem({ productId, quantity: 2 })],
		})
		let saves = 0
		const controller = createQuoteCartSync({
			adapter: {
				load: async () => ({
					globalNote: '',
					items: [],
					updatedAt: '2026-05-23T10:02:00.000Z',
					version: 3,
				}),
				save: async (snapshot) => {
					saves += 1
					return {
						...snapshot,
						updatedAt: '2026-05-23T10:03:00.000Z',
						version: 4,
					}
				},
			},
			broadcast: false,
			intervalMs: 60_000,
			source: 'website',
			store: memory.store,
		})

		await controller.pull()
		controller.stop()

		expect(saves).toBe(0)
		expect(memory.getState().globalNote).toBe('')
		expect(memory.getState().items).toEqual([])
	})
})

function cartItem(input: {
	productId: string
	quantity: number
}): QuoteCartItem {
	return {
		category: 'material',
		categoryName: 'Material',
		categoryNameAr: 'مواد',
		imageUrl: '',
		name: 'Wood',
		nameAr: 'خشب',
		note: '',
		productId: input.productId,
		quantity: input.quantity,
		slug: `wood-${input.productId.slice(0, 8)}`,
		unitOfMeasure: 'piece',
		unitOfMeasureAr: 'قطعة',
	}
}

function createMemoryQuoteCartStore(input: {
	globalNote: string
	items: QuoteCartItem[]
}): { getState: () => QuoteCartState; store: QuoteCartStoreApi } {
	const listeners = new Set<
		(state: QuoteCartState, previousState: QuoteCartState) => void
	>()
	let state = createQuoteCartState(input)
	const store: QuoteCartStoreApi = {
		getState: () => state,
		setState: (partial) => {
			const previousState = state
			state = { ...state, ...partial }
			for (const listener of listeners) {
				listener(state, previousState)
			}
		},
		subscribe: (listener) => {
			listeners.add(listener)
			return () => listeners.delete(listener)
		},
	}
	return { getState: () => state, store }
}

function createQuoteCartState(input: {
	globalNote: string
	items: QuoteCartItem[]
}): QuoteCartState {
	return {
		add: () => undefined,
		clear: () => undefined,
		duplicate: () => undefined,
		globalNote: input.globalNote,
		items: input.items,
		remove: () => undefined,
		setGlobalNote: () => undefined,
		totalUnits: () => input.items.reduce((sum, item) => sum + item.quantity, 0),
		updateNote: () => undefined,
		updateQuantity: () => undefined,
	}
}
