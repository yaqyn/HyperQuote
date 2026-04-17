// Reports domain types — contracts for the entire reports module
// Role dashboards, KPI cards, filters, date ranges

type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue }

// ─── Tab Navigation ──────────────────────────────────────

export type ReportsTab =
	| 'overview'
	| 'sales'
	| 'procurement'
	| 'operations'
	| 'finance'
	| 'warehouse'
	| 'dispatch'
	| 'cs'

// ─── Date Range ─────────────────────────────────────────

export type DateRange = 'mtd' | 'qtd' | 'ytd' | 'custom'

// ─── Report Filters ─────────────────────────────────────

export interface ReportFilter {
	dateRange: DateRange
	customStart?: string
	customEnd?: string
	department?: string
	team?: string
	individual?: string
	customerTier?: string
	category?: string
	region?: string
}

// ─── KPI Card ───────────────────────────────────────────

export interface KPICard {
	label: string
	value: number | string
	unit?: string
	trend?: number
	trendDirection?: 'up' | 'down' | 'flat'
}

// ─── Dashboard Data ─────────────────────────────────────

export interface DashboardData {
	kpis: KPICard[]
	tableData?: { [key: string]: JsonValue }[]
	chartData?: { [key: string]: JsonValue }[]
}

// ─── Export Format ───────────────────────────────────────

export type ExportFormat = 'csv' | 'pdf'

// ─── Schedule Frequency ─────────────────────────────────

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly'
