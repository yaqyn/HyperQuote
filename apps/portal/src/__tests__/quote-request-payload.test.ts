import { describe, expect, it } from 'vitest'
import {
	toQuoteDraftPayload,
	toQuoteSubmissionPayload,
} from '../lib/quote-request-payload'

const state = {
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
	items: [
		{
			customerDescription: 'Flow portal cement',
			id: 'line-1',
			isUnmatched: false,
			matchConfidence: 0.99,
			notes: 'Pour morning only',
			productId: 'product-1',
			quantity: 4,
			sortOrder: 0,
			unitOfMeasure: 'bag',
		},
		{
			customerDescription: 'Unmatched aggregate',
			id: 'line-2',
			isUnmatched: true,
			quantity: 2,
			sortOrder: 1,
			unitOfMeasure: 'ton',
		},
	],
	notes: 'Customer-visible note',
	projectId: 'project-1',
}

describe('quote request payloads', () => {
	it('serializes customer-submitted items without UI-only ids', () => {
		expect(toQuoteSubmissionPayload(state)).toEqual({
			attachmentUrls: ['quote-attachments/boq.pdf'],
			deliveryAddressId: 'address-1',
			deliveryDate: '2026-05-20',
			draftId: 'draft-1',
			items: [
				{
					customerDescription: 'Flow portal cement',
					isUnmatched: false,
					matchConfidence: 0.99,
					notes: 'Pour morning only',
					productId: 'product-1',
					quantity: 4,
					sortOrder: 0,
					unitOfMeasure: 'bag',
				},
				{
					customerDescription: 'Unmatched aggregate',
					isUnmatched: true,
					matchConfidence: undefined,
					notes: undefined,
					productId: undefined,
					quantity: 2,
					sortOrder: 1,
					unitOfMeasure: 'ton',
				},
			],
			notes: 'Customer-visible note',
			projectId: 'project-1',
		})
	})

	it('omits optional empty fields so the server owns workflow defaults', () => {
		const payload = toQuoteDraftPayload({
			...state,
			attachments: [],
			deliveryAddressId: null,
			deliveryDate: null,
			draftId: null,
			notes: '',
			projectId: null,
		})

		expect(payload.draftId).toBeUndefined()
		expect(payload.deliveryAddressId).toBeUndefined()
		expect(payload.deliveryDate).toBeUndefined()
		expect(payload.notes).toBeUndefined()
		expect(payload.projectId).toBeUndefined()
		expect(payload.attachmentUrls).toEqual([])
		expect(payload.items).toHaveLength(2)
	})
})
