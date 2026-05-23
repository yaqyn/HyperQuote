const PORTAL_CUSTOMER_ORDER_SCOPES = [
	'all',
	'drafts',
	'submitted',
	'active',
	'completed',
] as const

export type PortalCustomerOrderScope =
	(typeof PORTAL_CUSTOMER_ORDER_SCOPES)[number]

export interface PortalOrderScopeRecord {
	status: string
	type: 'draft' | 'submitted' | 'confirmed'
}

const ACTIVE_ORDER_STATUSES = new Set([
	'submitted',
	'assigned',
	'confirmed',
	'order_confirmed',
	'being_prepared',
	'warehouse_loading',
	'out_for_delivery',
])

export function isPortalCustomerOrderScope(
	value: unknown,
): value is PortalCustomerOrderScope {
	return (
		typeof value === 'string' &&
		PORTAL_CUSTOMER_ORDER_SCOPES.includes(value as PortalCustomerOrderScope)
	)
}

export function orderMatchesPortalScope(
	order: PortalOrderScopeRecord,
	scope: PortalCustomerOrderScope,
): boolean {
	const status = normalizeOrderStatus(order.status)
	switch (scope) {
		case 'all':
			return true
		case 'drafts':
			return order.type === 'draft'
		case 'submitted':
			return ACTIVE_ORDER_STATUSES.has(status)
		case 'active':
			return ACTIVE_ORDER_STATUSES.has(status)
		case 'completed':
			return status === 'delivered'
	}
}

export function portalOrderScopeTitle(scope: PortalCustomerOrderScope): string {
	switch (scope) {
		case 'all':
			return 'all quote requests/orders'
		case 'drafts':
			return 'editable drafts'
		case 'submitted':
			return 'submitted orders'
		case 'active':
			return 'active orders'
		case 'completed':
			return 'completed deliveries'
	}
}

function normalizeOrderStatus(value: string): string {
	return value.toLowerCase().replace(/\s+/g, '_')
}
