import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	buildSearchDetailFields,
	buildSearchDisplayTitle,
	buildSearchMatchedFieldLabels,
	buildSearchPreviewFields,
	buildSearchSummaryBuckets,
	buildSearchSummarySections,
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

	it('projects submitted quote requests as current order pipeline records', () => {
		const row: SearchDisplayIndexRow = {
			entity_type: 'order',
			entity_id: 'quote-request-1',
			title: 'QR-2026-00123',
			subtitle: 'submitted',
			metadata: {
				approval_required: false,
				company_name: 'Local Cairo Contractors',
				created_at: '2026-05-21T10:15:00+00:00',
				delivery_date: '2026-05-25',
				item_count: 3,
				item_summary: '20 Wood ton, 20 Metal ton',
				notes: 'Needs cement before noon',
				source: 'quote_request',
				submitted_at: '2026-05-21T10:20:00+00:00',
				urgency: 'urgent',
			},
		}

		const preview = buildSearchPreviewFields(row)
		const details = buildSearchDetailFields(row)
		const labels = details.map((field) => field.label)
		const renderedDetails = details
			.map((field) => String(field.value))
			.join(' ')

		expect(preview).toEqual(
			expect.arrayContaining([
				{ label: 'Customer', value: 'Local Cairo Contractors' },
				{ label: 'Stage', value: 'Submitted' },
				{ label: 'Items', value: '20 Wood ton, 20 Metal ton' },
			]),
		)
		expect(labels).toContain('Quote request')
		expect(labels).toContain('Submitted')
		expect(labels).not.toContain('source')
		expect(renderedDetails).toContain('Urgent')
		expect(renderedDetails).toContain('20 Wood ton, 20 Metal ton')
		expect(renderedDetails).toContain('Needs cement before noon')
		expect(renderedDetails).not.toContain('2026-05-21T10:20:00')
	})

	it('matches multi-token business searches against readable fields', () => {
		const row: SearchDisplayIndexRow = {
			entity_type: 'order',
			entity_id: 'quote-request-2',
			title: 'ORD-2026-1111',
			subtitle: 'submitted',
			metadata: {
				company_name: 'Local Cairo Contractors',
				delivery_address: 'New Cairo, Cairo',
				item_summary: '20 Wood ton, 20 Metal ton',
				source: 'quote_request',
				submitted_by: 'Ahmed Hassan',
			},
		}

		const labels = buildSearchMatchedFieldLabels(row, '20 may wood ahmed')

		expect(labels).toContain('Items')
		expect(labels).toContain('Submitted by')
		expect(buildSearchMatchedFieldLabels(row, 'new cairo')).toContain(
			'Delivery address',
		)
	})

	it('shows restricted employee compensation as business fields', () => {
		const row: SearchDisplayIndexRow = {
			entity_type: 'employee',
			entity_id: 'employee-1',
			title: 'Ahmed Hassan',
			subtitle: 'active',
			metadata: {
				base_salary: 25000,
				department: 'Sales',
				hire_date: '2026-05-20',
				roles: 'sales, admin',
				salary_currency: 'EGP',
				social_insurance_salary: 12000,
				title: 'Senior sales advisor',
			},
		}

		expect(buildSearchPreviewFields(row)).toEqual(
			expect.arrayContaining([
				{ label: 'Title', value: 'Senior sales advisor' },
				{ label: 'Department', value: 'Sales' },
				{ label: 'Base salary', value: 'EGP 25,000' },
			]),
		)
		const details = buildSearchDetailFields(row)
		expect(details).toEqual(
			expect.arrayContaining([
				{ label: 'Insurance salary', value: 'EGP 12,000' },
			]),
		)
		expect(
			String(details.find((field) => field.label === 'Hire date')?.value),
		).toContain('2026')
	})

	it('shows inventory stock counts and units in the clicked summary preview', () => {
		const row: SearchDisplayIndexRow = {
			entity_type: 'inventory',
			entity_id: 'inventory-wood',
			title: 'Wood',
			subtitle: 'building_materials',
			metadata: {
				sku: 'WOOD-001',
				unit_of_measure: 'piece',
				on_hand_quantity: 120,
				available_quantity: 80,
				reserved_quantity: 40,
				minimum_quantity: 25,
				good_quantity: 100,
				preferred_suppliers: 'Delta Supplies',
			},
		}

		const preview = buildSearchPreviewFields(row)
		const details = buildSearchDetailFields(row)

		expect(preview).toEqual(
			expect.arrayContaining([
				{ label: 'Unit', value: 'piece' },
				{ label: 'On hand', value: '120 piece' },
				{ label: 'Available', value: '80 piece' },
				{ label: 'Reserved', value: '40 piece' },
			]),
		)
		expect(details).toEqual(
			expect.arrayContaining([
				{ label: 'Minimum required', value: '25 piece' },
				{ label: 'Good from', value: '100 piece' },
			]),
		)
		expect(preview.map((field) => field.label)).not.toContain('entity_id')
	})

	it('projects finance rows as receivables and payables with balances', () => {
		const row: SearchDisplayIndexRow = {
			entity_type: 'payment',
			entity_id: 'customer_order:order-1',
			title: 'Customer payment - ORD-2026-00067',
			subtitle: 'partial',
			metadata: {
				source: 'customer_payment',
				payment_status: 'partial',
				total_due: 100,
				amount_paid: 50,
				remaining_due: 50,
				company_name: 'Local Cairo Contractors',
				order_number: 'ORD-2026-00067',
				item_summary: '20 Wood piece',
			},
		}

		expect(buildSearchDisplayTitle(row)).toBe(
			'Customer payment - ORD-2026-00067',
		)
		expect(buildSearchPreviewFields(row)).toEqual(
			expect.arrayContaining([
				{ label: 'Side', value: 'Customer' },
				{ label: 'Payment status', value: 'Partially paid' },
				{ label: 'Remaining', value: 'EGP 50' },
				{ label: 'Total due', value: 'EGP 100' },
			]),
		)
		expect(buildSearchDetailFields(row)).toEqual(
			expect.arrayContaining([
				{ label: 'Paid', value: 'EGP 50' },
				{ label: 'Items', value: '20 Wood piece' },
			]),
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

	it('keeps enriched activity headlines and shows business context', () => {
		const row: SearchDisplayIndexRow = {
			entity_type: 'activity',
			entity_id: 'activity-1',
			title: 'Local Cairo Contractors submitted QR-2026-00221 via Portal',
			subtitle: 'Sales',
			metadata: {
				action: 'order_submitted',
				action_label: 'Order submitted',
				actor: 'Local Cairo Contractors',
				actor_type: 'Customer',
				area: 'Sales',
				customer: 'Local Cairo Contractors',
				delivery_address: 'New Cairo, Cairo',
				headline: 'Local Cairo Contractors submitted QR-2026-00221 via Portal',
				items: '20 Wood ton, 20 Metal ton',
				request_number: 'QR-2026-00221',
				source: 'Portal',
				to_status: 'submitted',
				created_at: '2026-05-20T19:04:15.148802+00:00',
			},
		}

		const preview = buildSearchPreviewFields(row)
		const details = buildSearchDetailFields(row)

		expect(buildSearchDisplayTitle(row)).toBe(
			'Local Cairo Contractors submitted QR-2026-00221 via Portal',
		)
		expect(preview).toEqual(
			expect.arrayContaining([
				{ label: 'Who', value: 'Local Cairo Contractors' },
				{ label: 'Source', value: 'Portal' },
				{ label: 'Items', value: '20 Wood ton, 20 Metal ton' },
				{ label: 'Where', value: 'New Cairo, Cairo' },
			]),
		)
		expect(details).toEqual(
			expect.arrayContaining([
				{ label: 'Activity', value: row.title },
				{ label: 'Quote request', value: 'QR-2026-00221' },
				{ label: 'Status change', value: 'Now Submitted' },
			]),
		)
		expect(details.map((field) => field.label)).not.toContain('Context')
	})

	it('builds business summary buckets for the Search dashboard', () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-05-21T12:00:00Z'))

		const rows: SearchDisplayIndexRow[] = [
			row('order', 'ORD-SUB', 'submitted'),
			row('order', 'ORD-ACC', 'out_for_delivery'),
			row('order', 'ORD-REJ', 'rejected'),
			row('order', 'QR-DRAFT', 'draft'),
			row('inventory', 'Cement', 'bulk', {
				available_quantity: 4,
				minimum_quantity: 10,
				updated_at: '2026-05-01T08:00:00Z',
			}),
			row('warehouse', 'ORD-LOADING', 'loading'),
			row('warehouse', 'ORD-APPROVED', 'approved', {
				source: 'loading_task',
			}),
			row('warehouse', 'Receiving - Wood', 'receiving', {
				product_name: 'Wood',
				quantity: 8,
				source: 'receiving_task',
				supplier_name: 'Delta Supplies',
			}),
			row('warehouse', 'ORD-REJECTED', 'rejected', {
				rejection_reason: 'Truck missing documents',
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
		expect(counts('warehouse', rows)).toEqual([
			['Loading', 2],
			['Receiving', 1],
			['Rejected', 1],
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

	it('builds complete clicked-summary sections from the real domain rows', () => {
		const rows: SearchDisplayIndexRow[] = [
			row('order', 'ORD-1', 'out_for_delivery', { source: 'customer_order' }),
			row('order', 'QR-1', 'submitted', { source: 'quote_request' }),
			row('customer', 'Local Cairo Contractors', 'Ahmed'),
			row('inventory', 'Wood', 'material', {
				available_quantity: 12,
				minimum_quantity: 3,
			}),
			row('supplier', 'Delta Supplies', 'active'),
			row('warehouse', 'ORD-1', 'approved', { source: 'loading_task' }),
			row('payment', 'Customer payment - ORD-1', 'unpaid', {
				source: 'customer_payment',
				payment_status: 'unpaid',
			}),
			row('dispatch', 'DEL-1', 'assigned'),
			row('driver', 'Mina Farid', 'available'),
			row('support', 'Ticket 1', 'open', { source: 'ticket' }),
		]

		expect(sectionCounts('sales', rows)).toEqual([
			['Orders', 2],
			['Customers', 1],
		])
		expect(sectionCounts('inventory', rows)).toEqual([
			['Inventory items', 1],
			['Inventory orders', 0],
			['Suppliers', 1],
		])
		expect(sectionCounts('warehouse', rows)).toEqual([
			['Warehouse tasks', 1],
			['Stock levels', 1],
		])
		expect(sectionCounts('finance', rows)).toEqual([
			['Finance inbox', 1],
			['Customer orders', 1],
		])
		expect(sectionCounts('dispatch', rows)).toEqual([
			['Deliveries', 1],
			['Fleet', 1],
		])
		expect(sectionCounts('customer-service', rows)).toEqual([
			['Support cases', 1],
			['Customers', 1],
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

function sectionCounts(
	moduleId: Parameters<typeof buildSearchSummarySections>[0],
	rows: SearchDisplayIndexRow[],
): Array<[string, number]> {
	return buildSearchSummarySections(moduleId, rows).map((section) => [
		section.label,
		section.rows.length,
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
