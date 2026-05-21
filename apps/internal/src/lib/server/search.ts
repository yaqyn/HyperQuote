import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
	buildSearchDetailFields,
	buildSearchDisplayTitle,
	buildSearchMatchedFieldLabels,
	buildSearchPreviewFields,
	buildSearchSummaryBuckets,
	buildSearchSummaryNote,
	type SearchDisplayIndexRow,
} from '../search-display'
import { searchPattern, searchTokens } from '../search-query'
import type {
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
		tableId: 'inventory',
		entityType: 'inventory',
		label: 'Inventory',
		accent: '#A7F3D0',
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
		tableId: 'support',
		entityType: 'support',
		label: 'Support',
		accent: '#FBCFE8',
	},
	{
		tableId: 'suppliers',
		entityType: 'supplier',
		label: 'Suppliers',
		accent: '#E5E7EB',
	},
	{
		tableId: 'activity',
		entityType: 'activity',
		label: 'Activity',
		accent: '#D9F99D',
	},
]

const MODULE_TABLES: Record<SearchSummaryModuleId, SearchTableId[]> = {
	sales: ['orders', 'customers'],
	inventory: ['inventory', 'suppliers'],
	warehouse: ['warehouse', 'inventory'],
	finance: ['payments', 'orders'],
	dispatch: ['dispatch', 'drivers'],
	'customer-service': ['support', 'customers'],
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
const SEARCH_PAGE_SIZE = 1000
const SEARCH_SUMMARY_MODULES = Object.keys(
	MODULE_TABLES,
) as SearchSummaryModuleId[]
const SUMMARY_ENTITY_TYPES: Record<SearchSummaryModuleId, string[]> = {
	sales: ['order'],
	inventory: ['order', 'inventory'],
	warehouse: ['warehouse'],
	finance: ['payment'],
	dispatch: ['dispatch', 'driver'],
	'customer-service': ['support'],
}

async function requireSearchClient() {
	const { getInternalSupabaseClient } = await import('./_supabase')
	const auth = await getInternalSupabaseClient()
	if (!auth) throw new Error('search_employee_session_required')
	const { data, error } = await auth.client.rpc('can_access_ceo_search')
	if (error) throw new Error(error.message)
	if (data !== true) throw new Error('ceo_search_required')
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

function baseSearchQuery(client: SearchClient) {
	return client
		.from('ceo_search_index')
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
		.from('ceo_search_index')
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

async function recordSearchQuery(
	input: {
		query: string
		resultCount: number
		tableCount: number
	},
	providedClient?: SearchClient,
) {
	if (!input.query.trim()) return
	const client = providedClient ?? (await requireSearchClient())
	const { error } = await client.rpc('record_search_query_executed', {
		p_context: { source: 'internal_search_panel' },
		p_query: input.query,
		p_result_count: input.resultCount,
		p_table_count: input.tableCount,
	})
	if (error) throw new Error(error.message)
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
		const tables = await tableSummariesForSearch(query, client)
		const lowerQuery = query.toLowerCase()
		const tableMatches = lowerQuery
			? tables.filter((table) => table.label.toLowerCase().includes(lowerQuery))
			: tables

		const resultGroups = await Promise.all(
			SEARCH_TABLES.map(async (table) => {
				const rows = query
					? await fetchSearchRows(
							{
								entityType: table.entityType,
								limit: SEARCH_RESULT_GROUP_LIMIT,
								search: query,
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

		await recordSearchQuery(
			{
				query,
				resultCount: results.reduce(
					(count, group) => count + group.rowCount,
					0,
				),
				tableCount: results.length,
			},
			client,
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

function buildModuleSummary(
	moduleId: SearchSummaryModuleId,
	rows: SearchIndexRow[],
): SearchModuleSummary {
	const buckets = buildSearchSummaryBuckets(moduleId, rows)
	const sections = buckets.map((bucket) => {
		return {
			id: bucket.id,
			label: bucket.label,
			count: bucket.rows.length,
			rows: bucket.rows.slice(0, 5).flatMap((row) => {
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
		points: sections.map((section) => ({
			id: section.id,
			label: section.label,
			count: section.count,
		})),
		sections,
	}
}
