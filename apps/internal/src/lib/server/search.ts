import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { JsonObject, JsonValue } from '../db/types'
import type {
	SearchExecutiveBrief,
	SearchModuleSummary,
	SearchPreviewField,
	SearchResponse,
	SearchRow,
	SearchSummaryModuleId,
	SearchTableSummary,
	SearchTableView,
} from '../search-registry'
import { getInternalSupabaseClient } from './_supabase'

type SearchTableId = SearchTableSummary['tableId']
type SearchResultGroup = SearchResponse['results'][number]
type SearchResultRow = SearchResultGroup['rows'][number]

interface SearchIndexRow {
	entity_type: string
	entity_id: string
	title: string
	subtitle: string | null
	metadata: JsonObject | null
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

async function requireSearchClient() {
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

function metadataObject(value: JsonObject | null): JsonObject {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
	return value
}

function toScalar(value: JsonValue): string | number | boolean | null {
	if (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	) {
		return value
	}
	return JSON.stringify(value)
}

function previewFields(row: SearchIndexRow): SearchPreviewField[] {
	const metadata = metadataObject(row.metadata)
	const fields: SearchPreviewField[] = [
		{ label: 'Type', value: row.entity_type },
		{ label: 'Status', value: row.subtitle },
	]
	for (const [key, value] of Object.entries(metadata).slice(0, 3)) {
		fields.push({ label: key, value: toScalar(value) })
	}
	return fields
}

function details(
	row: SearchIndexRow,
): Array<{ label: string; value: JsonValue }> {
	return [
		{ label: 'entity_type', value: row.entity_type },
		{ label: 'entity_id', value: row.entity_id },
		{ label: 'title', value: row.title },
		{ label: 'subtitle', value: row.subtitle },
		...Object.entries(metadataObject(row.metadata)).map(([label, value]) => ({
			label,
			value,
		})),
	]
}

function toSearchRow(row: SearchIndexRow): SearchRow | null {
	const table = tableForEntity(row.entity_type)
	if (!table) return null
	return {
		tableId: table.tableId,
		tableLabel: table.label,
		accent: table.accent,
		rowId: row.entity_id,
		title: row.title,
		preview: previewFields(row),
		details: details(row),
	}
}

function rowHaystack(row: SearchIndexRow): string {
	return [
		row.entity_type,
		row.entity_id,
		row.title,
		row.subtitle,
		JSON.stringify(metadataObject(row.metadata)),
	]
		.filter(Boolean)
		.join(' ')
		.toLowerCase()
}

function matchedFields(row: SearchIndexRow, query: string): string[] {
	if (!query) return []
	const needle = query.toLowerCase()
	const matches: string[] = []
	if (row.title.toLowerCase().includes(needle)) matches.push('title')
	if (row.subtitle?.toLowerCase().includes(needle)) matches.push('subtitle')
	for (const [key, value] of Object.entries(metadataObject(row.metadata))) {
		if (String(value).toLowerCase().includes(needle)) matches.push(key)
	}
	return matches
}

async function fetchSearchRows(): Promise<SearchIndexRow[]> {
	const client = await requireSearchClient()
	const { data, error } = await client
		.from('ceo_search_index')
		.select('entity_type, entity_id, title, subtitle, metadata')
		.limit(500)
	if (error) throw new Error(error.message)
	return (data ?? []) as unknown as SearchIndexRow[]
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
		const rows = await fetchSearchRows()
		const tables = tableSummaries(rows)
		const lowerQuery = query.toLowerCase()
		const tableMatches = lowerQuery
			? tables.filter((table) => table.label.toLowerCase().includes(lowerQuery))
			: tables

		const results: SearchResultGroup[] = []
		for (const table of SEARCH_TABLES) {
			const matched = rows
				.filter((row) => row.entity_type === table.entityType)
				.filter((row) => !lowerQuery || rowHaystack(row).includes(lowerQuery))
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
		const rows = await fetchSearchRows()
		const tableRows = rows
			.filter((row) => row.entity_type === table.entityType)
			.map(toSearchRow)
			.filter((row): row is SearchRow => row !== null)
		return {
			tableId: table.tableId,
			label: table.label,
			accent: table.accent,
			rowCount: tableRows.length,
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
	const tableIds = MODULE_TABLES[moduleId]
	const sections = tableIds.map((tableId) => {
		const table = tableConfig(tableId)
		const sectionRows = table
			? rows.filter((row) => row.entity_type === table.entityType)
			: []
		return {
			id: tableId,
			label: table?.label ?? tableId,
			count: sectionRows.length,
			rows: sectionRows.slice(0, 5).flatMap((row) => {
				const searchRow = toSearchRow(row)
				if (!searchRow) return []
				return [
					{
						id: searchRow.rowId,
						title: searchRow.title,
						tableLabel: searchRow.tableLabel,
						note: row.subtitle,
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
		points: sections.slice(0, 3).map((section) => ({
			id: section.id,
			label: section.label,
			count: section.count,
		})),
		sections,
	}
}
