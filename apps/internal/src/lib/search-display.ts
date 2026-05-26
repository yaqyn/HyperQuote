import type { JsonObject, JsonValue } from './db/types'
import { searchTokens } from './search-query'
import type {
	SearchPreviewField,
	SearchSummaryModuleId,
} from './search-registry'

export interface SearchDisplayIndexRow {
	entity_type: string
	entity_id: string
	title: string
	subtitle: string | null
	metadata: JsonObject | null
	sort_at?: string | null
	search_text?: string | null
}

export interface SearchSummaryBucket {
	id: string
	label: string
	rows: SearchDisplayIndexRow[]
}

type SearchDetailField = {
	label: string
	value: JsonValue
}

const cairoDateTimeFormatter = new Intl.DateTimeFormat('en-EG', {
	dateStyle: 'medium',
	timeStyle: 'short',
	timeZone: 'Africa/Cairo',
})

const cairoDateFormatter = new Intl.DateTimeFormat('en-EG', {
	dateStyle: 'medium',
	timeZone: 'Africa/Cairo',
})

const statusLabels: Record<string, string> = {
	active: 'Active',
	approved: 'Approved',
	assigned: 'Assigned',
	available: 'Available',
	awaiting_clarification: 'Awaiting clarification',
	blocked: 'Blocked',
	canceled: 'Canceled',
	closed: 'Closed',
	completed: 'Completed',
	confirmed: 'Confirmed',
	confirmed_for_inventory: 'Accepted - inventory check',
	conversation: 'Conversation',
	declined: 'Declined',
	delivered: 'Delivered',
	disabled: 'Disabled',
	dispatch_assigned: 'Assigned for dispatch',
	dispatch_ready: 'Ready for dispatch',
	dispatched: 'Dispatched',
	draft: 'Draft',
	expired: 'Expired',
	inactive: 'Inactive',
	invited: 'Invited',
	loading: 'Loading',
	maintenance: 'Maintenance',
	new: 'New',
	offline: 'Offline',
	on_delivery: 'On delivery',
	online: 'Online',
	out_for_delivery: 'Out for delivery',
	paid: 'Paid',
	partial: 'Partially paid',
	pending: 'Pending',
	quoted: 'Quoted',
	quoting: 'Quoting',
	receiving: 'Receiving',
	recorded: 'Recorded',
	rejected: 'Rejected',
	reviewing: 'Reviewing',
	resolved: 'Resolved',
	saved: 'Saved',
	submitted: 'Submitted',
	ticket: 'Support ticket',
	under_review: 'Under review',
	unpaid: 'Unpaid',
	voided: 'Voided',
	warehouse_receiving: 'Warehouse receiving',
}

const sourceLabels: Record<string, string> = {
	approval: 'Approval',
	conversation: 'Conversation',
	customer_order: 'Customer order',
	customer_payment: 'Customer receipt',
	delivery_proof: 'Delivery proof',
	document: 'Document',
	finance_account: 'Finance account',
	finance_accounting_overview: 'Finance overview',
	finance_adjustment: 'Finance adjustment',
	finance_cash_flow: 'Cash flow',
	finance_income_statement: 'Income statement',
	finance_inventory_asset: 'Inventory asset',
	finance_inventory_damage_lot: 'Damaged inventory lot',
	finance_inventory_damage_transaction: 'Damaged inventory movement',
	finance_journal_entry: 'Journal entry',
	finance_payable: 'Supplier payable',
	finance_payment_followup: 'Finance follow-up',
	finance_payroll: 'Finance payroll',
	finance_payroll_payment: 'Payroll payment',
	finance_fuel_expense: 'Fuel expense',
	finance_company_asset: 'Company asset',
	finance_receivable: 'Customer receivable',
	price_update: 'Price update',
	price_update_request: 'Price request',
	pricing_rule: 'Pricing rule',
	quote_counter_offer: 'Counter offer',
	quote_request: 'Quote request',
	quote_version: 'Quote version',
	receiving_task: 'Warehouse receiving',
	sales_call_note: 'Sales call',
	sales_quote_version: 'Sales quote version',
	supplier_payment: 'Supplier payment',
	support_attachment: 'Support attachment',
	support_message: 'Support message',
	ticket: 'Support ticket',
}

function metadataObject(value: JsonObject | null): JsonObject {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
	return value
}

function normalizeToken(value: string | null | undefined): string {
	return (value ?? '')
		.trim()
		.toLowerCase()
		.replace(/[\s-]+/g, '_')
}

function humanizeIdentifier(value: string | null | undefined): string | null {
	const normalized = normalizeToken(value)
	if (!normalized) return null
	const label = statusLabels[normalized] ?? sourceLabels[normalized]
	if (label) return label
	return normalized
		.split('_')
		.filter(Boolean)
		.map((part, index) =>
			index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part,
		)
		.join(' ')
}

function stringValue(metadata: JsonObject, key: string): string | null {
	const value = metadata[key]
	if (typeof value !== 'string') return null
	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : null
}

function numberValue(metadata: JsonObject, key: string): number | null {
	const value = metadata[key]
	if (typeof value === 'number' && Number.isFinite(value)) return value
	if (typeof value !== 'string') return null
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : null
}

function booleanValue(metadata: JsonObject, key: string): boolean | null {
	const value = metadata[key]
	return typeof value === 'boolean' ? value : null
}

function jsonValue(metadata: JsonObject, key: string): JsonValue | null {
	const value = metadata[key]
	return value === undefined ? null : value
}

function formatStatus(value: string | null | undefined): string | null {
	return humanizeIdentifier(value)
}

function formatSource(value: string | null | undefined): string | null {
	const normalized = normalizeToken(value)
	return sourceLabels[normalized] ?? humanizeIdentifier(value)
}

function formatActivityTitle(row: SearchDisplayIndexRow): string {
	const metadata = metadataObject(row.metadata)
	const sentence = stringValue(metadata, 'activity_sentence')
	if (sentence) return sentence
	const headline = stringValue(metadata, 'headline')
	if (headline) return headline
	if (row.title.includes('_') && !row.title.includes(' ')) {
		return humanizeIdentifier(row.title) ?? row.title
	}
	return row.title
}

function activityLabel(
	metadata: JsonObject,
	row: SearchDisplayIndexRow,
): string | null {
	return (
		stringValue(metadata, 'action_label') ??
		humanizeIdentifier(stringValue(metadata, 'action')) ??
		humanizeIdentifier(row.title)
	)
}

function statusChange(metadata: JsonObject): string | null {
	const from = formatStatus(stringValue(metadata, 'from_status'))
	const to = formatStatus(stringValue(metadata, 'to_status'))
	if (from && to) return `${from} to ${to}`
	if (to) return `Now ${to}`
	if (from) return `From ${from}`
	return null
}

function activityAmount(metadata: JsonObject): string | null {
	return (
		formatMoney(numberValue(metadata, 'amount')) ??
		formatMoney(numberValue(metadata, 'total_amount'))
	)
}

function activityQuantity(metadata: JsonObject): string | null {
	return (
		formatNumber(numberValue(metadata, 'quantity')) ??
		stringValue(metadata, 'quantity')
	)
}

function activityUnitCost(metadata: JsonObject): string | null {
	return (
		stringValue(metadata, 'unit_cost_label') ??
		formatMoney(numberValue(metadata, 'unit_cost'))
	)
}

function activityMoneyValue(metadata: JsonObject, key: string): string | null {
	return (
		formatMoney(numberValue(metadata, key)) ??
		stringValue(metadata, `${key}_label`) ??
		stringValue(metadata, key)
	)
}

function activityNrvRemovedValue(metadata: JsonObject): string | null {
	const label =
		stringValue(metadata, 'carrying_amount_label') ??
		stringValue(metadata, 'nrv_removed_label')
	if (label) return withNrvSuffix(label)

	const amount = numberValue(metadata, 'carrying_amount')
	if (amount !== null) {
		return withNrvSuffix(
			`${amount.toLocaleString('en-EG', {
				maximumFractionDigits: 2,
				minimumFractionDigits: 2,
			})} ${stringValue(metadata, 'currency') ?? 'EGP'}`,
		)
	}

	const rawValue = stringValue(metadata, 'carrying_amount')
	return rawValue ? withNrvSuffix(rawValue) : null
}

function withNrvSuffix(value: string): string {
	return /\bnrv\b/i.test(value) ? value : `${value} NRV`
}

function activityWhen(metadata: JsonObject): string | null {
	return stringValue(metadata, 'when') ?? formatDateTime(metadata.created_at)
}

function activityChange(metadata: JsonObject): string | null {
	const field = stringValue(metadata, 'changed_field')
	const from = stringValue(metadata, 'from_value')
	const to = stringValue(metadata, 'to_value')
	if (field && from && to) return `${field}: ${from} to ${to}`
	if (from && to) return `${from} to ${to}`
	return statusChange(metadata)
}

function formatDateTime(value: JsonValue | undefined): string | null {
	if (typeof value !== 'string') return null
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return null
	return cairoDateTimeFormatter.format(date)
}

function formatDate(value: JsonValue | undefined): string | null {
	if (typeof value !== 'string') return null
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return null
	return cairoDateFormatter.format(date)
}

function formatMoney(value: number | null, currency = 'EGP'): string | null {
	if (value === null) return null
	return `${currency} ${value.toLocaleString('en-EG', {
		maximumFractionDigits: 2,
		minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
	})}`
}

function formatNumber(value: number | null): string | null {
	if (value === null) return null
	return value.toLocaleString('en-EG', {
		maximumFractionDigits: 2,
	})
}

function formatPercent(value: number | null): string | null {
	if (value === null) return null
	const percent = value > 0 && value <= 1 ? value * 100 : value
	return `${percent.toLocaleString('en-EG', {
		maximumFractionDigits: 1,
	})}%`
}

function formatRating(value: number | null): string | null {
	if (value === null) return null
	return `${value.toLocaleString('en-EG', {
		maximumFractionDigits: 1,
	})} / 5`
}

function previewField(
	label: string,
	value: SearchPreviewField['value'] | undefined,
): SearchPreviewField | null {
	if (value === undefined || value === null) return null
	if (typeof value === 'string' && value.trim().length === 0) return null
	return { label, value }
}

function detailField(
	label: string,
	value: JsonValue | undefined,
): SearchDetailField | null {
	if (value === undefined || value === null) return null
	if (typeof value === 'string' && value.trim().length === 0) return null
	return { label, value }
}

function fields(
	...items: Array<SearchPreviewField | null>
): SearchPreviewField[] {
	return items.filter((item): item is SearchPreviewField => item !== null)
}

function details(
	...items: Array<SearchDetailField | null>
): SearchDetailField[] {
	return items.filter((item): item is SearchDetailField => item !== null)
}

function stage(row: SearchDisplayIndexRow): string | null {
	return formatStatus(row.subtitle)
}

function metadataStatus(
	row: SearchDisplayIndexRow,
	key: string,
): string | null {
	return formatStatus(stringValue(metadataObject(row.metadata), key))
}

function contextSummary(value: JsonValue | null): string | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return typeof value === 'string' ? value : null
	}

	const parts = Object.entries(value)
		.filter(([key]) => !isTechnicalKey(key))
		.flatMap(([key, entry]) => {
			const rendered = renderGenericValue(key, entry)
			return rendered ? [`${humanLabel(key)}: ${rendered}`] : []
		})
		.slice(0, 4)

	return parts.length > 0 ? parts.join(', ') : null
}

function isTechnicalKey(key: string): boolean {
	const normalized = normalizeToken(key)
	return (
		normalized === 'id' ||
		normalized === 'entity_id' ||
		normalized === 'entity_type' ||
		normalized.endsWith('_id')
	)
}

function humanLabel(key: string): string {
	const labels: Record<string, string> = {
		amount: 'Amount',
		action_label: 'Action',
		active_panel: 'Active panel',
		actor: 'Who',
		area: 'Area',
		assigned_employee: 'Assigned to',
		assigned_sales_rep: 'Sales rep',
		assigned_to: 'Assigned to',
		attachment_count: 'Attachments',
		available_quantity: 'Available',
		absolute_min_margin: 'Absolute min margin',
		base_salary: 'Base salary',
		bonus_margin: 'Bonus margin',
		brand: 'Brand',
		category: 'Category',
		category_slug: 'Category slug',
		channel: 'Channel',
		company_name: 'Customer',
		contact: 'Contact',
		contact_channel: 'Channel',
		completed_at: 'Completed',
		current_exposure: 'Current exposure',
		customer: 'Customer',
		carrying_amount: 'Carrying value',
		carrying_unit_value: 'NRV unit value',
		carrying_value_remaining: 'Remaining NRV',
		created_at: 'Created',
		delivered_at: 'Delivered',
		delivery_address: 'Delivery address',
		delivery_date: 'Delivery date',
		department: 'Department',
		driver_name: 'Driver',
		driver_phone: 'Driver phone',
		driver_status: 'Driver status',
		draft_name: 'Draft name',
		email: 'Email',
		floor_margin: 'Floor margin',
		follow_up_notes: 'Follow-up notes',
		follow_up_outcome: 'Follow-up outcome',
		follow_up_due_at: 'Follow-up due',
		follow_up_state: 'Follow-up state',
		good_quantity: 'Good from',
		hire_date: 'Hire date',
		is_ceo: 'CEO access',
		is_active: 'Active',
		item_count: 'Items',
		item_summary: 'Items',
		items: 'Items',
		last_payment_at: 'Last payment',
		last_seen_at: 'Last seen',
		latitude: 'Latitude',
		lifetime_value: 'Lifetime value',
		location_source: 'Location source',
		longitude: 'Longitude',
		minimum_quantity: 'Minimum',
		message_body: 'Message',
		damage_number: 'Damage no.',
		on_hand_quantity: 'On hand',
		order_number: 'Order',
		order_status: 'Order status',
		amount_paid: 'Paid',
		old_price: 'Old price',
		new_price: 'New price',
		payment_fraction: 'Payment portion',
		payment_status: 'Payment status',
		payment_terms: 'Payment terms',
		panels: 'Panels',
		parent_category: 'Parent category',
		phone: 'Phone',
		plate_number: 'Truck',
		presence_status: 'Presence',
		preferred_suppliers: 'Suppliers',
		product_sku: 'SKU',
		product_name: 'Product',
		product_slug: 'Product slug',
		products: 'Products',
		proof_path: 'Proof',
		proof_type: 'Proof type',
		project_name: 'Project',
		quote_items: 'Quoted items',
		quote_number: 'Quote',
		quantity: 'Quantity',
		rating: 'Rating',
		receiving_status: 'Receiving status',
		recorded_at: 'Recorded',
		recovery_unit_value: 'Recovery unit value',
		request_items: 'Requested items',
		requested_by: 'Requested by',
		requested_item: 'Requested item',
		rejection_reason: 'Rejection reason',
		remaining_due: 'Remaining',
		remaining_quantity: 'Remaining qty',
		refill_status: 'Refill status',
		request_number: 'Request',
		requester: 'Requester',
		reserved_quantity: 'Reserved',
		role: 'Role',
		row_count: 'Rows',
		salary_currency: 'Salary currency',
		scope: 'Scope',
		sku: 'SKU',
		source: 'Source',
		speed_kmh: 'Speed',
		social_insurance_salary: 'Insurance salary',
		specialties: 'Specialties',
		status: 'Status',
		storage_path: 'File',
		subject: 'Subject',
		submitted_by: 'Submitted by',
		submitted_at: 'Submitted',
		support_reference: 'Support case',
		support_subject: 'Support subject',
		target: 'Target',
		target_margin: 'Target margin',
		target_type: 'Target type',
		tier: 'Tier',
		title: 'Title',
		total_due: 'Total due',
		total_amount: 'Value',
		transaction_type: 'Movement',
		trade_license_status: 'Trade license',
		unit_of_measure: 'Unit',
		unit_price: 'Unit price',
		urgency: 'Urgency',
		updated_at: 'Updated',
		vehicle_label: 'Vehicle',
		write_down_amount: 'Write-down',
		write_down_reversal_amount: 'Write-down reversal',
	}
	return labels[normalizeToken(key)] ?? humanizeIdentifier(key) ?? key
}

function renderGenericValue(key: string, value: JsonValue): string | null {
	if (value === null) return null
	const normalized = normalizeToken(key)
	if (normalized.endsWith('_date')) {
		return formatDate(value)
	}
	if (normalized.endsWith('_at')) {
		return formatDateTime(value)
	}
	if (
		normalized.includes('amount') ||
		normalized.includes('total') ||
		normalized.includes('value') ||
		normalized.includes('salary') ||
		normalized.includes('cost') ||
		normalized.includes('price') ||
		normalized.includes('fee')
	) {
		return formatMoney(typeof value === 'number' ? value : null)
	}
	if (normalized.includes('fraction') || normalized.includes('percent')) {
		return formatPercent(typeof value === 'number' ? value : null)
	}
	if (normalized.includes('status') || normalized === 'source') {
		return typeof value === 'string' ? humanizeIdentifier(value) : null
	}
	if (typeof value === 'string') return value
	if (typeof value === 'number') return formatNumber(value)
	if (typeof value === 'boolean') return value ? 'Yes' : 'No'
	return contextSummary(value)
}

function isQuoteRequestOrder(row: SearchDisplayIndexRow): boolean {
	return (
		row.entity_type === 'order' &&
		stringValue(metadataObject(row.metadata), 'source') === 'quote_request'
	)
}

function quantityWithUnit(
	value: number | null,
	unit: string | null,
): string | null {
	const formatted = formatNumber(value)
	if (!formatted) return null
	return unit ? `${formatted} ${unit}` : formatted
}

function financeSide(row: SearchDisplayIndexRow): string | null {
	const metadata = metadataObject(row.metadata)
	const sourceKey = normalizeToken(stringValue(metadata, 'source') ?? row.title)
	if (sourceKey.includes('customer')) return 'Customer'
	if (sourceKey.includes('supplier')) return 'Supplier'
	return formatSource(sourceKey)
}

function financePaymentStatus(row: SearchDisplayIndexRow): string | null {
	const metadata = metadataObject(row.metadata)
	return formatStatus(
		stringValue(metadata, 'payment_status') ??
			stringValue(metadata, 'status') ??
			row.subtitle,
	)
}

function financeRecordType(row: SearchDisplayIndexRow): string | null {
	const metadata = metadataObject(row.metadata)
	return (
		formatSource(stringValue(metadata, 'source')) ??
		humanizeIdentifier(row.title)
	)
}

function financePrimaryAmount(metadata: JsonObject): string | null {
	return (
		formatMoney(numberValue(metadata, 'total_assets')) ??
		formatMoney(numberValue(metadata, 'net_cash_movement')) ??
		formatMoney(numberValue(metadata, 'net_performance')) ??
		formatMoney(numberValue(metadata, 'remaining_due')) ??
		formatMoney(numberValue(metadata, 'valuation')) ??
		formatMoney(numberValue(metadata, 'carrying_value_remaining')) ??
		formatMoney(numberValue(metadata, 'carrying_amount')) ??
		formatMoney(numberValue(metadata, 'write_down_amount')) ??
		formatMoney(numberValue(metadata, 'amount')) ??
		formatMoney(numberValue(metadata, 'total_due')) ??
		formatMoney(numberValue(metadata, 'cash_balance'))
	)
}

function genericPreviewFields(
	row: SearchDisplayIndexRow,
): SearchPreviewField[] {
	const metadata = metadataObject(row.metadata)
	const metadataFields = Object.entries(metadata)
		.filter(([key]) => !isTechnicalKey(key))
		.flatMap(([key, value]) => {
			const rendered = renderGenericValue(key, value)
			return rendered ? [previewField(humanLabel(key), rendered)] : []
		})
		.filter((field): field is SearchPreviewField => field !== null)
		.slice(0, 3)

	return fields(
		previewField('Record type', humanizeIdentifier(row.entity_type)),
		previewField('Stage', stage(row)),
		...metadataFields,
	)
}

function genericDetails(row: SearchDisplayIndexRow): SearchDetailField[] {
	const metadata = metadataObject(row.metadata)
	const metadataFields = Object.entries(metadata)
		.filter(([key]) => !isTechnicalKey(key))
		.flatMap(([key, value]) => {
			const rendered = renderGenericValue(key, value)
			return rendered ? [detailField(humanLabel(key), rendered)] : []
		})

	return details(
		detailField('Record', row.title),
		detailField('Record type', humanizeIdentifier(row.entity_type)),
		detailField('Stage', stage(row)),
		...metadataFields,
	)
}

export function buildSearchPreviewFields(
	row: SearchDisplayIndexRow,
): SearchPreviewField[] {
	const metadata = metadataObject(row.metadata)

	switch (row.entity_type) {
		case 'order':
			if (isQuoteRequestOrder(row)) {
				return fields(
					previewField('Customer', stringValue(metadata, 'company_name')),
					previewField('Stage', stage(row)),
					previewField(
						'Items',
						stringValue(metadata, 'item_summary') ??
							formatNumber(numberValue(metadata, 'item_count')),
					),
					previewField('Address', stringValue(metadata, 'delivery_address')),
					previewField(
						'Submitted',
						formatDateTime(
							jsonValue(metadata, 'submitted_at') ??
								jsonValue(metadata, 'created_at'),
						),
					),
				)
			}
			return fields(
				previewField('Customer', stringValue(metadata, 'company_name')),
				previewField('Stage', stage(row)),
				previewField(
					'Items',
					stringValue(metadata, 'quote_items') ??
						stringValue(metadata, 'request_items'),
				),
				previewField(
					'Value',
					formatMoney(numberValue(metadata, 'total_amount')),
				),
				previewField('Created', formatDateTime(metadata.created_at)),
			)
		case 'customer':
			return fields(
				previewField('Contact', row.subtitle),
				previewField('Account', metadataStatus(row, 'status')),
				previewField('Tier', formatStatus(stringValue(metadata, 'tier'))),
				previewField('Address', stringValue(metadata, 'default_address')),
				previewField(
					'Orders',
					formatNumber(numberValue(metadata, 'order_count')),
				),
			)
		case 'category':
			return fields(
				previewField('Stage', stage(row)),
				previewField('Slug', stringValue(metadata, 'slug')),
				previewField('Parent', stringValue(metadata, 'parent_category')),
				previewField(
					'Products',
					formatNumber(numberValue(metadata, 'product_count')),
				),
			)
		case 'payment':
			return fields(
				previewField('Side', financeSide(row)),
				previewField('Payment status', financePaymentStatus(row)),
				previewField(
					'Remaining',
					formatMoney(numberValue(metadata, 'remaining_due')),
				),
				previewField(
					'Total due',
					formatMoney(numberValue(metadata, 'total_due')),
				),
				previewField('Paid', formatMoney(numberValue(metadata, 'amount_paid'))),
				previewField('Amount', formatMoney(numberValue(metadata, 'amount'))),
				previewField('Customer', stringValue(metadata, 'company_name')),
				previewField('Supplier', stringValue(metadata, 'supplier_name')),
				previewField(
					'Order',
					stringValue(metadata, 'order_number') ??
						stringValue(metadata, 'request_number'),
				),
				previewField(
					'Product',
					stringValue(metadata, 'product_name') ??
						stringValue(metadata, 'item_summary'),
				),
			)
		case 'finance':
			return fields(
				previewField('Record', financeRecordType(row)),
				previewField(
					'Status',
					financePaymentStatus(row) ??
						formatStatus(stringValue(metadata, 'status')),
				),
				previewField('Amount', financePrimaryAmount(metadata)),
				previewField(
					'Counterparty',
					stringValue(metadata, 'customer_name') ??
						stringValue(metadata, 'supplier_name') ??
						stringValue(metadata, 'counterparty_name') ??
						stringValue(metadata, 'counterparty_type'),
				),
				previewField(
					'Product',
					stringValue(metadata, 'product') ??
						stringValue(metadata, 'product_name') ??
						stringValue(metadata, 'product_sku'),
				),
				previewField(
					'Record no.',
					stringValue(metadata, 'entry_number') ??
						stringValue(metadata, 'damage_number') ??
						stringValue(metadata, 'order_number') ??
						stringValue(metadata, 'account_code'),
				),
				previewField(
					'Review',
					booleanValue(metadata, 'requires_accountant_signoff') === true
						? 'Accountant sign-off'
						: null,
				),
			)
		case 'finance_payroll':
			return fields(
				previewField('Employee', stringValue(metadata, 'employee_name')),
				previewField('Department', stringValue(metadata, 'department')),
				previewField('Title', stringValue(metadata, 'title')),
				previewField(
					'Base salary',
					formatMoney(numberValue(metadata, 'base_salary')),
				),
				previewField(
					'Social insurance',
					formatMoney(numberValue(metadata, 'social_insurance_salary')),
				),
			)
		case 'finance_payroll_payment':
			return fields(
				previewField('Employee', stringValue(metadata, 'employee_name')),
				previewField(
					'Type',
					formatStatus(stringValue(metadata, 'payment_type')),
				),
				previewField('Period', stringValue(metadata, 'period_month')),
				previewField('Amount', formatMoney(numberValue(metadata, 'amount'))),
			)
		case 'finance_fuel_expense':
			return fields(
				previewField('Truck', stringValue(metadata, 'truck_plate')),
				previewField('Driver', stringValue(metadata, 'driver_name')),
				previewField('Status', formatStatus(stringValue(metadata, 'status'))),
				previewField('Amount', formatMoney(numberValue(metadata, 'amount'))),
			)
		case 'finance_company_asset':
			return fields(
				previewField('Asset no.', stringValue(metadata, 'asset_number')),
				previewField('Type', formatStatus(stringValue(metadata, 'asset_type'))),
				previewField(
					'Value',
					formatMoney(numberValue(metadata, 'carrying_value')),
				),
				previewField(
					'Funding',
					formatStatus(stringValue(metadata, 'funding_source')),
				),
			)
		case 'inventory': {
			const unit = stringValue(metadata, 'unit_of_measure')
			return fields(
				previewField('SKU', stringValue(metadata, 'sku')),
				previewField('Unit', unit),
				previewField(
					'On hand',
					quantityWithUnit(numberValue(metadata, 'on_hand_quantity'), unit),
				),
				previewField(
					'Available',
					quantityWithUnit(numberValue(metadata, 'available_quantity'), unit),
				),
				previewField(
					'Reserved',
					quantityWithUnit(numberValue(metadata, 'reserved_quantity'), unit),
				),
				previewField(
					'Minimum',
					quantityWithUnit(numberValue(metadata, 'minimum_quantity'), unit),
				),
				previewField(
					'Good from',
					quantityWithUnit(numberValue(metadata, 'good_quantity'), unit),
				),
				previewField('Suppliers', stringValue(metadata, 'preferred_suppliers')),
			)
		}
		case 'pricing':
			return fields(
				previewField('Type', formatSource(stringValue(metadata, 'source'))),
				previewField(
					'Product',
					stringValue(metadata, 'product_name') ??
						stringValue(metadata, 'category'),
				),
				previewField('Stage', stage(row)),
				previewField('Assigned to', stringValue(metadata, 'assigned_to')),
				previewField(
					'New price',
					formatMoney(numberValue(metadata, 'new_price')),
				),
				previewField(
					'Target margin',
					formatPercent(numberValue(metadata, 'target_margin')),
				),
			)
		case 'warehouse':
			if (stringValue(metadata, 'source') === 'receiving_task') {
				return fields(
					previewField('Product', stringValue(metadata, 'product_name')),
					previewField('Supplier', stringValue(metadata, 'supplier_name')),
					previewField('Stage', stage(row)),
					previewField(
						'Quantity',
						formatNumber(numberValue(metadata, 'quantity')),
					),
				)
			}
			return fields(
				previewField('Customer', stringValue(metadata, 'company_name')),
				previewField('Stage', stage(row)),
				previewField('Advisor', stringValue(metadata, 'advisor_name')),
				previewField('Items', stringValue(metadata, 'item_summary')),
				previewField(
					'Truck',
					stringValue(metadata, 'plate_number') ??
						stringValue(metadata, 'driver_name'),
				),
			)
		case 'dispatch':
			return fields(
				previewField('Order', stringValue(metadata, 'order_number')),
				previewField('Driver', stringValue(metadata, 'driver_name')),
				previewField('Customer', stringValue(metadata, 'company_name')),
				previewField('Stage', stage(row)),
				previewField('Address', stringValue(metadata, 'delivery_address')),
			)
		case 'driver':
			return fields(
				previewField('Availability', stage(row)),
				previewField('Vehicle', stringValue(metadata, 'vehicle_label')),
				previewField('Last seen', formatDateTime(metadata.last_seen_at)),
				previewField('Phone', stringValue(metadata, 'phone')),
			)
		case 'driver_location':
			return fields(
				previewField('Driver', stringValue(metadata, 'driver_name')),
				previewField('Delivery', stringValue(metadata, 'delivery_number')),
				previewField('Customer', stringValue(metadata, 'company_name')),
				previewField('Recorded', formatDateTime(metadata.recorded_at)),
				previewField(
					'Speed',
					quantityWithUnit(numberValue(metadata, 'speed_kmh'), 'km/h'),
				),
			)
		case 'support':
			return fields(
				previewField('Stage', stage(row)),
				previewField('Channel', formatSource(stringValue(metadata, 'source'))),
				previewField('Requester', stringValue(metadata, 'requester')),
				previewField('Subject', stringValue(metadata, 'subject')),
			)
		case 'support_message':
			return fields(
				previewField('Channel', formatSource(stringValue(metadata, 'channel'))),
				previewField('Sender', stringValue(metadata, 'sender')),
				previewField(
					'Case',
					stringValue(metadata, 'ticket_reference') ??
						stringValue(metadata, 'conversation_reference'),
				),
				previewField('Message', stringValue(metadata, 'message_body')),
				previewField('Sent', formatDateTime(metadata.created_at)),
			)
		case 'supplier':
			return fields(
				previewField('Stage', stage(row)),
				previewField('Tier', formatStatus(stringValue(metadata, 'tier'))),
				previewField('Terms', stringValue(metadata, 'payment_terms')),
				previewField('Products', stringValue(metadata, 'products')),
				previewField('Specialties', stringValue(metadata, 'specialties')),
			)
		case 'employee':
			return fields(
				previewField('Stage', stage(row)),
				previewField('Title', stringValue(metadata, 'title')),
				previewField('Department', stringValue(metadata, 'department')),
				previewField(
					'Base salary',
					formatMoney(
						numberValue(metadata, 'base_salary'),
						stringValue(metadata, 'salary_currency') ?? 'EGP',
					),
				),
				previewField(
					'CEO access',
					booleanValue(metadata, 'is_ceo') === null
						? null
						: booleanValue(metadata, 'is_ceo')
							? 'Yes'
							: 'No',
				),
			)
		case 'sales_history':
			return fields(
				previewField('Type', formatSource(stringValue(metadata, 'source'))),
				previewField('Customer', stringValue(metadata, 'company_name')),
				previewField('Stage', stage(row)),
				previewField('Total', formatMoney(numberValue(metadata, 'total'))),
				previewField('By', stringValue(metadata, 'created_by')),
			)
		case 'approval':
			return fields(
				previewField(
					'Type',
					formatStatus(stringValue(metadata, 'approval_type')),
				),
				previewField('Stage', stage(row)),
				previewField('Target', stringValue(metadata, 'target')),
				previewField('Requested by', stringValue(metadata, 'requested_by')),
				previewField('Assigned to', stringValue(metadata, 'assigned_to')),
			)
		case 'document':
			return fields(
				previewField('Type', formatSource(stringValue(metadata, 'source'))),
				previewField(
					'Document',
					formatStatus(stringValue(metadata, 'document_type')) ??
						formatStatus(stringValue(metadata, 'proof_type')),
				),
				previewField(
					'Related',
					stringValue(metadata, 'related_order_ref') ??
						stringValue(metadata, 'delivery_number') ??
						stringValue(metadata, 'ticket_reference'),
				),
				previewField(
					'Customer',
					stringValue(metadata, 'customer_name') ??
						stringValue(metadata, 'company_name'),
				),
				previewField(
					'Created',
					formatDateTime(jsonValue(metadata, 'created_at')),
				),
			)
		case 'activity':
			return fields(
				previewField(
					'Who',
					stringValue(metadata, 'who') ?? stringValue(metadata, 'actor'),
				),
				previewField(
					'Panel',
					stringValue(metadata, 'department') ??
						stringValue(metadata, 'area') ??
						stage(row),
				),
				previewField(
					'What',
					stringValue(metadata, 'what') ?? activityLabel(metadata, row),
				),
				previewField('Changed', activityChange(metadata)),
				previewField('Advisor', stringValue(metadata, 'advisor')),
				previewField('Manager', stringValue(metadata, 'manager')),
				previewField(
					'Proofs',
					stringValue(metadata, 'proofs') ??
						formatNumber(numberValue(metadata, 'proof_count')),
				),
				previewField('Customer', stringValue(metadata, 'customer')),
				previewField('Target', stringValue(metadata, 'target')),
				previewField('Damage no.', stringValue(metadata, 'damage_number')),
				previewField('Quantity', activityQuantity(metadata)),
				previewField('Unit cost', activityUnitCost(metadata)),
				previewField('Amount', activityAmount(metadata)),
				previewField('NRV removed', activityNrvRemovedValue(metadata)),
				previewField(
					'Write-down',
					activityMoneyValue(metadata, 'write_down_amount'),
				),
				previewField(
					'Write-down reversal',
					activityMoneyValue(metadata, 'write_down_reversal_amount'),
				),
				previewField('When', activityWhen(metadata)),
			)
		default:
			return genericPreviewFields(row)
	}
}

export function buildSearchDisplayTitle(row: SearchDisplayIndexRow): string {
	switch (row.entity_type) {
		case 'activity':
			return formatActivityTitle(row)
		case 'payment':
			if (!row.title.includes('_') || row.title.includes(' ')) return row.title
			return formatSource(row.title) ?? row.title
		default:
			return row.title
	}
}

export function buildSearchDetailFields(
	row: SearchDisplayIndexRow,
): SearchDetailField[] {
	const metadata = metadataObject(row.metadata)
	const deliveredAt = formatDateTime(metadata.delivered_at)
	const completedAt = formatDateTime(metadata.completed_at)

	switch (row.entity_type) {
		case 'order':
			if (isQuoteRequestOrder(row)) {
				return details(
					detailField('Quote request', row.title),
					detailField('Customer', stringValue(metadata, 'company_name')),
					detailField('Stage', stage(row)),
					detailField(
						'Items',
						stringValue(metadata, 'item_summary') ??
							formatNumber(numberValue(metadata, 'item_count')),
					),
					detailField(
						'Delivery address',
						stringValue(metadata, 'delivery_address'),
					),
					detailField('Project', stringValue(metadata, 'project_name')),
					detailField('Submitted by', stringValue(metadata, 'submitted_by')),
					detailField(
						'Assigned to',
						stringValue(metadata, 'assigned_employee'),
					),
					detailField(
						'Urgency',
						formatStatus(stringValue(metadata, 'urgency')),
					),
					detailField('Delivery date', formatDate(metadata.delivery_date)),
					detailField(
						'Submitted',
						formatDateTime(
							jsonValue(metadata, 'submitted_at') ??
								jsonValue(metadata, 'created_at'),
						),
					),
					detailField(
						'Approval required',
						booleanValue(metadata, 'approval_required') === null
							? null
							: booleanValue(metadata, 'approval_required')
								? 'Yes'
								: 'No',
					),
					detailField('Notes', stringValue(metadata, 'notes')),
				)
			}
			return details(
				detailField('Order', row.title),
				detailField('Customer', stringValue(metadata, 'company_name')),
				detailField('Stage', stage(row)),
				detailField('Request', stringValue(metadata, 'request_number')),
				detailField('Quote', stringValue(metadata, 'quote_number')),
				detailField(
					'Items',
					stringValue(metadata, 'quote_items') ??
						stringValue(metadata, 'request_items'),
				),
				detailField(
					'Delivery address',
					stringValue(metadata, 'delivery_address'),
				),
				detailField('Submitted by', stringValue(metadata, 'submitted_by')),
				detailField('Assigned to', stringValue(metadata, 'assigned_employee')),
				detailField(
					'Order value',
					formatMoney(numberValue(metadata, 'total_amount')),
				),
				detailField('Created', formatDateTime(metadata.created_at)),
				detailField('Delivered', deliveredAt ?? 'Not delivered yet'),
			)
		case 'customer':
			return details(
				detailField('Company', row.title),
				detailField('Main contact', row.subtitle),
				detailField('Phone', stringValue(metadata, 'phone')),
				detailField('Email', stringValue(metadata, 'email')),
				detailField('Account status', metadataStatus(row, 'status')),
				detailField('Tier', formatStatus(stringValue(metadata, 'tier'))),
				detailField(
					'Trade license',
					metadataStatus(row, 'trade_license_status'),
				),
				detailField(
					'Default address',
					stringValue(metadata, 'default_address'),
				),
				detailField('Sales rep', stringValue(metadata, 'assigned_sales_rep')),
				detailField(
					'Credit limit',
					formatMoney(numberValue(metadata, 'credit_limit')),
				),
				detailField(
					'Lifetime value',
					formatMoney(numberValue(metadata, 'lifetime_value')),
				),
				detailField(
					'Current exposure',
					formatMoney(numberValue(metadata, 'current_exposure')),
				),
			)
		case 'category':
			return details(
				detailField('Category', row.title),
				detailField('Arabic name', stringValue(metadata, 'name_ar')),
				detailField('Stage', stage(row)),
				detailField('Slug', stringValue(metadata, 'slug')),
				detailField(
					'Parent category',
					stringValue(metadata, 'parent_category'),
				),
				detailField(
					'Products',
					formatNumber(numberValue(metadata, 'product_count')),
				),
				detailField('Description', stringValue(metadata, 'description')),
				detailField('Last update', formatDateTime(metadata.updated_at)),
			)
		case 'payment':
			return details(
				detailField('Finance side', financeSide(row)),
				detailField('Payment status', financePaymentStatus(row)),
				detailField(
					'Total due',
					formatMoney(numberValue(metadata, 'total_due')),
				),
				detailField('Paid', formatMoney(numberValue(metadata, 'amount_paid'))),
				detailField(
					'Remaining',
					formatMoney(numberValue(metadata, 'remaining_due')),
				),
				detailField('Amount', formatMoney(numberValue(metadata, 'amount'))),
				detailField(
					'Payment portion',
					formatPercent(numberValue(metadata, 'payment_fraction')),
				),
				detailField('Order', stringValue(metadata, 'order_number')),
				detailField('Customer', stringValue(metadata, 'company_name')),
				detailField('Supplier', stringValue(metadata, 'supplier_name')),
				detailField('Product', stringValue(metadata, 'product_name')),
				detailField('Items', stringValue(metadata, 'item_summary')),
				detailField(
					'Quantity',
					quantityWithUnit(
						numberValue(metadata, 'quantity'),
						stringValue(metadata, 'unit_of_measure'),
					),
				),
				detailField('Recorded by', stringValue(metadata, 'recorded_by')),
				detailField('Last payment', formatDateTime(metadata.last_payment_at)),
				detailField(
					'Follow-up state',
					formatStatus(stringValue(metadata, 'follow_up_state')),
				),
				detailField('Follow-up due', formatDateTime(metadata.follow_up_due_at)),
				detailField(
					'Follow-up outcome',
					stringValue(metadata, 'follow_up_outcome'),
				),
				detailField(
					'Follow-up notes',
					stringValue(metadata, 'follow_up_notes'),
				),
				detailField('Recorded', formatDateTime(metadata.created_at)),
			)
		case 'finance':
			return details(
				detailField('Record type', financeRecordType(row)),
				detailField(
					'Status',
					financePaymentStatus(row) ??
						formatStatus(stringValue(metadata, 'status')),
				),
				detailField(
					'Accounting period',
					stringValue(metadata, 'accounting_period'),
				),
				detailField(
					'Accounting date',
					formatDateTime(metadata.accounting_date),
				),
				detailField(
					'Total assets',
					formatMoney(numberValue(metadata, 'total_assets')),
				),
				detailField(
					'Total liabilities',
					formatMoney(numberValue(metadata, 'total_liabilities')),
				),
				detailField(
					'Net assets',
					formatMoney(numberValue(metadata, 'net_assets')),
				),
				detailField(
					'Cash balance',
					formatMoney(numberValue(metadata, 'cash_balance')),
				),
				detailField(
					'Cash on hand',
					formatMoney(numberValue(metadata, 'cash_asset_balance')),
				),
				detailField(
					'Cash overdraft',
					formatMoney(numberValue(metadata, 'cash_overdraft')),
				),
				detailField(
					'Net cash movement',
					formatMoney(numberValue(metadata, 'net_cash_movement')),
				),
				detailField(
					'Cash movement',
					formatMoney(numberValue(metadata, 'cash_movement')),
				),
				detailField(
					'Inventory assets',
					formatMoney(numberValue(metadata, 'inventory_assets')),
				),
				detailField(
					'Damaged inventory',
					formatMoney(numberValue(metadata, 'damaged_inventory_assets')),
				),
				detailField(
					'Company assets',
					formatMoney(numberValue(metadata, 'company_assets')),
				),
				detailField('Revenue', formatMoney(numberValue(metadata, 'revenue'))),
				detailField('Expenses', formatMoney(numberValue(metadata, 'expenses'))),
				detailField(
					'Net performance',
					formatMoney(numberValue(metadata, 'net_performance')),
				),
				detailField(
					'Total due',
					formatMoney(numberValue(metadata, 'total_due')),
				),
				detailField('Paid', formatMoney(numberValue(metadata, 'amount_paid'))),
				detailField(
					'Remaining',
					formatMoney(numberValue(metadata, 'remaining_due')),
				),
				detailField(
					'Valuation',
					formatMoney(numberValue(metadata, 'valuation')),
				),
				detailField(
					'Remaining NRV',
					formatMoney(numberValue(metadata, 'carrying_value_remaining')),
				),
				detailField(
					'Carrying value',
					formatMoney(numberValue(metadata, 'carrying_amount')),
				),
				detailField(
					'Write-down',
					formatMoney(numberValue(metadata, 'write_down_amount')),
				),
				detailField(
					'Write-down reversal',
					formatMoney(numberValue(metadata, 'write_down_reversal_amount')),
				),
				detailField('Amount', formatMoney(numberValue(metadata, 'amount'))),
				detailField('Damage no.', stringValue(metadata, 'damage_number')),
				detailField(
					'Movement',
					formatStatus(stringValue(metadata, 'transaction_type')),
				),
				detailField(
					'Quantity',
					quantityWithUnit(
						numberValue(metadata, 'quantity') ??
							numberValue(metadata, 'remaining_quantity'),
						stringValue(metadata, 'unit'),
					),
				),
				detailField(
					'Unit price',
					formatMoney(numberValue(metadata, 'unit_price')),
				),
				detailField(
					'Original unit cost',
					formatMoney(numberValue(metadata, 'original_unit_cost')),
				),
				detailField(
					'Recovery unit value',
					formatMoney(numberValue(metadata, 'recovery_unit_value')),
				),
				detailField(
					'NRV unit value',
					formatMoney(numberValue(metadata, 'carrying_unit_value')),
				),
				detailField('Entry', stringValue(metadata, 'entry_number')),
				detailField('Account', stringValue(metadata, 'account_name')),
				detailField('Account code', stringValue(metadata, 'account_code')),
				detailField('Customer', stringValue(metadata, 'customer_name')),
				detailField('Supplier', stringValue(metadata, 'supplier_name')),
				detailField('Counterparty', stringValue(metadata, 'counterparty_name')),
				detailField('Manager', stringValue(metadata, 'manager_name')),
				detailField(
					'Product',
					stringValue(metadata, 'product') ??
						stringValue(metadata, 'product_name'),
				),
				detailField('SKU', stringValue(metadata, 'sku')),
				detailField('Description', stringValue(metadata, 'description')),
				detailField('Reason', stringValue(metadata, 'reason')),
				detailField('Sign-off reason', stringValue(metadata, 'signoff_reason')),
				detailField(
					'Review required',
					formatNumber(numberValue(metadata, 'review_required_count')),
				),
				detailField(
					'Unposted journals',
					formatNumber(numberValue(metadata, 'unposted_count')),
				),
				detailField(
					'Pending fuel receipts',
					formatNumber(numberValue(metadata, 'pending_fuel_expense_count')),
				),
				detailField(
					'Pending fuel amount',
					formatMoney(numberValue(metadata, 'pending_fuel_expense_amount')),
				),
				detailField(
					'Payroll due',
					formatNumber(numberValue(metadata, 'payroll_due_count')),
				),
				detailField(
					'Payroll due amount',
					formatMoney(numberValue(metadata, 'payroll_due_amount')),
				),
				detailField('Proof', stringValue(metadata, 'proof_path')),
				detailField('Created', formatDateTime(metadata.created_at)),
				detailField('Updated', formatDateTime(metadata.updated_at)),
			)
		case 'finance_payroll':
			return details(
				detailField('Employee', stringValue(metadata, 'employee_name')),
				detailField(
					'Employee status',
					formatStatus(stringValue(metadata, 'employee_status')),
				),
				detailField('Department', stringValue(metadata, 'department')),
				detailField('Title', stringValue(metadata, 'title')),
				detailField('Hire date', formatDateTime(metadata.hire_date)),
				detailField(
					'Base salary',
					formatMoney(numberValue(metadata, 'base_salary')),
				),
				detailField(
					'Social insurance salary',
					formatMoney(numberValue(metadata, 'social_insurance_salary')),
				),
				detailField('Currency', stringValue(metadata, 'salary_currency')),
				detailField('Updated by', stringValue(metadata, 'updated_by')),
				detailField('Updated', formatDateTime(metadata.updated_at)),
			)
		case 'finance_payroll_payment':
			return details(
				detailField('Employee', stringValue(metadata, 'employee_name')),
				detailField(
					'Type',
					formatStatus(stringValue(metadata, 'payment_type')),
				),
				detailField('Period', formatDateTime(metadata.period_month)),
				detailField('Amount', formatMoney(numberValue(metadata, 'amount'))),
				detailField('Reason', stringValue(metadata, 'reason')),
				detailField('Status', formatStatus(stringValue(metadata, 'status'))),
				detailField('Proof', stringValue(metadata, 'proof_path')),
				detailField('Created by', stringValue(metadata, 'created_by')),
				detailField('Created', formatDateTime(metadata.created_at)),
			)
		case 'finance_fuel_expense':
			return details(
				detailField('Truck', stringValue(metadata, 'truck_plate')),
				detailField('Driver', stringValue(metadata, 'driver_name')),
				detailField('Status', formatStatus(stringValue(metadata, 'status'))),
				detailField('Amount', formatMoney(numberValue(metadata, 'amount'))),
				detailField(
					'Liters',
					formatNumber(numberValue(metadata, 'fuel_liters')),
				),
				detailField(
					'Odometer',
					formatNumber(numberValue(metadata, 'odometer_km')),
				),
				detailField('Note', stringValue(metadata, 'note')),
				detailField('Finance note', stringValue(metadata, 'finance_note')),
				detailField('Posted by', stringValue(metadata, 'posted_by')),
				detailField('Posted', formatDateTime(metadata.posted_at)),
				detailField('Created', formatDateTime(metadata.created_at)),
			)
		case 'finance_company_asset':
			return details(
				detailField('Asset no.', stringValue(metadata, 'asset_number')),
				detailField('Type', formatStatus(stringValue(metadata, 'asset_type'))),
				detailField('Name', stringValue(metadata, 'name')),
				detailField(
					'Cost',
					formatMoney(numberValue(metadata, 'acquisition_cost')),
				),
				detailField(
					'Carrying value',
					formatMoney(numberValue(metadata, 'carrying_value')),
				),
				detailField(
					'Funding',
					formatStatus(stringValue(metadata, 'funding_source')),
				),
				detailField('Location', stringValue(metadata, 'location')),
				detailField('Truck', stringValue(metadata, 'truck_plate')),
				detailField('Status', formatStatus(stringValue(metadata, 'status'))),
				detailField('Proof', stringValue(metadata, 'proof_path')),
				detailField('Created by', stringValue(metadata, 'created_by')),
				detailField('Created', formatDateTime(metadata.created_at)),
			)
		case 'inventory': {
			const unit = stringValue(metadata, 'unit_of_measure')
			return details(
				detailField('Product', row.title),
				detailField('SKU', stringValue(metadata, 'sku')),
				detailField('Category', row.subtitle),
				detailField('Brand', stringValue(metadata, 'brand')),
				detailField('Unit', unit),
				detailField('Suppliers', stringValue(metadata, 'preferred_suppliers')),
				detailField(
					'On hand',
					quantityWithUnit(numberValue(metadata, 'on_hand_quantity'), unit),
				),
				detailField(
					'Reserved',
					quantityWithUnit(numberValue(metadata, 'reserved_quantity'), unit),
				),
				detailField(
					'Available',
					quantityWithUnit(numberValue(metadata, 'available_quantity'), unit),
				),
				detailField(
					'Minimum required',
					quantityWithUnit(numberValue(metadata, 'minimum_quantity'), unit),
				),
				detailField(
					'Good from',
					quantityWithUnit(numberValue(metadata, 'good_quantity'), unit),
				),
				detailField('Last stock update', formatDateTime(metadata.updated_at)),
			)
		}
		case 'pricing':
			return details(
				detailField(
					'Record type',
					formatSource(stringValue(metadata, 'source')),
				),
				detailField('Stage', stage(row)),
				detailField('Product', stringValue(metadata, 'product_name')),
				detailField('SKU', stringValue(metadata, 'product_sku')),
				detailField('Category', stringValue(metadata, 'category')),
				detailField('Request', stringValue(metadata, 'request_number')),
				detailField('Requested item', stringValue(metadata, 'requested_item')),
				detailField('Requested by', stringValue(metadata, 'requested_by')),
				detailField('Assigned to', stringValue(metadata, 'assigned_to')),
				detailField('Updated by', stringValue(metadata, 'updated_by')),
				detailField('Supplier', stringValue(metadata, 'supplier_name')),
				detailField(
					'Old price',
					formatMoney(numberValue(metadata, 'old_price')),
				),
				detailField(
					'New price',
					formatMoney(numberValue(metadata, 'new_price')),
				),
				detailField(
					'Bonus margin',
					formatPercent(numberValue(metadata, 'bonus_margin')),
				),
				detailField(
					'Target margin',
					formatPercent(numberValue(metadata, 'target_margin')),
				),
				detailField(
					'Floor margin',
					formatPercent(numberValue(metadata, 'floor_margin')),
				),
				detailField(
					'Absolute min margin',
					formatPercent(numberValue(metadata, 'absolute_min_margin')),
				),
				detailField('Reason', stringValue(metadata, 'reason')),
				detailField('Notes', stringValue(metadata, 'notes')),
				detailField('Proof', stringValue(metadata, 'proof_path')),
				detailField('Resolved', formatDateTime(metadata.resolved_at)),
				detailField('Last update', formatDateTime(metadata.updated_at)),
			)
		case 'warehouse':
			if (stringValue(metadata, 'source') === 'receiving_task') {
				return details(
					detailField('Receiving task', row.title),
					detailField('Product', stringValue(metadata, 'product_name')),
					detailField('Supplier', stringValue(metadata, 'supplier_name')),
					detailField('Stage', stage(row)),
					detailField(
						'Receiving status',
						metadataStatus(row, 'receiving_status'),
					),
					detailField('Advisor', stringValue(metadata, 'advisor_name')),
					detailField(
						'Quantity',
						formatNumber(numberValue(metadata, 'quantity')),
					),
					detailField(
						'Received',
						formatNumber(numberValue(metadata, 'received_quantity')),
					),
					detailField(
						'Unit cost',
						formatMoney(numberValue(metadata, 'unit_cost')),
					),
					detailField(
						'Rejection reason',
						stringValue(metadata, 'rejection_reason'),
					),
					detailField('Last update', formatDateTime(metadata.updated_at)),
				)
			}
			return details(
				detailField('Order', row.title),
				detailField('Customer', stringValue(metadata, 'company_name')),
				detailField('Warehouse stage', stage(row)),
				detailField('Order status', metadataStatus(row, 'order_status')),
				detailField('Advisor', stringValue(metadata, 'advisor_name')),
				detailField('Driver', stringValue(metadata, 'driver_name')),
				detailField('Items', stringValue(metadata, 'item_summary')),
				detailField(
					'Delivery address',
					stringValue(metadata, 'delivery_address'),
				),
				detailField('Truck', stringValue(metadata, 'plate_number')),
				detailField(
					'Rejection reason',
					stringValue(metadata, 'rejection_reason'),
				),
				detailField('Last update', formatDateTime(metadata.updated_at)),
			)
		case 'dispatch':
			return details(
				detailField('Delivery', row.title),
				detailField('Stage', stage(row)),
				detailField('Order', stringValue(metadata, 'order_number')),
				detailField('Customer', stringValue(metadata, 'company_name')),
				detailField('Driver', stringValue(metadata, 'driver_name')),
				detailField('Driver phone', stringValue(metadata, 'driver_phone')),
				detailField('Truck', stringValue(metadata, 'plate_number')),
				detailField(
					'Delivery address',
					stringValue(metadata, 'delivery_address'),
				),
				detailField(
					'Rejection reason',
					stringValue(metadata, 'rejection_reason'),
				),
				detailField('Started', formatDateTime(metadata.started_at)),
				detailField('Arrived', formatDateTime(metadata.arrived_at)),
				detailField('Completed', completedAt ?? 'Not completed yet'),
				detailField('Last update', formatDateTime(metadata.updated_at)),
			)
		case 'driver':
			return details(
				detailField('Driver', row.title),
				detailField('Availability', stage(row)),
				detailField('Dispatch status', metadataStatus(row, 'driver_status')),
				detailField('Vehicle', stringValue(metadata, 'vehicle_label')),
				detailField('Email', stringValue(metadata, 'email')),
				detailField('Phone', stringValue(metadata, 'phone')),
				detailField('Truck', stringValue(metadata, 'truck_plates')),
				detailField('Last seen', formatDateTime(metadata.last_seen_at)),
				detailField('Last profile update', formatDateTime(metadata.updated_at)),
			)
		case 'driver_location':
			return details(
				detailField('Driver', stringValue(metadata, 'driver_name')),
				detailField('Driver phone', stringValue(metadata, 'driver_phone')),
				detailField('Driver status', metadataStatus(row, 'driver_status')),
				detailField('Online status', metadataStatus(row, 'online_status')),
				detailField('Delivery', stringValue(metadata, 'delivery_number')),
				detailField('Order', stringValue(metadata, 'order_number')),
				detailField('Customer', stringValue(metadata, 'company_name')),
				detailField(
					'Latitude',
					formatNumber(numberValue(metadata, 'latitude')),
				),
				detailField(
					'Longitude',
					formatNumber(numberValue(metadata, 'longitude')),
				),
				detailField(
					'Accuracy',
					quantityWithUnit(numberValue(metadata, 'accuracy_meters'), 'm'),
				),
				detailField(
					'Speed',
					quantityWithUnit(numberValue(metadata, 'speed_kmh'), 'km/h'),
				),
				detailField('Heading', formatNumber(numberValue(metadata, 'heading'))),
				detailField(
					'Source',
					formatSource(stringValue(metadata, 'location_source')),
				),
				detailField('Recorded', formatDateTime(metadata.recorded_at)),
				detailField('Last seen', formatDateTime(metadata.last_seen_at)),
			)
		case 'support':
			return details(
				detailField('Case', row.title),
				detailField('Stage', stage(row)),
				detailField('Channel', formatSource(stringValue(metadata, 'source'))),
				detailField('Subject', stringValue(metadata, 'subject')),
				detailField('Requester', stringValue(metadata, 'requester')),
				detailField('Customer', stringValue(metadata, 'customer_name')),
				detailField('Assigned to', stringValue(metadata, 'assigned_employee')),
				detailField('Email', stringValue(metadata, 'email')),
				detailField('Phone', stringValue(metadata, 'phone')),
				detailField('Last update', formatDateTime(metadata.updated_at)),
			)
		case 'support_message':
			return details(
				detailField('Support message', row.title),
				detailField('Channel', formatSource(stringValue(metadata, 'channel'))),
				detailField(
					'Sender type',
					formatStatus(stringValue(metadata, 'sender_type')),
				),
				detailField('Sender', stringValue(metadata, 'sender')),
				detailField('Customer', stringValue(metadata, 'customer_name')),
				detailField('Ticket', stringValue(metadata, 'ticket_reference')),
				detailField('Subject', stringValue(metadata, 'ticket_subject')),
				detailField(
					'Conversation',
					stringValue(metadata, 'conversation_reference'),
				),
				detailField('Message', stringValue(metadata, 'message_body')),
				detailField(
					'Attachments',
					formatNumber(numberValue(metadata, 'attachment_count')),
				),
				detailField(
					'Provider status',
					stringValue(metadata, 'provider_status'),
				),
				detailField('Provider error', stringValue(metadata, 'provider_error')),
				detailField('Sent', formatDateTime(metadata.created_at)),
			)
		case 'supplier':
			return details(
				detailField('Supplier', row.title),
				detailField('Stage', stage(row)),
				detailField('Tier', formatStatus(stringValue(metadata, 'tier'))),
				detailField('Payment terms', stringValue(metadata, 'payment_terms')),
				detailField('Rating', formatRating(numberValue(metadata, 'rating'))),
				detailField('Products', stringValue(metadata, 'products')),
				detailField('Specialties', stringValue(metadata, 'specialties')),
				detailField('Notes', stringValue(metadata, 'notes')),
				detailField('Phone', stringValue(metadata, 'phone')),
				detailField('Email', stringValue(metadata, 'email')),
				detailField('Last update', formatDateTime(metadata.updated_at)),
			)
		case 'employee':
			return details(
				detailField('Employee', row.title),
				detailField('Stage', stage(row)),
				detailField('Title', stringValue(metadata, 'title')),
				detailField('Department', stringValue(metadata, 'department')),
				detailField('Roles', stringValue(metadata, 'roles')),
				detailField('Hire date', formatDate(metadata.hire_date)),
				detailField(
					'Base salary',
					formatMoney(
						numberValue(metadata, 'base_salary'),
						stringValue(metadata, 'salary_currency') ?? 'EGP',
					),
				),
				detailField(
					'Insurance salary',
					formatMoney(
						numberValue(metadata, 'social_insurance_salary'),
						stringValue(metadata, 'salary_currency') ?? 'EGP',
					),
				),
				detailField('Email', stringValue(metadata, 'email')),
				detailField('Phone', stringValue(metadata, 'phone')),
				detailField(
					'CEO access',
					booleanValue(metadata, 'is_ceo') === null
						? null
						: booleanValue(metadata, 'is_ceo')
							? 'Yes'
							: 'No',
				),
				detailField('Last update', formatDateTime(metadata.updated_at)),
			)
		case 'sales_history':
			return details(
				detailField(
					'Record type',
					formatSource(stringValue(metadata, 'source')),
				),
				detailField('Stage', stage(row)),
				detailField('Customer', stringValue(metadata, 'company_name')),
				detailField('Request', stringValue(metadata, 'request_number')),
				detailField('Quote', stringValue(metadata, 'quote_number')),
				detailField(
					'Version',
					formatNumber(numberValue(metadata, 'version_number')),
				),
				detailField('Created by', stringValue(metadata, 'created_by')),
				detailField('Outcome', stringValue(metadata, 'outcome')),
				detailField('Subtotal', formatMoney(numberValue(metadata, 'subtotal'))),
				detailField('Tax', formatMoney(numberValue(metadata, 'tax_amount'))),
				detailField(
					'Delivery fee',
					formatMoney(numberValue(metadata, 'delivery_fee')),
				),
				detailField(
					'Discount',
					formatMoney(numberValue(metadata, 'discount_amount')),
				),
				detailField('Total', formatMoney(numberValue(metadata, 'total'))),
				detailField(
					'Counter type',
					formatStatus(stringValue(metadata, 'counter_type')),
				),
				detailField(
					'Self pickup',
					booleanValue(metadata, 'self_pickup') === null
						? null
						: booleanValue(metadata, 'self_pickup')
							? 'Yes'
							: 'No',
				),
				detailField('Notes', stringValue(metadata, 'notes')),
				detailField('Created', formatDateTime(metadata.created_at)),
			)
		case 'approval':
			return details(
				detailField('Approval', row.title),
				detailField(
					'Type',
					formatStatus(stringValue(metadata, 'approval_type')),
				),
				detailField('Stage', stage(row)),
				detailField(
					'Target type',
					formatStatus(stringValue(metadata, 'target_type')),
				),
				detailField('Target', stringValue(metadata, 'target')),
				detailField('Requested by', stringValue(metadata, 'requested_by')),
				detailField('Assigned to', stringValue(metadata, 'assigned_to')),
				detailField('Context', contextSummary(jsonValue(metadata, 'context'))),
				detailField('Decided', formatDateTime(metadata.decided_at)),
				detailField('Created', formatDateTime(metadata.created_at)),
				detailField('Last update', formatDateTime(metadata.updated_at)),
			)
		case 'document':
			return details(
				detailField('Document', row.title),
				detailField(
					'Record type',
					formatSource(stringValue(metadata, 'source')),
				),
				detailField(
					'Document type',
					formatStatus(stringValue(metadata, 'document_type')) ??
						formatStatus(stringValue(metadata, 'proof_type')),
				),
				detailField('Reference', stringValue(metadata, 'reference')),
				detailField(
					'Related order',
					stringValue(metadata, 'related_order_ref') ??
						stringValue(metadata, 'order_number'),
				),
				detailField('Delivery', stringValue(metadata, 'delivery_number')),
				detailField('Customer', stringValue(metadata, 'customer_name')),
				detailField('Driver', stringValue(metadata, 'driver_name')),
				detailField('Signer', stringValue(metadata, 'signer_name')),
				detailField('File size', stringValue(metadata, 'file_size')),
				detailField('File', stringValue(metadata, 'storage_path')),
				detailField('Proof', stringValue(metadata, 'proof_path')),
				detailField('Content type', stringValue(metadata, 'content_type')),
				detailField('Subject', stringValue(metadata, 'ticket_subject')),
				detailField('Created', formatDateTime(metadata.created_at)),
				detailField('Last update', formatDateTime(metadata.updated_at)),
			)
		case 'activity':
			return details(
				detailField('Story', formatActivityTitle(row)),
				detailField(
					'Who',
					stringValue(metadata, 'who') ?? stringValue(metadata, 'actor'),
				),
				detailField(
					'Panel',
					stringValue(metadata, 'department') ??
						stringValue(metadata, 'area') ??
						stage(row),
				),
				detailField(
					'What happened',
					stringValue(metadata, 'what') ?? activityLabel(metadata, row),
				),
				detailField('When', activityWhen(metadata)),
				detailField('Target', stringValue(metadata, 'target')),
				detailField('Quantity', activityQuantity(metadata)),
				detailField('Unit cost', activityUnitCost(metadata)),
				detailField('Changed', stringValue(metadata, 'changed_field')),
				detailField('From', stringValue(metadata, 'from_value')),
				detailField('To', stringValue(metadata, 'to_value')),
				detailField('Advisor', stringValue(metadata, 'advisor')),
				detailField('Manager', stringValue(metadata, 'manager')),
				detailField('Proofs', stringValue(metadata, 'proofs')),
				detailField('Proof types', stringValue(metadata, 'proof_types')),
				detailField('Customer', stringValue(metadata, 'customer')),
				detailField('Contact', stringValue(metadata, 'contact')),
				detailField('Phone', stringValue(metadata, 'phone')),
				detailField('Email', stringValue(metadata, 'email')),
				detailField('Order', stringValue(metadata, 'order_number')),
				detailField('Quote request', stringValue(metadata, 'request_number')),
				detailField('Quote', stringValue(metadata, 'quote_number')),
				detailField('Delivery', stringValue(metadata, 'delivery_number')),
				detailField(
					'Delivery address',
					stringValue(metadata, 'delivery_address'),
				),
				detailField('Items', stringValue(metadata, 'items')),
				detailField('Product', stringValue(metadata, 'product')),
				detailField('Product SKU', stringValue(metadata, 'product_sku')),
				detailField('Damage no.', stringValue(metadata, 'damage_number')),
				detailField('Unit', stringValue(metadata, 'unit')),
				detailField(
					'Original unit cost',
					activityMoneyValue(metadata, 'original_unit_cost'),
				),
				detailField(
					'Recovery unit value',
					activityMoneyValue(metadata, 'recovery_unit_value'),
				),
				detailField(
					'Original value',
					activityMoneyValue(metadata, 'original_value'),
				),
				detailField(
					'Carrying value',
					activityMoneyValue(metadata, 'carrying_value'),
				),
				detailField('NRV removed', activityNrvRemovedValue(metadata)),
				detailField(
					'Write-down',
					activityMoneyValue(metadata, 'write_down_amount'),
				),
				detailField(
					'Write-down reversal',
					activityMoneyValue(metadata, 'write_down_reversal_amount'),
				),
				detailField('Buyer', stringValue(metadata, 'buyer')),
				detailField(
					'Payment',
					formatStatus(stringValue(metadata, 'payment_status')),
				),
				detailField(
					'Product category',
					stringValue(metadata, 'product_category'),
				),
				detailField('Supplier', stringValue(metadata, 'supplier')),
				detailField('Driver', stringValue(metadata, 'driver')),
				detailField('Driver phone', stringValue(metadata, 'driver_phone')),
				detailField('Truck', stringValue(metadata, 'truck')),
				detailField('Truck type', stringValue(metadata, 'truck_type')),
				detailField('Entry no.', stringValue(metadata, 'entry_number')),
				detailField('Asset no.', stringValue(metadata, 'asset_number')),
				detailField('Receipt', stringValue(metadata, 'receipt_file')),
				detailField('Category', stringValue(metadata, 'category')),
				detailField('Description', stringValue(metadata, 'description')),
				detailField('Support case', stringValue(metadata, 'support_reference')),
				detailField(
					'Support subject',
					stringValue(metadata, 'support_subject'),
				),
				detailField('Role', formatStatus(stringValue(metadata, 'role'))),
				detailField(
					'Channel',
					formatSource(
						stringValue(metadata, 'contact_channel') ??
							stringValue(metadata, 'source'),
					),
				),
				detailField('Amount', formatMoney(numberValue(metadata, 'amount'))),
				detailField(
					'Payment portion',
					formatPercent(numberValue(metadata, 'payment_fraction')),
				),
				detailField(
					'Total',
					formatMoney(numberValue(metadata, 'total_amount')),
				),
				detailField('Status change', statusChange(metadata)),
				detailField(
					'Follow-up state',
					formatStatus(stringValue(metadata, 'follow_up_state')),
				),
				detailField('Follow-up due', formatDateTime(metadata.follow_up_due_at)),
				detailField('Scope', stringValue(metadata, 'scope')),
				detailField('Rows', formatNumber(numberValue(metadata, 'row_count'))),
				detailField('Reason', stringValue(metadata, 'reason')),
				detailField('Outcome', stringValue(metadata, 'outcome')),
				detailField('Notes', stringValue(metadata, 'notes')),
			)
		default:
			return genericDetails(row)
	}
}

export function buildSearchSummaryNote(
	row: SearchDisplayIndexRow,
): string | null {
	const metadata = metadataObject(row.metadata)
	switch (row.entity_type) {
		case 'order':
			if (isQuoteRequestOrder(row)) {
				const itemCount = formatNumber(numberValue(metadata, 'item_count'))
				const itemLabel =
					stringValue(metadata, 'item_summary') ??
					(itemCount ? `${itemCount} items` : null)
				return [stage(row), stringValue(metadata, 'company_name'), itemLabel]
					.filter(Boolean)
					.join(' - ')
			}
			return [
				stage(row),
				stringValue(metadata, 'company_name'),
				stringValue(metadata, 'quote_items') ??
					stringValue(metadata, 'request_items'),
			]
				.filter(Boolean)
				.join(' - ')
		case 'payment':
			return [
				financeSide(row),
				financePaymentStatus(row),
				stringValue(metadata, 'company_name') ??
					stringValue(metadata, 'supplier_name'),
				formatMoney(numberValue(metadata, 'remaining_due'))
					? `${formatMoney(numberValue(metadata, 'remaining_due'))} remaining`
					: null,
			]
				.filter(Boolean)
				.join(' - ')
		case 'finance':
			return [
				financeRecordType(row),
				financePaymentStatus(row) ??
					formatStatus(stringValue(metadata, 'status')),
				stringValue(metadata, 'customer_name') ??
					stringValue(metadata, 'supplier_name') ??
					stringValue(metadata, 'product_name') ??
					stringValue(metadata, 'account_name'),
				financePrimaryAmount(metadata),
			]
				.filter(Boolean)
				.join(' - ')
		case 'finance_payroll':
			return [
				stringValue(metadata, 'employee_name'),
				stringValue(metadata, 'department'),
				formatMoney(numberValue(metadata, 'base_salary')),
			]
				.filter(Boolean)
				.join(' - ')
		case 'finance_payroll_payment':
			return [
				stringValue(metadata, 'employee_name'),
				formatStatus(stringValue(metadata, 'payment_type')),
				formatMoney(numberValue(metadata, 'amount')),
			]
				.filter(Boolean)
				.join(' - ')
		case 'finance_fuel_expense':
			return [
				stringValue(metadata, 'truck_plate'),
				stringValue(metadata, 'driver_name'),
				formatStatus(stringValue(metadata, 'status')),
				formatMoney(numberValue(metadata, 'amount')),
			]
				.filter(Boolean)
				.join(' - ')
		case 'finance_company_asset':
			return [
				stringValue(metadata, 'asset_number'),
				stringValue(metadata, 'name'),
				formatMoney(numberValue(metadata, 'carrying_value')),
			]
				.filter(Boolean)
				.join(' - ')
		case 'inventory': {
			const unit = stringValue(metadata, 'unit_of_measure')
			return [
				`${quantityWithUnit(numberValue(metadata, 'on_hand_quantity'), unit) ?? '0'} on hand`,
				`${quantityWithUnit(numberValue(metadata, 'available_quantity'), unit) ?? '0'} available`,
				`${quantityWithUnit(numberValue(metadata, 'minimum_quantity'), unit) ?? '0'} minimum`,
				stringValue(metadata, 'preferred_suppliers'),
			]
				.filter(Boolean)
				.join(' - ')
		}
		case 'pricing':
			return [
				formatSource(stringValue(metadata, 'source')),
				stringValue(metadata, 'product_name') ??
					stringValue(metadata, 'category'),
				stage(row),
				formatMoney(numberValue(metadata, 'new_price')) ??
					formatPercent(numberValue(metadata, 'target_margin')),
			]
				.filter(Boolean)
				.join(' - ')
		case 'category':
			return [
				stage(row),
				stringValue(metadata, 'parent_category'),
				formatNumber(numberValue(metadata, 'product_count'))
					? `${formatNumber(numberValue(metadata, 'product_count'))} products`
					: null,
			]
				.filter(Boolean)
				.join(' - ')
		case 'warehouse':
			if (stringValue(metadata, 'source') === 'receiving_task') {
				return [
					stage(row),
					stringValue(metadata, 'product_name'),
					stringValue(metadata, 'supplier_name'),
				]
					.filter(Boolean)
					.join(' - ')
			}
			return [stage(row), stringValue(metadata, 'company_name')]
				.filter(Boolean)
				.join(' - ')
		case 'dispatch':
			return [stage(row), stringValue(metadata, 'driver_name')]
				.filter(Boolean)
				.join(' - ')
		case 'driver':
			return [stage(row), stringValue(metadata, 'vehicle_label')]
				.filter(Boolean)
				.join(' - ')
		case 'driver_location':
			return [
				stringValue(metadata, 'driver_name'),
				stringValue(metadata, 'delivery_number'),
				formatDateTime(metadata.recorded_at),
			]
				.filter(Boolean)
				.join(' - ')
		case 'support':
			return [stage(row), stringValue(metadata, 'requester')]
				.filter(Boolean)
				.join(' - ')
		case 'support_message':
			return [
				formatSource(stringValue(metadata, 'channel')),
				stringValue(metadata, 'sender'),
				stringValue(metadata, 'message_body'),
			]
				.filter(Boolean)
				.join(' - ')
		case 'sales_history':
			return [
				formatSource(stringValue(metadata, 'source')),
				stringValue(metadata, 'company_name'),
				stage(row),
				formatMoney(numberValue(metadata, 'total')),
			]
				.filter(Boolean)
				.join(' - ')
		case 'approval':
			return [
				stage(row),
				stringValue(metadata, 'target'),
				stringValue(metadata, 'assigned_to'),
			]
				.filter(Boolean)
				.join(' - ')
		case 'document':
			return [
				formatSource(stringValue(metadata, 'source')),
				stringValue(metadata, 'customer_name'),
				stringValue(metadata, 'related_order_ref') ??
					stringValue(metadata, 'delivery_number') ??
					stringValue(metadata, 'ticket_reference'),
			]
				.filter(Boolean)
				.join(' - ')
		case 'activity':
			return [
				stringValue(metadata, 'area') ?? stage(row),
				stringValue(metadata, 'actor'),
				stringValue(metadata, 'source'),
				stringValue(metadata, 'target'),
			]
				.filter(Boolean)
				.join(' - ')
		default:
			return stage(row)
	}
}

export function buildSearchMatchedFieldLabels(
	row: SearchDisplayIndexRow,
	query: string,
): string[] {
	const needle = query.trim().toLowerCase()
	if (!needle) return []
	const needles = searchTokens(needle)
	const activeNeedles = needles.length > 0 ? needles : [needle]

	const labels = new Set<string>()
	if (matchesAnyNeedle(row.title, activeNeedles)) labels.add('Record')

	const rowStage = stage(row)
	if (rowStage && matchesAnyNeedle(rowStage, activeNeedles)) labels.add('Stage')

	for (const field of [
		...buildSearchPreviewFields(row),
		...buildSearchDetailFields(row),
	]) {
		const rendered = String(field.value)
		if (
			matchesAnyNeedle(field.label, activeNeedles) ||
			matchesAnyNeedle(rendered, activeNeedles)
		) {
			labels.add(field.label)
		}
	}

	return Array.from(labels)
}

function matchesAnyNeedle(value: string, needles: string[]): boolean {
	return needles.some((needle) => matchesNeedle(value, needle))
}

function matchesNeedle(value: string, needle: string): boolean {
	const lower = value.toLowerCase()
	if (lower.includes(needle)) return true
	const normalizedNeedle = normalizeToken(needle)
	return (
		normalizedNeedle.length > 0 &&
		normalizeToken(value).includes(normalizedNeedle)
	)
}

export function buildSearchSummaryBuckets(
	moduleId: SearchSummaryModuleId,
	rows: SearchDisplayIndexRow[],
): SearchSummaryBucket[] {
	switch (moduleId) {
		case 'sales':
			return [
				bucket('sales-submitted', 'Submitted orders', rows, isSubmittedOrder),
				bucket('sales-rejected', 'Rejected orders', rows, isRejectedOrder),
				bucket('sales-accepted', 'Accepted orders', rows, isAcceptedOrder),
			]
		case 'inventory':
			return [
				bucket(
					'inventory-damaged',
					'Damaged stock',
					rows,
					isDamagedInventoryLotSearchRow,
				),
				bucket('inventory-needs-update', 'Needs update', rows, isStaleStock),
				bucket('inventory-low-stock', 'Low stock', rows, isLowStock),
			]
		case 'warehouse':
			return [
				bucket('warehouse-loading', 'Loading', rows, isWarehouseLoading),
				bucket('warehouse-receiving', 'Receiving', rows, isWarehouseReceiving),
				bucket('warehouse-rejected', 'Rejected', rows, isWarehouseRejected),
			]
		case 'finance':
			return [
				bucket(
					'finance-receivables',
					'Customer receivables',
					rows,
					isCustomerReceivable,
				),
				bucket(
					'finance-payables',
					'Supplier payables',
					rows,
					isSupplierPayable,
				),
				bucket(
					'finance-payroll',
					'Payroll',
					rows,
					(row) =>
						row.entity_type === 'finance_payroll' ||
						row.entity_type === 'finance_payroll_payment',
				),
			]
		case 'dispatch':
			return [
				bucket('dispatch-deliveries', 'Deliveries', rows, isDeliveryRow),
				bucket(
					'dispatch-available',
					'Fleet available',
					rows,
					isAvailableDriver,
				),
				bucket(
					'dispatch-unavailable',
					'Fleet unavailable',
					rows,
					isUnavailableDriver,
				),
			]
		case 'customer-service':
			return [
				bucket('support-messages', 'Messages', rows, isOpenMessage),
				bucket('support-email', 'Email', rows, isOpenEmail),
				bucket('support-resolved', 'Resolved', rows, isResolvedSupport),
			]
	}
}

export function buildSearchSummarySections(
	moduleId: SearchSummaryModuleId,
	rows: SearchDisplayIndexRow[],
): SearchSummaryBucket[] {
	switch (moduleId) {
		case 'sales':
			return [
				entitySection('sales-orders', 'Orders', rows, 'order'),
				entitySection('sales-history', 'Sales history', rows, 'sales_history'),
				entitySection('sales-approvals', 'Approvals', rows, 'approval'),
				entitySection('sales-customers', 'Customers', rows, 'customer'),
			]
		case 'inventory':
			return [
				bucket(
					'inventory-damaged',
					'Damaged stock',
					rows,
					isDamagedInventorySearchRow,
				),
				entitySection('inventory-items', 'Inventory items', rows, 'inventory'),
				entitySection('inventory-pricing', 'Price work', rows, 'pricing'),
				entitySection('inventory-categories', 'Categories', rows, 'category'),
				bucket('inventory-orders', 'Inventory orders', rows, isInventoryOrder),
				entitySection('inventory-suppliers', 'Suppliers', rows, 'supplier'),
			]
		case 'warehouse':
			return [
				entitySection('warehouse-tasks', 'Warehouse tasks', rows, 'warehouse'),
				entitySection(
					'warehouse-stock-levels',
					'Stock levels',
					rows,
					'inventory',
				),
				entitySection('warehouse-documents', 'Documents', rows, 'document'),
			]
		case 'finance':
			return [
				entitySection('finance-accounting', 'Accounting', rows, 'finance'),
				entitySection('finance-payroll', 'Payroll', rows, 'finance_payroll'),
				entitySection(
					'finance-payroll-payments',
					'Payroll payments',
					rows,
					'finance_payroll_payment',
				),
				entitySection(
					'finance-fuel',
					'Fuel expenses',
					rows,
					'finance_fuel_expense',
				),
				entitySection(
					'finance-company-assets',
					'Company assets',
					rows,
					'finance_company_asset',
				),
				bucket(
					'finance-activity',
					'Finance activity',
					rows,
					isFinanceActivitySearchRow,
				),
				entitySection('finance-inbox', 'Finance inbox', rows, 'payment'),
				bucket(
					'finance-customer-orders',
					'Customer orders',
					rows,
					isFinanceOrder,
				),
				entitySection('finance-approvals', 'Approvals', rows, 'approval'),
				entitySection('finance-documents', 'Documents', rows, 'document'),
			]
		case 'dispatch':
			return [
				entitySection('dispatch-deliveries', 'Deliveries', rows, 'dispatch'),
				entitySection('dispatch-fleet', 'Fleet', rows, 'driver'),
				entitySection(
					'dispatch-locations',
					'Driver locations',
					rows,
					'driver_location',
				),
			]
		case 'customer-service':
			return [
				entitySection('support-cases', 'Support cases', rows, 'support'),
				entitySection(
					'support-messages',
					'Support messages',
					rows,
					'support_message',
				),
				entitySection('support-customers', 'Customers', rows, 'customer'),
				entitySection('support-documents', 'Documents', rows, 'document'),
			]
	}
}

function bucket(
	id: string,
	label: string,
	rows: SearchDisplayIndexRow[],
	predicate: (row: SearchDisplayIndexRow) => boolean,
): SearchSummaryBucket {
	return { id, label, rows: rows.filter(predicate) }
}

function entitySection(
	id: string,
	label: string,
	rows: SearchDisplayIndexRow[],
	entityType: string,
): SearchSummaryBucket {
	return {
		id,
		label,
		rows: rows.filter((row) => row.entity_type === entityType),
	}
}

function rowStatusKey(row: SearchDisplayIndexRow): string {
	return normalizeToken(row.subtitle)
}

function rowSourceKey(row: SearchDisplayIndexRow): string {
	return normalizeToken(row.title)
}

function rowMetadataSourceKey(row: SearchDisplayIndexRow): string {
	return (
		normalizeToken(stringValue(metadataObject(row.metadata), 'source')) ||
		rowSourceKey(row)
	)
}

export function isDamagedInventorySearchRow(
	row: SearchDisplayIndexRow,
): boolean {
	const source = rowMetadataSourceKey(row)
	return (
		row.entity_type === 'finance' &&
		(source === 'finance_inventory_damage_lot' ||
			source === 'finance_inventory_damage_transaction')
	)
}

function isDamagedInventoryLotSearchRow(row: SearchDisplayIndexRow): boolean {
	return (
		row.entity_type === 'finance' &&
		rowMetadataSourceKey(row) === 'finance_inventory_damage_lot'
	)
}

function isFinanceActivitySearchRow(row: SearchDisplayIndexRow): boolean {
	const source = rowMetadataSourceKey(row)
	const metadata = metadataObject(row.metadata)
	const area = normalizeToken(
		stringValue(metadata, 'area') ??
			stringValue(metadata, 'department') ??
			row.subtitle,
	)
	return (
		row.entity_type === 'activity' &&
		(source === 'activity_finance_operating' ||
			source === 'activity_inventory_damage' ||
			area === 'finance')
	)
}

function rowPaymentStatusKey(row: SearchDisplayIndexRow): string {
	return normalizeToken(
		stringValue(metadataObject(row.metadata), 'payment_status') ??
			stringValue(metadataObject(row.metadata), 'status') ??
			row.subtitle,
	)
}

function isStatusOneOf(
	row: SearchDisplayIndexRow,
	statuses: readonly string[],
): boolean {
	return statuses.includes(rowStatusKey(row))
}

function isRejectedStatus(row: SearchDisplayIndexRow): boolean {
	return isStatusOneOf(row, [
		'canceled',
		'declined',
		'expired',
		'rejected',
		'returned',
	])
}

function isSubmittedOrder(row: SearchDisplayIndexRow): boolean {
	return row.entity_type === 'order' && rowStatusKey(row) === 'submitted'
}

function isRejectedOrder(row: SearchDisplayIndexRow): boolean {
	return row.entity_type === 'order' && isRejectedStatus(row)
}

function isAcceptedOrder(row: SearchDisplayIndexRow): boolean {
	return (
		row.entity_type === 'order' &&
		!isStatusOneOf(row, ['draft', 'saved']) &&
		!isSubmittedOrder(row) &&
		!isRejectedOrder(row)
	)
}

function isInventoryOrder(row: SearchDisplayIndexRow): boolean {
	return (
		row.entity_type === 'order' &&
		(rowStatusKey(row).includes('inventory') ||
			rowStatusKey(row).includes('stock'))
	)
}

function isStaleStock(row: SearchDisplayIndexRow): boolean {
	if (
		row.entity_type === 'pricing' &&
		rowMetadataSourceKey(row) === 'price_update_request'
	) {
		return !['completed', 'done', 'recorded', 'resolved'].includes(
			rowStatusKey(row),
		)
	}
	if (row.entity_type !== 'inventory') return false
	const updatedAt = metadataObject(row.metadata).updated_at
	if (typeof updatedAt !== 'string') return true
	const updated = new Date(updatedAt)
	if (Number.isNaN(updated.getTime())) return true
	const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
	return Date.now() - updated.getTime() > sevenDaysMs
}

function isLowStock(row: SearchDisplayIndexRow): boolean {
	if (row.entity_type !== 'inventory') return false
	const metadata = metadataObject(row.metadata)
	const available = numberValue(metadata, 'available_quantity')
	const minimum = numberValue(metadata, 'minimum_quantity')
	return (
		available !== null &&
		minimum !== null &&
		minimum > 0 &&
		available <= minimum
	)
}

function isWarehouseRejected(row: SearchDisplayIndexRow): boolean {
	if (row.entity_type !== 'warehouse') return false
	const rejectionReason = stringValue(
		metadataObject(row.metadata),
		'rejection_reason',
	)
	return rowStatusKey(row) === 'rejected' || Boolean(rejectionReason)
}

function isWarehouseLoading(row: SearchDisplayIndexRow): boolean {
	if (row.entity_type !== 'warehouse' || isWarehouseRejected(row)) return false
	if (stringValue(metadataObject(row.metadata), 'source') === 'loading_task') {
		return true
	}
	return ['approved', 'loading', 'pending'].includes(rowStatusKey(row))
}

function isWarehouseReceiving(row: SearchDisplayIndexRow): boolean {
	if (row.entity_type !== 'warehouse') return false
	if (
		stringValue(metadataObject(row.metadata), 'source') === 'receiving_task'
	) {
		return !isWarehouseRejected(row)
	}
	return rowStatusKey(row) === 'receiving'
}

function isPaidFinanceRow(row: SearchDisplayIndexRow): boolean {
	return (
		(row.entity_type === 'payment' || row.entity_type === 'finance') &&
		['completed', 'paid', 'settled'].includes(rowPaymentStatusKey(row))
	)
}

function isCustomerReceivable(row: SearchDisplayIndexRow): boolean {
	const source = rowMetadataSourceKey(row)
	return (
		(row.entity_type === 'payment' || row.entity_type === 'finance') &&
		(source === 'customer_payment' || source === 'finance_receivable') &&
		!isPaidFinanceRow(row)
	)
}

function isSupplierPayable(row: SearchDisplayIndexRow): boolean {
	const source = rowMetadataSourceKey(row)
	return (
		(row.entity_type === 'payment' || row.entity_type === 'finance') &&
		(source === 'supplier_payment' || source === 'finance_payable') &&
		!isPaidFinanceRow(row)
	)
}

function isFinanceOrder(row: SearchDisplayIndexRow): boolean {
	return (
		row.entity_type === 'order' &&
		!isQuoteRequestOrder(row) &&
		!isRejectedOrder(row)
	)
}

function isDeliveryRow(row: SearchDisplayIndexRow): boolean {
	return row.entity_type === 'dispatch'
}

function isAvailableDriver(row: SearchDisplayIndexRow): boolean {
	if (row.entity_type !== 'driver') return false
	const dispatchStatus = normalizeToken(
		stringValue(metadataObject(row.metadata), 'driver_status'),
	)
	return (
		isStatusOneOf(row, ['available', 'online']) ||
		dispatchStatus === 'available'
	)
}

function isUnavailableDriver(row: SearchDisplayIndexRow): boolean {
	return row.entity_type === 'driver' && !isAvailableDriver(row)
}

function isResolvedSupport(row: SearchDisplayIndexRow): boolean {
	return (
		row.entity_type === 'support' &&
		isStatusOneOf(row, ['closed', 'completed', 'done', 'resolved'])
	)
}

function supportSource(row: SearchDisplayIndexRow): string {
	const metadata = metadataObject(row.metadata)
	if (row.entity_type === 'support_message') {
		return normalizeToken(stringValue(metadata, 'channel'))
	}
	return normalizeToken(
		stringValue(metadata, 'source') ?? stringValue(metadata, 'channel'),
	)
}

function supportSubject(row: SearchDisplayIndexRow): string {
	return normalizeToken(stringValue(metadataObject(row.metadata), 'subject'))
}

function isOpenEmail(row: SearchDisplayIndexRow): boolean {
	if (!['support', 'support_message'].includes(row.entity_type)) return false
	if (isResolvedSupport(row)) return false
	return supportSource(row) === 'ticket' || supportSubject(row) === 'email'
}

function isOpenMessage(row: SearchDisplayIndexRow): boolean {
	if (!['support', 'support_message'].includes(row.entity_type)) return false
	if (isResolvedSupport(row)) return false
	return !isOpenEmail(row)
}
