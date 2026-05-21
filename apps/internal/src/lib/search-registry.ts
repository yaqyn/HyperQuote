import type { JsonValue } from './db/types'

type SearchTableId =
	| 'orders'
	| 'customers'
	| 'payments'
	| 'employees'
	| 'inventory'
	| 'warehouse'
	| 'dispatch'
	| 'drivers'
	| 'support'
	| 'suppliers'
	| 'activity'

type SearchScalar = string | number | boolean | null

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
	details: Array<{
		label: string
		value: JsonValue
	}>
}

interface SearchResultRow extends SearchRow {
	matchedFields: string[]
}

interface SearchResultGroup {
	tableId: SearchTableId
	label: string
	accent: string
	rowCount: number
	rows: SearchResultRow[]
}

export interface SearchTableSummary {
	tableId: SearchTableId
	label: string
	accent: string
	rowCount: number
}

export interface SearchTableView extends SearchTableSummary {
	loadedRowCount: number
	rowLimit: number
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
