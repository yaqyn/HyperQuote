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
		const expectedItems = [
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
		]

		expect(toQuoteSubmissionPayload(state)).toEqual({
			associates: undefined,
			attachmentUrls: ['quote-attachments/boq.pdf'],
			deliveryAddressId: 'address-1',
			deliveryDate: '2026-05-20',
			draftId: 'draft-1',
			items: expectedItems,
			locations: [
				{
					addressId: 'address-1',
					clientId: 'default-location',
					deliveryDate: '2026-05-20',
					deliveryHour: undefined,
					deliveryPeriod: undefined,
					items: expectedItems,
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

	it('groups repeated products by delivery location', () => {
		const payload = toQuoteSubmissionPayload({
			...state,
			items: [
				{ ...state.items[0], locationClientId: 'loc-a' },
				{
					...state.items[0],
					id: 'line-3',
					quantity: 7,
					locationClientId: 'loc-b',
				},
			],
			locations: [
				{
					addressId: 'address-a',
					clientId: 'loc-a',
					deliveryDate: '2026-05-21',
					deliveryHour: 9,
					deliveryPeriod: 'AM' as const,
				},
				{
					addressId: 'address-b',
					clientId: 'loc-b',
					deliveryDate: '2026-05-22',
					deliveryHour: 3,
					deliveryPeriod: 'PM' as const,
				},
			],
		})

		expect(payload.locations).toHaveLength(2)
		expect(payload.locations[0]?.items).toHaveLength(1)
		expect(payload.locations[1]?.items).toHaveLength(1)
		expect(payload.locations[0]?.items[0]?.productId).toBe('product-1')
		expect(payload.locations[1]?.items[0]?.productId).toBe('product-1')
		expect(payload.locations[1]?.items[0]?.quantity).toBe(7)
	})
})
