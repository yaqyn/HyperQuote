import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
	buildSearchDetailFields,
	buildSearchDisplayTitle,
	buildSearchMatchedFieldLabels,
	buildSearchPreviewFields,
	buildSearchSummaryBuckets,
	buildSearchSummaryNote,
	buildSearchSummarySections,
	type SearchDisplayIndexRow,
} from '../search-display'
import { searchPattern, searchTokens } from '../search-query'
import type {
	SearchActivityFeed,
	SearchExecutiveBrief,
	SearchModuleSummary,
	SearchResponse,
	SearchRow,
	SearchSummaryModuleId,
	SearchTableSummary,
	SearchTableView,
} from '../search-registry'

type SearchTableId = SearchTableSummary['tableId']
type SearchResultGroup = SearchResponse['results'][number]
type SearchResultRow = SearchResultGroup['rows'][number]

interface SearchIndexRow extends SearchDisplayIndexRow {}

interface FetchSearchRowsOptions {
	search?: string
	entityType?: string
	limit?: number
}

interface SearchTableConfig {
	tableId: SearchTableId
	entityType: string
	label: string
	accent: string
}

const SEARCH_TABLES: SearchTableConfig[] = [
	{
		tableId: 'orders',
		entityType: 'order',
		label: 'Orders',
		accent: '#F5F5F5',
	},
	{
		tableId: 'customers',
		entityType: 'customer',
		label: 'Customers',
		accent: '#CBD5E1',
	},
	{
		tableId: 'payments',
		entityType: 'payment',
		label: 'Payments',
		accent: '#C4B5FD',
	},
	{
		tableId: 'employees',
		entityType: 'employee',
		label: 'Employees',
		accent: '#DDD6FE',
	},
	{
		tableId: 'approvals',
		entityType: 'approval',
		label: 'Approvals',
		accent: '#E5E7EB',
	},
	{
		tableId: 'inventory',
		entityType: 'inventory',
		label: 'Inventory',
		accent: '#A7F3D0',
	},
	{
		tableId: 'pricing',
		entityType: 'pricing',
		label: 'Pricing',
		accent: '#D1D5DB',
	},
	{
		tableId: 'categories',
		entityType: 'category',
		label: 'Categories',
		accent: '#E5E7EB',
	},
	{
		tableId: 'warehouse',
		entityType: 'warehouse',
		label: 'Warehouse',
		accent: '#FDE68A',
	},
	{
		tableId: 'dispatch',
		entityType: 'dispatch',
		label: 'Dispatch',
		accent: '#93C5FD',
	},
	{
		tableId: 'drivers',
		entityType: 'driver',
		label: 'Drivers',
		accent: '#BFDBFE',
	},
	{
		tableId: 'driver-locations',
		entityType: 'driver_location',
		label: 'Driver locations',
		accent: '#DBEAFE',
	},
	{
		tableId: 'support',
		entityType: 'support',
		label: 'Support',
		accent: '#FBCFE8',
	},
	{
		tableId: 'support-messages',
		entityType: 'support_message',
		label: 'Support messages',
		accent: '#FCE7F3',
	},
	{
		tableId: 'suppliers',
		entityType: 'supplier',
		label: 'Suppliers',
		accent: '#E5E7EB',
	},
	{
		tableId: 'sales-history',
		entityType: 'sales_history',
		label: 'Sales history',
		accent: '#F5F5F5',
	},
	{
		tableId: 'documents',
		entityType: 'document',
		label: 'Documents',
		accent: '#E5E7EB',
	},
	{
		tableId: 'activity',
		entityType: 'activity',
		label: 'Activity',
		accent: '#D9F99D',
	},
]

const SEARCH_DOMAIN_TERMS: Record<string, readonly string[]> = {
	activity: ['activity', 'activities', 'audit', 'history'],
	approval: ['approval', 'approvals'],
	category: ['category', 'categories'],
	customer: ['customer', 'customers', 'client', 'clients'],
	dispatch: ['dispatch', 'delivery', 'deliveries'],
	document: ['document', 'documents', 'proof', 'proofs'],
	driver: ['driver', 'drivers', 'fleet'],
	driver_location: ['location', 'locations', 'gps', 'tracking', 'map'],
	employee: ['employee', 'employees', 'staff', 'team'],
	inventory: ['inventory', 'stock', 'products', 'materials'],
	order: ['order', 'orders', 'quote', 'quotes', 'sales'],
	payment: ['finance', 'payment', 'payments', 'invoice', 'invoices'],
	pricing: ['price', 'prices', 'pricing', 'cost', 'costs'],
	sales_history: ['version', 'versions', 'history', 'calls'],
	supplier: ['supplier', 'suppliers', 'vendor', 'vendors'],
	support: ['support', 'ticket', 'tickets'],
	support_message: ['message', 'messages', 'whatsapp', 'reply', 'replies'],
	warehouse: ['warehouse', 'loading', 'receiving'],
}

const SEARCH_DOMAIN_STOP_TOKENS = new Set(['all', 'and', 'or', 'plus', 'with'])

const MODULE_TABLES: Record<SearchSummaryModuleId, SearchTableId[]> = {
	sales: ['orders', 'sales-history', 'customers', 'approvals'],
	inventory: ['inventory', 'pricing', 'categories', 'suppliers'],
	warehouse: ['warehouse', 'inventory', 'documents'],
	finance: ['payments', 'orders', 'approvals', 'documents'],
	dispatch: ['dispatch', 'drivers', 'driver-locations', 'documents'],
	'customer-service': ['support', 'support-messages', 'customers', 'documents'],
}

const MODULE_LABELS: Record<SearchSummaryModuleId, string> = {
	sales: 'Sales',
	inventory: 'Inventory',
	warehouse: 'Warehouse',
	finance: 'Finance',
	dispatch: 'Dispatch',
	'customer-service': 'Customer service',
}

const SEARCH_ROW_SELECT =
	'entity_type, entity_id, title, subtitle, metadata, sort_at, search_text'
const SEARCH_RESULT_GROUP_LIMIT = 8
const SEARCH_TABLE_LIMIT = 500
const SEARCH_SUMMARY_ENTITY_LIMIT = 5000
const SEARCH_ACTIVITY_LIMIT = 5000
const SEARCH_PAGE_SIZE = 1000
const SEARCH_SUMMARY_MODULES = Object.keys(
	MODULE_TABLES,
) as SearchSummaryModuleId[]
const SUMMARY_ENTITY_TYPES: Record<SearchSummaryModuleId, string[]> = {
	sales: ['order', 'sales_history', 'customer', 'approval'],
	inventory: ['inventory', 'pricing', 'category', 'order', 'supplier'],
	warehouse: ['warehouse', 'inventory', 'document'],
	finance: ['payment', 'order', 'approval', 'document'],
	dispatch: ['dispatch', 'driver', 'driver_location', 'document'],
	'customer-service': ['support', 'support_message', 'customer', 'document'],
}

const ACTIVITY_DOMAINS = [
	{ id: 'all', label: 'All activity' },
	{ id: 'sales', label: 'Sales' },
	{ id: 'inventory', label: 'Inventory' },
	{ id: 'warehouse', label: 'Warehouse' },
	{ id: 'finance', label: 'Finance' },
	{ id: 'dispatch', label: 'Dispatch' },
	{ id: 'customer-service', label: 'Customer service' },
	{ id: 'procurement', label: 'Procurement' },
	{ id: 'admin', label: 'Admin' },
	{ id: 'other', label: 'Other' },
] as const

async function requireSearchClient() {
	const { getInternalSupabaseClient } = await import('./_supabase')
	const auth = await getInternalSupabaseClient()
	if (!auth) throw new Error('search_employee_session_required')
	const { data, error } = await auth.client.rpc('can_access_ceo_search')
	if (error) throw new Error(error.message)
	if (data !== true) throw new Error('ceo_search_required')
	await refreshSearchDocumentsIfDirty(auth.client)
	return auth.client
}

function tableConfig(tableId: string): SearchTableConfig | null {
	return SEARCH_TABLES.find((table) => table.tableId === tableId) ?? null
}

function tableForEntity(entityType: string): SearchTableConfig | null {
	return SEARCH_TABLES.find((table) => table.entityType === entityType) ?? null
}

function toSearchRow(row: SearchIndexRow): SearchRow | null {
	const table = tableForEntity(row.entity_type)
	if (!table) return null
	return {
		tableId: table.tableId,
		tableLabel: table.label,
		accent: table.accent,
		rowId: row.entity_id,
		title: buildSearchDisplayTitle(row),
		preview: buildSearchPreviewFields(row),
		details: buildSearchDetailFields(row),
	}
}

function matchedFields(row: SearchIndexRow, query: string): string[] {
	return buildSearchMatchedFieldLabels(row, query)
}

type SearchClient = Awaited<ReturnType<typeof requireSearchClient>>

async function refreshSearchDocumentsIfDirty(client: SearchClient) {
	const { error } = await client.rpc('refresh_ceo_search_documents_if_dirty')
	if (error) throw new Error(error.message)
}

function baseSearchQuery(client: SearchClient) {
	return client
		.from('ceo_search_documents')
		.select(SEARCH_ROW_SELECT)
		.order('sort_at', { ascending: false })
		.order('title', { ascending: true })
}

function filteredSearchQuery(
	client: SearchClient,
	options: FetchSearchRowsOptions,
) {
	let query = baseSearchQuery(client)
	if (options.entityType) {
		query = query.eq('entity_type', options.entityType)
	}
	const search = options.search?.trim()
	if (search) {
		const tokens = searchTokens(search)
		for (const token of tokens.length > 0 ? tokens : [search]) {
			query = query.ilike('search_text', searchPattern(token))
		}
	}
	return query
}

function entityTypesForDomainOnlySearch(search: string): string[] {
	const tokens = searchTokens(search).filter(
		(token) => !SEARCH_DOMAIN_STOP_TOKENS.has(token),
	)
	if (tokens.length < 2) return []

	const allDomainTerms = new Set(Object.values(SEARCH_DOMAIN_TERMS).flat())
	if (!tokens.every((token) => allDomainTerms.has(token))) return []

	const matches = SEARCH_TABLES.filter((table) => {
		const terms = SEARCH_DOMAIN_TERMS[table.entityType] ?? []
		return terms.some((term) => tokens.includes(term))
	}).map((table) => table.entityType)
	return matches.length >= 2 ? uniqueEntityTypes(matches) : []
}

async function fetchSearchRows(
	options: FetchSearchRowsOptions = {},
	providedClient?: SearchClient,
): Promise<SearchIndexRow[]> {
	const client = providedClient ?? (await requireSearchClient())
	const limit = options.limit ?? SEARCH_RESULT_GROUP_LIMIT
	const rows: SearchIndexRow[] = []

	for (let from = 0; from < limit; from += SEARCH_PAGE_SIZE) {
		const to = Math.min(from + SEARCH_PAGE_SIZE, limit) - 1
		const { data, error } = await filteredSearchQuery(client, options).range(
			from,
			to,
		)
		if (error) throw new Error(error.message)
		const page = (data ?? []) as unknown as SearchIndexRow[]
		rows.push(...page)
		if (page.length < to - from + 1) break
	}

	return rows
}

async function countSearchRows(
	options: FetchSearchRowsOptions = {},
	providedClient?: SearchClient,
): Promise<number> {
	const client = providedClient ?? (await requireSearchClient())
	let query = client
		.from('ceo_search_documents')
		.select('entity_id', { count: 'exact', head: true })
	if (options.entityType) {
		query = query.eq('entity_type', options.entityType)
	}
	const search = options.search?.trim()
	if (search) {
		const tokens = searchTokens(search)
		for (const token of tokens.length > 0 ? tokens : [search]) {
			query = query.ilike('search_text', searchPattern(token))
		}
	}
	const { count, error } = await query
	if (error) throw new Error(error.message)
	return count ?? 0
}

async function tableSummariesForSearch(
	search: string,
	client: SearchClient,
): Promise<SearchTableSummary[]> {
	const trimmedSearch = search.trim()
	const counts = await Promise.all(
		SEARCH_TABLES.map((table) =>
			countSearchRows(
				{
					entityType: table.entityType,
					search: trimmedSearch || undefined,
				},
				client,
			),
		),
	)
	return SEARCH_TABLES.map((table, index) => ({
		tableId: table.tableId,
		label: table.label,
		accent: table.accent,
		rowCount: counts[index] ?? 0,
	}))
}

function uniqueEntityTypes(entityTypes: readonly string[]): string[] {
	return Array.from(new Set(entityTypes))
}

async function fetchRowsForEntityTypes(
	entityTypes: readonly string[],
	client: SearchClient,
	limit: number,
	search?: string,
): Promise<SearchIndexRow[]> {
	const rowGroups = await Promise.all(
		uniqueEntityTypes(entityTypes).map((entityType) =>
			fetchSearchRows(
				{
					entityType,
					limit,
					search,
				},
				client,
			),
		),
	)
	return rowGroups.flat()
}

async function fetchSummaryRowsForModule(
	moduleId: SearchSummaryModuleId,
	client: SearchClient,
): Promise<SearchIndexRow[]> {
	return fetchRowsForEntityTypes(
		SUMMARY_ENTITY_TYPES[moduleId],
		client,
		SEARCH_SUMMARY_ENTITY_LIMIT,
	)
}

export const searchInternalDb = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ query: z.string() }))
	.handler(async ({ data }): Promise<SearchResponse> => {
		const query = data.query.trim()
		const client = await requireSearchClient()
		const broadEntityTypes = entityTypesForDomainOnlySearch(query)
		const rowSearch = broadEntityTypes.length > 0 ? undefined : query
		const tables = await tableSummariesForSearch(rowSearch ?? '', client)
		const lowerQuery = query.toLowerCase()
		const tableMatches =
			broadEntityTypes.length > 0
				? tables.filter((table) => {
						const config = tableConfig(table.tableId)
						return config ? broadEntityTypes.includes(config.entityType) : false
					})
				: lowerQuery
					? tables.filter((table) =>
							table.label.toLowerCase().includes(lowerQuery),
						)
					: tables

		const resultGroups = await Promise.all(
			SEARCH_TABLES.map(async (table) => {
				if (
					broadEntityTypes.length > 0 &&
					!broadEntityTypes.includes(table.entityType)
				) {
					return null
				}
				const rows = query
					? await fetchSearchRows(
							{
								entityType: table.entityType,
								limit: SEARCH_RESULT_GROUP_LIMIT,
								search: rowSearch,
							},
							client,
						)
					: []
				const matched = rows
					.map((row): SearchResultRow | null => {
						const searchRow = toSearchRow(row)
						if (!searchRow) return null
						return { ...searchRow, matchedFields: matchedFields(row, query) }
					})
					.filter((row): row is SearchResultRow => row !== null)
				if (matched.length === 0) return null
				const summary = tables.find(
					(candidate) => candidate.tableId === table.tableId,
				)
				return {
					tableId: table.tableId,
					label: table.label,
					accent: table.accent,
					rowCount: summary?.rowCount ?? matched.length,
					rows: matched,
				}
			}),
		)
		const results = resultGroups.filter(
			(group): group is SearchResultGroup => group !== null,
		)

		return { query, tables, tableMatches, results }
	})

export const listSearchTable = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ tableId: z.string() }))
	.handler(async ({ data }): Promise<SearchTableView> => {
		const table = tableConfig(data.tableId)
		if (!table) throw new Error(`Unknown search table: ${data.tableId}`)
		const client = await requireSearchClient()
		const [rows, rowCount] = await Promise.all([
			fetchSearchRows(
				{
					entityType: table.entityType,
					limit: SEARCH_TABLE_LIMIT,
				},
				client,
			),
			countSearchRows({ entityType: table.entityType }, client),
		])
		const tableRows = rows
			.map(toSearchRow)
			.filter((row): row is SearchRow => row !== null)
		return {
			tableId: table.tableId,
			label: table.label,
			accent: table.accent,
			rowCount,
			loadedRowCount: tableRows.length,
			rowLimit: SEARCH_TABLE_LIMIT,
			rows: tableRows,
		}
	})

export const getSearchExecutiveBrief = createServerFn({
	method: 'GET',
}).handler(async (): Promise<SearchExecutiveBrief> => {
	const client = await requireSearchClient()
	const rows = await fetchRowsForEntityTypes(
		SEARCH_SUMMARY_MODULES.flatMap(
			(moduleId) => SUMMARY_ENTITY_TYPES[moduleId],
		),
		client,
		SEARCH_SUMMARY_ENTITY_LIMIT,
	)
	return {
		generatedAt: new Date().toISOString(),
		modules: SEARCH_SUMMARY_MODULES.map((moduleId) =>
			buildModuleSummary(moduleId, rows),
		),
	}
})

export const getSearchActivityFeed = createServerFn({
	method: 'GET',
}).handler(async (): Promise<SearchActivityFeed> => {
	const client = await requireSearchClient()
	const [rows, totalCount] = await Promise.all([
		fetchSearchRows(
			{
				entityType: 'activity',
				limit: SEARCH_ACTIVITY_LIMIT,
			},
			client,
		),
		countSearchRows({ entityType: 'activity' }, client),
	])
	const activityRows = rows
		.flatMap((row) => {
			const searchRow = toSearchRow(row)
			if (!searchRow) return []
			return [
				{
					domainId: activityDomainId(row),
					id: searchRow.rowId,
					title: searchRow.title,
					note: buildSearchSummaryNote(row),
					preview: searchRow.preview,
					row: searchRow,
					occurredAt: activityOccurredAt(row),
				},
			]
		})
		.sort(compareActivityRows)

	const domains = ACTIVITY_DOMAINS.map((domain) => {
		const domainRows =
			domain.id === 'all'
				? activityRows
				: activityRows.filter((row) => row.domainId === domain.id)
		return {
			id: domain.id,
			label: domain.label,
			count: domainRows.length,
			latestAt: domainRows[0]?.occurredAt ?? null,
			rows: domainRows.map((row) => ({
				id: row.id,
				title: row.title,
				note: row.note,
				preview: row.preview,
				row: row.row,
				occurredAt: row.occurredAt,
			})),
		}
	})

	return {
		generatedAt: new Date().toISOString(),
		totalCount,
		loadedRowCount: activityRows.length,
		rowLimit: SEARCH_ACTIVITY_LIMIT,
		domains,
	}
})

export const getSearchModuleSummary = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ moduleId: z.string() }))
	.handler(async ({ data }): Promise<SearchModuleSummary> => {
		if (!(data.moduleId in MODULE_TABLES)) {
			throw new Error(`Unknown search summary: ${data.moduleId}`)
		}
		const client = await requireSearchClient()
		const moduleId = data.moduleId as SearchSummaryModuleId
		const rows = await fetchSummaryRowsForModule(moduleId, client)
		return buildModuleSummary(moduleId, rows)
	})

function activityDomainId(row: SearchIndexRow): string {
	const metadata = row.metadata ?? {}
	const area =
		typeof metadata.area === 'string' && metadata.area.trim()
			? metadata.area
			: row.subtitle
	const normalized = (area ?? '')
		.trim()
		.toLowerCase()
		.replace(/[\s_]+/g, '-')
	if (normalized === 'customer-service') return 'customer-service'
	if (
		[
			'admin',
			'dispatch',
			'finance',
			'inventory',
			'procurement',
			'sales',
			'warehouse',
		].includes(normalized)
	) {
		return normalized
	}
	return 'other'
}

function activityOccurredAt(row: SearchIndexRow): string | null {
	if (row.sort_at) return row.sort_at
	const metadata = row.metadata ?? {}
	return typeof metadata.created_at === 'string' ? metadata.created_at : null
}

function compareActivityRows(
	left: { occurredAt: string | null },
	right: { occurredAt: string | null },
): number {
	const leftTime = left.occurredAt ? new Date(left.occurredAt).getTime() : 0
	const rightTime = right.occurredAt ? new Date(right.occurredAt).getTime() : 0
	return rightTime - leftTime
}

function buildModuleSummary(
	moduleId: SearchSummaryModuleId,
	rows: SearchIndexRow[],
): SearchModuleSummary {
	const points = buildSearchSummaryBuckets(moduleId, rows).map((bucket) => ({
		id: bucket.id,
		label: bucket.label,
		count: bucket.rows.length,
	}))
	const sections = buildSearchSummarySections(moduleId, rows).map((section) => {
		return {
			id: section.id,
			label: section.label,
			count: section.rows.length,
			rows: section.rows.flatMap((row) => {
				const searchRow = toSearchRow(row)
				if (!searchRow) return []
				return [
					{
						id: searchRow.rowId,
						title: searchRow.title,
						tableLabel: searchRow.tableLabel,
						note: buildSearchSummaryNote(row),
						preview: searchRow.preview,
						row: searchRow,
					},
				]
			}),
		}
	})
	return {
		moduleId,
		moduleLabel: MODULE_LABELS[moduleId],
		points,
		sections,
	}
}
