import { describe, expect, it } from 'vitest'
import {
	compareSalesQueuePosition,
	isClaimableSalesRfq,
	isSalesPipelineRfq,
} from '../lib/sales-active-queue'
import type { RFQ } from '../types/sales'

function rfq(overrides: Partial<RFQ>): RFQ {
	return {
		assignedRep: null,
		createdAt: '2026-05-21T01:00:00.000Z',
		customerName: 'Customer',
		customerTier: 'new',
		deliveryUrgency: 14,
		estimatedValue: 100,
		id: overrides.id ?? 'rfq-1',
		lineItemCount: 1,
		priorityScore: 20,
		slaDeadline: '2026-05-22T01:00:00.000Z',
		status: 'submitted',
		...overrides,
	}
}

describe('sales active queue', () => {
	it('keeps unassigned submitted orders in the visible active queue', () => {
		expect(isSalesPipelineRfq(rfq({ status: 'submitted' }))).toBe(true)
		expect(isSalesPipelineRfq(rfq({ status: 'assigned' }))).toBe(true)
		expect(isSalesPipelineRfq(rfq({ status: 'saved' }))).toBe(false)
		expect(isSalesPipelineRfq(rfq({ status: 'quoted' }))).toBe(false)
	})

	it('only treats Supabase submitted orders as claimable', () => {
		expect(
			isClaimableSalesRfq(rfq({ source: 'supabase', status: 'submitted' })),
		).toBe(true)
		expect(isClaimableSalesRfq(rfq({ status: 'submitted' }))).toBe(false)
		expect(
			isClaimableSalesRfq(rfq({ source: 'supabase', status: 'assigned' })),
		).toBe(false)
	})

	it('sorts active queue rows oldest to latest', () => {
		const rows = [
			rfq({ createdAt: '2026-05-21T01:02:00.000Z', id: 'newer' }),
			rfq({ createdAt: '2026-05-21T01:00:00.000Z', id: 'older' }),
		].sort(compareSalesQueuePosition)

		expect(rows.map((row) => row.id)).toEqual(['older', 'newer'])
	})
})
