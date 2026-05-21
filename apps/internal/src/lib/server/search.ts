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
const SEARCH_RESULT_LIMIT = 220
const SEARCH_TABLE_LIMIT = 500
const SEARCH_SUMMARY_LIMIT = 5000
const SEARCH_PAGE_SIZE = 1000

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

function searchPattern(value: string): string {
	return `%${value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%`
}

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
		query = query.ilike('search_text', searchPattern(search))
	}
	return query
}

async function fetchSearchRows(
	options: FetchSearchRowsOptions = {},
): Promise<SearchIndexRow[]> {
	const client = await requireSearchClient()
	const limit = options.limit ?? SEARCH_RESULT_LIMIT
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

async function recordSearchQuery(input: {
	query: string
	resultCount: number
	tableCount: number
}) {
	if (!input.query.trim()) return
	const client = await requireSearchClient()
	const { error } = await client.rpc('record_search_query_executed', {
		p_context: { source: 'internal_search_panel' },
		p_query: input.query,
		p_result_count: input.resultCount,
		p_table_count: input.tableCount,
	})
	if (error) throw new Error(error.message)
}

function tableSummaries(rows: SearchIndexRow[]): SearchTableSummary[] {
	return SEARCH_TABLES.map((table) => ({
		tableId: table.tableId,
		label: table.label,
		accent: table.accent,
		rowCount: rows.filter((row) => row.entity_type === table.entityType).length,
	}))
}

export const searchInternalDb = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ query: z.string() }))
	.handler(async ({ data }): Promise<SearchResponse> => {
		const query = data.query.trim()
		const rows = await fetchSearchRows({
			limit: query ? SEARCH_RESULT_LIMIT : SEARCH_SUMMARY_LIMIT,
			search: query,
		})
		const tables = tableSummaries(rows)
		const lowerQuery = query.toLowerCase()
		const tableMatches = lowerQuery
			? tables.filter((table) => table.label.toLowerCase().includes(lowerQuery))
			: tables

		const results: SearchResultGroup[] = []
		for (const table of SEARCH_TABLES) {
			const matched = rows
				.filter((row) => row.entity_type === table.entityType)
				.slice(0, 8)
				.map((row): SearchResultRow | null => {
					const searchRow = toSearchRow(row)
					if (!searchRow) return null
					return { ...searchRow, matchedFields: matchedFields(row, query) }
				})
				.filter((row): row is SearchResultRow => row !== null)
			if (matched.length > 0) {
				results.push({
					tableId: table.tableId,
					label: table.label,
					accent: table.accent,
					rows: matched,
				})
			}
		}

		await recordSearchQuery({
			query,
			resultCount: results.reduce(
				(count, group) => count + group.rows.length,
				0,
			),
			tableCount: results.length,
		})

		return { query, tables, tableMatches, results }
	})

export const listSearchTable = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ tableId: z.string() }))
	.handler(async ({ data }): Promise<SearchTableView> => {
		const table = tableConfig(data.tableId)
		if (!table) throw new Error(`Unknown search table: ${data.tableId}`)
		const [rows, summaryRows] = await Promise.all([
			fetchSearchRows({
				entityType: table.entityType,
				limit: SEARCH_TABLE_LIMIT,
			}),
			fetchSearchRows({ limit: SEARCH_SUMMARY_LIMIT }),
		])
		const tableRows = rows
			.map(toSearchRow)
			.filter((row): row is SearchRow => row !== null)
		return {
			tableId: table.tableId,
			label: table.label,
			accent: table.accent,
			rowCount: summaryRows.filter(
				(row) => row.entity_type === table.entityType,
			).length,
			rows: tableRows,
		}
	})

export const getSearchExecutiveBrief = createServerFn({
	method: 'GET',
}).handler(async (): Promise<SearchExecutiveBrief> => {
	const rows = await fetchSearchRows()
	return {
		generatedAt: new Date().toISOString(),
		modules: (Object.keys(MODULE_TABLES) as SearchSummaryModuleId[]).map(
			(moduleId) => buildModuleSummary(moduleId, rows),
		),
	}
})

export const getSearchModuleSummary = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ moduleId: z.string() }))
	.handler(async ({ data }): Promise<SearchModuleSummary> => {
		if (!(data.moduleId in MODULE_TABLES)) {
			throw new Error(`Unknown search summary: ${data.moduleId}`)
		}
		const rows = await fetchSearchRows()
		return buildModuleSummary(data.moduleId as SearchSummaryModuleId, rows)
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
