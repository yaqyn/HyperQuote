import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

type QueryKeyPrefix = readonly unknown[]

const SEARCH_QUERY_KEYS = [
	['internal-search'],
	['internal-search-table'],
	['internal-search-module-summary'],
	['internal-search-executive-brief'],
	['internal-search-activity-feed'],
] as const satisfies readonly QueryKeyPrefix[]

const ADMIN_QUERY_KEYS = [
	['admin'],
] as const satisfies readonly QueryKeyPrefix[]

const CUSTOMER_QUERY_KEYS = [
	['sales-customer-list'],
	['customer-orders'],
	['customer-order-detail'],
	['quote-builder-data'],
	['support-inbox'],
] as const satisfies readonly QueryKeyPrefix[]

const CATALOG_QUERY_KEYS = [
	['product-catalog'],
	['inventory-damage'],
	['inventory-overview'],
	['inventory-product-detail'],
	['inventory-top-suppliers'],
	['supplier-batch-price-options'],
	['sales-outdated-prices'],
	['stock-overview'],
	['refill-product'],
	['quote-builder-data'],
] as const satisfies readonly QueryKeyPrefix[]

const SALES_QUERY_KEYS = [
	['sales-rfq-list'],
	['rfq-queue'],
	['rfq-detail'],
	['quote-builder-data'],
	['order-report'],
	['urgent-items'],
] as const satisfies readonly QueryKeyPrefix[]

const ORDER_FLOW_QUERY_KEYS = [
	['customer-orders'],
	['customer-order-detail'],
	['finance-inbox'],
	['warehouse-queue'],
	['warehouse-order'],
	['warehouse-receiving-queue'],
	['warehouse-receiving-deal'],
	['dispatch-board'],
	['dispatch-route'],
	['order-report'],
	['urgent-items'],
] as const satisfies readonly QueryKeyPrefix[]

const FINANCE_QUERY_KEYS = [
	['finance-inbox'],
	['finance-accounting'],
	['customer-orders'],
	['customer-order-detail'],
	['inventory-damage'],
	['stock-overview'],
	['inventory-overview'],
	['warehouse-receiving-queue'],
] as const satisfies readonly QueryKeyPrefix[]

const WAREHOUSE_QUERY_KEYS = [
	['warehouse-queue'],
	['warehouse-order'],
	['warehouse-trucks'],
	['warehouse-employees'],
	['warehouse-receiving-queue'],
	['warehouse-receiving-deal'],
	['stock-overview'],
	['inventory-overview'],
	['dispatch-board'],
] as const satisfies readonly QueryKeyPrefix[]

const DISPATCH_QUERY_KEYS = [
	['dispatch-board'],
	['dispatch-route'],
	['dispatch-drivers'],
	['dispatch-employees'],
	['warehouse-queue'],
	['warehouse-order'],
] as const satisfies readonly QueryKeyPrefix[]

const SUPPORT_QUERY_KEYS = [
	['support-inbox'],
	['urgent-items'],
] as const satisfies readonly QueryKeyPrefix[]

const EMPLOYEE_QUERY_KEYS = [
	['sales-approvers'],
	['warehouse-employees'],
	['dispatch-employees'],
] as const satisfies readonly QueryKeyPrefix[]

const NOTIFICATION_QUERY_KEYS = [
	['notifications'],
] as const satisfies readonly QueryKeyPrefix[]

const DEFAULT_QUERY_KEYS = [
	...SEARCH_QUERY_KEYS,
	['urgent-items'],
] as const satisfies readonly QueryKeyPrefix[]

const TABLE_QUERY_KEYS: Record<string, readonly QueryKeyPrefix[]> = {
	activity_events: [...SEARCH_QUERY_KEYS, ['order-report'], ['urgent-items']],
	ai_tool_call_audit: SEARCH_QUERY_KEYS,
	approvals: [...SALES_QUERY_KEYS, ...ORDER_FLOW_QUERY_KEYS],
	categories: [...ADMIN_QUERY_KEYS, ...CATALOG_QUERY_KEYS],
	customer_addresses: [
		...ADMIN_QUERY_KEYS,
		...CUSTOMER_QUERY_KEYS,
		...SALES_QUERY_KEYS,
		...ORDER_FLOW_QUERY_KEYS,
	],
	customer_payments: [...FINANCE_QUERY_KEYS, ...ORDER_FLOW_QUERY_KEYS],
	customers: [
		...ADMIN_QUERY_KEYS,
		...CUSTOMER_QUERY_KEYS,
		...SALES_QUERY_KEYS,
		...ORDER_FLOW_QUERY_KEYS,
	],
	deliveries: [
		...DISPATCH_QUERY_KEYS,
		...ORDER_FLOW_QUERY_KEYS,
		...WAREHOUSE_QUERY_KEYS,
	],
	delivery_proofs: [...DISPATCH_QUERY_KEYS, ...ORDER_FLOW_QUERY_KEYS],
	document_downloads: [...ORDER_FLOW_QUERY_KEYS, ...SEARCH_QUERY_KEYS],
	documents: [...ORDER_FLOW_QUERY_KEYS, ...SEARCH_QUERY_KEYS],
	driver_locations: DISPATCH_QUERY_KEYS,
	driver_online_states: [...DISPATCH_QUERY_KEYS, ...WAREHOUSE_QUERY_KEYS],
	driver_team_messages: DISPATCH_QUERY_KEYS,
	drivers: [
		...ADMIN_QUERY_KEYS,
		...DISPATCH_QUERY_KEYS,
		...WAREHOUSE_QUERY_KEYS,
	],
	employee_panel_permissions: [...ADMIN_QUERY_KEYS, ...EMPLOYEE_QUERY_KEYS],
	employee_presence: [...EMPLOYEE_QUERY_KEYS, ['sales-rfq-list']],
	employee_roles: [...ADMIN_QUERY_KEYS, ...EMPLOYEE_QUERY_KEYS],
	employees: [...ADMIN_QUERY_KEYS, ...EMPLOYEE_QUERY_KEYS],
	finance_payment_followups: FINANCE_QUERY_KEYS,
	inventory_damage_lots: [
		...CATALOG_QUERY_KEYS,
		...FINANCE_QUERY_KEYS,
		...SEARCH_QUERY_KEYS,
	],
	inventory_damage_transactions: [
		...CATALOG_QUERY_KEYS,
		...FINANCE_QUERY_KEYS,
		...SEARCH_QUERY_KEYS,
	],
	inventory_reservations: [...ORDER_FLOW_QUERY_KEYS, ...CATALOG_QUERY_KEYS],
	inventory_stock: [
		...CATALOG_QUERY_KEYS,
		...WAREHOUSE_QUERY_KEYS,
		...ORDER_FLOW_QUERY_KEYS,
	],
	loading_task_drivers: [...WAREHOUSE_QUERY_KEYS, ...DISPATCH_QUERY_KEYS],
	loading_tasks: [...WAREHOUSE_QUERY_KEYS, ...DISPATCH_QUERY_KEYS],
	notification_preferences: NOTIFICATION_QUERY_KEYS,
	notifications: NOTIFICATION_QUERY_KEYS,
	orders: [...ORDER_FLOW_QUERY_KEYS, ...FINANCE_QUERY_KEYS],
	price_update_requests: [...CATALOG_QUERY_KEYS, ...SALES_QUERY_KEYS],
	price_updates: CATALOG_QUERY_KEYS,
	pricing_rules: [
		...ADMIN_QUERY_KEYS,
		...CATALOG_QUERY_KEYS,
		...SALES_QUERY_KEYS,
	],
	products: [...ADMIN_QUERY_KEYS, ...CATALOG_QUERY_KEYS, ...SALES_QUERY_KEYS],
	projects: [...ADMIN_QUERY_KEYS, ...CUSTOMER_QUERY_KEYS, ...SALES_QUERY_KEYS],
	quote_counter_offers: [...SALES_QUERY_KEYS, ...ORDER_FLOW_QUERY_KEYS],
	quote_items: [...SALES_QUERY_KEYS, ...ORDER_FLOW_QUERY_KEYS],
	quote_request_items: [
		...SALES_QUERY_KEYS,
		...ORDER_FLOW_QUERY_KEYS,
		...CATALOG_QUERY_KEYS,
	],
	quote_requests: [
		...SALES_QUERY_KEYS,
		...ORDER_FLOW_QUERY_KEYS,
		...CUSTOMER_QUERY_KEYS,
	],
	quote_versions: [...SALES_QUERY_KEYS, ...ORDER_FLOW_QUERY_KEYS],
	quotes: [...SALES_QUERY_KEYS, ...ORDER_FLOW_QUERY_KEYS],
	receiving_task_items: [...WAREHOUSE_QUERY_KEYS, ...FINANCE_QUERY_KEYS],
	receiving_tasks: [...WAREHOUSE_QUERY_KEYS, ...FINANCE_QUERY_KEYS],
	refill_requests: [...CATALOG_QUERY_KEYS, ...FINANCE_QUERY_KEYS],
	sales_call_notes: SALES_QUERY_KEYS,
	sales_quote_versions: [...SALES_QUERY_KEYS, ...ORDER_FLOW_QUERY_KEYS],
	supplier_payments: [...FINANCE_QUERY_KEYS, ...WAREHOUSE_QUERY_KEYS],
	supplier_specialties: [...ADMIN_QUERY_KEYS, ...CATALOG_QUERY_KEYS],
	supplier_product_links: [...ADMIN_QUERY_KEYS, ...CATALOG_QUERY_KEYS],
	suppliers: [
		...ADMIN_QUERY_KEYS,
		...CATALOG_QUERY_KEYS,
		...WAREHOUSE_QUERY_KEYS,
	],
	support_attachments: SUPPORT_QUERY_KEYS,
	support_conversations: SUPPORT_QUERY_KEYS,
	support_messages: SUPPORT_QUERY_KEYS,
	support_tickets: SUPPORT_QUERY_KEYS,
	trucks: [
		...ADMIN_QUERY_KEYS,
		...WAREHOUSE_QUERY_KEYS,
		...DISPATCH_QUERY_KEYS,
	],
	user_profiles: ADMIN_QUERY_KEYS,
	user_roles: ADMIN_QUERY_KEYS,
} as const

const REALTIME_TABLES = Object.keys(TABLE_QUERY_KEYS)

function uniqueQueryKeys(keys: readonly QueryKeyPrefix[]) {
	const unique = new Map<string, QueryKeyPrefix>()
	for (const key of keys) {
		unique.set(JSON.stringify(key), key)
	}
	return Array.from(unique.values())
}

export function internalRealtimeQueryKeysForTable(
	table: string,
): readonly QueryKeyPrefix[] {
	return uniqueQueryKeys([
		...(TABLE_QUERY_KEYS[table] ?? DEFAULT_QUERY_KEYS),
		...SEARCH_QUERY_KEYS,
	])
}

export function useInternalRealtimeSync({ enabled = true } = {}) {
	const queryClient = useQueryClient()

	useEffect(() => {
		if (!enabled) return
		const pending = new Map<string, QueryKeyPrefix>()
		let flushTimer: number | null = null

		const flush = () => {
			flushTimer = null
			const keys = Array.from(pending.values())
			pending.clear()
			for (const queryKey of keys) {
				void queryClient.invalidateQueries({ queryKey })
			}
		}

		const enqueueInvalidation = (table: string) => {
			for (const queryKey of internalRealtimeQueryKeysForTable(table)) {
				pending.set(JSON.stringify(queryKey), queryKey)
			}
			if (flushTimer === null) {
				flushTimer = window.setTimeout(flush, 150)
			}
		}

		const interval = window.setInterval(() => {
			for (const table of REALTIME_TABLES) enqueueInvalidation(table)
		}, 15_000)

		return () => {
			if (flushTimer !== null) window.clearTimeout(flushTimer)
			window.clearInterval(interval)
			pending.clear()
		}
	}, [enabled, queryClient])
}
