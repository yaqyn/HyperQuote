import type {
	LifecycleOrderReport,
	OrderReportActor,
	OrderReportFact,
	OrderReportStageId,
	OrderReportStep,
} from '@hyperquote/types'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { computeMarginFromSellPrice } from '../pricing-math'
import {
	formatSupabaseAddress,
	isSalesQuoteAddress,
	normalizeAddressText,
} from './address-format'

export interface ResolvedReport extends LifecycleOrderReport {
	id: string
	rfqId: string
	customerName: string
	customerTier: string
}

type OrderStatusLevelId =
	| 'stopped'
	| 'sales'
	| 'finance'
	| 'inventory'
	| 'warehouse'
	| 'dispatch'
	| 'delivery'

export interface OrderStatusIndexRow {
	id: string
	rfqId: string
	requestNumber: string
	orderId: string | null
	orderNumber: string | null
	customerName: string
	contactName: string
	level: number
	levelId: OrderStatusLevelId
	levelLabel: string
	stage: OrderReportStageId
	status: string
	orderStatus: string | null
	summary: string
	itemCount: number
	totalAmount: number | null
	paymentCount: number
	lastActivityAt: string
	createdAt: string
}

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface SupabaseReportCustomerRow {
	company_name: string
	contact_name: string
	phone: string
	tier: string | null
}

interface SupabaseReportAddressRow {
	street: string
	area: string | null
	city: string
	governorate: string
	landmark: string | null
	label: string | null
}

interface SupabaseReportProductRow {
	id?: string
	slug: string
	name: string
	unit_of_measure: string
}

interface SupabaseReportRequestItemRow {
	customer_description: string
	quantity: number
	unit_of_measure: string
	products: SupabaseReportProductRow | SupabaseReportProductRow[] | null
}

interface SupabaseReportRequestRow {
	id: string
	request_number: string
	status: string
	urgency: string
	delivery_date: string | null
	notes: string | null
	rejected_reason: string | null
	rejected_proof: unknown
	created_at: string
	submitted_at: string | null
	submitted_by: string | null
	assigned_employee_id: string | null
	customers: SupabaseReportCustomerRow | SupabaseReportCustomerRow[] | null
	customer_addresses:
		| SupabaseReportAddressRow
		| SupabaseReportAddressRow[]
		| null
	quote_request_items: SupabaseReportRequestItemRow[] | null
}

interface SupabaseReportQuoteVersionRow {
	id: string
	version_number: number
	status: string
	subtotal: number
	tax_amount: number
	total: number
	notes: string | null
	created_by_employee_id: string | null
	created_at: string
}

interface SupabaseReportOrderRow {
	id: string
	order_number: string
	status: string
	total_amount: number
	created_at: string
	delivered_at: string | null
	updated_at: string | null
}

interface SupabaseReportPaymentRow {
	id: string
	amount: number
	payment_fraction: number
	proof_path: string
	status: string
	recorded_by_employee_id: string | null
	created_at: string
}

interface SupabaseReportReservationRow {
	id: string
	quantity: number
	status: string
	created_by_employee_id: string | null
	created_at: string
	updated_at: string
	products: { name: string } | { name: string }[] | null
}

interface SupabaseReportLoadingTaskRow {
	id: string
	order_id: string
	advisor_employee_id: string | null
	status: string
	proof: JsonRecord
	rejection_reason: string | null
	created_at: string
	updated_at: string
}

interface SupabaseReportLoadingDriverRow {
	loading_task_id: string
	driver_id: string
	truck_id: string | null
	assigned_items: unknown
	created_at: string
	drivers:
		| { id: string; full_name: string; phone: string | null }
		| { id: string; full_name: string; phone: string | null }[]
		| null
	trucks:
		| { id: string; plate_number: string }
		| { id: string; plate_number: string }[]
		| null
}

interface SupabaseReportDeliveryRow {
	id: string
	delivery_number: string
	status: string
	driver_id: string | null
	truck_id: string | null
	loading_task_id: string | null
	started_at: string | null
	arrived_at: string | null
	completed_at: string | null
	rejection_reason: string | null
	created_at: string
	updated_at: string
	drivers:
		| { id: string; full_name: string; phone: string | null }
		| { id: string; full_name: string; phone: string | null }[]
		| null
	trucks:
		| { id: string; plate_number: string }
		| { id: string; plate_number: string }[]
		| null
}

interface SupabaseReportActivityRow {
	id: string
	entity_type: string
	entity_id: string | null
	action: string
	actor_employee_id: string | null
	actor_customer_id: string | null
	actor_driver_id: string | null
	details: JsonRecord | null
	created_at: string
}

interface SupabaseStatusRequestRow {
	id: string
	request_number: string
	status: string
	urgency: string
	delivery_date: string | null
	created_at: string
	submitted_at: string | null
	customers: SupabaseReportCustomerRow | SupabaseReportCustomerRow[] | null
	quote_request_items: { id: string }[] | null
}

interface SupabaseStatusOrderRow {
	id: string
	order_number: string
	quote_request_id: string | null
	status: string
	total_amount: number | null
	created_at: string
	delivered_at: string | null
	updated_at: string | null
}

interface SupabaseStatusPaymentRow {
	order_id: string
	amount: number
	payment_fraction: number
	created_at: string
}

interface SupabaseStatusReservationRow {
	order_id: string
	status: string
	updated_at: string
}

interface SupabaseStatusLoadingTaskRow {
	order_id: string
	status: string
	updated_at: string
}

interface SupabaseStatusDeliveryRow {
	order_id: string | null
	status: string
	created_at: string
	updated_at: string
	completed_at: string | null
}

interface SupabaseReportSavedLineItem {
	productSlug?: string
	productName: string
	quantity: number
	unit: string
	supplierCost: number
	marginPercent?: number
	sellPrice?: number
}

interface SupabaseReportSavedNotes {
	deliveryAddress?: string | null
	deliveryCity?: string | null
	items?: SupabaseReportSavedLineItem[]
}

type JsonRecord = Record<string, unknown>

function firstRelation<T>(value: T | T[] | null): T | null {
	if (Array.isArray(value)) return value[0] ?? null
	return value
}

function isRecord(value: unknown): value is JsonRecord {
	return typeof value === 'object' && value !== null
}

function stringOrNull(value: unknown): string | null {
	return typeof value === 'string' ? value : null
}

function numberOrNull(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function parseJsonObject(value: string | null): JsonRecord | null {
	if (!value) return null
	try {
		const parsed: unknown = JSON.parse(value)
		return isRecord(parsed) ? parsed : null
	} catch {
		return null
	}
}

function parseSavedVersionNotes(
	value: string | null,
): SupabaseReportSavedNotes {
	const outer = parseJsonObject(value)
	if (!outer) return {}

	const metadata = parseJsonObject(stringOrNull(outer.notes)) ?? outer
	const rawItems = Array.isArray(outer.items) ? outer.items : []
	const items = rawItems
		.map((item): SupabaseReportSavedLineItem | null => {
			if (!isRecord(item)) return null
			const productName = stringOrNull(item.productName)
			const quantity = numberOrNull(item.quantity)
			const unit = stringOrNull(item.unit)
			const supplierCost = numberOrNull(item.supplierCost)
			if (!productName || quantity === null || !unit || supplierCost === null) {
				return null
			}
			return {
				productSlug: stringOrNull(item.productSlug) ?? undefined,
				productName,
				quantity,
				unit,
				supplierCost,
				marginPercent: numberOrNull(item.marginPercent) ?? undefined,
				sellPrice: numberOrNull(item.sellPrice) ?? undefined,
			}
		})
		.filter((item): item is SupabaseReportSavedLineItem => item !== null)

	return {
		deliveryAddress:
			normalizeAddressText(stringOrNull(metadata.deliveryAddress)) || undefined,
		deliveryCity: stringOrNull(metadata.deliveryCity) ?? undefined,
		items: items.length > 0 ? items : undefined,
	}
}

function deliveryUrgencyDays(deliveryDate: string | null): number {
	if (!deliveryDate) return 14
	const diff = new Date(deliveryDate).getTime() - Date.now()
	return Math.max(0, Math.ceil(diff / 86_400_000))
}

function formatMoney(value: number): string {
	return `EGP ${Math.round(value).toLocaleString('en-EG')}`
}

function labelStatus(value: string): string {
	return value.replaceAll('_', ' ')
}

function sourceLabel(value: string): string {
	switch (value) {
		case 'manual_phone_order':
			return 'Sales new order button'
		case 'website':
			return 'Website'
		case 'portal':
			return 'Portal'
		default:
			return labelStatus(value)
	}
}

function fact(label: string, value: string | number | null | undefined) {
	if (value === null || value === undefined || value === '') return null
	return { label, value: String(value) }
}

function facts(values: Array<OrderReportFact | null>): OrderReportFact[] {
	return values.filter((value): value is OrderReportFact => value !== null)
}

function reportItemsFromRequest(
	items: SupabaseReportRequestItemRow[] | null,
): string[] {
	return (items ?? []).map((item, index) => {
		const product = firstRelation(item.products)
		const snapshotName = item.customer_description.trim()
		const productName =
			snapshotName || product?.name || `Request line ${index + 1}`
		return `${productName}: ${Number(item.quantity).toLocaleString('en-EG')} ${item.unit_of_measure}`
	})
}

function reportItemsFromSavedVersion(
	items: SupabaseReportSavedLineItem[] | undefined,
): string[] | null {
	if (!items?.length) return null
	return items.map(
		(item) =>
			`${item.productName}: ${item.quantity.toLocaleString('en-EG')} ${item.unit}`,
	)
}

function assignedItemLoads(
	value: unknown,
	quantityBySlug: Map<string, number>,
): { productSlug: string; quantity: number }[] {
	if (!Array.isArray(value)) return []
	return value
		.map((item) => {
			if (typeof item === 'string') {
				const quantity = quantityBySlug.get(item) ?? 0
				return quantity > 0 ? { productSlug: item, quantity } : null
			}
			if (
				typeof item !== 'object' ||
				item === null ||
				!('productSlug' in item) ||
				!('quantity' in item) ||
				typeof item.productSlug !== 'string' ||
				typeof item.quantity !== 'number' ||
				!Number.isFinite(item.quantity) ||
				item.quantity <= 0
			) {
				return null
			}
			return { productSlug: item.productSlug, quantity: item.quantity }
		})
		.filter(
			(item): item is { productSlug: string; quantity: number } =>
				item !== null,
		)
}

function loadingDriverReportLine(
	assignment: SupabaseReportLoadingDriverRow,
	quantityBySlug: Map<string, number>,
	nameBySlug: Map<string, string>,
) {
	const driver = firstRelation(assignment.drivers)
	const truck = firstRelation(assignment.trucks)
	const loads = assignedItemLoads(assignment.assigned_items, quantityBySlug)
	const loadText = loads
		.map((load) => {
			const name = nameBySlug.get(load.productSlug) ?? load.productSlug
			return `${load.quantity.toLocaleString('en-EG')} ${name}`
		})
		.join(', ')
	return `${truck?.plate_number ?? 'Truck'} with ${driver?.full_name ?? 'driver'}${
		loadText ? `: ${loadText}` : ''
	}`
}

function averageMarginPercent(
	items: SupabaseReportSavedLineItem[] | undefined,
) {
	if (!items?.length) return 0
	const margins = items.map((item) => {
		if (typeof item.marginPercent === 'number') return item.marginPercent
		const sellPrice = item.sellPrice ?? item.supplierCost
		return computeMarginFromSellPrice(item.supplierCost, sellPrice)
	})
	return (
		Math.round(
			(margins.reduce((sum, value) => sum + value, 0) / margins.length) * 10,
		) / 10
	)
}

function extractRejectedProofNote(value: unknown): string | null {
	if (!isRecord(value)) return null
	const note = stringOrNull(value.note)
	if (note?.trim()) return note
	const proof = stringOrNull(value.proof)
	return proof?.trim() ? proof : null
}

function idFromDetails(details: JsonRecord | null, key: string) {
	const value = details?.[key]
	return typeof value === 'string' && UUID_RE.test(value) ? value : null
}

function actorFromEmployee(
	employeeId: string | null | undefined,
	employees: Map<string, string>,
): OrderReportActor | null {
	if (!employeeId) return null
	return {
		id: employeeId,
		kind: 'employee',
		name: employees.get(employeeId) ?? 'Employee',
	}
}

function actorFromActivity(
	row: SupabaseReportActivityRow | null | undefined,
	employees: Map<string, string>,
	customerName: string,
	driverNames: Map<string, string>,
): OrderReportActor | null {
	if (!row) return null
	if (row.actor_employee_id)
		return actorFromEmployee(row.actor_employee_id, employees)
	if (row.actor_driver_id) {
		return {
			id: row.actor_driver_id,
			kind: 'driver',
			name: driverNames.get(row.actor_driver_id) ?? 'Driver',
		}
	}
	if (row.actor_customer_id) {
		return { id: row.actor_customer_id, kind: 'customer', name: customerName }
	}
	const employeeId = idFromDetails(row.details, 'employee_id')
	return actorFromEmployee(employeeId, employees)
}

function stepSortValue(step: OrderReportStep): number {
	if (!step.timestamp) return Number.MAX_SAFE_INTEGER
	return new Date(step.timestamp).getTime()
}

function matchingActivity(
	rows: SupabaseReportActivityRow[],
	action: string,
	entityId?: string | null,
) {
	return (
		rows
			.filter(
				(row) =>
					row.action === action && (!entityId || row.entity_id === entityId),
			)
			.sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
	)
}

function activityRowsForActions(
	rows: SupabaseReportActivityRow[],
	actions: readonly string[],
) {
	const actionSet = new Set(actions)
	return rows.filter((row) => actionSet.has(row.action))
}

function relatedDelivery(
	row: SupabaseReportActivityRow,
	deliveries: SupabaseReportDeliveryRow[],
) {
	if (row.entity_type === 'delivery' && row.entity_id) {
		return deliveries.find((delivery) => delivery.id === row.entity_id) ?? null
	}
	const deliveryId = idFromDetails(row.details, 'delivery_id')
	return deliveries.find((delivery) => delivery.id === deliveryId) ?? null
}

function warehouseActivityTitle(action: string): string {
	switch (action) {
		case 'warehouse_loading_driver_assigned':
			return 'Warehouse assigned driver'
		case 'warehouse_loading_driver_removed':
			return 'Warehouse removed driver'
		case 'warehouse_loading_marked_ready':
			return 'Warehouse marked ready'
		case 'warehouse_loading_reset':
			return 'Warehouse reset loading'
		case 'warehouse_loading_rejected':
			return 'Warehouse rejected load'
		case 'warehouse_loading_approved':
			return 'Warehouse approved loading'
		default:
			return labelStatus(action)
	}
}

function dispatchActivityTitle(action: string): string {
	switch (action) {
		case 'driver_delivery_accepted':
			return 'Driver accepted delivery'
		case 'driver_delivery_started':
			return 'Driver started delivery'
		case 'driver_delivery_arrived':
			return 'Driver arrived'
		case 'driver_delivery_confirmed':
		case 'dispatch_delivery_completed':
			return 'Delivery completed'
		case 'dispatch_delivery_rejected':
		case 'driver_delivery_rejected':
			return 'Dispatch rejected delivery'
		case 'delivery_returned_to_warehouse_loading':
		case 'driver_delivery_returned_to_warehouse_loading':
			return 'Delivery returned to warehouse'
		default:
			return labelStatus(action)
	}
}

function currentStageForOrder(
	request: SupabaseReportRequestRow,
	order: SupabaseReportOrderRow | null,
	deliveries: SupabaseReportDeliveryRow[],
	payments: SupabaseReportPaymentRow[],
): OrderReportStageId {
	if (
		['rejected', 'declined', 'canceled', 'cancelled', 'expired'].includes(
			request.status,
		)
	) {
		return 'stopped'
	}
	if (
		order?.status === 'delivered' ||
		deliveries.some((delivery) => delivery.status === 'completed')
	) {
		return 'delivery'
	}
	if (order?.status === 'rejected' || order?.status === 'canceled')
		return 'stopped'
	if (
		order?.status === 'dispatch_ready' ||
		order?.status === 'dispatch_assigned' ||
		order?.status === 'out_for_delivery'
	) {
		return 'dispatch'
	}
	if (order?.status === 'warehouse_loading') return 'warehouse'
	if (order?.status === 'inventory_reserved') return 'warehouse'
	if (payments.length > 0) return 'finance'
	if (order) return 'inventory'
	return 'sales'
}

function pendingStages(currentStage: OrderReportStageId, stopped: boolean) {
	if (stopped || currentStage === 'delivery') return []
	const order: OrderReportStageId[] = [
		'sales',
		'finance',
		'inventory',
		'warehouse',
		'dispatch',
		'delivery',
	]
	const currentIndex = order.indexOf(currentStage)
	return currentIndex === -1 ? order : order.slice(currentIndex + 1)
}

function statusLevelForStage(
	stage: OrderReportStageId,
	order: SupabaseStatusOrderRow | null,
	paymentTotal: number,
	reservations: SupabaseStatusReservationRow[],
): {
	id: OrderStatusLevelId
	label: string
	level: number
	summary: string
} {
	if (stage === 'stopped') {
		return {
			id: 'stopped',
			label: 'Stopped',
			level: 0,
			summary: 'Rejected, canceled, or expired before completion.',
		}
	}
	if (stage === 'delivery') {
		return {
			id: 'delivery',
			label: 'Delivery',
			level: 6,
			summary: 'Delivery is complete or currently customer-facing.',
		}
	}
	if (stage === 'dispatch') {
		return {
			id: 'dispatch',
			label: 'Dispatch',
			level: 5,
			summary: 'Dispatch is assigning, tracking, or completing delivery.',
		}
	}
	if (stage === 'warehouse') {
		return {
			id: 'warehouse',
			label: 'Warehouse',
			level: 4,
			summary: 'Warehouse is preparing loading, drivers, and trucks.',
		}
	}
	if (!order || stage === 'sales') {
		return {
			id: 'sales',
			label: 'Sales',
			level: 1,
			summary: 'Sales is evaluating, quoting, or confirming the order.',
		}
	}
	if (paymentTotal <= 0) {
		return {
			id: 'finance',
			label: 'Finance payment collection',
			level: 2,
			summary: 'Finance is waiting for customer payment collection.',
		}
	}
	if (reservations.length === 0 || stage === 'inventory') {
		return {
			id: 'inventory',
			label: 'Inventory',
			level: 3,
			summary: 'Inventory is reserving confirmed supply for the order.',
		}
	}
	return {
		id: 'finance',
		label: 'Finance payment collection',
		level: 2,
		summary: 'Finance has payment activity recorded for this order.',
	}
}

function latestIso(values: Array<string | null | undefined>): string {
	const latest = values
		.filter((value): value is string => Boolean(value))
		.map((value) => new Date(value).getTime())
		.filter((value) => Number.isFinite(value))
		.sort((a, b) => b - a)[0]
	return latest ? new Date(latest).toISOString() : new Date(0).toISOString()
}

async function fetchActivityRows(
	client: Awaited<
		ReturnType<typeof import('./_supabase').getInternalSupabaseClient>
	>['client'],
	entityType: string,
	entityId: string | null | undefined,
) {
	if (!entityId) return []
	const { data, error } = await client
		.from('activity_events')
		.select(
			'id, entity_type, entity_id, action, actor_employee_id, actor_customer_id, actor_driver_id, details, created_at',
		)
		.eq('entity_type', entityType)
		.eq('entity_id', entityId)
		.order('created_at', { ascending: true })
	if (error) throw new Error(error.message)
	return (data ?? []) as unknown as SupabaseReportActivityRow[]
}

async function getSupabaseOrderStatusIndex(): Promise<OrderStatusIndexRow[]> {
	const { getInternalSupabaseClient } = await import('./_supabase')
	const auth = await getInternalSupabaseClient()
	if (!auth) throw new Error('order_status_no_internal_auth')

	const { data: requestData, error: requestError } = await auth.client
		.from('quote_requests')
		.select(`
			id,
			request_number,
			status,
			urgency,
			delivery_date,
			created_at,
			submitted_at,
			customers (
				company_name,
				contact_name,
				phone,
				tier
			),
			quote_request_items (
				id
			)
		`)
		.neq('status', 'draft')
		.order('created_at', { ascending: false })
		.limit(500)
	if (requestError) throw new Error(requestError.message)

	const requests =
		(requestData as unknown as SupabaseStatusRequestRow[] | null) ?? []
	const rfqIds = requests.map((request) => request.id)
	if (rfqIds.length === 0) return []

	const { data: orderData, error: orderError } = await auth.client
		.from('orders')
		.select(
			'id, order_number, quote_request_id, status, total_amount, created_at, delivered_at, updated_at',
		)
		.in('quote_request_id', rfqIds)
	if (orderError) throw new Error(orderError.message)
	const orders = (orderData as unknown as SupabaseStatusOrderRow[] | null) ?? []
	const orderIds = orders.map((order) => order.id)

	const [
		paymentsResult,
		reservationsResult,
		loadingTasksResult,
		deliveriesResult,
	] =
		orderIds.length > 0
			? await Promise.all([
					auth.client
						.from('customer_payments')
						.select('order_id, amount, payment_fraction, created_at')
						.in('order_id', orderIds),
					auth.client
						.from('inventory_reservations')
						.select('order_id, status, updated_at')
						.in('order_id', orderIds),
					auth.client
						.from('loading_tasks')
						.select('order_id, status, updated_at')
						.in('order_id', orderIds),
					auth.client
						.from('deliveries')
						.select('order_id, status, created_at, updated_at, completed_at')
						.in('order_id', orderIds),
				])
			: [
					{ data: [], error: null },
					{ data: [], error: null },
					{ data: [], error: null },
					{ data: [], error: null },
				]
	if (paymentsResult.error) throw new Error(paymentsResult.error.message)
	if (reservationsResult.error)
		throw new Error(reservationsResult.error.message)
	if (loadingTasksResult.error)
		throw new Error(loadingTasksResult.error.message)
	if (deliveriesResult.error) throw new Error(deliveriesResult.error.message)

	const payments =
		(paymentsResult.data as unknown as SupabaseStatusPaymentRow[] | null) ?? []
	const reservations =
		(reservationsResult.data as unknown as
			| SupabaseStatusReservationRow[]
			| null) ?? []
	const loadingTasks =
		(loadingTasksResult.data as unknown as
			| SupabaseStatusLoadingTaskRow[]
			| null) ?? []
	const deliveries =
		(deliveriesResult.data as unknown as SupabaseStatusDeliveryRow[] | null) ??
		[]

	return requests
		.map((request): OrderStatusIndexRow => {
			const order =
				orders.find((candidate) => candidate.quote_request_id === request.id) ??
				null
			const orderPayments = order
				? payments.filter((payment) => payment.order_id === order.id)
				: []
			const orderReservations = order
				? reservations.filter(
						(reservation) => reservation.order_id === order.id,
					)
				: []
			const orderLoadingTasks = order
				? loadingTasks.filter((task) => task.order_id === order.id)
				: []
			const orderDeliveries = order
				? deliveries.filter((delivery) => delivery.order_id === order.id)
				: []
			const deliveryRows = orderDeliveries.map(
				(delivery): SupabaseReportDeliveryRow => ({
					id: '',
					delivery_number: '',
					status: delivery.status,
					driver_id: null,
					truck_id: null,
					loading_task_id: null,
					started_at: null,
					arrived_at: null,
					completed_at: delivery.completed_at,
					rejection_reason: null,
					created_at: delivery.created_at,
					updated_at: delivery.updated_at,
					drivers: null,
					trucks: null,
				}),
			)
			const paymentRows = orderPayments.map(
				(payment): SupabaseReportPaymentRow => ({
					id: '',
					amount: payment.amount,
					payment_fraction: payment.payment_fraction,
					proof_path: '',
					status: 'recorded',
					recorded_by_employee_id: null,
					created_at: payment.created_at,
				}),
			)
			const stage = currentStageForOrder(
				{
					id: request.id,
					request_number: request.request_number,
					status: request.status,
					urgency: request.urgency,
					delivery_date: request.delivery_date,
					notes: null,
					rejected_reason: null,
					rejected_proof: null,
					created_at: request.created_at,
					submitted_at: request.submitted_at,
					submitted_by: null,
					assigned_employee_id: null,
					customers: request.customers,
					customer_addresses: null,
					quote_request_items: null,
				},
				order
					? {
							id: order.id,
							order_number: order.order_number,
							status: order.status,
							total_amount: order.total_amount ?? 0,
							created_at: order.created_at,
							delivered_at: order.delivered_at,
							updated_at: order.updated_at,
						}
					: null,
				deliveryRows,
				paymentRows,
			)
			const paymentTotal = orderPayments.reduce(
				(total, payment) => total + Number(payment.amount),
				0,
			)
			const level = statusLevelForStage(
				stage,
				order,
				paymentTotal,
				orderReservations,
			)
			const customer = firstRelation(request.customers)
			const lastActivityAt = latestIso([
				request.submitted_at,
				request.created_at,
				order?.updated_at,
				order?.created_at,
				...orderPayments.map((payment) => payment.created_at),
				...orderReservations.map((reservation) => reservation.updated_at),
				...orderLoadingTasks.map((task) => task.updated_at),
				...orderDeliveries.map((delivery) => delivery.updated_at),
				...orderDeliveries.map((delivery) => delivery.completed_at),
			])
			return {
				id: request.id,
				rfqId: request.id,
				requestNumber: request.request_number,
				orderId: order?.id ?? null,
				orderNumber: order?.order_number ?? null,
				customerName: customer?.company_name ?? 'Customer',
				contactName: customer?.contact_name ?? '',
				level: level.level,
				levelId: level.id,
				levelLabel: level.label,
				stage,
				status: request.status,
				orderStatus: order?.status ?? null,
				summary: level.summary,
				itemCount: request.quote_request_items?.length ?? 0,
				totalAmount: order?.total_amount ?? null,
				paymentCount: orderPayments.length,
				lastActivityAt,
				createdAt: request.created_at,
			}
		})
		.sort((a, b) => {
			if (a.level !== b.level) return a.level - b.level
			return (
				new Date(b.lastActivityAt).getTime() -
				new Date(a.lastActivityAt).getTime()
			)
		})
}

async function getSupabaseOrderReport(
	rfqId: string,
): Promise<ResolvedReport | null> {
	if (!UUID_RE.test(rfqId)) return null
	const { getInternalSupabaseClient } = await import('./_supabase')
	const auth = await getInternalSupabaseClient()
	if (!auth) throw new Error('flow_report_no_internal_auth')

	const { data: requestData, error: requestError } = await auth.client
		.from('quote_requests')
		.select(`
			id,
			request_number,
			status,
			urgency,
			delivery_date,
			notes,
			rejected_reason,
			rejected_proof,
			created_at,
			submitted_at,
			submitted_by,
			assigned_employee_id,
			customers (
				company_name,
				contact_name,
				phone,
				tier
			),
			customer_addresses (
				label,
				street,
				area,
				city,
				governorate,
				landmark
			),
			quote_request_items (
				customer_description,
				quantity,
				unit_of_measure,
				products (
					slug,
					name,
					unit_of_measure
				)
			)
		`)
		.eq('id', rfqId)
		.maybeSingle()
	if (requestError) throw new Error(requestError.message)
	if (!requestData) throw new Error(`flow_report_request_not_found_${rfqId}`)

	const request = requestData as unknown as SupabaseReportRequestRow
	const { data: versions, error: versionError } = await auth.client
		.from('sales_quote_versions')
		.select(
			'id, version_number, status, subtotal, tax_amount, total, notes, created_by_employee_id, created_at',
		)
		.eq('quote_request_id', rfqId)
		.order('version_number', { ascending: true })
	if (versionError) throw new Error(versionError.message)

	const { data: orderData, error: orderError } = await auth.client
		.from('orders')
		.select(
			'id, order_number, status, total_amount, created_at, delivered_at, updated_at',
		)
		.eq('quote_request_id', rfqId)
		.maybeSingle()
	if (orderError) throw new Error(orderError.message)

	const versionRows =
		(versions as unknown as SupabaseReportQuoteVersionRow[] | null) ?? []
	const latestVersion = versionRows[versionRows.length - 1] ?? null
	const order = orderData as unknown as SupabaseReportOrderRow | null

	const [
		paymentsResult,
		reservationsResult,
		loadingTasksResult,
		deliveryResult,
	] = order
		? await Promise.all([
				auth.client
					.from('customer_payments')
					.select(
						'id, amount, payment_fraction, proof_path, status, recorded_by_employee_id, created_at',
					)
					.eq('order_id', order.id)
					.order('created_at', { ascending: true }),
				auth.client
					.from('inventory_reservations')
					.select(
						'id, quantity, status, created_by_employee_id, created_at, updated_at, products(name)',
					)
					.eq('order_id', order.id)
					.order('created_at', { ascending: true }),
				auth.client
					.from('loading_tasks')
					.select(
						'id, order_id, advisor_employee_id, status, proof, rejection_reason, created_at, updated_at',
					)
					.eq('order_id', order.id)
					.order('created_at', { ascending: true }),
				auth.client
					.from('deliveries')
					.select(
						'id, delivery_number, status, driver_id, truck_id, loading_task_id, started_at, arrived_at, completed_at, rejection_reason, created_at, updated_at, drivers(id, full_name, phone), trucks(id, plate_number)',
					)
					.eq('order_id', order.id)
					.order('created_at', { ascending: true }),
			])
		: [
				{ data: [], error: null },
				{ data: [], error: null },
				{ data: null, error: null },
				{ data: [], error: null },
			]
	if (paymentsResult.error) throw new Error(paymentsResult.error.message)
	if (reservationsResult.error)
		throw new Error(reservationsResult.error.message)
	if (loadingTasksResult.error)
		throw new Error(loadingTasksResult.error.message)
	if (deliveryResult.error) throw new Error(deliveryResult.error.message)

	const payments =
		(paymentsResult.data as unknown as SupabaseReportPaymentRow[] | null) ?? []
	const reservations =
		(reservationsResult.data as unknown as
			| SupabaseReportReservationRow[]
			| null) ?? []
	const loadingTasks =
		(loadingTasksResult.data as unknown as
			| SupabaseReportLoadingTaskRow[]
			| null) ?? []
	const loadingTask = loadingTasks[loadingTasks.length - 1] ?? null
	const deliveries =
		(deliveryResult.data as unknown as SupabaseReportDeliveryRow[] | null) ?? []

	const loadingDriversResult =
		loadingTasks.length > 0
			? await auth.client
					.from('loading_task_drivers')
					.select(
						'loading_task_id, driver_id, truck_id, assigned_items, created_at, drivers(id, full_name, phone), trucks(id, plate_number)',
					)
					.in(
						'loading_task_id',
						loadingTasks.map((task) => task.id),
					)
					.order('created_at', { ascending: true })
			: { data: [], error: null }
	if (loadingDriversResult.error)
		throw new Error(loadingDriversResult.error.message)
	const loadingDrivers =
		(loadingDriversResult.data as unknown as
			| SupabaseReportLoadingDriverRow[]
			| null) ?? []

	const activityGroups = await Promise.all([
		fetchActivityRows(auth.client, 'quote_request', request.id),
		fetchActivityRows(auth.client, 'order', order?.id),
		...loadingTasks.map((task) =>
			fetchActivityRows(auth.client, 'loading_task', task.id),
		),
		...deliveries.map((delivery) =>
			fetchActivityRows(auth.client, 'delivery', delivery.id),
		),
	])
	const activityRows = activityGroups
		.flat()
		.sort((a, b) => a.created_at.localeCompare(b.created_at))

	const employeeIds = new Set<string>()
	for (const id of [
		request.assigned_employee_id,
		...versionRows.map((row) => row.created_by_employee_id),
		...payments.map((row) => row.recorded_by_employee_id),
		...reservations.map((row) => row.created_by_employee_id),
		...loadingTasks.map((row) => row.advisor_employee_id),
		...activityRows.map((row) => row.actor_employee_id),
		...activityRows.flatMap((row) => [
			idFromDetails(row.details, 'employee_id'),
			idFromDetails(row.details, 'advisor_employee_id'),
			idFromDetails(row.details, 'manager_employee_id'),
		]),
	]) {
		if (id) employeeIds.add(id)
	}

	const employeeRowsResult =
		employeeIds.size > 0
			? await auth.client
					.from('employees')
					.select('id, full_name')
					.in('id', [...employeeIds])
			: { data: [], error: null }
	if (employeeRowsResult.error)
		throw new Error(employeeRowsResult.error.message)
	const employeeNames = new Map(
		(
			(employeeRowsResult.data ?? []) as Array<{
				id: string
				full_name: string
			}>
		).map((row) => [row.id, row.full_name]),
	)

	const driverNames = new Map<string, string>()
	for (const delivery of deliveries) {
		const driver = firstRelation(delivery.drivers)
		if (driver) driverNames.set(driver.id, driver.full_name)
	}
	for (const assignment of loadingDrivers) {
		const driver = firstRelation(assignment.drivers)
		if (driver) driverNames.set(driver.id, driver.full_name)
	}

	const customer = firstRelation(request.customers)
	const address = firstRelation(request.customer_addresses)
	const salesAddress = isSalesQuoteAddress(address) ? address : null
	const savedNotes = parseSavedVersionNotes(latestVersion?.notes ?? null)
	const customerName = customer?.company_name ?? 'Customer'
	const submittedAt = request.submitted_at ?? request.created_at
	const submittedActivity =
		matchingActivity(activityRows, 'order_submitted', request.id) ??
		matchingActivity(activityRows, 'quote_request_submitted', request.id) ??
		matchingActivity(activityRows, 'draft_submitted', request.id) ??
		matchingActivity(activityRows, 'manual_order_created', request.id)
	const source = stringOrNull(submittedActivity?.details?.source) ?? 'portal'
	const sourceName = sourceLabel(source)
	const quantityBySlug = new Map<string, number>()
	const nameBySlug = new Map<string, string>()
	for (const item of request.quote_request_items ?? []) {
		const product = firstRelation(item.products)
		if (!product?.slug) continue
		quantityBySlug.set(product.slug, Number(item.quantity))
		nameBySlug.set(
			product.slug,
			item.customer_description.trim() || product.name || product.slug,
		)
	}

	const steps: OrderReportStep[] = [
		{
			id: `submitted-${request.id}`,
			actor: { id: null, kind: 'customer', name: customerName },
			advisor: null,
			facts: facts([
				fact('Source', sourceName),
				fact('Reference', request.request_number),
				fact('Contact', customer?.contact_name),
				fact('Phone', customer?.phone),
				fact(
					'Delivery address',
					savedNotes.deliveryAddress ?? formatSupabaseAddress(salesAddress),
				),
				fact('Delivery city', savedNotes.deliveryCity ?? salesAddress?.city),
				fact('Urgency', `${deliveryUrgencyDays(request.delivery_date)}d`),
			]),
			lines:
				reportItemsFromSavedVersion(savedNotes.items) ??
				reportItemsFromRequest(request.quote_request_items),
			specialCase: null,
			stage: 'submitted',
			status: 'completed',
			summary: `Order was placed through ${sourceName}.`,
			timestamp: submittedAt,
			title: 'Order placed',
		},
	]

	for (const version of versionRows.filter((row) => row.status !== 'draft')) {
		const notes = parseSavedVersionNotes(version.notes)
		const salesActivity =
			matchingActivity(activityRows, 'sales_order_confirmed', request.id) ??
			matchingActivity(activityRows, 'sales_quote_edited', request.id)
		const actor =
			actorFromEmployee(version.created_by_employee_id, employeeNames) ??
			actorFromActivity(salesActivity, employeeNames, customerName, driverNames)
		steps.push({
			id: `sales-${version.id}`,
			actor,
			advisor: null,
			facts: facts([
				fact('Quote version', `V${version.version_number}`),
				fact('Quote status', version.status),
				fact('Subtotal', formatMoney(Number(version.subtotal))),
				fact('VAT', formatMoney(Number(version.tax_amount))),
				fact('Total', formatMoney(Number(version.total))),
				fact('Margin', `${averageMarginPercent(notes.items).toFixed(1)}%`),
			]),
			lines: reportItemsFromSavedVersion(notes.items) ?? [],
			specialCase: null,
			stage: 'sales',
			status: 'completed',
			summary: `${actor?.name ?? 'Sales'} evaluated and confirmed the commercial record.`,
			timestamp: version.created_at,
			title: 'Sales evaluated',
		})
	}

	for (const payment of payments) {
		const actor = actorFromEmployee(
			payment.recorded_by_employee_id,
			employeeNames,
		)
		const isFinal =
			payment.payment_fraction === 1 ||
			payments
				.filter((row) => row.created_at <= payment.created_at)
				.reduce((sum, row) => sum + row.amount, 0) >=
				(order?.total_amount ?? Number.POSITIVE_INFINITY)
		steps.push({
			id: `finance-${payment.id}`,
			actor,
			advisor: null,
			facts: facts([
				fact(
					'Payment fraction',
					payment.payment_fraction === 0.5 ? '50%' : '100%',
				),
				fact('Amount', formatMoney(Number(payment.amount))),
				fact('Status', payment.status),
				fact('Proof', payment.proof_path ? 'Attached' : null),
			]),
			lines: [],
			specialCase:
				isFinal && payments.length > 1
					? { kind: 'final_payment', label: 'Final payment collection' }
					: null,
			stage: 'finance',
			status: 'completed',
			summary: `${actor?.name ?? 'Finance'} recorded ${payment.payment_fraction === 0.5 ? '50%' : '100%'} customer payment.`,
			timestamp: payment.created_at,
			title:
				isFinal && payments.length > 1
					? 'Final payment collected'
					: 'Payment collected',
		})
	}

	if (reservations.length > 0) {
		const firstReservation = reservations[0]
		const actor = actorFromEmployee(
			firstReservation.created_by_employee_id,
			employeeNames,
		)
		steps.push({
			id: `inventory-${order?.id ?? request.id}`,
			actor,
			advisor: null,
			facts: facts([
				fact('Reserved lines', reservations.length),
				fact(
					'Reserved units',
					reservations
						.reduce((sum, row) => sum + Number(row.quantity), 0)
						.toLocaleString('en-EG'),
				),
			]),
			lines: reservations.map((row) => {
				const product = firstRelation(row.products)
				return `${product?.name ?? 'Product'}: ${Number(row.quantity).toLocaleString('en-EG')} ${labelStatus(row.status)}`
			}),
			specialCase: null,
			stage: 'inventory',
			status: 'completed',
			summary: `${actor?.name ?? 'Inventory'} confirmed and reserved order supplies.`,
			timestamp: firstReservation.created_at,
			title: 'Inventory reserved',
		})
	}

	for (const task of loadingTasks) {
		const taskDrivers = loadingDrivers.filter(
			(assignment) => assignment.loading_task_id === task.id,
		)
		const advisor = actorFromEmployee(task.advisor_employee_id, employeeNames)
		const approvedActivity = matchingActivity(
			activityRows,
			'warehouse_loading_approved',
			task.id,
		)
		const rejectedActivity = matchingActivity(
			activityRows,
			'warehouse_loading_rejected',
			task.id,
		)
		const actor =
			actorFromActivity(
				approvedActivity ?? rejectedActivity,
				employeeNames,
				customerName,
				driverNames,
			) ?? advisor
		steps.push({
			id: `warehouse-${task.id}`,
			actor,
			advisor,
			facts: facts([
				fact('Warehouse status', task.status),
				fact('Advisor', advisor?.name),
				fact('Truck count', taskDrivers.length),
				fact('Rejected reason', task.rejection_reason),
			]),
			lines: taskDrivers.map((assignment) =>
				loadingDriverReportLine(assignment, quantityBySlug, nameBySlug),
			),
			specialCase:
				task.status === 'rejected'
					? {
							kind: 'warehouse_rejection',
							label: 'Warehouse correction required',
						}
					: null,
			stage: 'warehouse',
			status: task.status === 'rejected' ? 'special' : 'completed',
			summary:
				task.status === 'rejected'
					? `${actor?.name ?? 'Warehouse'} rejected the load for correction.`
					: `${actor?.name ?? 'Warehouse'} prepared the order for dispatch.`,
			timestamp:
				approvedActivity?.created_at ??
				rejectedActivity?.created_at ??
				task.updated_at,
			title:
				task.status === 'rejected'
					? 'Warehouse rejected load'
					: 'Warehouse prepared',
		})
	}

	for (const row of activityRowsForActions(activityRows, [
		'warehouse_loading_driver_assigned',
		'warehouse_loading_driver_removed',
		'warehouse_loading_marked_ready',
		'warehouse_loading_reset',
		'warehouse_loading_rejected',
		'warehouse_loading_approved',
	])) {
		const actor = actorFromActivity(
			row,
			employeeNames,
			customerName,
			driverNames,
		)
		const driverId = idFromDetails(row.details, 'driver_id')
		const truckId = idFromDetails(row.details, 'truck_id')
		const driver =
			loadingDrivers
				.map((assignment) => firstRelation(assignment.drivers))
				.find((candidate) => candidate?.id === driverId) ?? null
		const truck =
			loadingDrivers
				.map((assignment) => firstRelation(assignment.trucks))
				.find((candidate) => candidate?.id === truckId) ?? null
		const rejected = row.action === 'warehouse_loading_rejected'
		steps.push({
			id: `warehouse-activity-${row.id}`,
			actor,
			advisor: actorFromEmployee(
				idFromDetails(row.details, 'advisor_employee_id') ??
					loadingTask?.advisor_employee_id,
				employeeNames,
			),
			facts: facts([
				fact('Action', labelStatus(row.action)),
				fact('Driver', driver?.full_name),
				fact('Truck', truck?.plate_number),
				fact('Reason', stringOrNull(row.details?.reason)),
			]),
			lines: [],
			specialCase: rejected
				? {
						kind: 'warehouse_rejection',
						label: 'Warehouse correction required',
					}
				: null,
			stage: 'warehouse',
			status: rejected ? 'special' : 'completed',
			summary: `${warehouseActivityTitle(row.action)} by ${actor?.name ?? 'Warehouse'}.`,
			timestamp: row.created_at,
			title: warehouseActivityTitle(row.action),
		})
	}

	for (const delivery of deliveries) {
		const driver = firstRelation(delivery.drivers)
		const truck = firstRelation(delivery.trucks)
		const completed = delivery.status === 'completed'
		const rejected = delivery.status === 'rejected'
		const activity =
			matchingActivity(
				activityRows,
				completed
					? 'dispatch_delivery_completed'
					: 'dispatch_delivery_rejected',
				delivery.id,
			) ??
			matchingActivity(
				activityRows,
				'driver_delivery_confirmed',
				delivery.id,
			) ??
			matchingActivity(activityRows, 'driver_delivery_accepted', delivery.id)
		const actor = actorFromActivity(
			activity,
			employeeNames,
			customerName,
			driverNames,
		)
		steps.push({
			id: `dispatch-${delivery.id}`,
			actor,
			advisor: null,
			facts: facts([
				fact('Delivery number', delivery.delivery_number),
				fact('Delivery status', delivery.status),
				fact('Driver', driver?.full_name),
				fact('Driver phone', driver?.phone),
				fact('Truck', truck?.plate_number),
				fact('Rejected reason', delivery.rejection_reason),
			]),
			lines: facts([
				fact('Started', delivery.started_at),
				fact('Arrived', delivery.arrived_at),
				fact('Completed', delivery.completed_at),
			]).map((item) => `${item.label}: ${item.value}`),
			specialCase: rejected
				? { kind: 'dispatch_return', label: 'Returned to warehouse' }
				: null,
			stage: completed ? 'delivery' : 'dispatch',
			status: rejected ? 'special' : completed ? 'completed' : 'current',
			summary: rejected
				? `${actor?.name ?? 'Dispatch'} returned the order to warehouse.`
				: completed
					? `${actor?.name ?? driver?.full_name ?? 'Dispatch'} confirmed delivery completion.`
					: `${driver?.full_name ?? 'Driver'} is assigned for dispatch.`,
			timestamp:
				delivery.completed_at ?? activity?.created_at ?? delivery.updated_at,
			title: rejected
				? 'Dispatch returned order'
				: completed
					? 'Delivered'
					: 'Dispatch assigned',
		})
	}

	for (const row of activityRowsForActions(activityRows, [
		'driver_delivery_accepted',
		'driver_delivery_started',
		'driver_delivery_arrived',
		'driver_delivery_confirmed',
		'driver_delivery_rejected',
		'dispatch_delivery_completed',
		'dispatch_delivery_rejected',
		'delivery_returned_to_warehouse_loading',
		'driver_delivery_returned_to_warehouse_loading',
	])) {
		const delivery = relatedDelivery(row, deliveries)
		const driver = firstRelation(delivery?.drivers ?? null)
		const truck = firstRelation(delivery?.trucks ?? null)
		const returned =
			row.action === 'delivery_returned_to_warehouse_loading' ||
			row.action === 'driver_delivery_returned_to_warehouse_loading' ||
			row.action === 'dispatch_delivery_rejected' ||
			row.action === 'driver_delivery_rejected'
		const completed =
			row.action === 'driver_delivery_confirmed' ||
			row.action === 'dispatch_delivery_completed'
		const actor = actorFromActivity(
			row,
			employeeNames,
			customerName,
			driverNames,
		)
		steps.push({
			id: `dispatch-activity-${row.id}`,
			actor,
			advisor: null,
			facts: facts([
				fact('Action', labelStatus(row.action)),
				fact('Delivery', delivery?.delivery_number),
				fact('Driver', driver?.full_name),
				fact('Truck', truck?.plate_number),
				fact('Reason', stringOrNull(row.details?.reason)),
			]),
			lines: [],
			specialCase: returned
				? { kind: 'dispatch_return', label: 'Returned to warehouse' }
				: null,
			stage: completed ? 'delivery' : 'dispatch',
			status: returned ? 'special' : 'completed',
			summary: `${dispatchActivityTitle(row.action)} by ${actor?.name ?? driver?.full_name ?? 'Dispatch'}.`,
			timestamp: row.created_at,
			title: dispatchActivityTitle(row.action),
		})
	}

	const stopActivity =
		matchingActivity(activityRows, 'sales_order_rejected', request.id) ??
		matchingActivity(activityRows, 'sales_order_canceled', request.id) ??
		(order
			? matchingActivity(
					activityRows,
					'finance_customer_order_canceled',
					order.id,
				)
			: null)
	const stopped =
		['rejected', 'declined', 'canceled', 'cancelled', 'expired'].includes(
			request.status,
		) ||
		order?.status === 'rejected' ||
		order?.status === 'canceled'
	if (stopped) {
		const reason =
			request.rejected_reason ??
			stringOrNull(stopActivity?.details?.reason) ??
			order?.status ??
			request.status
		const actor = actorFromActivity(
			stopActivity,
			employeeNames,
			customerName,
			driverNames,
		)
		steps.push({
			id: `stopped-${request.id}`,
			actor,
			advisor: null,
			facts: facts([
				fact('Reason', reason),
				fact('Quote status', request.status),
				fact('Order status', order?.status),
				fact(
					'Proof',
					extractRejectedProofNote(request.rejected_proof) ? 'Attached' : null,
				),
			]),
			lines: [extractRejectedProofNote(request.rejected_proof) ?? ''].filter(
				Boolean,
			),
			specialCase: {
				kind: request.status === 'rejected' ? 'rejection' : 'cancellation',
				label: 'Workflow stopped',
			},
			stage: 'stopped',
			status: 'stopped',
			summary: `${actor?.name ?? 'Employee'} stopped the order at ${reason}.`,
			timestamp:
				stopActivity?.created_at ?? order?.updated_at ?? request.created_at,
			title: 'Order stopped',
		})
	}

	steps.sort((a, b) => stepSortValue(a) - stepSortValue(b))

	const currentStage = currentStageForOrder(
		request,
		order,
		deliveries,
		payments,
	)
	const lastStep = steps[steps.length - 1] ?? null
	const completed = currentStage === 'delivery' && !stopped
	const summaryStatus = stopped ? 'stopped' : completed ? 'completed' : 'active'
	const specialCaseCount = steps.filter((step) => step.specialCase).length
	const headline =
		lastStep?.stage === 'stopped'
			? lastStep.summary
			: lastStep?.actor
				? `${lastStep.title} - ${lastStep.actor.name}`
				: (lastStep?.title ?? 'Order report')

	return {
		id: `sb-report-${request.id}`,
		rfqId: request.request_number || request.id,
		customerName,
		customerTier: customer?.tier ?? '',
		exportFileName: `${request.request_number || request.id}-internal-order-report.html`,
		generatedAt: new Date().toISOString(),
		pending: pendingStages(currentStage, stopped),
		steps,
		summary: {
			currentStage,
			headline,
			lastAction: lastStep?.title ?? null,
			processedBy: lastStep?.actor?.name ?? null,
			reachedStage: currentStage,
			specialCaseCount,
			status: summaryStatus,
		},
	}
}

export const getOrderReport = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ rfqId: z.string() }))
	.handler(async ({ data }) => {
		return getSupabaseOrderReport(data.rfqId)
	})

export const getOrderStatusIndex = createServerFn({ method: 'GET' }).handler(
	async (): Promise<OrderStatusIndexRow[]> => getSupabaseOrderStatusIndex(),
)
