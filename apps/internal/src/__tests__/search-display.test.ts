import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	buildSearchDetailFields,
	buildSearchDisplayTitle,
	buildSearchMatchedFieldLabels,
	buildSearchPreviewFields,
	buildSearchSummaryBuckets,
	type SearchDisplayIndexRow,
} from '../lib/search-display'

describe('Search display formatting', () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	it('projects order rows into executive-facing fields instead of raw index fields', () => {
		const row: SearchDisplayIndexRow = {
			entity_type: 'order',
			entity_id: '2242cd60-92c8-4d97-adf4-5425d0ab4815',
			title: 'ORD-2026-00067',
			subtitle: 'out_for_delivery',
			metadata: {
				company_name: 'Local Cairo Contractors',
				created_at: '2026-05-20T19:04:15.148802+00:00',
				delivered_at: null,
				total_amount: 100,
			},
		}

		const preview = buildSearchPreviewFields(row)
		const details = buildSearchDetailFields(row)
		const detailLabels = details.map((field) => field.label)
		const renderedDetails = details
			.map((field) => String(field.value))
			.join(' ')

		expect(preview).toEqual(
			expect.arrayContaining([
				{ label: 'Customer', value: 'Local Cairo Contractors' },
				{ label: 'Stage', value: 'Out for delivery' },
				{ label: 'Value', value: 'EGP 100' },
			]),
		)
		expect(preview.map((field) => field.label)).not.toContain('Type')
		expect(detailLabels).not.toContain('entity_id')
		expect(detailLabels).not.toContain('created_at')
		expect(detailLabels).not.toContain('delivered_at')
		expect(renderedDetails).toContain('Not delivered yet')
		expect(renderedDetails).not.toContain('2026-05-20T19:04:15')
	})

	it('uses readable match labels for raw status and metadata matches', () => {
		const row: SearchDisplayIndexRow = {
			entity_type: 'order',
			entity_id: '2242cd60-92c8-4d97-adf4-5425d0ab4815',
			title: 'ORD-2026-00067',
			subtitle: 'out_for_delivery',
			metadata: {
				company_name: 'Local Cairo Contractors',
				created_at: '2026-05-20T19:04:15.148802+00:00',
				delivered_at: null,
				total_amount: 100,
			},
		}

		expect(buildSearchMatchedFieldLabels(row, 'Local Cairo')).toContain(
			'Customer',
		)
		expect(buildSearchMatchedFieldLabels(row, 'out_for_delivery')).toContain(
			'Stage',
		)
	})

	it('replaces raw source and action titles where the index title is technical', () => {
		expect(
			buildSearchDisplayTitle(row('payment', 'customer_payment', 'paid')),
		).toBe('Customer receipt')
		expect(
			buildSearchDisplayTitle(
				row('activity', 'customer_order_submitted', 'order'),
			),
		).toBe('Customer order submitted')
	})

	it('builds business summary buckets for the Search dashboard', () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-05-21T12:00:00Z'))

		const rows: SearchDisplayIndexRow[] = [
			row('order', 'ORD-SUB', 'submitted'),
			row('order', 'ORD-ACC', 'out_for_delivery'),
			row('order', 'ORD-REJ', 'rejected'),
			row('inventory', 'Cement', 'bulk', {
				available_quantity: 4,
				minimum_quantity: 10,
				updated_at: '2026-05-01T08:00:00Z',
			}),
			row('payment', 'customer_payment', 'unpaid'),
			row('payment', 'supplier_payment', 'partial'),
			row('payment', 'customer_payment', 'paid'),
			row('dispatch', 'DEL-1', 'out_for_delivery'),
			row('driver', 'Mina Farid', 'available', { driver_status: 'available' }),
			row('driver', 'Omar Adel', 'offline', { driver_status: 'offline' }),
			row('support', 'Ticket 1', 'open', {
				source: 'ticket',
				subject: 'Need a copy invoice',
			}),
			row('support', 'Thread 1', 'open', {
				source: 'conversation',
				subject: 'whatsapp',
			}),
			row('support', 'Ticket 2', 'resolved', {
				source: 'ticket',
				subject: 'Delivery ETA',
			}),
		]

		expect(counts('sales', rows)).toEqual([
			['Submitted orders', 1],
			['Rejected orders', 1],
			['Accepted orders', 1],
		])
		expect(counts('inventory', rows)).toEqual([
			['Inventory orders', 0],
			['Needs update', 1],
			['Low stock', 1],
		])
		expect(counts('finance', rows)).toEqual([
			['Customer receivables', 1],
			['Supplier payables', 1],
			['Paid', 1],
		])
		expect(counts('dispatch', rows)).toEqual([
			['Deliveries', 1],
			['Fleet available', 1],
			['Fleet unavailable', 1],
		])
		expect(counts('customer-service', rows)).toEqual([
			['Messages', 1],
			['Email', 1],
			['Resolved', 1],
		])
	})
})

function counts(
	moduleId: Parameters<typeof buildSearchSummaryBuckets>[0],
	rows: SearchDisplayIndexRow[],
): Array<[string, number]> {
	return buildSearchSummaryBuckets(moduleId, rows).map((bucket) => [
		bucket.label,
		bucket.rows.length,
	])
}

function row(
	entityType: string,
	title: string,
	subtitle: string,
	metadata: SearchDisplayIndexRow['metadata'] = {},
): SearchDisplayIndexRow {
	return {
		entity_type: entityType,
		entity_id: `${entityType}-${title}`,
		title,
		subtitle,
		metadata,
	}
}
