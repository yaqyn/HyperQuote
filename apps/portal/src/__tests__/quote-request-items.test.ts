import { describe, expect, it } from 'vitest'
import { toQuoteRequestItemRows } from '../lib/server/quote-request-items'

const quoteRequestId = '11111111-1111-4111-8111-111111111111'
const orderableProductId = '22222222-2222-4222-8222-222222222222'
const staleProductId = '33333333-3333-4333-8333-333333333333'

describe('quote request item insert rows', () => {
	it('keeps orderable product links and converts stale product ids to customer-described lines', () => {
		expect(
			toQuoteRequestItemRows(
				quoteRequestId,
				[
					{
						customerDescription: 'Current wood',
						isUnmatched: false,
						matchConfidence: 1,
						productId: orderableProductId,
						quantity: 2,
						sortOrder: 0,
						unitOfMeasure: 'piece',
						unitOfMeasureAr: 'قطعة',
					},
					{
						customerDescription: 'Old catalog item',
						isUnmatched: false,
						matchConfidence: 1,
						productId: staleProductId,
						quantity: 1,
						sortOrder: 1,
						unitOfMeasure: 'bag',
					},
				],
				new Set([orderableProductId]),
			),
		).toEqual([
			{
				customer_description: 'Current wood',
				is_unmatched: false,
				match_confidence: 1,
				notes: null,
				product_id: orderableProductId,
				quantity: 2,
				quote_request_id: quoteRequestId,
				sort_order: 0,
				unit_of_measure: 'piece',
				unit_of_measure_ar: 'قطعة',
			},
			{
				customer_description: 'Old catalog item',
				is_unmatched: true,
				match_confidence: null,
				notes: null,
				product_id: null,
				quantity: 1,
				quote_request_id: quoteRequestId,
				sort_order: 1,
				unit_of_measure: 'bag',
				unit_of_measure_ar: 'bag',
			},
		])
	})
})
