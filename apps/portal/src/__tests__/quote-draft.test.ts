import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	clearLocalDraft,
	hasRecentDraft,
	loadDraftFromLocal,
	saveDraftToLocal,
} from '../lib/quote-draft'
import type { QuoteItem } from '../stores/quote-builder'

function installMemoryStorage() {
	const values = new Map<string, string>()
	vi.stubGlobal('localStorage', {
		getItem: (key: string) => values.get(key) ?? null,
		removeItem: (key: string) => {
			values.delete(key)
		},
		setItem: (key: string, value: string) => {
			values.set(key, value)
		},
	})
	return values
}

const item: QuoteItem = {
	customerDescription: 'Flow draft cement',
	id: 'line-1',
	isUnmatched: false,
	notes: 'Keep snapshot note',
	productId: 'product-1',
	quantity: 3,
	sortOrder: 0,
	unitOfMeasure: 'bag',
}

describe('quote draft local persistence', () => {
	beforeEach(() => {
		installMemoryStorage()
		vi.useRealTimers()
	})

	it('saves, restores, and clears a customer draft snapshot', () => {
		saveDraftToLocal({
			attachments: [
				{
					name: 'boq.pdf',
					size: 512,
					type: 'application/pdf',
					url: 'quote-attachments/boq.pdf',
				},
			],
			deliveryAddressId: 'address-1',
			deliveryDate: '2026-05-20',
			draftId: 'draft-1',
			items: [item],
			notes: 'Site delivery note',
			projectId: 'project-1',
		})

		const restored = loadDraftFromLocal()
		expect(restored?.draftId).toBe('draft-1')
		expect(restored?.items).toEqual([item])
		expect(restored?.attachments[0]?.url).toBe('quote-attachments/boq.pdf')
		expect(hasRecentDraft()).toBe(true)

		clearLocalDraft()
		expect(loadDraftFromLocal()).toBeNull()
		expect(hasRecentDraft()).toBe(false)
	})

	it('rejects invalid, empty, and stale local draft records', () => {
		const storage = installMemoryStorage()
		storage.set('quote-draft-data', '{bad json')
		expect(loadDraftFromLocal()).toBeNull()

		storage.set(
			'quote-draft-data',
			JSON.stringify({
				items: [],
				updatedAt: Date.now(),
			}),
		)
		expect(hasRecentDraft()).toBe(false)

		storage.set(
			'quote-draft-data',
			JSON.stringify({
				items: [item],
				updatedAt: Date.now() - 25 * 60 * 60 * 1000,
			}),
		)
		expect(hasRecentDraft()).toBe(false)
	})
})
