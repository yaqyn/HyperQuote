import { OPS_ASSISTANT, SEARCH_ASSISTANT } from '@hyperquote/ai'
import type { JsonValue } from './db/types'
import {
	buildSearchDetailFields,
	buildSearchDisplayTitle,
	buildSearchPreviewFields,
	type SearchDisplayIndexRow,
} from './search-display'

export type InternalAiScope = 'employee' | 'search'

export interface InternalAiVtable {
	entityType: string
	keywords: readonly string[]
	label: string
	normalPanelAccess: boolean
	readEntities: readonly string[]
}

export interface InternalAiContextPackage {
	context: string
	fallbackText: string
	readEntities: string[]
	rows: SearchDisplayIndexRow[]
}

const NORMAL_PANEL_EXCLUDED_ENTITY_TYPES = new Set(['activity', 'employee'])
const FINANCE_ENTITY_TYPES = new Set([
	'finance',
	'finance_company_asset',
	'finance_fuel_expense',
	'finance_payroll',
	'finance_payroll_payment',
	'payment',
])
const FINANCE_READ_ENTITY_RE =
	/^ceo_search_(?:finance|payment)(?:_|$)|^ceo_search_inventory_damage_activity_vtable$/
const MAX_ROWS_PER_ENTITY = 6
const MAX_CONTEXT_LINES = 80
const MAX_FIELD_VALUE_LENGTH = 160

const INTERNAL_AI_VTABLES: readonly InternalAiVtable[] = [
	{
		entityType: 'order',
		keywords: ['order', 'orders', 'rfq', 'quote', 'quotes', 'sales'],
		label: 'Orders',
		normalPanelAccess: true,
		readEntities: [
			'ceo_search_order_vtable',
			'ceo_search_quote_request_vtable',
		],
	},
	{
		entityType: 'customer',
		keywords: ['customer', 'customers', 'client', 'contractor'],
		label: 'Customers',
		normalPanelAccess: true,
		readEntities: ['ceo_search_customer_vtable'],
	},
	{
		entityType: 'payment',
		keywords: ['finance', 'payment', 'payments', 'invoice', 'paid', 'cash'],
		label: 'Payments',
		normalPanelAccess: false,
		readEntities: ['ceo_search_payment_vtable'],
	},
	{
		entityType: 'finance',
		keywords: [
			'finance',
			'accounting',
			'ledger',
			'journal',
			'asset',
			'assets',
			'receivable',
			'receivables',
			'payable',
			'payables',
			'damage',
			'damaged',
			'write down',
			'write-down',
			'nrv',
			'cash flow',
			'income statement',
			'balance sheet',
			'payroll',
			'salary',
			'salaries',
			'bonus',
			'fuel',
			'truck fuel',
			'company asset',
			'company assets',
		],
		label: 'Finance accounting',
		normalPanelAccess: false,
		readEntities: [
			'ceo_search_finance_vtable',
			'ceo_search_finance_damage_vtable',
			'ceo_search_finance_activity_vtable',
			'ceo_search_finance_payroll_vtable',
			'ceo_search_finance_payroll_payment_vtable',
			'ceo_search_finance_fuel_vtable',
			'ceo_search_finance_company_asset_vtable',
			'ceo_search_inventory_damage_activity_vtable',
		],
	},
	{
		entityType: 'approval',
		keywords: ['approval', 'approvals', 'approve', 'pending approval'],
		label: 'Approvals',
		normalPanelAccess: true,
		readEntities: ['ceo_search_approval_vtable'],
	},
	{
		entityType: 'inventory',
		keywords: [
			'inventory',
			'stock',
			'material',
			'materials',
			'product',
			'damage',
			'damaged',
		],
		label: 'Inventory',
		normalPanelAccess: true,
		readEntities: [
			'ceo_search_inventory_vtable',
			'ceo_search_finance_damage_vtable',
			'ceo_search_inventory_damage_activity_vtable',
		],
	},
	{
		entityType: 'pricing',
		keywords: ['price', 'pricing', 'margin', 'cost', 'outdated price'],
		label: 'Pricing',
		normalPanelAccess: true,
		readEntities: ['ceo_search_pricing_vtable'],
	},
	{
		entityType: 'category',
		keywords: ['category', 'categories'],
		label: 'Categories',
		normalPanelAccess: true,
		readEntities: ['ceo_search_category_vtable'],
	},
	{
		entityType: 'warehouse',
		keywords: ['warehouse', 'loading', 'receiving', 'received'],
		label: 'Warehouse',
		normalPanelAccess: true,
		readEntities: [
			'ceo_search_warehouse_vtable',
			'ceo_search_receiving_vtable',
		],
	},
	{
		entityType: 'dispatch',
		keywords: ['dispatch', 'delivery', 'deliveries'],
		label: 'Dispatch',
		normalPanelAccess: true,
		readEntities: ['ceo_search_dispatch_vtable'],
	},
	{
		entityType: 'driver',
		keywords: ['driver', 'drivers', 'fleet'],
		label: 'Drivers',
		normalPanelAccess: true,
		readEntities: ['ceo_search_driver_vtable'],
	},
	{
		entityType: 'driver_location',
		keywords: ['location', 'gps', 'map', 'tracking', 'driver location'],
		label: 'Driver locations',
		normalPanelAccess: true,
		readEntities: ['ceo_search_driver_location_vtable'],
	},
	{
		entityType: 'support',
		keywords: ['support', 'ticket', 'tickets', 'customer service'],
		label: 'Support',
		normalPanelAccess: true,
		readEntities: ['ceo_search_support_vtable'],
	},
	{
		entityType: 'support_message',
		keywords: ['message', 'messages', 'reply', 'replies', 'whatsapp'],
		label: 'Support messages',
		normalPanelAccess: true,
		readEntities: ['ceo_search_support_message_vtable'],
	},
	{
		entityType: 'supplier',
		keywords: ['supplier', 'suppliers', 'vendor', 'vendors'],
		label: 'Suppliers',
		normalPanelAccess: true,
		readEntities: ['ceo_search_supplier_vtable'],
	},
	{
		entityType: 'sales_history',
		keywords: ['version', 'versions', 'call note', 'sales history'],
		label: 'Sales history',
		normalPanelAccess: true,
		readEntities: ['ceo_search_sales_history_vtable'],
	},
	{
		entityType: 'document',
		keywords: ['document', 'documents', 'proof', 'proofs', 'attachment'],
		label: 'Documents',
		normalPanelAccess: true,
		readEntities: ['ceo_search_document_vtable'],
	},
	{
		entityType: 'employee',
		keywords: ['employee', 'employees', 'staff', 'team', 'salary'],
		label: 'Employees',
		normalPanelAccess: false,
		readEntities: ['ceo_search_employee_vtable'],
	},
	{
		entityType: 'finance_payroll',
		keywords: ['payroll', 'salary', 'salaries', 'social insurance'],
		label: 'Finance payroll',
		normalPanelAccess: false,
		readEntities: [
			'ceo_search_finance_payroll_vtable',
			'ceo_search_finance_payroll_payment_vtable',
		],
	},
	{
		entityType: 'finance_payroll_payment',
		keywords: ['salary paid', 'bonus paid', 'payroll payment'],
		label: 'Payroll payments',
		normalPanelAccess: false,
		readEntities: ['ceo_search_finance_payroll_payment_vtable'],
	},
	{
		entityType: 'finance_fuel_expense',
		keywords: ['fuel', 'fuel expense', 'truck fuel', 'diesel'],
		label: 'Fuel expenses',
		normalPanelAccess: false,
		readEntities: ['ceo_search_finance_fuel_vtable'],
	},
	{
		entityType: 'finance_company_asset',
		keywords: ['company asset', 'company assets', 'building', 'vehicle'],
		label: 'Company assets',
		normalPanelAccess: false,
		readEntities: ['ceo_search_finance_company_asset_vtable'],
	},
	{
		entityType: 'activity',
		keywords: ['activity', 'activities', 'audit', 'event', 'history'],
		label: 'Activities',
		normalPanelAccess: false,
		readEntities: [
			'ceo_search_activity_vtable',
			'ceo_search_inventory_damage_activity_vtable',
		],
	},
]

export function resolveInternalAiScope({
	panelId,
}: {
	panelId?: string | null
}): InternalAiScope {
	if (panelId === 'search') return 'search'
	return 'employee'
}

export function searchQueryFromPrompt(userText: string): string {
	return userText.replace(/^search internal database for:\s*/i, '').trim()
}

function isFinancePanelAi({
	panelId,
	scope,
}: {
	panelId?: string | null
	scope: InternalAiScope
}): boolean {
	return scope === 'search' || panelId === 'finance'
}

export function allowedInternalAiVtables(
	scope: InternalAiScope,
	panelId?: string | null,
): InternalAiVtable[] {
	if (scope === 'search') return [...INTERNAL_AI_VTABLES]
	const canReadFinance = isFinancePanelAi({ panelId, scope })
	return INTERNAL_AI_VTABLES.filter(
		(vtable) =>
			(vtable.normalPanelAccess ||
				(canReadFinance && FINANCE_ENTITY_TYPES.has(vtable.entityType))) &&
			!NORMAL_PANEL_EXCLUDED_ENTITY_TYPES.has(vtable.entityType),
	)
}

export function requestedInternalAiEntityTypes({
	panelId,
	query,
	scope,
}: {
	panelId?: string | null
	query: string
	scope: InternalAiScope
}): string[] {
	const allowed = allowedInternalAiVtables(scope, panelId)
	const lower = query.toLowerCase()
	const matches = allowed.filter((vtable) =>
		vtable.keywords.some((keyword) => lower.includes(keyword)),
	)
	return (matches.length > 0 ? matches : allowed).map(
		(vtable) => vtable.entityType,
	)
}

export function normalPanelExcludedRequest(
	userText: string,
	panelId?: string | null,
): string | null {
	const lower = userText.toLowerCase()
	if (/\b(activities|activity|audit log|audit history)\b/.test(lower)) {
		return 'Normal internal AI cannot read activity history. Open Search for audited activity analysis.'
	}
	if (/\b(employee|employees|staff)\b/.test(lower)) {
		return 'Normal internal AI cannot read employee information. Open Search for employee-aware analysis.'
	}
	if (
		panelId !== 'finance' &&
		/\b(finance|accounting|ledger|journal|payroll|salary|salaries|bonus|fuel expense|truck fuel|company asset|company assets|receivable|receivables|payable|payables|cash flow|income statement|balance sheet|write[- ]?off|write[- ]?down|nrv|payment|payments|invoice|refund)\b/.test(
			lower,
		)
	) {
		return 'Normal panel AI cannot read finance records. Use Finance AI for finance data or Search AI for CEO-wide analysis.'
	}
	return null
}

export function internalAiPolicyRefusal(
	userText: string,
	scope: InternalAiScope,
	panelId?: string | null,
): string | null {
	const lower = userText.toLowerCase()
	const asksWrite =
		/\b(approve|assign|cancel|delete|reject)\b/.test(lower) ||
		/\b(update|change)\s+(?:the\s+)?(?:status|price)\b/.test(lower) ||
		/\bmark\s+(?:as\s+)?delivered\b/.test(lower)
	if (asksWrite) {
		return scope === 'search'
			? 'Search AI is read-only. Use the normal authorized panel action for workflow changes.'
			: 'Normal internal AI is read-only. Use the authorized app action so the backend can enforce role checks, proof requirements, and activity history.'
	}
	if (
		lower.includes('raw export') ||
		lower.includes('secret') ||
		lower.includes('token') ||
		lower.includes('api key')
	) {
		return 'I cannot reveal raw exports, secrets, tokens, or credentials.'
	}
	if (scope === 'employee') {
		return normalPanelExcludedRequest(userText, panelId)
	}
	return null
}

function readEntitiesForRows({
	panelId,
	rows,
	scope,
}: {
	panelId?: string | null
	rows: SearchDisplayIndexRow[]
	scope: InternalAiScope
}): string[] {
	return readEntitiesForEntityTypes({
		entityTypes: rows.map((row) => row.entity_type),
		panelId,
		scope,
	})
}

function readEntitiesForEntityTypes({
	entityTypes,
	panelId,
	scope,
}: {
	entityTypes: string[]
	panelId?: string | null
	scope: InternalAiScope
}): string[] {
	const byEntityType = new Map(
		allowedInternalAiVtables(scope, panelId).map((vtable) => [
			vtable.entityType,
			vtable,
		]),
	)
	const entities = entityTypes.flatMap(
		(entityType) => byEntityType.get(entityType)?.readEntities ?? [],
	)
	if (scope === 'search') entities.unshift('ceo_search_index')
	const canReadFinance = isFinancePanelAi({ panelId, scope })
	return [
		...new Set(
			entities.filter(
				(entity) => canReadFinance || !FINANCE_READ_ENTITY_RE.test(entity),
			),
		),
	]
}

export function buildInternalAiContextPackage({
	panelId,
	query,
	queriedEntityTypes,
	rows,
	scope,
}: {
	panelId?: string | null
	query: string
	queriedEntityTypes?: string[]
	rows: SearchDisplayIndexRow[]
	scope: InternalAiScope
}): InternalAiContextPackage {
	const readEntities = queriedEntityTypes
		? readEntitiesForEntityTypes({
				entityTypes: queriedEntityTypes,
				panelId,
				scope,
			})
		: readEntitiesForRows({ panelId, rows, scope })
	const grouped = groupRows(rows)
	const accessLine =
		scope === 'search'
			? 'Search panel AI can read all approved internal vtables, including employees and activities.'
			: panelId === 'finance'
				? 'Finance panel AI can read finance/payment vtables plus normal operational context, but not employee directory or activity history.'
				: 'Normal internal AI can read operational vtables except finance records, employee information, and activities.'
	const lines = [
		`Mode: ${
			scope === 'search'
				? 'Search panel AI'
				: panelId === 'finance'
					? 'Finance panel AI'
					: 'Normal internal AI'
		}`,
		`User query: ${query || 'general operational summary'}`,
		accessLine,
		'Use only the records below. Do not invent missing values. Stay read-only.',
	]

	if (rows.length === 0) {
		lines.push('No matching allowed records were found.')
	} else {
		for (const [entityType, entityRows] of Object.entries(grouped)) {
			const label =
				INTERNAL_AI_VTABLES.find((vtable) => vtable.entityType === entityType)
					?.label ?? entityType
			lines.push(`${label} (${entityRows.length})`)
			for (const row of entityRows.slice(0, MAX_ROWS_PER_ENTITY)) {
				lines.push(`- ${formatContextRow(row)}`)
			}
		}
	}

	const context = lines.slice(0, MAX_CONTEXT_LINES).join('\n')
	return {
		context,
		fallbackText: buildFallbackAnswer({ panelId, query, rows, scope }),
		readEntities,
		rows,
	}
}

export function buildInternalAiSystemPrompt({
	context,
	panelId,
	scope,
}: {
	context: string
	panelId?: string | null
	scope: InternalAiScope
}): string {
	const base = scope === 'search' ? SEARCH_ASSISTANT : OPS_ASSISTANT
	const mode =
		scope === 'search'
			? 'Search panel mode'
			: panelId === 'finance'
				? 'Finance panel mode'
				: 'Normal internal mode'
	return `${base}

Internal AI contract:
- Active mode: ${mode}.
- Normal internal mode may use operational vtable context except finance records, employee information, and activities.
- Finance panel mode may use finance/payment vtable context plus normal operational context, but not employee directory or activity history.
- Search panel mode may use all approved vtable context.
- Never perform writes from chat. If the user asks for an action, point to the authorized panel action.
- Keep answers natural and specific. Mention exact names, numbers, statuses, dates, and panels when present.
- Do not tell the user to open another panel just to find records already supplied in context. Answer from the supplied records first.
- Do not use tutorial language, "Next step" headings, or generic navigation advice.
- Do not describe the context as the current screen, current data set, or on-screen data.
- If context is missing, say what is missing instead of guessing.

Approved context:
${context}`
}

export function buildInternalAiToolSystemPrompt({
	panelId,
	scope,
}: {
	panelId?: string | null
	scope: InternalAiScope
}): string {
	const base = scope === 'search' ? SEARCH_ASSISTANT : OPS_ASSISTANT
	const mode =
		scope === 'search'
			? 'Search panel mode'
			: panelId === 'finance'
				? 'Finance panel mode'
				: 'Normal internal mode'
	return `${base}

Internal AI tool contract:
- Active mode: ${mode}.
- Tools are the source of truth for company records.
- When the user asks about operational records, call search_internal_records before answering.
- Infer the user's target from natural, messy, slangy, misspelled, repeated, or casual text. Do not require exact keywords from the user.
- Choose entity_types for the records the user wants. Put only meaningful filters in query. If the user only asks to list records, set query to an empty string.
- Normal internal mode may read operational vtable context except finance records, employee information, and activities.
- Finance panel mode may read finance/payment vtable context plus normal operational context, but not employee directory or activity history.
- Search panel mode may read all approved vtable context, including employees and activities.
- Never perform writes from chat. If the user asks for an action, point to the authorized panel action.
- If a tool result has records, answer from those records. Do not tell the user to open another panel just to find them.
- Do not use tutorial language, "Next step" headings, or generic navigation advice.
- Do not describe tool results as the current screen, current data set, or on-screen data.`
}

function buildFallbackAnswer({
	panelId,
	query,
	rows,
	scope,
}: {
	panelId?: string | null
	query: string
	rows: SearchDisplayIndexRow[]
	scope: InternalAiScope
}): string {
	if (rows.length === 0) {
		return scope === 'search'
			? `Search panel AI checked all approved vtables for "${query || 'general operational summary'}" and found no matching records.`
			: panelId === 'finance'
				? `Finance panel AI checked finance and allowed operational vtables for "${query || 'general operational summary'}" and found no matching records. Employee directory and activities were not read.`
				: `Normal internal AI checked allowed operational vtables for "${query || 'general operational summary'}" and found no matching records. Finance records, employee information, and activities were not read.`
	}

	const grouped = groupRows(rows)
	const lines = [
		scope === 'search'
			? `Search panel AI read the approved vtable context for "${query || 'general operational summary'}".`
			: panelId === 'finance'
				? `Finance panel AI read finance and allowed operational vtable context for "${query || 'general operational summary'}". Employee directory and activities were not read.`
				: `Normal internal AI read allowed operational vtable context for "${query || 'general operational summary'}". Finance records, employee information, and activities were not read.`,
	]
	for (const [entityType, entityRows] of Object.entries(grouped)) {
		const label =
			INTERNAL_AI_VTABLES.find((vtable) => vtable.entityType === entityType)
				?.label ?? entityType
		lines.push(`${label}: ${entityRows.length}`)
		for (const row of entityRows.slice(0, 3)) {
			lines.push(`- ${formatContextRow(row)}`)
		}
	}
	return lines.join('\n')
}

function groupRows(
	rows: SearchDisplayIndexRow[],
): Record<string, SearchDisplayIndexRow[]> {
	const grouped: Record<string, SearchDisplayIndexRow[]> = {}
	for (const row of rows) {
		const bucket = grouped[row.entity_type] ?? []
		bucket.push(row)
		grouped[row.entity_type] = bucket
	}
	return grouped
}

function formatContextRow(row: SearchDisplayIndexRow): string {
	const title = buildSearchDisplayTitle(row)
	const fields = mergeFields([
		...buildSearchPreviewFields(row),
		...buildSearchDetailFields(row),
	])
		.filter((field) => field.label !== 'Story')
		.slice(0, 8)
		.map((field) => `${field.label}: ${formatContextValue(field.value)}`)
		.filter((field) => field.trim().length > 0)
	const suffix = fields.length > 0 ? ` | ${fields.join(' | ')}` : ''
	return truncateText(`${title}${suffix}`, 900)
}

function mergeFields(
	fields: Array<{ label: string; value: JsonValue }>,
): Array<{ label: string; value: JsonValue }> {
	const seen = new Set<string>()
	const merged: Array<{ label: string; value: JsonValue }> = []
	for (const field of fields) {
		const key = `${field.label}:${String(field.value)}`
		if (seen.has(key)) continue
		seen.add(key)
		merged.push(field)
	}
	return merged
}

function formatContextValue(value: JsonValue): string {
	if (value === null) return 'not set'
	if (typeof value === 'string')
		return truncateText(value, MAX_FIELD_VALUE_LENGTH)
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value)
	}
	if (Array.isArray(value)) {
		return truncateText(value.map(formatContextValue).join(', '), 220)
	}
	return truncateText(JSON.stringify(value), 220)
}

function truncateText(value: string, maxLength: number): string {
	return value.length > maxLength
		? `${value.slice(0, maxLength - 1)}...`
		: value
}
