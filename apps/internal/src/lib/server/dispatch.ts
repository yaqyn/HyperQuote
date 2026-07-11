import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getInternalSupabaseClient } from './_supabase'
import { formatSupabaseAddress, isSalesQuoteAddress } from './address-format'
import { verifyEmployeeCredential } from './employee-credentials'

const OVERDUE_HOURS = 4
const DRIVER_LOCATION_LIVE_WINDOW_MS = 2 * 60 * 1000
const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DISPATCH_ADVISOR_ROLES = new Set([
	'admin',
	'ceo',
	'dispatch',
	'warehouse',
])
const ACTIVE_DELIVERY_STATUSES = new Set([
	'assigned',
	'accepted',
	'in_transit',
	'arrived',
])

// ─── View types ──────────────────────────────────────────

interface DispatchTruckView {
	driverId: string
	truckId: string
	plateNumber: string
	driverName: string
	driverPhone: string
	capacityTons: number
	deliveryId: string | null
	deliveryStatus: string | null
	deliveryStartedAt: string | null
	deliveryArrivedAt: string | null
	deliveryCompletedAt: string | null
	deliveryRejectionReason: string | null
	driverLat: number | null
	driverLng: number | null
	locationRecordedAt: string | null
	hasLiveLocation: boolean
}

interface DispatchRouteItemView {
	productSlug: string
	productName: string
	sku: string
	qty: number
	unit: string
	truckId: string | null
	truckPlateNumber: string | null
	driverName: string | null
	truckLoads: {
		truckId: string | null
		truckPlateNumber: string | null
		driverName: string
		quantity: number
	}[]
}

export interface DispatchRouteView {
	quoteId: string
	quoteNumber: string
	customerName: string
	customerPhone: string
	customerContactName: string
	deliveryAddress: string
	deliveryCity: string
	deliveryUrgencyDays: number
	items: DispatchRouteItemView[]
	trucks: DispatchTruckView[]
	passedAt: string
	passedAtHoursAgo: number
	isOverdue: boolean
	/** Delivery destination coordinates */
	deliveryLat: number | null
	deliveryLng: number | null
	driverLat: number | null
	driverLng: number | null
}

export interface DispatchBoardTotals {
	inTransit: number
	overdue: number
	deliveredToday: number
	returnedToday: number
}

interface DispatchBoardView {
	routes: DispatchRouteView[]
	totals: DispatchBoardTotals
}

export interface DispatchDriverView {
	driverId: string
	truckId: string | null
	plateNumber: string
	driverName: string
	driverPhone: string
	capacityTons: number
	bodyType: string
	status: string
	/** If dispatched, the order they're carrying */
	assignedQuoteId: string | null
	assignedQuoteNumber: string | null
	assignedCustomerName: string | null
	assignedDeliveryStatus: string | null
}

interface SupabaseDispatchProductRow {
	id: string
	slug: string
	sku: string
	name: string
	unit_of_measure: string
}

interface SupabaseDispatchItemRow {
	product_id: string | null
	customer_description: string
	quantity: number
	unit_of_measure: string
	sort_order: number
	products: SupabaseDispatchProductRow | SupabaseDispatchProductRow[] | null
}

interface SupabaseDispatchAddressRow {
	street: string
	area: string | null
	city: string
	governorate: string
	label: string | null
	phone: string | null
	latitude: number | null
	longitude: number | null
}

interface SupabaseDispatchCustomerRow {
	company_name: string
	contact_name: string
	phone: string
	status: string
}

interface SupabaseDispatchRequestRow {
	id: string
	request_number: string
	delivery_date: string | null
	created_at: string
	customer_addresses:
		| SupabaseDispatchAddressRow
		| SupabaseDispatchAddressRow[]
		| null
	quote_request_items: SupabaseDispatchItemRow[] | null
}

interface SupabaseDispatchOrderRow {
	id: string
	order_number: string
	quote_request_id: string
	customer_id: string | null
	status: string
	total_amount: number
	created_at: string
	delivered_at: string | null
	customers: SupabaseDispatchCustomerRow | SupabaseDispatchCustomerRow[] | null
	quote_requests:
		| SupabaseDispatchRequestRow
		| SupabaseDispatchRequestRow[]
		| null
}

interface SupabaseDispatchTaskRow {
	id: string
	order_id: string
	status: string
	proof: Record<string, unknown>
	rejection_reason: string | null
	created_at: string
	updated_at: string
	orders: SupabaseDispatchOrderRow | SupabaseDispatchOrderRow[] | null
}

interface SupabaseDispatchDriverRow {
	id: string
	full_name: string
	phone: string
	status: string
	vehicle_label: string | null
}

interface SupabaseDispatchTruckRow {
	id: string
	plate_number: string
	driver_id: string | null
	capacity_tons: number | null
	body_type?: string | null
	status: string
	drivers: SupabaseDispatchDriverRow | SupabaseDispatchDriverRow[] | null
}

interface SupabaseDispatchAssignmentRow {
	id: string
	loading_task_id: string
	driver_id: string
	truck_id: string | null
	assigned_items: unknown
	created_at: string
	drivers: SupabaseDispatchDriverRow | SupabaseDispatchDriverRow[] | null
	trucks: SupabaseDispatchTruckRow | SupabaseDispatchTruckRow[] | null
}

interface SupabaseDispatchLocationRow {
	driver_id: string
	delivery_id: string | null
	latitude: number
	longitude: number
	recorded_at: string
}

interface SupabaseDispatchDeliveryRow {
	id: string
	order_id: string | null
	loading_task_id: string | null
	driver_id: string | null
	truck_id: string | null
	status: string
	created_at: string
	updated_at: string
	started_at: string | null
	arrived_at: string | null
	completed_at: string | null
	rejection_reason: string | null
}

interface SupabaseDispatchOnlineRow {
	driver_id: string
	status: string
	last_seen_at: string
}

interface SupabaseDispatchEmployeeRoleRow {
	role: string
}

interface SupabaseDispatchEmployeeRow {
	id: string
	full_name: string
	employee_roles: SupabaseDispatchEmployeeRoleRow[] | null
}

// ─── Helpers ─────────────────────────────────────────────

function isUuid(value: string | undefined): value is string {
	return Boolean(value && UUID_RE.test(value))
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
	if (Array.isArray(value)) return value[0] ?? null
	return value ?? null
}

function parseAssignedItemLoads(
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

function nullableCoordinate(value: number | null | undefined): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function locationRecordedAtMs(row: SupabaseDispatchLocationRow): number {
	const recordedAt = Date.parse(row.recorded_at)
	return Number.isFinite(recordedAt) ? recordedAt : 0
}

function locationRank(
	row: SupabaseDispatchLocationRow,
	activeDeliveryIds: Set<string>,
): number {
	if (row.delivery_id && activeDeliveryIds.has(row.delivery_id)) return 2
	if (!row.delivery_id) return 1
	return 0
}

function isBetterLocationForDriver(
	candidate: SupabaseDispatchLocationRow,
	current: SupabaseDispatchLocationRow | undefined,
	activeDeliveryIds: Set<string>,
): boolean {
	if (!current) return true
	const candidateRank = locationRank(candidate, activeDeliveryIds)
	const currentRank = locationRank(current, activeDeliveryIds)
	if (candidateRank !== currentRank) return candidateRank > currentRank
	return locationRecordedAtMs(candidate) > locationRecordedAtMs(current)
}

function isFreshDriverLocation(
	location: SupabaseDispatchLocationRow | undefined,
): boolean {
	if (!location) return false
	const recordedAt = locationRecordedAtMs(location)
	return (
		recordedAt > 0 && Date.now() - recordedAt <= DRIVER_LOCATION_LIVE_WINDOW_MS
	)
}

function assignmentDeliveryKey(input: {
	driver_id: string | null
	loading_task_id: string | null
	truck_id: string | null
}) {
	return [
		input.loading_task_id ?? '',
		input.driver_id ?? '',
		input.truck_id ?? '',
	].join(':')
}

function truckRank(status: string): number {
	if (status === 'dispatched') return 4
	if (status === 'loading') return 3
	if (status === 'available') return 2
	if (status === 'maintenance') return 1
	return 0
}

function isDispatchAdvisor(row: SupabaseDispatchEmployeeRow): boolean {
	return (row.employee_roles ?? []).some((entry) =>
		DISPATCH_ADVISOR_ROLES.has(entry.role),
	)
}

function roundedHoursSince(iso: string): number {
	return (
		Math.round(((Date.now() - new Date(iso).getTime()) / 3_600_000) * 10) / 10
	)
}

function supabaseDeliveryUrgencyDays(deliveryDate: string | null) {
	if (!deliveryDate) return 0
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	const target = new Date(`${deliveryDate}T00:00:00`)
	const diffMs = target.getTime() - today.getTime()
	return Math.max(0, Math.ceil(diffMs / 86_400_000))
}

function isToday(iso: string): boolean {
	const d = new Date(iso)
	const now = new Date()
	return (
		d.getFullYear() === now.getFullYear() &&
		d.getMonth() === now.getMonth() &&
		d.getDate() === now.getDate()
	)
}

async function getSupabaseDispatchData(orderId?: string) {
	const auth = await getInternalSupabaseClient()

	let taskQuery = auth.client.from('loading_tasks').select(`
		id,
		order_id,
		status,
		proof,
		rejection_reason,
		created_at,
		updated_at,
		orders (
			id,
			order_number,
			quote_request_id,
			customer_id,
			status,
			total_amount,
			created_at,
			delivered_at,
			customers (
				company_name,
				contact_name,
				phone,
				status
			),
			quote_requests (
				id,
				request_number,
				delivery_date,
				created_at,
				customer_addresses (
					label,
					street,
					area,
					city,
					governorate,
					phone,
					latitude,
					longitude
				),
				quote_request_items (
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
						unit_of_measure
					)
				)
			)
		)
	`)
	if (orderId) taskQuery = taskQuery.eq('order_id', orderId)

	const { data: taskRows, error: taskError } = await taskQuery
	if (taskError) throw new Error(taskError.message)
	const tasks = (taskRows ?? []) as unknown as SupabaseDispatchTaskRow[]
	const taskIds = tasks.map((task) => task.id)

	const assignmentsByTask = new Map<string, SupabaseDispatchAssignmentRow[]>()
	const driverIds = new Set<string>()
	if (taskIds.length > 0) {
		const { data: assignmentRows, error: assignmentError } = await auth.client
			.from('loading_task_drivers')
			.select(`
				id,
				loading_task_id,
				driver_id,
				truck_id,
				assigned_items,
				created_at,
				drivers (
					id,
					full_name,
					phone,
					status,
					vehicle_label
				),
				trucks (
					id,
					plate_number,
					driver_id,
					capacity_tons,
					body_type,
					status
				)
			`)
			.in('loading_task_id', taskIds)
		if (assignmentError) throw new Error(assignmentError.message)
		for (const assignment of (assignmentRows ??
			[]) as unknown as SupabaseDispatchAssignmentRow[]) {
			const list = assignmentsByTask.get(assignment.loading_task_id) ?? []
			list.push(assignment)
			assignmentsByTask.set(assignment.loading_task_id, list)
			driverIds.add(assignment.driver_id)
		}
	}

	const deliveriesByAssignment = new Map<string, SupabaseDispatchDeliveryRow>()
	const activeDeliveryIdsByDriver = new Map<string, Set<string>>()
	if (taskIds.length > 0) {
		const { data: deliveryRows, error: deliveryError } = await auth.client
			.from('deliveries')
			.select(
				'id, order_id, loading_task_id, driver_id, truck_id, status, created_at, updated_at, started_at, arrived_at, completed_at, rejection_reason',
			)
			.in('loading_task_id', taskIds)
			.order('updated_at', { ascending: false })
		if (deliveryError) throw new Error(deliveryError.message)
		for (const row of (deliveryRows ??
			[]) as unknown as SupabaseDispatchDeliveryRow[]) {
			const key = assignmentDeliveryKey(row)
			if (!deliveriesByAssignment.has(key)) {
				deliveriesByAssignment.set(key, row)
			}
			if (row.driver_id && ACTIVE_DELIVERY_STATUSES.has(row.status)) {
				const activeIds =
					activeDeliveryIdsByDriver.get(row.driver_id) ?? new Set<string>()
				activeIds.add(row.id)
				activeDeliveryIdsByDriver.set(row.driver_id, activeIds)
			}
		}
	}

	const latestLocationByDriver = new Map<string, SupabaseDispatchLocationRow>()
	if (driverIds.size > 0) {
		const { data: locationRows, error: locationError } = await auth.client
			.from('driver_locations')
			.select('driver_id, delivery_id, latitude, longitude, recorded_at')
			.in('driver_id', [...driverIds])
			.order('recorded_at', { ascending: false })
		if (locationError) throw new Error(locationError.message)
		for (const row of (locationRows ??
			[]) as unknown as SupabaseDispatchLocationRow[]) {
			const activeDeliveryIds =
				activeDeliveryIdsByDriver.get(row.driver_id) ?? new Set<string>()
			const current = latestLocationByDriver.get(row.driver_id)
			if (isBetterLocationForDriver(row, current, activeDeliveryIds)) {
				latestLocationByDriver.set(row.driver_id, row)
			}
		}
	}

	return {
		auth,
		tasks,
		assignmentsByTask,
		latestLocationByDriver,
		deliveriesByAssignment,
	}
}

function buildSupabaseRoute(
	task: SupabaseDispatchTaskRow,
	assignments: SupabaseDispatchAssignmentRow[],
	latestLocationByDriver: Map<string, SupabaseDispatchLocationRow>,
	deliveriesByAssignment: Map<string, SupabaseDispatchDeliveryRow>,
): DispatchRouteView | null {
	const order = firstRelation(task.orders)
	if (!order || task.status !== 'approved') return null
	if (
		!['dispatch_ready', 'dispatch_assigned', 'out_for_delivery'].includes(
			order.status,
		)
	) {
		return null
	}
	const customer = firstRelation(order.customers)
	const request = firstRelation(order.quote_requests)
	if (!customer || !request || assignments.length === 0) return null

	const address = firstRelation(request.customer_addresses)
	const salesAddress = isSalesQuoteAddress(address) ? address : null
	const city = salesAddress?.city ?? ''
	const passedAt = task.updated_at || task.created_at
	const passedAtHoursAgo = roundedHoursSince(passedAt)
	const requestItems = request.quote_request_items ?? []
	const quantityBySlug = new Map<string, number>()
	for (const item of requestItems) {
		const product = firstRelation(item.products)
		const slug =
			product?.slug ??
			item.customer_description
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-|-$/g, '')
		quantityBySlug.set(slug, Number(item.quantity))
	}
	const itemAssignments = new Map<
		string,
		{
			truckId: string | null
			truckPlateNumber: string | null
			driverName: string
			quantity: number
		}[]
	>()
	for (const assignment of assignments) {
		const truck = firstRelation(assignment.trucks)
		const driver = firstRelation(assignment.drivers)
		if (!driver) continue
		for (const load of parseAssignedItemLoads(
			assignment.assigned_items,
			quantityBySlug,
		)) {
			const list = itemAssignments.get(load.productSlug) ?? []
			list.push({
				truckId: truck?.id ?? null,
				truckPlateNumber: truck?.plate_number ?? null,
				driverName: driver.full_name,
				quantity: load.quantity,
			})
			itemAssignments.set(load.productSlug, list)
		}
	}
	const items: DispatchRouteItemView[] = requestItems
		.slice()
		.sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
		.map((item) => {
			const product = firstRelation(item.products)
			const slug =
				product?.slug ??
				item.customer_description
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, '-')
					.replace(/^-|-$/g, '')
			const assignmentsForItem = itemAssignments.get(slug) ?? []
			const singleAssignment =
				assignmentsForItem.length === 1 ? assignmentsForItem[0] : null
			return {
				productSlug: slug,
				productName: product?.name ?? item.customer_description,
				sku: product?.sku ?? '',
				qty: Number(item.quantity),
				unit: product?.unit_of_measure ?? item.unit_of_measure,
				truckId: singleAssignment?.truckId ?? null,
				truckPlateNumber:
					singleAssignment?.truckPlateNumber ??
					(assignmentsForItem.length > 1 ? 'Multiple trucks' : null),
				driverName:
					singleAssignment?.driverName ??
					(assignmentsForItem.length > 1
						? `${assignmentsForItem.length} drivers`
						: null),
				truckLoads: assignmentsForItem,
			}
		})

	const trucks: DispatchTruckView[] = assignments
		.map((assignment) => {
			const truck = firstRelation(assignment.trucks)
			const driver = firstRelation(assignment.drivers)
			if (!driver) return null
			const location = latestLocationByDriver.get(driver.id)
			const delivery = deliveriesByAssignment.get(
				assignmentDeliveryKey({
					driver_id: driver.id,
					loading_task_id: assignment.loading_task_id,
					truck_id: truck?.id ?? null,
				}),
			)
			return {
				driverId: driver.id,
				truckId: truck?.id ?? assignment.id,
				plateNumber: truck?.plate_number ?? 'No truck asset',
				driverName: driver.full_name,
				driverPhone: driver.phone,
				capacityTons: Number(truck?.capacity_tons ?? 0),
				deliveryId: delivery?.id ?? null,
				deliveryStatus: delivery?.status ?? null,
				deliveryStartedAt: delivery?.started_at ?? null,
				deliveryArrivedAt: delivery?.arrived_at ?? null,
				deliveryCompletedAt: delivery?.completed_at ?? null,
				deliveryRejectionReason: delivery?.rejection_reason ?? null,
				driverLat: location ? Number(location.latitude) : null,
				driverLng: location ? Number(location.longitude) : null,
				locationRecordedAt: location?.recorded_at ?? null,
				hasLiveLocation: isFreshDriverLocation(location),
			}
		})
		.filter((truck): truck is DispatchTruckView => truck !== null)
	if (trucks.length === 0) return null
	const leadTruck = trucks[0]

	return {
		quoteId: order.id,
		quoteNumber: order.order_number || request.request_number,
		customerName: customer.company_name,
		customerPhone: customer.phone,
		customerContactName: customer.contact_name,
		deliveryAddress: formatSupabaseAddress(salesAddress),
		deliveryCity: city,
		deliveryUrgencyDays: supabaseDeliveryUrgencyDays(request.delivery_date),
		items,
		trucks,
		passedAt,
		passedAtHoursAgo,
		isOverdue: passedAtHoursAgo >= OVERDUE_HOURS,
		deliveryLat: nullableCoordinate(salesAddress?.latitude),
		deliveryLng: nullableCoordinate(salesAddress?.longitude),
		driverLat: leadTruck.driverLat,
		driverLng: leadTruck.driverLng,
	}
}

async function getDispatchAdvisor(
	client: Parameters<typeof verifyEmployeeCredential>[0]['client'],
	advisorId: string,
	securityMethod: 'password' | 'qr',
	securityToken: string,
) {
	const verified = await verifyEmployeeCredential({
		allowedRoles: DISPATCH_ADVISOR_ROLES,
		client,
		employeeId: advisorId,
		method: securityMethod,
		password: securityToken,
	})
	if (!verified.success) return verified
	return { success: true as const, advisor: verified.employee }
}

async function getDispatchAdvisorProof(
	client: Parameters<typeof getDispatchAdvisor>[0],
	credential: {
		advisorId: string
		securityMethod: 'password' | 'qr'
		securityToken: string
		proofUrl: string
		proofSource?: string
	},
) {
	const advisorCheck = await getDispatchAdvisor(
		client,
		credential.advisorId,
		credential.securityMethod,
		credential.securityToken,
	)
	if (!advisorCheck.success) return advisorCheck

	const baseProof = {
		advisor_id: credential.advisorId,
		advisor_name: advisorCheck.advisor.name,
		proof_url: credential.proofUrl.trim(),
		security_method: credential.securityMethod,
	}
	return {
		success: true as const,
		proof: credential.proofSource
			? { ...baseProof, proof_source: credential.proofSource }
			: baseProof,
	}
}

interface DispatchTerminalProofInput {
	quoteId: string
	advisorId: string
	proofUrl: string
	securityMethod: 'password' | 'qr'
	securityToken: string
}

async function getDispatchTerminalProof(
	data: DispatchTerminalProofInput,
	proofSource?: string,
) {
	if (!isUuid(data.quoteId)) {
		return { success: false as const, error: 'Order not found' }
	}
	const auth = await getInternalSupabaseClient()
	const advisorProof = await getDispatchAdvisorProof(auth.client, {
		advisorId: data.advisorId,
		proofSource,
		proofUrl: data.proofUrl,
		securityMethod: data.securityMethod,
		securityToken: data.securityToken,
	})
	if (!advisorProof.success) return advisorProof
	return {
		success: true as const,
		client: auth.client,
		proof: advisorProof.proof,
	}
}

// ─── Server functions ────────────────────────────────────

export const getDispatchBoard = createServerFn({ method: 'POST' })
	.inputValidator(z.object({}))
	.handler(async (): Promise<DispatchBoardView> => {
		const supabaseData = await getSupabaseDispatchData()
		const routes = supabaseData.tasks
			.map((task) =>
				buildSupabaseRoute(
					task,
					supabaseData.assignmentsByTask.get(task.id) ?? [],
					supabaseData.latestLocationByDriver,
					supabaseData.deliveriesByAssignment,
				),
			)
			.filter((route): route is DispatchRouteView => route !== null)
			.sort((a, b) => {
				if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
				return b.passedAtHoursAgo - a.passedAtHoursAgo
			})

		const { data: deliveryRows, error: deliveryError } =
			await supabaseData.auth.client
				.from('deliveries')
				.select('status, created_at, updated_at, completed_at')
				.in('status', ['completed', 'rejected'])
		if (deliveryError) throw new Error(deliveryError.message)
		const deliveries = (deliveryRows ??
			[]) as unknown as SupabaseDispatchDeliveryRow[]
		const deliveredToday = deliveries.filter(
			(delivery) =>
				delivery.status === 'completed' &&
				isToday(delivery.completed_at ?? delivery.updated_at),
		).length
		const returnedToday = deliveries.filter(
			(delivery) =>
				delivery.status === 'rejected' && isToday(delivery.updated_at),
		).length

		return {
			routes,
			totals: {
				inTransit: routes.length,
				overdue: routes.filter((r) => r.isOverdue).length,
				deliveredToday,
				returnedToday,
			},
		}
	})

export const getDispatchRouteDetail = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ quoteId: z.string() }))
	.handler(async ({ data }): Promise<DispatchRouteView | null> => {
		if (!isUuid(data.quoteId)) return null
		const supabaseData = await getSupabaseDispatchData(data.quoteId)
		const task = supabaseData.tasks[0]
		if (!task) return null
		return buildSupabaseRoute(
			task,
			supabaseData.assignmentsByTask.get(task.id) ?? [],
			supabaseData.latestLocationByDriver,
			supabaseData.deliveriesByAssignment,
		)
	})

export const getDispatchDrivers = createServerFn({ method: 'POST' })
	.inputValidator(z.object({}))
	.handler(async (): Promise<{ drivers: DispatchDriverView[] }> => {
		const supabaseData = await getSupabaseDispatchData()
		const { data: driverRows, error: driverError } =
			await supabaseData.auth.client
				.from('drivers')
				.select('id, full_name, phone, status, vehicle_label')
				.neq('status', 'invited')
				.neq('status', 'disabled')
				.order('full_name')
		if (driverError) throw new Error(driverError.message)
		const driverRowsTyped = (driverRows ??
			[]) as unknown as SupabaseDispatchDriverRow[]
		const driverIds = driverRowsTyped.map((driver) => driver.id)
		const onlineByDriver = new Map<string, SupabaseDispatchOnlineRow>()
		if (driverIds.length > 0) {
			const { data: onlineRows, error: onlineError } =
				await supabaseData.auth.client
					.from('driver_online_states')
					.select('driver_id, status, last_seen_at')
					.in('driver_id', driverIds)
			if (onlineError) throw new Error(onlineError.message)
			for (const row of (onlineRows ??
				[]) as unknown as SupabaseDispatchOnlineRow[]) {
				onlineByDriver.set(row.driver_id, row)
			}
		}
		const { data: truckRows, error: truckError } =
			driverIds.length === 0
				? { data: [], error: null }
				: await supabaseData.auth.client
						.from('trucks')
						.select(`
				id,
				plate_number,
				driver_id,
				capacity_tons,
				body_type,
				status,
				drivers (
					id,
					full_name,
					phone,
					status,
					vehicle_label
				)
			`)
						.in('driver_id', driverIds)
						.order('updated_at', { ascending: false })
		if (truckError) throw new Error(truckError.message)
		const trucks = (truckRows ?? []) as unknown as SupabaseDispatchTruckRow[]
		const truckByDriver = new Map<string, SupabaseDispatchTruckRow>()
		for (const truck of trucks) {
			if (!truck.driver_id) continue
			const current = truckByDriver.get(truck.driver_id)
			if (!current || truckRank(truck.status) > truckRank(current.status)) {
				truckByDriver.set(truck.driver_id, truck)
			}
		}

		const assignmentByDriver = new Map<
			string,
			{
				customerName: string
				deliveryStatus: string | null
				orderId: string
				orderNumber: string
			}
		>()
		for (const task of supabaseData.tasks) {
			const route = buildSupabaseRoute(
				task,
				supabaseData.assignmentsByTask.get(task.id) ?? [],
				supabaseData.latestLocationByDriver,
				supabaseData.deliveriesByAssignment,
			)
			if (!route) continue
			for (const assignment of supabaseData.assignmentsByTask.get(task.id) ??
				[]) {
				const routeTruck = route.trucks.find(
					(truck) => truck.driverId === assignment.driver_id,
				)
				assignmentByDriver.set(assignment.driver_id, {
					orderId: route.quoteId,
					orderNumber: route.quoteNumber,
					customerName: route.customerName,
					deliveryStatus: routeTruck?.deliveryStatus ?? null,
				})
			}
		}

		const now = Date.now()
		const drivers: DispatchDriverView[] = driverRowsTyped.map((driver) => {
			const truck = truckByDriver.get(driver.id)
			const online = onlineByDriver.get(driver.id)
			const freshOnline =
				online?.status === 'online' &&
				now - new Date(online.last_seen_at).getTime() <= 15 * 60_000
			const assignment = assignmentByDriver.get(driver.id)
			const status =
				assignment || driver.status === 'on_delivery'
					? 'dispatched'
					: driver.status === 'available' && freshOnline
						? 'available'
						: 'offline'
			return {
				driverId: driver.id,
				truckId: truck?.id ?? null,
				plateNumber: truck?.plate_number ?? 'No truck asset',
				driverName: driver.full_name,
				driverPhone: driver.phone,
				capacityTons: Number(truck?.capacity_tons ?? 0),
				bodyType: truck?.body_type ?? driver.vehicle_label ?? '',
				status,
				assignedQuoteId: assignment?.orderId ?? null,
				assignedQuoteNumber: assignment?.orderNumber ?? null,
				assignedCustomerName: assignment?.customerName ?? null,
				assignedDeliveryStatus: assignment?.deliveryStatus ?? null,
			}
		})

		return { drivers }
	})

export const markOrderDelivered = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			quoteId: z.string(),
			advisorId: z.string(),
			proofUrl: z.string().min(1),
			securityMethod: z.enum(['password', 'qr']),
			securityToken: z.string().min(1),
		}),
	)
	.handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
		const terminalProof = await getDispatchTerminalProof(
			data,
			'advisor_credential',
		)
		if (!terminalProof.success) return terminalProof
		const { error } = await terminalProof.client.rpc(
			'dispatch_complete_loaded_order',
			{
				p_order_id: data.quoteId,
				p_proof: terminalProof.proof,
			},
		)
		if (error) return { success: false, error: error.message }
		return { success: true }
	})

export const markOrderReturned = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			quoteId: z.string(),
			advisorId: z.string(),
			reason: z.string().min(3),
			proofUrl: z.string().min(1),
			securityMethod: z.enum(['password', 'qr']),
			securityToken: z.string().min(1),
		}),
	)
	.handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
		const terminalProof = await getDispatchTerminalProof(data)
		if (!terminalProof.success) return terminalProof
		const { error } = await terminalProof.client.rpc(
			'dispatch_return_loaded_order',
			{
				p_order_id: data.quoteId,
				p_reason: data.reason.trim(),
				p_proof: terminalProof.proof,
			},
		)
		if (error) return { success: false, error: error.message }
		return { success: true }
	})

export const getWarehouseEmployeesForDispatch = createServerFn({
	method: 'POST',
})
	.inputValidator(z.object({}))
	.handler(async () => {
		const auth = await getInternalSupabaseClient()
		const { data, error } = await auth.client
			.from('employees')
			.select('id, full_name, employee_roles(role)')
			.eq('status', 'active')
			.order('full_name', { ascending: true })
		if (error) throw new Error(error.message)

		const employees = ((data ?? []) as unknown as SupabaseDispatchEmployeeRow[])
			.filter(isDispatchAdvisor)
			.map((employee) => ({
				id: employee.id,
				name: employee.full_name,
			}))

		return { employees }
	})
