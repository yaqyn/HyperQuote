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
	rejected: 'Rejected',
	reviewing: 'Reviewing',
	resolved: 'Resolved',
	saved: 'Saved',
	submitted: 'Submitted',
	ticket: 'Support ticket',
	under_review: 'Under review',
	unpaid: 'Unpaid',
}

const sourceLabels: Record<string, string> = {
	conversation: 'Conversation',
	customer_order: 'Customer order',
	customer_payment: 'Customer receipt',
	quote_request: 'Quote request',
	receiving_task: 'Warehouse receiving',
	supplier_payment: 'Supplier payment',
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
		assigned_employee: 'Assigned to',
		assigned_sales_rep: 'Sales rep',
		available_quantity: 'Available',
		base_salary: 'Base salary',
		brand: 'Brand',
		company_name: 'Customer',
		completed_at: 'Completed',
		current_exposure: 'Current exposure',
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
		good_quantity: 'Good from',
		hire_date: 'Hire date',
		is_ceo: 'CEO access',
		item_count: 'Items',
		item_summary: 'Items',
		last_seen_at: 'Last seen',
		lifetime_value: 'Lifetime value',
		minimum_quantity: 'Minimum',
		on_hand_quantity: 'On hand',
		order_number: 'Order',
		order_status: 'Order status',
		payment_fraction: 'Payment portion',
		payment_terms: 'Payment terms',
		phone: 'Phone',
		plate_number: 'Truck',
		preferred_suppliers: 'Suppliers',
		product_sku: 'SKU',
		product_name: 'Product',
		products: 'Products',
		project_name: 'Project',
		quote_items: 'Quoted items',
		quote_number: 'Quote',
		quantity: 'Quantity',
		rating: 'Rating',
		receiving_status: 'Receiving status',
		request_items: 'Requested items',
		rejection_reason: 'Rejection reason',
		refill_status: 'Refill status',
		request_number: 'Request',
		requester: 'Requester',
		reserved_quantity: 'Reserved',
		salary_currency: 'Salary currency',
		sku: 'SKU',
		source: 'Source',
		social_insurance_salary: 'Insurance salary',
		specialties: 'Specialties',
		status: 'Status',
		subject: 'Subject',
		submitted_by: 'Submitted by',
		submitted_at: 'Submitted',
		tier: 'Tier',
		title: 'Title',
		total_amount: 'Value',
		trade_license_status: 'Trade license',
		urgency: 'Urgency',
		updated_at: 'Updated',
		vehicle_label: 'Vehicle',
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
		case 'payment':
			return fields(
				previewField('Source', formatSource(row.title)),
				previewField('Stage', stage(row)),
				previewField('Amount', formatMoney(numberValue(metadata, 'amount'))),
				previewField('Customer', stringValue(metadata, 'company_name')),
				previewField('Supplier', stringValue(metadata, 'supplier_name')),
				previewField('Recorded by', stringValue(metadata, 'recorded_by')),
			)
		case 'inventory':
			return fields(
				previewField('SKU', stringValue(metadata, 'sku')),
				previewField(
					'Available',
					formatNumber(numberValue(metadata, 'available_quantity')),
				),
				previewField(
					'Reserved',
					formatNumber(numberValue(metadata, 'reserved_quantity')),
				),
				previewField('Suppliers', stringValue(metadata, 'preferred_suppliers')),
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
		case 'support':
			return fields(
				previewField('Stage', stage(row)),
				previewField('Channel', formatSource(stringValue(metadata, 'source'))),
				previewField('Requester', stringValue(metadata, 'requester')),
				previewField('Subject', stringValue(metadata, 'subject')),
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
		case 'activity':
			return fields(
				previewField('Action', humanizeIdentifier(row.title)),
				previewField('Area', humanizeIdentifier(row.subtitle)),
				previewField('When', formatDateTime(metadata.created_at)),
				previewField('Context', contextSummary(jsonValue(metadata, 'details'))),
			)
		default:
			return genericPreviewFields(row)
	}
}

export function buildSearchDisplayTitle(row: SearchDisplayIndexRow): string {
	switch (row.entity_type) {
		case 'activity':
			return humanizeIdentifier(row.title) ?? row.title
		case 'payment':
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
		case 'payment':
			return details(
				detailField('Payment source', formatSource(row.title)),
				detailField('Stage', stage(row)),
				detailField('Amount', formatMoney(numberValue(metadata, 'amount'))),
				detailField(
					'Payment portion',
					formatPercent(numberValue(metadata, 'payment_fraction')),
				),
				detailField('Order', stringValue(metadata, 'order_number')),
				detailField('Customer', stringValue(metadata, 'company_name')),
				detailField('Supplier', stringValue(metadata, 'supplier_name')),
				detailField('Product', stringValue(metadata, 'product_name')),
				detailField('Recorded by', stringValue(metadata, 'recorded_by')),
				detailField('Recorded', formatDateTime(metadata.created_at)),
			)
		case 'inventory':
			return details(
				detailField('Product', row.title),
				detailField('SKU', stringValue(metadata, 'sku')),
				detailField('Category', row.subtitle),
				detailField('Brand', stringValue(metadata, 'brand')),
				detailField('Suppliers', stringValue(metadata, 'preferred_suppliers')),
				detailField(
					'On hand',
					formatNumber(numberValue(metadata, 'on_hand_quantity')),
				),
				detailField(
					'Reserved',
					formatNumber(numberValue(metadata, 'reserved_quantity')),
				),
				detailField(
					'Available',
					formatNumber(numberValue(metadata, 'available_quantity')),
				),
				detailField(
					'Minimum required',
					formatNumber(numberValue(metadata, 'minimum_quantity')),
				),
				detailField(
					'Good from',
					formatNumber(numberValue(metadata, 'good_quantity')),
				),
				detailField('Last stock update', formatDateTime(metadata.updated_at)),
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
		case 'activity':
			return details(
				detailField('Action', humanizeIdentifier(row.title)),
				detailField('Area', humanizeIdentifier(row.subtitle)),
				detailField('When', formatDateTime(metadata.created_at)),
				detailField('Context', contextSummary(jsonValue(metadata, 'details'))),
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
			return [formatSource(row.title), stage(row)].filter(Boolean).join(' - ')
		case 'inventory':
			return [
				`${formatNumber(numberValue(metadata, 'available_quantity')) ?? '0'} available`,
				`${formatNumber(numberValue(metadata, 'minimum_quantity')) ?? '0'} minimum`,
			].join(' - ')
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
		case 'support':
			return [stage(row), stringValue(metadata, 'requester')]
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
				bucket('inventory-orders', 'Inventory orders', rows, isInventoryOrder),
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
				bucket('finance-paid', 'Paid', rows, isPaidFinanceRow),
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

function bucket(
	id: string,
	label: string,
	rows: SearchDisplayIndexRow[],
	predicate: (row: SearchDisplayIndexRow) => boolean,
): SearchSummaryBucket {
	return { id, label, rows: rows.filter(predicate) }
}

function rowStatusKey(row: SearchDisplayIndexRow): string {
	return normalizeToken(row.subtitle)
}

function rowSourceKey(row: SearchDisplayIndexRow): string {
	return normalizeToken(row.title)
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
	return available !== null && minimum !== null && available <= minimum
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
	return (
		row.entity_type === 'warehouse' &&
		rowStatusKey(row) === 'loading' &&
		!isWarehouseRejected(row)
	)
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
		row.entity_type === 'payment' &&
		isStatusOneOf(row, ['completed', 'paid', 'settled'])
	)
}

function isCustomerReceivable(row: SearchDisplayIndexRow): boolean {
	return (
		row.entity_type === 'payment' &&
		rowSourceKey(row) === 'customer_payment' &&
		!isPaidFinanceRow(row)
	)
}

function isSupplierPayable(row: SearchDisplayIndexRow): boolean {
	return (
		row.entity_type === 'payment' &&
		rowSourceKey(row) === 'supplier_payment' &&
		!isPaidFinanceRow(row)
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
	return normalizeToken(stringValue(metadataObject(row.metadata), 'source'))
}

function supportSubject(row: SearchDisplayIndexRow): string {
	return normalizeToken(stringValue(metadataObject(row.metadata), 'subject'))
}

function isOpenEmail(row: SearchDisplayIndexRow): boolean {
	if (row.entity_type !== 'support' || isResolvedSupport(row)) return false
	return supportSource(row) === 'ticket' || supportSubject(row) === 'email'
}

function isOpenMessage(row: SearchDisplayIndexRow): boolean {
	if (row.entity_type !== 'support' || isResolvedSupport(row)) return false
	return !isOpenEmail(row)
}
