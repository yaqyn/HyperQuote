import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	isSalesRfqStatusEvaluatable,
	mapSupabaseRfqStatusForSales,
} from '../lib/sales-rfq-status'

describe('mapSupabaseRfqStatusForSales', () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	it('does not expose customer saved drafts as sales saved work', () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-05-20T12:00:00.000Z'))

		expect(
			mapSupabaseRfqStatusForSales({
				eligible_at: '2026-05-21T12:00:00.000Z',
				status: 'draft',
			}),
		).toBeNull()
	})

	it('maps employee-held submitted orders to the sales saved bucket', () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-05-20T12:00:00.000Z'))

		expect(
			mapSupabaseRfqStatusForSales({
				eligible_at: '2026-05-20T12:30:00.000Z',
				status: 'submitted',
			}),
		).toBe('saved')
	})

	it('keeps ready submitted orders in the active sales queue', () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-05-20T12:00:00.000Z'))

		expect(
			mapSupabaseRfqStatusForSales({
				eligible_at: '2026-05-20T11:59:00.000Z',
				status: 'submitted',
			}),
		).toBe('submitted')
	})

	it('maps approved database RFQs to the evaluated bucket', () => {
		expect(
			mapSupabaseRfqStatusForSales({
				eligible_at: '2026-05-20T11:59:00.000Z',
				status: 'approved',
			}),
		).toBe('quoted')
	})

	it('only allows DB-confirmable RFQ statuses to be evaluated', () => {
		expect(isSalesRfqStatusEvaluatable('submitted')).toBe(true)
		expect(isSalesRfqStatusEvaluatable('assigned')).toBe(true)
		expect(isSalesRfqStatusEvaluatable('saved')).toBe(true)
		expect(isSalesRfqStatusEvaluatable('approved')).toBe(false)
		expect(isSalesRfqStatusEvaluatable('quoted')).toBe(false)
		expect(isSalesRfqStatusEvaluatable('declined')).toBe(false)
	})
})
