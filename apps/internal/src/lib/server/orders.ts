import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getInternalSupabaseClient } from './_supabase'
import { formatSupabaseAddress } from './address-format'

/**
 * Customer orders arriving at inventory prep. Each row represents a won
 * quote (status='accepted') that finance has cleared for partial payment
 * and is waiting for the inventory team to verify stock.
 *
 * Readiness is derived from Supabase inventory_stock. Approval goes through
 * the reserve_order_stock RPC so stock reservations and workflow events stay
 * transactional.
 */

type OrderItemStatus = 'ready' | 'shortage'

export interface ActiveRefillSummary {
	id: string
	supplierName: string
	quantity: number
	unitCost: number
	status: string
	createdAt: string
}

export interface OrderLineItemView {
	productSlug: string
	productName: string
	productSku: string
	unit: string
	requiredQty: number
	stockLevel: number
	available: number
	shortage: number
	status: OrderItemStatus
	sellPrice: number
	lineTotal: number
	activeRefills: ActiveRefillSummary[]
}

export interface CustomerOrderView {
	quoteId: string
	quoteNumber: string
	rfqId: string
	customerId: string
	customerName: string
	customerTier: string
	customerPoNumber: string | null
	acceptedAt: string
	acceptedHoursAgo: number
	deliveryAddress: string
	deliveryCity: string
	deliveryUrgencyDays: number
	items: OrderLineItemView[]
	totalValue: number
	itemCount: number
	readyCount: number
	shortageCount: number
	allReady: boolean
}

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string): boolean {
	return UUID_RE.test(value)
}

function roundMoney(value: number): number {
	return Math.round(value * 100) / 100
}

interface SupabaseOrderCustomerRow {
	id: string
	company_name: string
	status: string
	tier: string | null
}

interface SupabaseOrderAddressRow {
	street: string
	area: string | null
	city: string
	governorate: string
	landmark: string | null
}

interface SupabaseOrderProductRow {
	id: string
	slug: string
	sku: string
	name: string
	unit_of_measure: string
	price_range_max: number | null
	price_range_min: number | null
}

interface SupabaseOrderRequestItemRow {
	id: string
	product_id: string | null
	customer_description: string
	quantity: number
	unit_of_measure: string
	sort_order: number
	products: SupabaseOrderProductRow | SupabaseOrderProductRow[] | null
}

interface SupabaseOrderRequestRow {
	id: string
	request_number: string
	delivery_date: string | null
	customer_addresses: SupabaseOrderAddressRow | SupabaseOrderAddressRow[] | null
	quote_request_items: SupabaseOrderRequestItemRow[] | null
}

interface SupabaseOrderRow {
	id: string
	order_number: string
	quote_request_id: string
	customer_id: string
	total_amount: number
	created_at: string
	customers: SupabaseOrderCustomerRow | SupabaseOrderCustomerRow[] | null
	quote_requests: SupabaseOrderRequestRow | SupabaseOrderRequestRow[] | null
}

interface SupabaseInventoryStockRow {
	product_id: string
	on_hand_quantity: number
	reserved_quantity: number
	available_quantity: number
}

interface SupabaseOrderRefillRow {
	id: string
	product_id: string
	quantity: number
	unit_cost: number
	status: string
	created_at: string
	suppliers: { name: string } | { name: string }[] | null
}

function firstRelation<T>(value: T | T[] | null): T | null {
	if (Array.isArray(value)) return value[0] ?? null
	return value
}

function deliveryUrgencyDays(deliveryDate: string | null): number {
	if (!deliveryDate) return 0
	const [year, month, day] = deliveryDate.split('-').map(Number)
	if (!year || !month || !day) return 0
	const target = new Date(year, month - 1, day)
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	target.setHours(0, 0, 0, 0)
	return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}

function hoursAgo(iso: string): number {
	return Math.max(
		0,
		Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000),
	)
}

function buildSupabaseLineItem(
	item: SupabaseOrderRequestItemRow,
	stockByProduct: Map<string, SupabaseInventoryStockRow>,
	refillsByProduct: Map<string, ActiveRefillSummary[]>,
): OrderLineItemView {
	const product = firstRelation(item.products)
	const productId = product?.id ?? item.product_id ?? ''
	const requiredQty = Number(item.quantity)
	const stock = productId ? stockByProduct.get(productId) : undefined
	const availableLevel = Math.max(
		0,
		Number(
			stock?.available_quantity ??
				Number(stock?.on_hand_quantity ?? 0) -
					Number(stock?.reserved_quantity ?? 0),
		),
	)
	const available = Math.min(availableLevel, requiredQty)
	const shortage = Math.max(0, requiredQty - availableLevel)
	const sellPrice = Number(
		product?.price_range_max ?? product?.price_range_min ?? 0,
	)
	return {
		productSlug: product?.slug ?? `request-item-${item.id}`,
		productName: product?.name ?? item.customer_description,
		productSku: product?.sku ?? '',
		unit: product?.unit_of_measure ?? item.unit_of_measure,
		requiredQty,
		stockLevel: availableLevel,
		available,
		shortage,
		status: shortage > 0 ? 'shortage' : 'ready',
		sellPrice,
		lineTotal: roundMoney(sellPrice * requiredQty),
		activeRefills: productId ? (refillsByProduct.get(productId) ?? []) : [],
	}
}

function buildSupabaseOrder(
	order: SupabaseOrderRow,
	stockByProduct: Map<string, SupabaseInventoryStockRow>,
	refillsByProduct: Map<string, ActiveRefillSummary[]>,
): CustomerOrderView | null {
	const customer = firstRelation(order.customers)
	const request = firstRelation(order.quote_requests)
	if (!customer || !request) return null
	const address = firstRelation(request.customer_addresses)
	const items = (request.quote_request_items ?? [])
		.slice()
		.sort((a, b) => a.sort_order - b.sort_order)
		.map((item) =>
			buildSupabaseLineItem(item, stockByProduct, refillsByProduct),
		)
	const readyCount = items.filter((item) => item.status === 'ready').length
	const shortageCount = items.filter(
		(item) => item.status === 'shortage',
	).length
	const totalValue =
		Number(order.total_amount) ||
		items.reduce((sum, item) => sum + item.lineTotal, 0)

	return {
		quoteId: order.id,
		quoteNumber: `${order.order_number} · ${request.request_number}`,
		rfqId: request.id,
		customerId: customer.id,
		customerName: customer.company_name,
		customerTier: customer.tier ?? customer.status,
		customerPoNumber: null,
		acceptedAt: order.created_at,
		acceptedHoursAgo: hoursAgo(order.created_at),
		deliveryAddress: formatSupabaseAddress(address),
		deliveryCity: address?.city ?? '',
		deliveryUrgencyDays: deliveryUrgencyDays(request.delivery_date),
		items,
		totalValue: roundMoney(totalValue),
		itemCount: items.length,
		readyCount,
		shortageCount,
		allReady: shortageCount === 0 && items.length > 0,
	}
}

async function getSupabaseCustomerOrders(orderId?: string) {
	const auth = await getInternalSupabaseClient()

	let query = auth.client
		.from('orders')
		.select(`
			id,
			order_number,
			quote_request_id,
			customer_id,
			total_amount,
			created_at,
			customers (
				id,
				company_name,
				status,
				tier
			),
			quote_requests (
				id,
				request_number,
				delivery_date,
				customer_addresses (
					street,
					area,
					city,
					governorate,
					landmark
				),
				quote_request_items (
					id,
					product_id,
					customer_description,
					quantity,
					unit_of_measure,
					sort_order,
					products (
						id,
						slug,
						sku,
						name,
						unit_of_measure,
						price_range_min,
						price_range_max
					)
				)
			)
		`)
		.eq('status', 'confirmed_for_inventory')

	if (orderId) query = query.eq('id', orderId)

	const { data: orderRows, error: orderError } = await query
	if (orderError) throw new Error(orderError.message)

	const orders = (orderRows ?? []) as unknown as SupabaseOrderRow[]
	const orderIds = orders.map((order) => order.id)
	if (orderIds.length === 0) {
		return {
			orders: [],
			totals: { total: 0, ready: 0, blocked: 0, shortageItems: 0, value: 0 },
		}
	}

	const { data: paymentRows, error: paymentError } = await auth.client.rpc(
		'inventory_finance_cleared_order_ids',
		{
			p_order_ids: orderIds,
		},
	)
	if (paymentError) throw new Error(paymentError.message)

	const paidOrderIds = new Set(
		((paymentRows ?? []) as { order_id: string }[]).map(
			(payment) => payment.order_id,
		),
	)
	const paidOrders = orders.filter((order) => paidOrderIds.has(order.id))
	const productIds = paidOrders.flatMap((order) => {
		const request = firstRelation(order.quote_requests)
		return (request?.quote_request_items ?? [])
			.map((item) => firstRelation(item.products)?.id ?? item.product_id)
			.filter((productId): productId is string => Boolean(productId))
	})

	const stockByProduct = new Map<string, SupabaseInventoryStockRow>()
	const refillsByProduct = new Map<string, ActiveRefillSummary[]>()
	if (productIds.length > 0) {
		const { data: stockRows, error: stockError } = await auth.client
			.from('inventory_stock')
			.select(
				'product_id, on_hand_quantity, reserved_quantity, available_quantity',
			)
			.in('product_id', [...new Set(productIds)])
		if (stockError) throw new Error(stockError.message)
		for (const row of (stockRows ?? []) as SupabaseInventoryStockRow[]) {
			stockByProduct.set(row.product_id, row)
		}

		const { data: refillRows, error: refillError } = await auth.client
			.from('refill_requests')
			.select(
				'id, product_id, quantity, unit_cost, status, created_at, suppliers ( name )',
			)
			.in('product_id', [...new Set(productIds)])
			.in('status', [
				'finance_pending',
				'finance_approved',
				'warehouse_receiving',
			])
			.order('created_at', { ascending: false })
		if (refillError) throw new Error(refillError.message)
		for (const row of (refillRows ?? []) as SupabaseOrderRefillRow[]) {
			const supplier = firstRelation(row.suppliers)
			const refills = refillsByProduct.get(row.product_id) ?? []
			refills.push({
				id: row.id,
				supplierName: supplier?.name ?? 'Supplier',
				quantity: Number(row.quantity),
				unitCost: Number(row.unit_cost),
				status: row.status,
				createdAt: row.created_at,
			})
			refillsByProduct.set(row.product_id, refills)
		}
	}

	const presented = paidOrders
		.map((order) => buildSupabaseOrder(order, stockByProduct, refillsByProduct))
		.filter((order): order is CustomerOrderView => order !== null)
		.sort((a, b) => {
			if (a.allReady !== b.allReady) return a.allReady ? -1 : 1
			if (a.deliveryUrgencyDays !== b.deliveryUrgencyDays) {
				return a.deliveryUrgencyDays - b.deliveryUrgencyDays
			}
			return a.acceptedHoursAgo - b.acceptedHoursAgo
		})

	const totals = presented.reduce(
		(acc, order) => {
			acc.total += 1
			if (order.allReady) acc.ready += 1
			else acc.blocked += 1
			acc.shortageItems += order.shortageCount
			acc.value += order.totalValue
			return acc
		},
		{ total: 0, ready: 0, blocked: 0, shortageItems: 0, value: 0 },
	)

	return { orders: presented, totals }
}

export const getCustomerOrdersList = createServerFn({ method: 'POST' })
	.inputValidator(z.object({}))
	.handler(async () => {
		return getSupabaseCustomerOrders()
	})

export const getCustomerOrderDetail = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ quoteId: z.string() }))
	.handler(async ({ data }) => {
		if (!isUuid(data.quoteId)) {
			return null
		}
		const supabaseOrders = await getSupabaseCustomerOrders(data.quoteId)
		let order: CustomerOrderView | undefined = supabaseOrders.orders[0]
		if (!order) {
			const allSupabaseOrders = await getSupabaseCustomerOrders()
			order = allSupabaseOrders.orders.find(
				(candidate) => candidate.quoteId === data.quoteId,
			)
		}
		return order ?? null
	})

export const fillOrderForWarehouse = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ quoteId: z.string() }))
	.handler(async ({ data }) => {
		const auth = await getInternalSupabaseClient()
		const rawReference = data.quoteId.trim()
		let orderId: string | null = null

		if (isUuid(rawReference)) {
			orderId = rawReference
		}

		if (!orderId) {
			const references = [
				rawReference,
				...rawReference.split('·').map((part) => part.trim()),
			].filter((part, index, list) => part && list.indexOf(part) === index)

			const { data: orderRows, error: orderLookupError } = await auth.client
				.from('orders')
				.select('id')
				.in('order_number', references)
				.limit(1)
			if (orderLookupError) throw new Error(orderLookupError.message)
			orderId = orderRows?.[0]?.id ?? null

			if (!orderId) {
				const { data: requestRows, error: requestLookupError } =
					await auth.client
						.from('quote_requests')
						.select('id')
						.in('request_number', references)
						.limit(1)
				if (requestLookupError) throw new Error(requestLookupError.message)
				const requestId = requestRows?.[0]?.id
				if (requestId) {
					const { data: requestOrderRow, error: requestOrderLookupError } =
						await auth.client
							.from('orders')
							.select('id')
							.eq('quote_request_id', requestId)
							.maybeSingle()
					if (requestOrderLookupError) {
						throw new Error(requestOrderLookupError.message)
					}
					orderId = requestOrderRow?.id ?? null
				}
			}
		}

		if (!orderId || !isUuid(orderId)) {
			return { success: false as const, error: 'Order not found' }
		}

		const { data: order, error } = await auth.client.rpc(
			'reserve_order_stock',
			{
				p_order_id: orderId,
			},
		)
		if (error) throw new Error(error.message)
		return {
			success: true as const,
			quoteId:
				typeof order === 'object' &&
				order !== null &&
				'id' in order &&
				typeof order.id === 'string'
					? order.id
					: orderId,
		}
	})
