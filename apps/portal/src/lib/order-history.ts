import type { Order } from '../types/order'

type DatedOrder = Pick<Order, 'date'>
type OrderHistoryCandidate = Pick<Order, 'date' | 'type' | 'status'>
export type OrderHistoryGroupKey = 'active' | 'delivered' | 'rejected'
const ACTIVE_ORDER_STATUSES = new Set<Order['status']>([
	'order_confirmed',
	'out_for_delivery',
	'submitted',
])
const REJECTED_HISTORY_STATUSES = new Set<Order['status']>([
	'cancelled',
	'expired',
	'rejected',
])

function orderDateValue(order: DatedOrder): number {
	const timestamp = Date.parse(order.date)
	return Number.isNaN(timestamp) ? 0 : timestamp
}

function compareOrdersByDateDesc(a: DatedOrder, b: DatedOrder): number {
	return orderDateValue(b) - orderDateValue(a)
}

export function sortOrdersByDateDesc<T extends DatedOrder>(
	orders: readonly T[],
): T[] {
	return [...orders].sort(compareOrdersByDateDesc)
}

function isRealOrderHistoryOrder(
	order: Pick<Order, 'type' | 'status'>,
): boolean {
	return order.type !== 'saved' && order.status !== 'draft'
}

export function getOrderHistoryOrders<T extends OrderHistoryCandidate>(
	orders: readonly T[],
): T[] {
	return sortOrdersByDateDesc(orders.filter(isRealOrderHistoryOrder))
}

export function getOrderHistoryGroupKey(
	order: Pick<Order, 'status'>,
): OrderHistoryGroupKey {
	if (order.status === 'delivered') return 'delivered'
	if (order.status && REJECTED_HISTORY_STATUSES.has(order.status)) {
		return 'rejected'
	}
	return 'active'
}

function isActiveOrder(order: Pick<Order, 'status'>): boolean {
	return ACTIVE_ORDER_STATUSES.has(order.status)
}

export function getActiveOrders<T extends OrderHistoryCandidate>(
	orders: readonly T[],
): T[] {
	return sortOrdersByDateDesc(orders.filter(isActiveOrder))
}
