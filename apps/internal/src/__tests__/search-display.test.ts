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

	it('projects finance accounting and payroll rows', () => {
		const accountingRow: SearchDisplayIndexRow = {
			entity_type: 'finance',
			entity_id: 'journal_entry:entry-1',
			title: 'Journal entry JE-2026-000001',
			subtitle: 'draft',
			metadata: {
				accounting_period: '2026-05',
				amount: 2500,
				entry_number: 'JE-2026-000001',
				requires_accountant_signoff: true,
				source: 'finance_journal_entry',
				status: 'draft',
			},
		}
		const payrollRow: SearchDisplayIndexRow = {
			entity_type: 'finance_payroll',
			entity_id: 'finance_payroll:employee-1',
			title: 'Payroll - Mona Finance',
			subtitle: 'Finance',
			metadata: {
				base_salary: 12000,
				department: 'Finance',
				employee_name: 'Mona Finance',
				social_insurance_salary: 8000,
				source: 'finance_payroll',
				title: 'Accountant',
			},
		}

		expect(buildSearchPreviewFields(accountingRow)).toEqual(
			expect.arrayContaining([
				{ label: 'Record', value: 'Journal entry' },
				{ label: 'Status', value: 'Draft' },
				{ label: 'Amount', value: 'EGP 2,500' },
				{ label: 'Review', value: 'Accountant sign-off' },
			]),
		)
		expect(buildSearchDetailFields(accountingRow)).toEqual(
			expect.arrayContaining([
				{ label: 'Entry', value: 'JE-2026-000001' },
				{ label: 'Accounting period', value: '2026-05' },
			]),
		)
		expect(buildSearchPreviewFields(payrollRow)).toEqual(
			expect.arrayContaining([
				{ label: 'Employee', value: 'Mona Finance' },
				{ label: 'Base salary', value: 'EGP 12,000' },
				{ label: 'Social insurance', value: 'EGP 8,000' },
			]),
		)
	})

	it('projects damaged inventory finance rows with write-down context', () => {
		const row: SearchDisplayIndexRow = {
			entity_type: 'finance',
			entity_id: 'inventory_damage_lot:lot-1',
			title: 'Damaged inventory - Wood',
			subtitle: 'open',
			metadata: {
				carrying_unit_value: 50,
				carrying_value_remaining: 100000,
				damage_number: 'DMG-2026-ABC123',
				original_unit_cost: 100,
				product: 'Wood',
				quantity: 2000,
				reason: 'Water leak in bay A',
				remaining_quantity: 2000,
				source: 'finance_inventory_damage_lot',
				unit: 'piece',
				write_down_amount: 100000,
			},
		}

		expect(buildSearchPreviewFields(row)).toEqual(
			expect.arrayContaining([
				{ label: 'Record', value: 'Damaged inventory lot' },
				{ label: 'Status', value: 'Open' },
				{ label: 'Amount', value: 'EGP 100,000' },
				{ label: 'Product', value: 'Wood' },
				{ label: 'Record no.', value: 'DMG-2026-ABC123' },
			]),
		)
		expect(buildSearchDetailFields(row)).toEqual(
			expect.arrayContaining([
				{ label: 'Damage no.', value: 'DMG-2026-ABC123' },
				{ label: 'Remaining NRV', value: 'EGP 100,000' },
				{ label: 'Write-down', value: 'EGP 100,000' },
				{ label: 'Original unit cost', value: 'EGP 100' },
				{ label: 'NRV unit value', value: 'EGP 50' },
				{ label: 'Reason', value: 'Water leak in bay A' },
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
				{ label: 'Panel', value: 'Sales' },
				{ label: 'What', value: 'Order submitted' },
				{ label: 'Changed', value: 'Now Submitted' },
			]),
		)
		expect(details).toEqual(
			expect.arrayContaining([
				{ label: 'Story', value: row.title },
				{ label: 'Panel', value: 'Sales' },
				{ label: 'What happened', value: 'Order submitted' },
				{ label: 'Quote request', value: 'QR-2026-00221' },
				{ label: 'Status change', value: 'Now Submitted' },
			]),
		)
		expect(details.map((field) => field.label)).not.toContain('Context')
		expect(details.map((field) => field.label)).not.toContain('Actor type')
	})

	it('projects activity price changes as detailed human business stories', () => {
		const row: SearchDisplayIndexRow = {
			entity_type: 'activity',
			entity_id: 'activity-price-1',
			title: 'Inventory price updated',
			subtitle: 'Inventory',
			metadata: {
				activity_sentence:
					'Ahmed Hassan from Inventory changed price of Portland Cement from 1,200.00 LE to 1,350.00 LE on May 21, 2026, 12:20 PM',
				actor: 'Ahmed Hassan',
				area: 'Inventory',
				changed_field: 'Price',
				from_value: '1,200.00 LE',
				target: 'Portland Cement',
				to_value: '1,350.00 LE',
				what: 'Changed price of Portland Cement from 1,200.00 LE to 1,350.00 LE',
				when: 'May 21, 2026, 12:20 PM',
			},
		}

		const preview = buildSearchPreviewFields(row)
		const details = buildSearchDetailFields(row)
		const labels = details.map((field) => field.label)

		expect(buildSearchDisplayTitle(row)).toBe(
			'Ahmed Hassan from Inventory changed price of Portland Cement from 1,200.00 LE to 1,350.00 LE on May 21, 2026, 12:20 PM',
		)
		expect(preview).toEqual(
			expect.arrayContaining([
				{ label: 'Who', value: 'Ahmed Hassan' },
				{ label: 'Panel', value: 'Inventory' },
				{
					label: 'Changed',
					value: 'Price: 1,200.00 LE to 1,350.00 LE',
				},
				{ label: 'When', value: 'May 21, 2026, 12:20 PM' },
			]),
		)
		expect(details).toEqual(
			expect.arrayContaining([
				{ label: 'Story', value: row.metadata?.activity_sentence },
				{ label: 'Who', value: 'Ahmed Hassan' },
				{ label: 'Panel', value: 'Inventory' },
				{ label: 'Changed', value: 'Price' },
				{ label: 'From', value: '1,200.00 LE' },
				{ label: 'To', value: '1,350.00 LE' },
				{ label: 'When', value: 'May 21, 2026, 12:20 PM' },
			]),
		)
		expect(labels).not.toContain('Actor type')
		expect(labels).not.toContain('Source')
		expect(labels).not.toContain('Context')
	})

	it('projects refill-sourced pricing as refill activity instead of a price change', () => {
		const row: SearchDisplayIndexRow = {
			entity_type: 'activity',
			entity_id: 'activity-refill-price-1',
			title:
				'Ahmed Hassan from Inventory recorded refill pricing for Wood for 10 units at 12.00 LE before Finance review on May 24, 2026, 11:59 AM',
			subtitle: 'Inventory',
			metadata: {
				activity_sentence:
					'Ahmed Hassan from Inventory recorded refill pricing for Wood for 10 units at 12.00 LE before Finance review on May 24, 2026, 11:59 AM',
				actor: 'Ahmed Hassan',
				area: 'Inventory',
				quantity: '10',
				target: 'Wood',
				to_status: 'finance_pending',
				unit_cost: '12',
				unit_cost_label: '12.00 LE',
				what: 'Recorded refill pricing for Wood for 10 units at 12.00 LE before Finance review',
				when: 'May 24, 2026, 11:59 AM',
			},
		}

		const preview = buildSearchPreviewFields(row)
		const details = buildSearchDetailFields(row)
		const labels = details.map((field) => field.label)

		expect(buildSearchDisplayTitle(row)).toBe(row.title)
		expect(preview).toEqual(
			expect.arrayContaining([
				{ label: 'What', value: row.metadata?.what },
				{ label: 'Target', value: 'Wood' },
				{ label: 'Quantity', value: '10' },
				{ label: 'Unit cost', value: '12.00 LE' },
			]),
		)
		expect(details).toEqual(
			expect.arrayContaining([
				{ label: 'What happened', value: row.metadata?.what },
				{ label: 'Target', value: 'Wood' },
				{ label: 'Quantity', value: '10' },
				{ label: 'Unit cost', value: '12.00 LE' },
				{ label: 'Status change', value: 'Now Finance pending' },
			]),
		)
		expect(labels).not.toContain('Changed')
		expect(labels).not.toContain('From')
		expect(labels).not.toContain('To')
	})

	it('projects activity manager approval as a business-facing person field', () => {
		const row: SearchDisplayIndexRow = {
			entity_type: 'activity',
			entity_id: 'activity-manager-1',
			title:
				'Ahmed Hassan from Sales confirmed QR-2026-00221 with Mona Saleh as manager on May 24, 2026, 01:15 PM',
			subtitle: 'Sales',
			metadata: {
				activity_sentence:
					'Ahmed Hassan from Sales confirmed QR-2026-00221 with Mona Saleh as manager on May 24, 2026, 01:15 PM',
				actor: 'Ahmed Hassan',
				area: 'Sales',
				manager: 'Mona Saleh',
				request_number: 'QR-2026-00221',
				target: 'QR-2026-00221',
				what: 'Confirmed QR-2026-00221',
				when: 'May 24, 2026, 01:15 PM',
			},
		}

		expect(buildSearchPreviewFields(row)).toEqual(
			expect.arrayContaining([
				{ label: 'Who', value: 'Ahmed Hassan' },
				{ label: 'Panel', value: 'Sales' },
				{ label: 'Manager', value: 'Mona Saleh' },
			]),
		)
		expect(buildSearchDetailFields(row)).toEqual(
			expect.arrayContaining([
				{ label: 'Story', value: row.title },
				{ label: 'Manager', value: 'Mona Saleh' },
				{ label: 'Quote request', value: 'QR-2026-00221' },
			]),
		)
	})

	it('projects damaged inventory activity with accounting and proof context', () => {
		const row: SearchDisplayIndexRow = {
			entity_type: 'activity',
			entity_id: 'activity-damage-1',
			title:
				'Ahmed Hassan from Inventory marked 2,000 piece of Wood as damaged under DMG-2026-ABC123 with 100,000.00 EGP write-down with proof on May 26, 2026, 05:52 AM',
			subtitle: 'Inventory',
			metadata: {
				activity_sentence:
					'Ahmed Hassan from Inventory marked 2,000 piece of Wood as damaged under DMG-2026-ABC123 with 100,000.00 EGP write-down with proof on May 26, 2026, 05:52 AM',
				actor: 'Ahmed Hassan',
				area: 'Inventory',
				carrying_value: '100,000.00 EGP',
				damage_number: 'DMG-2026-ABC123',
				original_unit_cost: '100.00 EGP',
				original_value: '200,000.00 EGP',
				product: 'Wood',
				product_sku: 'WOOD-001',
				proofs: '/proofs/damage.jpg',
				quantity: '2,000 piece',
				reason: 'Water leak in bay A',
				recovery_unit_value: '50.00 EGP',
				target: 'Wood',
				unit: 'piece',
				what: 'Marked 2,000 piece of Wood as damaged under DMG-2026-ABC123 with 100,000.00 EGP write-down',
				when: 'May 26, 2026, 05:52 AM',
				write_down_amount: '100,000.00 EGP',
			},
		}

		expect(buildSearchDisplayTitle(row)).toBe(row.title)
		expect(buildSearchPreviewFields(row)).toEqual(
			expect.arrayContaining([
				{ label: 'Panel', value: 'Inventory' },
				{ label: 'Damage no.', value: 'DMG-2026-ABC123' },
				{ label: 'Quantity', value: '2,000 piece' },
				{ label: 'Write-down', value: '100,000.00 EGP' },
			]),
		)
		expect(buildSearchDetailFields(row)).toEqual(
			expect.arrayContaining([
				{ label: 'Story', value: row.title },
				{ label: 'Product', value: 'Wood' },
				{ label: 'Product SKU', value: 'WOOD-001' },
				{ label: 'Damage no.', value: 'DMG-2026-ABC123' },
				{ label: 'Original unit cost', value: '100.00 EGP' },
				{ label: 'Recovery unit value', value: '50.00 EGP' },
				{ label: 'Original value', value: '200,000.00 EGP' },
				{ label: 'Carrying value', value: '100,000.00 EGP' },
				{ label: 'Write-down', value: '100,000.00 EGP' },
				{ label: 'Reason', value: 'Water leak in bay A' },
			]),
		)
	})

	it('projects damaged inventory disposal NRV in the same phrase used by the activity story', () => {
		const row: SearchDisplayIndexRow = {
			entity_type: 'activity',
			entity_id: 'activity-disposed-damage-1',
			title:
				'Admin from Inventory disposed 100 bag of damaged Portland Cement from DMG-2026-645F5C removing 7,100.00 EGP NRV with proof on May 26, 2026, 10:28 AM',
			subtitle: 'Inventory',
			metadata: {
				activity_sentence:
					'Admin from Inventory disposed 100 bag of damaged Portland Cement from DMG-2026-645F5C removing 7,100.00 EGP NRV with proof on May 26, 2026, 10:28 AM',
				actor: 'Admin',
				area: 'Inventory',
				carrying_amount: 7100,
				damage_number: 'DMG-2026-645F5C',
				product: 'Portland Cement',
				proofs: '/proofs/disposal.jpg',
				quantity: '100 bag',
				target: 'Portland Cement',
				unit: 'bag',
				what: 'Disposed 100 bag of damaged Portland Cement from DMG-2026-645F5C removing 7,100.00 EGP NRV',
				when: 'May 26, 2026, 10:28 AM',
			},
		}

		expect(buildSearchPreviewFields(row)).toEqual(
			expect.arrayContaining([
				{ label: 'Damage no.', value: 'DMG-2026-645F5C' },
				{ label: 'Quantity', value: '100 bag' },
				{ label: 'NRV removed', value: '7,100.00 EGP NRV' },
			]),
		)
		expect(buildSearchDetailFields(row)).toEqual(
			expect.arrayContaining([
				{ label: 'Story', value: row.title },
				{ label: 'Product', value: 'Portland Cement' },
				{ label: 'Damage no.', value: 'DMG-2026-645F5C' },
				{ label: 'NRV removed', value: '7,100.00 EGP NRV' },
			]),
		)
	})

	it('projects finance operating activity as human searchable facts', () => {
		const row: SearchDisplayIndexRow = {
			entity_type: 'activity',
			entity_id: 'activity-finance-1',
			title:
				'Local Finance from Finance paid salary for Local Sales for 2026-04 amount EGP 12,345.00 with proof on May 26, 2026, 07:36 AM',
			subtitle: 'Finance',
			metadata: {
				activity_sentence:
					'Local Finance from Finance paid salary for Local Sales for 2026-04 amount EGP 12,345.00 with proof on May 26, 2026, 07:36 AM',
				action: 'finance_payroll_paid',
				actor: 'Local Finance',
				amount: '12345',
				amount_label: 'EGP 12,345.00',
				area: 'Finance',
				department: 'Finance',
				employee: 'Local Sales',
				entry_number: 'JE-2026-0001',
				proofs: 'stress-salary-paid.pdf',
				source: 'activity_finance_operating',
				target: 'Local Sales',
				what: 'Paid salary for Local Sales for 2026-04 amount EGP 12,345.00',
				when: 'May 26, 2026, 07:36 AM',
			},
		}

		expect(buildSearchDisplayTitle(row)).toBe(row.title)
		expect(buildSearchPreviewFields(row)).toEqual(
			expect.arrayContaining([
				{ label: 'Who', value: 'Local Finance' },
				{ label: 'Panel', value: 'Finance' },
				{
					label: 'What',
					value: 'Paid salary for Local Sales for 2026-04 amount EGP 12,345.00',
				},
				{ label: 'Proofs', value: 'stress-salary-paid.pdf' },
				{ label: 'Target', value: 'Local Sales' },
				{ label: 'Amount', value: 'EGP 12,345' },
			]),
		)
		expect(buildSearchDetailFields(row)).toEqual(
			expect.arrayContaining([
				{ label: 'Story', value: row.title },
				{ label: 'Panel', value: 'Finance' },
				{ label: 'Entry no.', value: 'JE-2026-0001' },
				{ label: 'Amount', value: 'EGP 12,345' },
			]),
		)
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
			row('pricing', 'Price request - Cement', 'pending', {
				product_name: 'Cement',
				source: 'price_update_request',
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
			row('finance', 'Finance accounting overview', 'overview', {
				source: 'finance_accounting_overview',
				total_assets: 1000,
			}),
			row('finance', 'Damaged inventory - Wood', 'open', {
				damage_number: 'DMG-2026-0001',
				product: 'Wood',
				source: 'finance_inventory_damage_lot',
			}),
			row('finance_payroll', 'Payroll - Mona Finance', 'Finance', {
				base_salary: 12000,
				employee_name: 'Mona Finance',
				source: 'finance_payroll',
			}),
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
			row('support_message', 'Support message - Thread 1', 'whatsapp', {
				channel: 'whatsapp',
				message_body: 'Customer asked for delivery ETA',
				source: 'support_message',
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
			['Damaged stock', 1],
			['Needs update', 2],
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
			['Payroll', 1],
		])
		expect(counts('dispatch', rows)).toEqual([
			['Deliveries', 1],
			['Fleet available', 1],
			['Fleet unavailable', 1],
		])
		expect(counts('customer-service', rows)).toEqual([
			['Messages', 2],
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
			row('finance', 'Journal entry JE-1', 'draft', {
				source: 'finance_journal_entry',
			}),
			row('finance', 'Damaged inventory - Wood', 'open', {
				damage_number: 'DMG-2026-0001',
				product: 'Wood',
				source: 'finance_inventory_damage_lot',
			}),
			row('finance', 'Damaged inventory sold - Wood', 'posted', {
				damage_number: 'DMG-2026-0001',
				product: 'Wood',
				source: 'finance_inventory_damage_transaction',
			}),
			row('finance_payroll', 'Payroll - Mona Finance', 'Finance', {
				employee_name: 'Mona Finance',
				source: 'finance_payroll',
			}),
			row(
				'activity',
				'Local Finance from Finance paid salary for Mona Finance',
				'Finance',
				{
					area: 'Finance',
					source: 'activity_finance_operating',
				},
			),
			row('activity', 'Ahmed Inventory marked Wood damaged', 'Inventory', {
				area: 'Inventory',
				source: 'activity_inventory_damage',
			}),
			row('activity', 'Sales moved ORD-1 to confirmed', 'Sales', {
				area: 'Sales',
				source: 'activity',
			}),
			row('dispatch', 'DEL-1', 'assigned'),
			row('driver', 'Mina Farid', 'available'),
			row('support', 'Ticket 1', 'open', { source: 'ticket' }),
			row('support_message', 'Support message - Ticket 1', 'email', {
				channel: 'email',
				message_body: 'Invoice copy requested',
				source: 'support_message',
			}),
			row('pricing', 'Price request - Wood', 'pending', {
				product_name: 'Wood',
				source: 'price_update_request',
			}),
			row('category', 'Building materials', 'active', {
				product_count: 12,
				source: 'category',
			}),
			row('sales_history', 'Sales quote v1 - QR-1', 'draft', {
				company_name: 'Local Cairo Contractors',
				source: 'sales_quote_version',
				total: 1200,
			}),
			row('approval', 'Approval - ORD-1', 'pending', {
				source: 'approval',
				target: 'ORD-1',
			}),
			row('driver_location', 'Driver location - Mina Farid', 'online', {
				driver_name: 'Mina Farid',
				recorded_at: '2026-05-21T10:20:00+00:00',
				source: 'driver_location',
			}),
			row('document', 'Delivery proof - DEL-1', 'signature', {
				delivery_number: 'DEL-1',
				source: 'delivery_proof',
			}),
		]

		expect(sectionCounts('sales', rows)).toEqual([
			['Orders', 2],
			['Sales history', 1],
			['Approvals', 1],
			['Customers', 1],
		])
		expect(sectionCounts('inventory', rows)).toEqual([
			['Damaged stock', 2],
			['Inventory items', 1],
			['Price work', 1],
			['Categories', 1],
			['Inventory orders', 0],
			['Suppliers', 1],
		])
		expect(sectionCounts('warehouse', rows)).toEqual([
			['Warehouse tasks', 1],
			['Stock levels', 1],
			['Documents', 1],
		])
		expect(sectionCounts('finance', rows)).toEqual([
			['Accounting', 3],
			['Payroll', 1],
			['Payroll payments', 0],
			['Fuel expenses', 0],
			['Company assets', 0],
			['Finance activity', 2],
			['Finance inbox', 1],
			['Customer orders', 1],
			['Approvals', 1],
			['Documents', 1],
		])
		expect(sectionCounts('dispatch', rows)).toEqual([
			['Deliveries', 1],
			['Fleet', 1],
			['Driver locations', 1],
		])
		expect(sectionCounts('customer-service', rows)).toEqual([
			['Support cases', 1],
			['Support messages', 1],
			['Customers', 1],
			['Documents', 1],
		])
	})

	it('projects upgraded operational rows without raw vtable field leakage', () => {
		const pricing = row('pricing', 'Price request - Cement', 'pending', {
			assigned_to: 'Mona Inventory',
			product_name: 'Cement',
			reason: 'Live order needs fresh supplier price',
			source: 'price_update_request',
		})
		const supportMessage = row(
			'support_message',
			'Support message - SUP-1',
			'whatsapp',
			{
				channel: 'whatsapp',
				message_body: 'Please send the delivery ETA',
				sender: 'Local Cairo Contractors',
				source: 'support_message',
				ticket_reference: 'SUP-1',
			},
		)
		const location = row(
			'driver_location',
			'Driver location - Mina Farid',
			'online',
			{
				company_name: 'Local Cairo Contractors',
				delivery_number: 'DEL-1',
				driver_name: 'Mina Farid',
				recorded_at: '2026-05-21T10:20:00+00:00',
				speed_kmh: 42,
			},
		)

		expect(buildSearchPreviewFields(pricing)).toEqual(
			expect.arrayContaining([
				{ label: 'Type', value: 'Price request' },
				{ label: 'Product', value: 'Cement' },
				{ label: 'Assigned to', value: 'Mona Inventory' },
			]),
		)
		expect(buildSearchDetailFields(pricing)).toEqual(
			expect.arrayContaining([
				{ label: 'Reason', value: 'Live order needs fresh supplier price' },
			]),
		)
		expect(buildSearchPreviewFields(supportMessage)).toEqual(
			expect.arrayContaining([
				{ label: 'Channel', value: 'Whatsapp' },
				{ label: 'Sender', value: 'Local Cairo Contractors' },
				{ label: 'Message', value: 'Please send the delivery ETA' },
			]),
		)
		expect(buildSearchPreviewFields(location)).toEqual(
			expect.arrayContaining([
				{ label: 'Driver', value: 'Mina Farid' },
				{ label: 'Delivery', value: 'DEL-1' },
				{ label: 'Customer', value: 'Local Cairo Contractors' },
				{ label: 'Speed', value: '42 km/h' },
			]),
		)
		expect(
			buildSearchDetailFields(pricing).map((field) => field.label),
		).not.toContain('entity_id')
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
