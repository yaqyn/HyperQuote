import { db, hoursSince, type JsonObject, type JsonValue } from './db/db'

type SearchScalar = string | number | boolean | null

interface SearchField {
	label: string
	value: JsonValue
}

export interface SearchPreviewField {
	label: string
	value: SearchScalar
}

export interface SearchRow {
	tableId: SearchTableId
	tableLabel: string
	accent: string
	rowId: string
	title: string
	preview: SearchPreviewField[]
	details: SearchField[]
}

interface SearchResultRow extends SearchRow {
	matchedFields: string[]
}

interface SearchResultGroup {
	tableId: SearchTableId
	label: string
	accent: string
	rows: SearchResultRow[]
}

export interface SearchTableSummary {
	tableId: SearchTableId
	label: string
	accent: string
	rowCount: number
}

export interface SearchTableView extends SearchTableSummary {
	rows: SearchRow[]
}

export interface SearchResponse {
	query: string
	tables: SearchTableSummary[]
	tableMatches: SearchTableSummary[]
	results: SearchResultGroup[]
}

export type SearchSummaryModuleId =
	| 'sales'
	| 'inventory'
	| 'warehouse'
	| 'finance'
	| 'dispatch'
	| 'customer-service'

interface SearchSummaryPoint {
	id: string
	label: string
	count: number
}

interface SearchSummaryRow {
	id: string
	title: string
	tableLabel: string
	note: string | null
	preview: SearchPreviewField[]
	row: SearchRow
}

interface SearchSummarySection {
	id: string
	label: string
	count: number
	rows: SearchSummaryRow[]
}

export interface SearchModuleSummary {
	moduleId: SearchSummaryModuleId
	moduleLabel: string
	points: SearchSummaryPoint[]
	sections: SearchSummarySection[]
}

export interface SearchExecutiveBrief {
	generatedAt: string
	modules: SearchModuleSummary[]
}

interface SearchableField {
	label: string
	value: string
}

interface SearchTableDefinition<T extends object> {
	label: string
	accent: string
	rows: () => readonly T[]
	rowId: (row: T) => string
	title: (row: T) => string
	preview: (row: T) => SearchPreviewField[]
	searchable: (row: T) => SearchableField[]
	details?: (row: T) => SearchField[]
}

interface RegisteredSearchTable {
	label: string
	accent: string
	rows: () => readonly object[]
	rowId: (row: object) => string
	title: (row: object) => string
	preview: (row: object) => SearchPreviewField[]
	searchable: (row: object) => SearchableField[]
	details: (row: object) => SearchField[]
}

function defineTable<T extends object>(
	definition: SearchTableDefinition<T>,
): RegisteredSearchTable {
	return {
		label: definition.label,
		accent: definition.accent,
		// Heterogeneous tables need one erased registry shape; the cast stays
		// contained here so individual table definitions remain strongly typed.
		rows: definition.rows as () => readonly object[],
		rowId: (row) => definition.rowId(row as T),
		title: (row) => definition.title(row as T),
		preview: (row) => definition.preview(row as T),
		searchable: (row) => definition.searchable(row as T),
		details: (row) =>
			definition.details
				? definition.details(row as T)
				: detailsFromRecord(row),
	}
}

const formatMoney = (value: number) =>
	`${Math.round(value).toLocaleString()} EGP`
const findProductName = (slug: string) =>
	db.products.findBySlug(slug)?.name ?? slug
const customerName = (id: string) => db.customers.get(id)?.companyName ?? id

function searchable(label: string, value: unknown): SearchableField {
	return { label, value: flattenForSearch(value) }
}

function preview(label: string, value: SearchScalar): SearchPreviewField {
	return { label, value }
}

const SEARCH_TABLE_REGISTRY = {
	products: defineTable({
		label: 'Products',
		accent: '#F5F5F5',
		rows: () => db.products.list(),
		rowId: (row) => row.slug,
		title: (row) => row.name,
		preview: (row) => [
			preview('SKU', row.sku),
			preview('Category', row.category),
			preview('Brand', row.brand),
			preview('Availability', row.availability_status),
		],
		searchable: (row) => [
			searchable('Name', row.name),
			searchable('Arabic name', row.name_ar),
			searchable('SKU', row.sku),
			searchable('Slug', row.slug),
			searchable('Description', row.description),
			searchable('Category', row.category),
			searchable('Subcategory', row.subcategory),
			searchable('Brand', row.brand),
			searchable('Manufacturer', row.manufacturer),
			searchable('Tags', row.tags),
		],
	}),
	suppliers: defineTable({
		label: 'Suppliers',
		accent: '#E5E7EB',
		rows: () => db.suppliers.list(),
		rowId: (row) => row.name,
		title: (row) => row.name,
		preview: (row) => [
			preview('Tier', row.tier),
			preview('Terms', row.paymentTerms),
			preview('Phone', row.phone),
			preview('Rating', row.rating),
		],
		searchable: (row) => [
			searchable('Name', row.name),
			searchable('Tier', row.tier),
			searchable('Payment terms', row.paymentTerms),
			searchable('Phone', row.phone),
			searchable('Badges', row.customBadges),
		],
	}),
	supplierPrices: defineTable({
		label: 'Supplier Prices',
		accent: '#94A3B8',
		rows: () => db.supplierPrices.all(),
		rowId: (row) => row.id,
		title: (row) => `${findProductName(row.productSlug)} · ${row.supplierName}`,
		preview: (row) => [
			preview('Raw cost', formatMoney(row.rawCost)),
			preview('Lead time', `${row.leadTimeDays}d`),
			preview('MOQ', row.minOrderQty),
			preview('Primary', row.isPrimary ? 'yes' : 'no'),
		],
		searchable: (row) => [
			searchable('Product', findProductName(row.productSlug)),
			searchable('Product slug', row.productSlug),
			searchable('Supplier', row.supplierName),
			searchable('Notes', row.notes),
			searchable('Raw cost', row.rawCost),
		],
	}),
	rfqs: defineTable({
		label: 'RFQs',
		accent: '#D97706',
		rows: () => db.rfqs.list(),
		rowId: (row) => row.id,
		title: (row) => `${row.id} · ${row.customerName}`,
		preview: (row) => [
			preview('Status', row.status),
			preview('Value', formatMoney(row.estimatedValue)),
			preview('City', row.deliveryCity),
			preview('Assigned', row.assignedRep),
		],
		searchable: (row) => [
			searchable('ID', row.id),
			searchable('Customer', row.customerName),
			searchable('Contact', row.contactName),
			searchable('Address', row.deliveryAddress),
			searchable('City', row.deliveryCity),
			searchable('Status', row.status),
			searchable('Assigned rep', row.assignedRep),
			searchable(
				'Products',
				row.items.map((item) => findProductName(item.productSlug)),
			),
		],
	}),
	customers: defineTable({
		label: 'Customers',
		accent: '#22C55E',
		rows: () => db.customers.list(),
		rowId: (row) => row.id,
		title: (row) => row.companyName,
		preview: (row) => [
			preview('Contact', row.contactName),
			preview('City', row.city),
			preview('Tier', row.tier),
			preview('Status', row.status),
		],
		searchable: (row) => [
			searchable('ID', row.id),
			searchable('Company', row.companyName),
			searchable('Contact', row.contactName),
			searchable('Phone', row.phone),
			searchable('Email', row.email),
			searchable('Address', row.address),
			searchable('City', row.city),
			searchable('Tier', row.tier),
			searchable('Status', row.status),
			searchable('Assigned rep', row.assignedSalesRep),
		],
	}),
	quotes: defineTable({
		label: 'Quotes',
		accent: '#2563EB',
		rows: () => db.quotes.list(),
		rowId: (row) => row.id,
		title: (row) => `${row.quoteNumber} · ${customerName(row.customerId)}`,
		preview: (row) => [
			preview('Status', row.status),
			preview('Payment', row.paymentStatus),
			preview('Total due', formatMoney(row.totalDue)),
			preview('PO', row.customerPoNumber),
		],
		searchable: (row) => [
			searchable('ID', row.id),
			searchable('Quote number', row.quoteNumber),
			searchable('RFQ', row.rfqId),
			searchable('Customer', customerName(row.customerId)),
			searchable('Status', row.status),
			searchable('Payment status', row.paymentStatus),
			searchable('PO', row.customerPoNumber),
			searchable(
				'Products',
				row.items.map((item) => findProductName(item.productSlug)),
			),
		],
	}),
	priceUpdateRequests: defineTable({
		label: 'Price Update Requests',
		accent: '#F97316',
		rows: () => db.priceUpdateRequests.list(),
		rowId: (row) => row.id,
		title: (row) => `${findProductName(row.productSlug)} · ${row.status}`,
		preview: (row) => [
			preview('Status', row.status),
			preview('Customer', row.customerContext),
			preview('Requested', row.requestedAt.slice(0, 10)),
		],
		searchable: (row) => [
			searchable('ID', row.id),
			searchable('Product', findProductName(row.productSlug)),
			searchable('Product slug', row.productSlug),
			searchable('Customer context', row.customerContext),
			searchable('Status', row.status),
		],
	}),
	salesReps: defineTable({
		label: 'Sales Reps',
		accent: '#A855F7',
		rows: () => db.salesReps.list(),
		rowId: (row) => row.id,
		title: (row) => row.name,
		preview: (row) => [
			preview('Role', row.role),
			preview('Active RFQs', row.activeRfqs),
			preview('Territories', row.territories.join(', ')),
		],
		searchable: (row) => [
			searchable('ID', row.id),
			searchable('Name', row.name),
			searchable('Role', row.role),
			searchable('Specialization', row.specialization),
			searchable('Territories', row.territories),
		],
	}),
	orderReports: defineTable({
		label: 'Order Reports',
		accent: '#38BDF8',
		rows: () => db.orderReports.list(),
		rowId: (row) => row.id,
		title: (row) => `${row.id} · ${row.rfqId}`,
		preview: (row) => [
			preview('Stage', row.currentStage),
			preview('RFQ', row.rfqId),
			preview('Canceled', row.canceledReason),
		],
		searchable: (row) => [
			searchable('ID', row.id),
			searchable('RFQ', row.rfqId),
			searchable('Stage', row.currentStage),
			searchable('Canceled reason', row.canceledReason),
			searchable('Canceled note', row.canceledNote),
			searchable('Sections', row.sections),
		],
	}),
	stock: defineTable({
		label: 'Stock',
		accent: '#10B981',
		rows: () => db.stock.list(),
		rowId: (row) => row.productSlug,
		title: (row) => findProductName(row.productSlug),
		preview: (row) => [
			preview('On hand', row.stockLevel),
			preview('Reserved', row.reservedLevel),
			preview('Low mark', row.lowStockThreshold),
		],
		searchable: (row) => [
			searchable('Product', findProductName(row.productSlug)),
			searchable('Product slug', row.productSlug),
			searchable('Stock level', row.stockLevel),
			searchable('Reserved level', row.reservedLevel),
			searchable('Low stock threshold', row.lowStockThreshold),
		],
	}),
	deals: defineTable({
		label: 'Deals',
		accent: '#FACC15',
		rows: () => db.deals.list(),
		rowId: (row) => row.id,
		title: (row) => `${row.id} · ${row.supplierName}`,
		preview: (row) => [
			preview('Status', row.status),
			preview('Payment', row.paymentStatus),
			preview('Total due', formatMoney(row.totalDue)),
			preview('Items', row.items.length),
		],
		searchable: (row) => [
			searchable('ID', row.id),
			searchable('Supplier', row.supplierName),
			searchable('Status', row.status),
			searchable('Payment status', row.paymentStatus),
			searchable('Notes', row.notes),
			searchable(
				'Products',
				row.items.map((item) => findProductName(item.productSlug)),
			),
		],
	}),
	trucks: defineTable({
		label: 'Trucks',
		accent: '#06B6D4',
		rows: () => db.trucks.list(),
		rowId: (row) => row.id,
		title: (row) => row.plateNumber,
		preview: (row) => [
			preview('Driver', row.driverName),
			preview('Status', row.status),
			preview('Body', row.bodyType),
			preview('Capacity', `${row.capacityTons}t`),
		],
		searchable: (row) => [
			searchable('ID', row.id),
			searchable('Plate', row.plateNumber),
			searchable('Driver', row.driverName),
			searchable('Driver phone', row.driverPhone),
			searchable('Status', row.status),
			searchable('Body type', row.bodyType),
		],
	}),
	employees: defineTable({
		label: 'Employees',
		accent: '#F472B6',
		rows: () => db.employees.list(),
		rowId: (row) => row.id,
		title: (row) => row.name,
		preview: (row) => [
			preview('Phone', row.phone),
			preview('Arabic name', row.name_ar),
		],
		searchable: (row) => [
			searchable('ID', row.id),
			searchable('Name', row.name),
			searchable('Arabic name', row.name_ar),
			searchable('Phone', row.phone),
		],
	}),
	conversations: defineTable({
		label: 'Conversations',
		accent: '#64748B',
		rows: () => db.conversations.list(),
		rowId: (row) => row.id,
		title: (row) => `${row.ticketId ?? row.id} · ${row.subject}`,
		preview: (row) => [
			preview('Status', row.status),
			preview('Priority', row.priority),
			preview('Customer', customerName(row.customerId)),
			preview('Assigned', row.assignedToName),
		],
		searchable: (row) => [
			searchable('ID', row.id),
			searchable('Ticket', row.ticketId),
			searchable('Subject', row.subject),
			searchable('Customer', customerName(row.customerId)),
			searchable('Channel', row.channel),
			searchable('Status', row.status),
			searchable('Priority', row.priority),
			searchable('Assigned', row.assignedToName),
			searchable('Tags', row.tags),
			searchable(
				'Messages',
				row.messages.map((message) => message.content),
			),
			searchable(
				'Linked orders',
				row.linkedOrders.map((order) => order.displayId),
			),
			searchable(
				'Linked quotes',
				row.linkedQuotes.map((quote) => quote.displayId),
			),
		],
	}),
} as const

type SearchTableId = keyof typeof SEARCH_TABLE_REGISTRY

function isSearchTableId(tableId: string): tableId is SearchTableId {
	return tableId in SEARCH_TABLE_REGISTRY
}

function getSearchTables(): SearchTableSummary[] {
	return Object.entries(SEARCH_TABLE_REGISTRY).map(([tableId, table]) => ({
		tableId: tableId as SearchTableId,
		label: table.label,
		accent: table.accent,
		rowCount: table.rows().length,
	}))
}

function sectionWithDate(
	section: Record<string, unknown> | undefined,
	field: string,
): string | null {
	if (!section) return null
	const value = section[field]
	return typeof value === 'string' && value.length > 0 ? value : null
}

const SEARCH_SUMMARY_MODULE_IDS = [
	'sales',
	'inventory',
	'warehouse',
	'finance',
	'dispatch',
	'customer-service',
] as const satisfies readonly SearchSummaryModuleId[]

const MAX_SUMMARY_ROWS = 4

function isSearchSummaryModuleId(
	moduleId: string,
): moduleId is SearchSummaryModuleId {
	return SEARCH_SUMMARY_MODULE_IDS.some((id) => id === moduleId)
}

export function buildSearchExecutiveBrief(): SearchExecutiveBrief {
	return {
		generatedAt: new Date().toISOString(),
		modules: SEARCH_SUMMARY_MODULE_IDS.map(buildSearchModuleSummary),
	}
}

export function getSearchModuleSummary(
	moduleId: string,
): SearchModuleSummary | null {
	if (!isSearchSummaryModuleId(moduleId)) return null
	return buildSearchModuleSummary(moduleId)
}

function buildSearchModuleSummary(
	moduleId: SearchSummaryModuleId,
): SearchModuleSummary {
	switch (moduleId) {
		case 'sales':
			return buildSalesSummary()
		case 'inventory':
			return buildInventorySummary()
		case 'warehouse':
			return buildWarehouseSummary()
		case 'finance':
			return buildFinanceSummary()
		case 'dispatch':
			return buildDispatchSummary()
		case 'customer-service':
			return buildCustomerServiceSummary()
	}
}

function buildSalesSummary(): SearchModuleSummary {
	const rfqs = db.rfqs.list()
	const submitted = [...rfqs]
		.filter((rfq) => rfq.status === 'submitted')
		.sort((a, b) => timeValue(a.createdAt) - timeValue(b.createdAt))
	const rejected = rfqs.filter(
		(rfq) => rfq.status === 'declined' || rfq.status === 'expired',
	)
	const confirmed = db.quotes
		.list()
		.filter((quote) => quote.status === 'accepted')

	return moduleSummary('sales', 'Sales', [
		section(
			'submitted',
			'Submitted',
			submitted.length,
			rowsFor('rfqs', submitted),
		),
		section('rejected', 'Rejected', rejected.length, rowsFor('rfqs', rejected)),
		section(
			'confirmed',
			'Confirmed',
			confirmed.length,
			rowsFor('quotes', confirmed),
		),
	])
}

function buildInventorySummary(): SearchModuleSummary {
	const inventoryOrders = db.quotes.list().filter((quote) => {
		const report = db.orderReports.forRfq(quote.rfqId)
		return (
			quote.status === 'accepted' &&
			quote.paymentStatus !== 'unpaid' &&
			!report?.sections.inventory_orders
		)
	})
	const needsUpdate = db.supplierPrices
		.all()
		.filter((price) => price.isPrimary && hoursSince(price.lastQuotedAt) >= 24)
	const lowStock = db.stock.list().filter((row) => stockIsLow(row))

	return moduleSummary('inventory', 'Inventory', [
		section(
			'orders',
			'Orders',
			inventoryOrders.length,
			rowsFor('quotes', inventoryOrders),
		),
		section(
			'needs-update',
			'Needs update',
			needsUpdate.length,
			rowsFor('supplierPrices', needsUpdate),
		),
		section(
			'low-stock',
			'Low stock',
			lowStock.length,
			rowsFor('stock', lowStock),
		),
	])
}

function buildWarehouseSummary(): SearchModuleSummary {
	const loadingOrders = db.quotes.list().filter((quote) => {
		const report = db.orderReports.forRfq(quote.rfqId)
		const warehouse = report?.sections.warehouse
		return (
			quote.status === 'accepted' &&
			quote.paymentStatus !== 'unpaid' &&
			Boolean(report?.sections.inventory_orders) &&
			!sectionWithDate(warehouse, 'passedAt')
		)
	})
	const receiving = receivingDeals()
	const rejected = receiving.filter((deal) =>
		deal.receivingAttempts.some((attempt) => attempt.rejectedSlugs.length > 0),
	)

	return moduleSummary('warehouse', 'Warehouse', [
		section(
			'loading',
			'Loading',
			loadingOrders.length,
			rowsFor('quotes', loadingOrders),
		),
		section(
			'receiving',
			'Receiving',
			receiving.length,
			rowsFor('deals', receiving),
		),
		section(
			'rejected',
			'Rejected',
			rejected.length,
			rowsFor('deals', rejected),
		),
	])
}

function buildFinanceSummary(): SearchModuleSummary {
	const customerReceivables = db.quotes
		.list()
		.filter(
			(quote) => quote.status === 'accepted' && quote.paymentStatus !== 'paid',
		)
	const supplierPayables = db.deals
		.list()
		.filter((deal) => deal.paymentStatus !== 'paid')
	const paidQuotes = db.quotes
		.list()
		.filter(
			(quote) => quote.status === 'accepted' && quote.paymentStatus === 'paid',
		)
	const paidDeals = db.deals
		.list()
		.filter((deal) => deal.paymentStatus === 'paid')

	return moduleSummary('finance', 'Finance', [
		section(
			'in',
			'In',
			customerReceivables.length,
			rowsFor('quotes', customerReceivables),
		),
		section(
			'out',
			'Out',
			supplierPayables.length,
			rowsFor('deals', supplierPayables),
		),
		section(
			'completed',
			'Completed',
			paidQuotes.length + paidDeals.length,
			[...rowsFor('quotes', paidQuotes), ...rowsFor('deals', paidDeals)].slice(
				0,
				MAX_SUMMARY_ROWS,
			),
		),
	])
}

function buildDispatchSummary(): SearchModuleSummary {
	const deliveries = db.quotes.list().filter((quote) => {
		const report = db.orderReports.forRfq(quote.rfqId)
		const warehouse = report?.sections.warehouse
		return (
			quote.status === 'accepted' &&
			sectionWithDate(warehouse, 'passedAt') !== null &&
			!sectionWithDate(report?.sections.delivered, 'deliveredAt') &&
			!sectionWithDate(report?.sections.returned, 'returnedAt')
		)
	})
	const available = db.trucks
		.list()
		.filter((truck) => truck.status === 'available')
	const notAvailable = db.trucks
		.list()
		.filter((truck) => truck.status !== 'available')

	return moduleSummary('dispatch', 'Dispatch', [
		section(
			'deliveries',
			'Deliveries',
			deliveries.length,
			rowsFor('quotes', deliveries),
		),
		section(
			'fleet-available',
			'Fleet available',
			available.length,
			rowsFor('trucks', available),
		),
		section(
			'fleet-not-available',
			'Fleet not available',
			notAvailable.length,
			rowsFor('trucks', notAvailable),
		),
	])
}

function buildCustomerServiceSummary(): SearchModuleSummary {
	const conversations = db.conversations.list()
	const messages = conversations.filter(
		(conversation) => conversation.channel === 'live',
	)
	const emails = conversations.filter(
		(conversation) => conversation.channel === 'email',
	)
	const resolved = conversations.filter(
		(conversation) => conversation.status === 'resolved',
	)

	return moduleSummary('customer-service', 'Customer service', [
		section(
			'message',
			'Message',
			messages.length,
			rowsFor('conversations', messages),
		),
		section('email', 'Email', emails.length, rowsFor('conversations', emails)),
		section(
			'resolved',
			'Resolved',
			resolved.length,
			rowsFor('conversations', resolved),
		),
	])
}

function receivingDeals() {
	return db.deals
		.list()
		.filter(
			(deal) =>
				deal.paymentStatus !== 'unpaid' &&
				deal.status !== 'delivered' &&
				deal.status !== 'closed' &&
				deal.items.some((item) => !item.received),
		)
}

function stockIsLow(row: ReturnType<typeof db.stock.list>[number]): boolean {
	const available = Math.max(0, row.stockLevel - row.reservedLevel)
	return available <= row.lowStockThreshold
}

function moduleSummary(
	moduleId: SearchSummaryModuleId,
	moduleLabel: string,
	sections: SearchSummarySection[],
): SearchModuleSummary {
	return {
		moduleId,
		moduleLabel,
		points: sections.map((item) => ({
			id: item.id,
			label: item.label,
			count: item.count,
		})),
		sections,
	}
}

function section(
	id: string,
	label: string,
	count: number,
	rows: SearchSummaryRow[],
): SearchSummarySection {
	return { id, label, count, rows }
}

function rowsFor(
	tableId: SearchTableId,
	rows: readonly object[],
): SearchSummaryRow[] {
	const table = SEARCH_TABLE_REGISTRY[tableId]
	return rows
		.slice(0, MAX_SUMMARY_ROWS)
		.map((row) => summaryRow(serializeRow(tableId, table, row)))
}

function summaryRow(row: SearchRow): SearchSummaryRow {
	return {
		id: `${row.tableId}:${row.rowId}`,
		title: row.title,
		tableLabel: row.tableLabel,
		note: null,
		preview: row.preview.slice(0, 3),
		row,
	}
}

function timeValue(value: string | null): number {
	return value ? new Date(value).getTime() : 0
}

export function searchInternalDbRows(query: string): SearchResponse {
	const normalizedQuery = normalize(query)
	const tables = getSearchTables()
	if (!normalizedQuery) {
		return { query: '', tables, tableMatches: [], results: [] }
	}

	const tokens = tokenise(normalizedQuery)
	const tableMatches = tables.filter((table) =>
		matchesTokens(`${table.label} ${table.tableId}`, tokens),
	)
	const results: SearchResultGroup[] = []

	for (const [tableId, table] of Object.entries(SEARCH_TABLE_REGISTRY)) {
		const rows = table
			.rows()
			.map((row) => {
				const fields = table.searchable(row)
				const haystack = fields.map((field) => field.value).join(' ')
				if (!matchesTokens(haystack, tokens)) return null
				const matchedFields = fields
					.filter((field) => matchesAnyToken(field.value, tokens))
					.map((field) => field.label)
				return {
					...serializeRow(tableId as SearchTableId, table, row),
					matchedFields,
				}
			})
			.filter((row): row is SearchResultRow => row !== null)

		if (rows.length > 0) {
			results.push({
				tableId: tableId as SearchTableId,
				label: table.label,
				accent: table.accent,
				rows,
			})
		}
	}

	return { query: normalizedQuery, tables, tableMatches, results }
}

export function listSearchTableRows(tableId: string): SearchTableView | null {
	if (!isSearchTableId(tableId)) return null
	const table = SEARCH_TABLE_REGISTRY[tableId]
	return {
		tableId,
		label: table.label,
		accent: table.accent,
		rowCount: table.rows().length,
		rows: table.rows().map((row) => serializeRow(tableId, table, row)),
	}
}

function serializeRow(
	tableId: SearchTableId,
	table: RegisteredSearchTable,
	row: object,
): SearchRow {
	return {
		tableId,
		tableLabel: table.label,
		accent: table.accent,
		rowId: table.rowId(row),
		title: table.title(row),
		preview: table.preview(row),
		details: table.details(row),
	}
}

function detailsFromRecord(row: object): SearchField[] {
	return Object.entries(row).map(([key, value]) => ({
		label: labelFromKey(key),
		value: toSearchValue(value),
	}))
}

function toSearchValue(value: unknown): JsonValue {
	if (value === null) return null
	if (value === undefined) return null
	if (
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	) {
		return value
	}
	if (Array.isArray(value)) return value.map((entry) => toSearchValue(entry))
	if (typeof value === 'object') {
		const out: JsonObject = {}
		for (const [key, entry] of Object.entries(
			value as Record<string, unknown>,
		)) {
			out[key] = toSearchValue(entry)
		}
		return out
	}
	return String(value)
}

function flattenForSearch(value: unknown): string {
	if (value === null || value === undefined) return ''
	if (Array.isArray(value)) return value.map(flattenForSearch).join(' ')
	if (typeof value === 'object') {
		return Object.values(value as Record<string, unknown>)
			.map(flattenForSearch)
			.join(' ')
	}
	return String(value)
}

function normalize(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function tokenise(value: string): string[] {
	return value.split(' ').filter(Boolean)
}

function matchesTokens(value: string, tokens: string[]): boolean {
	const normalized = normalize(value)
	return tokens.every((token) => normalized.includes(token))
}

function matchesAnyToken(value: string, tokens: string[]): boolean {
	const normalized = normalize(value)
	return tokens.some((token) => normalized.includes(token))
}

function labelFromKey(key: string): string {
	return key
		.replace(/_/g, ' ')
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/\b\w/g, (letter) => letter.toUpperCase())
}
