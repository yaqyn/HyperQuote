import { createActorServiceRoleClient } from '@hyperquote/auth/server'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
	getInternalSupabaseAdminClient,
	getInternalSupabaseClient,
	getInternalSupabasePasswordClient,
} from './_supabase'
import { formatSupabaseAddress, isSalesQuoteAddress } from './address-format'
import { verifyEmployeeCredential } from './employee-credentials'

/**
 * Warehouse dock flow — resumable 4-stage wizard per order.
 *
 * Source of truth is `order_reports.sections.warehouse` — a sparse blob
 * that grows as the advisor walks through the stages. Every mutation
 * re-reads the current blob, merges, and writes back, so an advisor can
 * drop their tablet mid-load and pick up exactly where they left off.
 *
 * Stages (derived at read time from what's already in the blob):
 *   1. unstarted       — no truck assigned yet
 *   2. loading         — at least one truck assigned, items being checked off
 *   3. awaiting_signoff — every line item checked across all trucks
 *   4. complete        — advisor + quality signoff recorded, ready for dispatch
 *
 * Dispatch hand-off: passing an order advances `currentStage` to
 * 'warehouse' on the order report so downstream (dispatch panel) picks
 * it up.
 */

// ─── Wizard state shape (lives inside report.sections.warehouse) ──

interface TruckAssignment {
	truckId: string
	plateNumber: string
	driverName: string
	capacityTons: number
	/** productSlug entries that have been physically loaded onto this truck. */
	itemsLoaded: string[]
	assignedAt: string
}

export type SecurityMethod = 'password' | 'qr'

interface WarehouseSignoff {
	advisorName: string
	qualityPass: boolean
	proofUrl: string
	securityMethod: SecurityMethod
	signedAt: string
}

/**
 * Audit record for a failed quality inspection. The advisor writes one
 * of these every time they reject a load during signoff. The order
 * bounces back to the loading stage and the advisor fixes + retries.
 */
interface FailedInspection {
	advisorName: string
	reason: string
	proofUrl: string
	securityMethod: SecurityMethod
	failedAt: string
}

export type WarehouseStage =
	| 'unstarted'
	| 'loading'
	| 'awaiting_signoff'
	| 'complete'

// ─── View shapes returned to the client ──

interface WarehouseItemView {
	productSlug: string
	productName: string
	sku: string
	unit: string
	quantity: number
	/** Which truck (if any) this item has been loaded onto. */
	loadedOnTruckId: string | null
}

export interface WarehouseOrderRowView {
	quoteId: string
	quoteNumber: string
	customerName: string
	customerTier: string
	deliveryAddress: string
	deliveryCity: string
	deliveryUrgencyDays: number
	itemCount: number
	totalValue: number
	approvedHoursAgo: number
	stage: WarehouseStage
	loadedCount: number
	truckCount: number
}

export interface WarehouseOrderDetailView extends WarehouseOrderRowView {
	rfqId: string
	customerPoNumber: string | null
	items: WarehouseItemView[]
	truckAssignments: TruckAssignment[]
	signoff: WarehouseSignoff | null
	failedInspections: FailedInspection[]
}

interface SupabaseLoadingProductRow {
	id: string
	slug: string
	sku: string
	name: string
	unit_of_measure: string
}

interface SupabaseLoadingItemRow {
	product_id: string | null
	customer_description: string
	quantity: number
	unit_of_measure: string
	sort_order: number
	products: SupabaseLoadingProductRow | SupabaseLoadingProductRow[] | null
}

interface SupabaseLoadingAddressRow {
	street: string
	area: string | null
	city: string
	governorate: string
	label: string | null
}

interface SupabaseLoadingCustomerRow {
	company_name: string
	status: string
}

interface SupabaseLoadingRequestRow {
	id: string
	request_number: string
	delivery_date: string | null
	created_at: string
	customer_addresses:
		| SupabaseLoadingAddressRow
		| SupabaseLoadingAddressRow[]
		| null
	quote_request_items: SupabaseLoadingItemRow[] | null
}

interface SupabaseLoadingOrderRow {
	id: string
	order_number: string
	quote_request_id: string
	customer_id: string | null
	status: string
	total_amount: number
	created_at: string
	customers: SupabaseLoadingCustomerRow | SupabaseLoadingCustomerRow[] | null
	quote_requests: SupabaseLoadingRequestRow | SupabaseLoadingRequestRow[] | null
}

interface SupabaseLoadingTaskRow {
	id: string
	order_id: string
	advisor_employee_id: string | null
	status: string
	proof: Record<string, unknown>
	rejection_reason: string | null
	created_at: string
	updated_at: string
	orders: SupabaseLoadingOrderRow | SupabaseLoadingOrderRow[] | null
	employees:
		| SupabaseWarehouseEmployeeRow
		| SupabaseWarehouseEmployeeRow[]
		| null
}

interface SupabaseLoadingDriverRow {
	id: string
	full_name: string
	status: string
	vehicle_label: string | null
}

interface SupabaseLoadingTruckRow {
	id: string
	plate_number: string
	driver_id: string | null
	capacity_tons: number | null
	body_type?: string | null
	status: string
	drivers: SupabaseLoadingDriverRow | SupabaseLoadingDriverRow[] | null
}

interface SupabaseLoadingTaskDriverRow {
	id: string
	loading_task_id: string
	driver_id: string
	truck_id: string | null
	assigned_items: unknown
	created_at: string
	drivers: SupabaseLoadingDriverRow | SupabaseLoadingDriverRow[] | null
	trucks: SupabaseLoadingTruckRow | SupabaseLoadingTruckRow[] | null
}

interface SupabaseDriverOnlineRow {
	driver_id: string
	status: string
	last_seen_at: string
}

interface SupabaseWarehouseEmployeeRoleRow {
	role: string
}

interface SupabaseWarehouseEmployeeRow {
	id: string
	full_name: string
	employee_roles: SupabaseWarehouseEmployeeRoleRow[] | null
}

interface SupabaseTruckView {
	id: string
	driverId: string
	plateNumber: string
	driverName: string
	capacityTons: number
	bodyType: string
	status: string
}

const WAREHOUSE_ADVISOR_ROLES = new Set([
	'admin',
	'ceo',
	'dispatch',
	'warehouse',
])

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string | undefined): value is string {
	return Boolean(value && UUID_RE.test(value))
}

function roundMoney(value: number): number {
	return Math.round(value * 100) / 100
}

function roundedHoursSince(iso: string): number {
	return Math.max(
		0,
		Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000),
	)
}

function firstRelation<T>(value: T | T[] | null): T | null {
	if (Array.isArray(value)) return value[0] ?? null
	return value
}

function parseAssignedItems(value: unknown): string[] {
	if (!Array.isArray(value)) return []
	return value.filter((item): item is string => typeof item === 'string')
}

function isWarehouseAdvisor(row: SupabaseWarehouseEmployeeRow): boolean {
	return (row.employee_roles ?? []).some((entry) =>
		WAREHOUSE_ADVISOR_ROLES.has(entry.role),
	)
}

function warehouseLoadingActionError(message: string): string {
	if (message.includes('assigned_driver_unavailable')) {
		return 'Selected driver is unavailable. Choose another driver before signoff.'
	}
	if (
		message.includes('driver_not_available') ||
		message.includes('truck_not_available')
	) {
		return 'That driver is unavailable. Choose another driver.'
	}
	if (message.includes('driver_not_online')) {
		return 'That driver is offline. Choose another online driver.'
	}
	return message
}

function supabaseAdvisorName(
	row: {
		employees:
			| SupabaseWarehouseEmployeeRow
			| SupabaseWarehouseEmployeeRow[]
			| null
	} | null,
) {
	return firstRelation(row?.employees ?? null)?.full_name ?? ''
}

function supabaseDeliveryUrgencyDays(deliveryDate: string | null) {
	if (!deliveryDate) return 3
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	const target = new Date(`${deliveryDate}T00:00:00`)
	const diffMs = target.getTime() - today.getTime()
	return Math.max(0, Math.ceil(diffMs / 86_400_000))
}

function supabaseLoadingStage(
	task: SupabaseLoadingTaskRow,
	assignments: SupabaseLoadingTaskDriverRow[],
): WarehouseStage {
	if (task.status === 'approved') return 'complete'
	if (task.proof?.advisor_marked_ready === true) return 'awaiting_signoff'
	if (task.status === 'loading' || task.status === 'rejected') return 'loading'
	if (assignments.length > 0) return 'loading'
	return 'unstarted'
}

async function getWarehouseAdvisor(
	client: Parameters<typeof verifyEmployeeCredential>[0]['client'],
	advisorId: string,
	securityMethod: SecurityMethod,
	securityToken: string,
) {
	const verified = await verifyEmployeeCredential({
		allowedRoles: WAREHOUSE_ADVISOR_ROLES,
		client,
		employeeId: advisorId,
		method: securityMethod,
		password: securityToken,
	})
	if (!verified.success) return verified
	return { success: true as const, advisor: verified.employee }
}

async function getWarehouseCredentialClient(
	advisorId: string,
	securityMethod: SecurityMethod,
	securityToken: string,
) {
	const adminClient = await getInternalSupabaseAdminClient()
	const advisorCheck = await getWarehouseAdvisor(
		adminClient,
		advisorId,
		securityMethod,
		securityToken,
	)
	if (!advisorCheck.success) return advisorCheck

	const client = await getInternalSupabasePasswordClient()
	const { error, data } = await client.auth.signInWithPassword({
		email: advisorCheck.advisor.email,
		password: securityToken.trim(),
	})
	if (error || !data.user) {
		return { success: false as const, error: 'Invalid employee password' }
	}
	if (
		data.user.app_metadata?.pool !== 'internal' ||
		data.user.app_metadata?.employee_id !== advisorCheck.advisor.id
	) {
		return {
			success: false as const,
			error: 'Password belongs to a different account',
		}
	}

	return {
		success: true as const,
		advisor: advisorCheck.advisor,
		client: createActorServiceRoleClient({
			actorPool: 'internal',
			actorUserId: data.user.id,
			client: adminClient,
		}),
	}
}

async function getSupabaseLoadingData(orderId?: string) {
	const auth = await getInternalSupabaseClient()

	let query = auth.client.from('loading_tasks').select(`
		id,
		order_id,
		advisor_employee_id,
		status,
		proof,
		rejection_reason,
		created_at,
		updated_at,
		employees (
			id,
			full_name,
			employee_roles (
				role
			)
		),
		orders (
			id,
			order_number,
			quote_request_id,
			customer_id,
			status,
			total_amount,
			created_at,
			customers (
				company_name,
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
					governorate
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
	if (orderId) query = query.eq('order_id', orderId)

	const { data: taskRows, error: taskError } = await query
	if (taskError) throw new Error(taskError.message)
	const tasks = (taskRows ?? []) as unknown as SupabaseLoadingTaskRow[]
	const taskIds = tasks.map((task) => task.id)

	const assignmentsByTask = new Map<string, SupabaseLoadingTaskDriverRow[]>()
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
					status,
					vehicle_label
				),
				trucks (
					id,
					plate_number,
					driver_id,
					capacity_tons,
					status
				)
			`)
			.in('loading_task_id', taskIds)
		if (assignmentError) throw new Error(assignmentError.message)
		for (const assignment of (assignmentRows ??
			[]) as unknown as SupabaseLoadingTaskDriverRow[]) {
			const list = assignmentsByTask.get(assignment.loading_task_id) ?? []
			list.push(assignment)
			assignmentsByTask.set(assignment.loading_task_id, list)
		}
	}

	return { auth, tasks, assignmentsByTask }
}

function buildSupabaseTruckAssignment(
	assignment: SupabaseLoadingTaskDriverRow,
): TruckAssignment | null {
	const truck = firstRelation(assignment.trucks)
	const driver = firstRelation(assignment.drivers)
	if (!truck || !driver) return null
	return {
		truckId: truck.id,
		plateNumber: truck.plate_number,
		driverName: driver.full_name,
		capacityTons: Number(truck.capacity_tons ?? 0),
		itemsLoaded: parseAssignedItems(assignment.assigned_items),
		assignedAt: assignment.created_at,
	}
}

function buildSupabaseLoadingRow(
	task: SupabaseLoadingTaskRow,
	assignments: SupabaseLoadingTaskDriverRow[],
): WarehouseOrderRowView | null {
	const order = firstRelation(task.orders)
	if (!order) return null
	if (
		!['inventory_reserved', 'warehouse_loading', 'dispatch_ready'].includes(
			order.status,
		)
	) {
		return null
	}
	const request = firstRelation(order.quote_requests)
	const customer = firstRelation(order.customers)
	if (!request || !customer) return null
	const items = request.quote_request_items ?? []
	const loaded = new Set(
		assignments.flatMap((a) => parseAssignedItems(a.assigned_items)),
	)
	const address = firstRelation(request.customer_addresses)
	const salesAddress = isSalesQuoteAddress(address) ? address : null
	return {
		quoteId: order.id,
		quoteNumber: order.order_number || request.request_number,
		customerName: customer.company_name,
		customerTier: customer.status || 'standard',
		deliveryAddress: formatSupabaseAddress(salesAddress),
		deliveryCity: salesAddress?.city ?? '',
		deliveryUrgencyDays: supabaseDeliveryUrgencyDays(request.delivery_date),
		itemCount: items.length,
		totalValue: roundMoney(Number(order.total_amount)),
		approvedHoursAgo: roundedHoursSince(task.created_at),
		stage: supabaseLoadingStage(task, assignments),
		loadedCount: loaded.size,
		truckCount: assignments.length,
	}
}

function buildSupabaseLoadingDetail(
	task: SupabaseLoadingTaskRow,
	assignments: SupabaseLoadingTaskDriverRow[],
): WarehouseOrderDetailView | null {
	const row = buildSupabaseLoadingRow(task, assignments)
	const order = firstRelation(task.orders)
	const request = firstRelation(order?.quote_requests ?? null)
	if (!row || !order || !request) return null
	const loadedByTruck = new Map<string, string>()
	for (const assignment of assignments) {
		const truck = firstRelation(assignment.trucks)
		if (!truck) continue
		for (const slug of parseAssignedItems(assignment.assigned_items)) {
			loadedByTruck.set(slug, truck.id)
		}
	}
	const items: WarehouseItemView[] = (request.quote_request_items ?? [])
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
			return {
				productSlug: slug,
				productName: product?.name ?? item.customer_description,
				sku: product?.sku ?? '',
				unit: product?.unit_of_measure ?? item.unit_of_measure,
				quantity: Number(item.quantity),
				loadedOnTruckId: loadedByTruck.get(slug) ?? null,
			}
		})
	const truckAssignments = assignments
		.map(buildSupabaseTruckAssignment)
		.filter((assignment): assignment is TruckAssignment => assignment !== null)
	const advisorName = supabaseAdvisorName(task)
	const failedInspections: FailedInspection[] =
		task.status === 'rejected'
			? [
					{
						advisorName,
						reason: task.rejection_reason ?? '',
						proofUrl:
							typeof task.proof?.proof_url === 'string'
								? task.proof.proof_url
								: '',
						securityMethod:
							task.proof?.security_method === 'qr' ? 'qr' : 'password',
						failedAt: task.updated_at,
					},
				]
			: []
	const signoff: WarehouseSignoff | null =
		task.status === 'approved'
			? {
					advisorName,
					qualityPass: true,
					proofUrl:
						typeof task.proof?.proof_url === 'string'
							? task.proof.proof_url
							: '',
					securityMethod:
						task.proof?.security_method === 'qr' ? 'qr' : 'password',
					signedAt: task.updated_at,
				}
			: null
	return {
		...row,
		rfqId: request.id,
		customerPoNumber: null,
		items,
		truckAssignments,
		signoff,
		failedInspections,
	}
}

// ─── Queries ──────────────────────────────────────────────

export const getWarehouseQueue = createServerFn({ method: 'POST' })
	.inputValidator(z.object({}))
	.handler(async () => {
		const supabaseData = await getSupabaseLoadingData()
		const orders = supabaseData.tasks
			.map((task) =>
				buildSupabaseLoadingRow(
					task,
					supabaseData.assignmentsByTask.get(task.id) ?? [],
				),
			)
			.filter((order): order is WarehouseOrderRowView => order !== null)
			.filter((order) => order.stage !== 'complete')
			.sort((a, b) => {
				const order = {
					loading: 0,
					awaiting_signoff: 1,
					unstarted: 2,
					complete: 3,
				} as const
				if (order[a.stage] !== order[b.stage]) {
					return order[a.stage] - order[b.stage]
				}
				if (a.deliveryUrgencyDays !== b.deliveryUrgencyDays) {
					return a.deliveryUrgencyDays - b.deliveryUrgencyDays
				}
				return b.approvedHoursAgo - a.approvedHoursAgo
			})
		return {
			orders,
			totals: {
				total: orders.length,
				unstarted: orders.filter((order) => order.stage === 'unstarted').length,
				loading: orders.filter((order) => order.stage === 'loading').length,
				awaitingSignoff: orders.filter(
					(order) => order.stage === 'awaiting_signoff',
				).length,
			},
		}
	})

export const getWarehouseOrderDetail = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ quoteId: z.string() }))
	.handler(async ({ data }) => {
		if (!isUuid(data.quoteId)) return null
		const supabaseData = await getSupabaseLoadingData(data.quoteId)
		const task = supabaseData.tasks[0]
		if (!task) return null
		return buildSupabaseLoadingDetail(
			task,
			supabaseData.assignmentsByTask.get(task.id) ?? [],
		)
	})

export const getAvailableTrucks = createServerFn({ method: 'POST' })
	.inputValidator(z.object({}))
	.handler(async () => {
		const auth = await getInternalSupabaseClient()
		const { data: driverRows, error: driverError } = await auth.client
			.from('drivers')
			.select('id, full_name, status, vehicle_label')
			.eq('status', 'available')
			.order('full_name', { ascending: true })
		if (driverError) throw new Error(driverError.message)
		const drivers = (driverRows ?? []) as unknown as SupabaseLoadingDriverRow[]
		if (drivers.length === 0) return { trucks: [] }
		const driverIds = drivers.map((driver) => driver.id)
		const { data: onlineRows, error: onlineError } = await auth.client
			.from('driver_online_states')
			.select('driver_id, status, last_seen_at')
			.in('driver_id', driverIds)
		if (onlineError) throw new Error(onlineError.message)
		const onlineByDriver = new Map<string, SupabaseDriverOnlineRow>()
		for (const row of (onlineRows ?? []) as SupabaseDriverOnlineRow[]) {
			onlineByDriver.set(row.driver_id, row)
		}
		const { data: truckRows, error: truckError } = await auth.client
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
					status,
					vehicle_label
				)
			`)
			.eq('status', 'available')
			.in('driver_id', driverIds)
			.order('updated_at', { ascending: false })
		if (truckError) throw new Error(truckError.message)
		const trucks = (truckRows ?? []) as unknown as SupabaseLoadingTruckRow[]
		const truckByDriver = new Map<string, SupabaseLoadingTruckRow>()
		for (const truck of trucks) {
			if (!truck.driver_id || truckByDriver.has(truck.driver_id)) continue
			truckByDriver.set(truck.driver_id, truck)
		}
		const now = Date.now()
		const available: SupabaseTruckView[] = []
		for (const driver of drivers) {
			const online = onlineByDriver.get(driver.id)
			if (!online || online.status !== 'online') continue
			if (now - new Date(online.last_seen_at).getTime() > 15 * 60_000) continue
			const truck = truckByDriver.get(driver.id)
			if (!truck) continue
			available.push({
				id: truck.id,
				driverId: driver.id,
				plateNumber: truck.plate_number,
				driverName: driver.full_name,
				capacityTons: Number(truck.capacity_tons ?? 0),
				bodyType: truck.body_type ?? driver.vehicle_label ?? '',
				status: truck.status,
			})
		}
		return { trucks: available }
	})

export const getWarehouseEmployees = createServerFn({ method: 'POST' })
	.inputValidator(z.object({}))
	.handler(async () => {
		const auth = await getInternalSupabaseClient()
		const { data, error } = await auth.client
			.from('employees')
			.select('id, full_name, employee_roles(role)')
			.eq('status', 'active')
			.order('full_name', { ascending: true })
		if (error) throw new Error(error.message)

		const employees = (
			(data ?? []) as unknown as SupabaseWarehouseEmployeeRow[]
		)
			.filter(isWarehouseAdvisor)
			.map((employee) => ({
				id: employee.id,
				name: employee.full_name,
				name_ar: employee.full_name,
			}))

		return { employees }
	})

// ─── Mutations ────────────────────────────────────────────

export const assignTruckToOrder = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			driverId: z.string(),
			quoteId: z.string(),
			truckId: z.string(),
		}),
	)
	.handler(async ({ data }) => {
		if (
			!isUuid(data.quoteId) ||
			!isUuid(data.driverId) ||
			!isUuid(data.truckId)
		) {
			return {
				success: false as const,
				error: 'Order, driver, or truck not found',
			}
		}
		const auth = await getInternalSupabaseClient()
		const { error } = await auth.client.rpc('warehouse_assign_loading_driver', {
			p_driver_id: data.driverId,
			p_order_id: data.quoteId,
			p_truck_id: data.truckId,
		})
		if (error) {
			return {
				success: false as const,
				error: warehouseLoadingActionError(error.message),
			}
		}
		return { success: true as const, quoteId: data.quoteId }
	})

export const toggleItemLoaded = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			quoteId: z.string(),
			truckId: z.string(),
			productSlug: z.string(),
		}),
	)
	.handler(async ({ data }) => {
		if (!isUuid(data.quoteId) || !isUuid(data.truckId)) {
			return { success: false as const, error: 'Order or truck not found' }
		}
		const auth = await getInternalSupabaseClient()
		const { error } = await auth.client.rpc('warehouse_toggle_loading_item', {
			p_order_id: data.quoteId,
			p_product_slug: data.productSlug,
			p_truck_id: data.truckId,
		})
		if (error) return { success: false as const, error: error.message }
		return { success: true as const }
	})

export const markReadyForSignoff = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ quoteId: z.string() }))
	.handler(async ({ data }) => {
		if (!isUuid(data.quoteId)) {
			return { success: false as const, error: 'Order not found' }
		}
		const auth = await getInternalSupabaseClient()
		const { error } = await auth.client.rpc('warehouse_mark_loading_ready', {
			p_order_id: data.quoteId,
		})
		if (error) return { success: false as const, error: error.message }
		return { success: true as const }
	})

export const removeTruckFromOrder = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ quoteId: z.string(), truckId: z.string() }))
	.handler(async ({ data }) => {
		if (!isUuid(data.quoteId) || !isUuid(data.truckId)) {
			return { success: false as const, error: 'Order or truck not found' }
		}
		const auth = await getInternalSupabaseClient()
		const { error } = await auth.client.rpc('warehouse_remove_loading_driver', {
			p_order_id: data.quoteId,
			p_truck_id: data.truckId,
		})
		if (error) return { success: false as const, error: error.message }
		return { success: true as const }
	})

export const replaceTruckOnOrder = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			fromTruckId: z.string(),
			driverId: z.string(),
			quoteId: z.string(),
			truckId: z.string(),
		}),
	)
	.handler(async ({ data }) => {
		if (
			!isUuid(data.quoteId) ||
			!isUuid(data.fromTruckId) ||
			!isUuid(data.driverId) ||
			!isUuid(data.truckId)
		) {
			return {
				success: false as const,
				error: 'Order, driver, or truck not found',
			}
		}
		const auth = await getInternalSupabaseClient()
		const { error } = await auth.client.rpc(
			'warehouse_replace_loading_driver',
			{
				p_driver_id: data.driverId,
				p_from_truck_id: data.fromTruckId,
				p_order_id: data.quoteId,
				p_truck_id: data.truckId,
			},
		)
		if (error) {
			return {
				success: false as const,
				error: warehouseLoadingActionError(error.message),
			}
		}
		return { success: true as const, quoteId: data.quoteId }
	})

export const recordWarehouseSignoff = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			quoteId: z.string(),
			advisorId: z.string().min(1),
			proofUrl: z.string().min(1),
			securityMethod: z.enum(['password', 'qr']),
			securityToken: z.string().min(1),
		}),
	)
	.handler(async ({ data }) => {
		if (!isUuid(data.quoteId)) {
			return { success: false as const, error: 'Order not found' }
		}
		const auth = await getInternalSupabaseClient()
		const advisorCheck = await getWarehouseAdvisor(
			auth.client,
			data.advisorId,
			data.securityMethod,
			data.securityToken,
		)
		if (!advisorCheck.success) return advisorCheck
		const supabaseData = await getSupabaseLoadingData(data.quoteId)
		const task = supabaseData.tasks[0]
		if (!task) return { success: false as const, error: 'Order not found' }
		const { error } = await auth.client.rpc('warehouse_approve_loading', {
			p_loading_task_id: task.id,
			p_proof: {
				advisor_id: data.advisorId,
				proof_url: data.proofUrl.trim(),
				security_method: data.securityMethod,
			},
		})
		if (error) {
			return {
				success: false as const,
				error: warehouseLoadingActionError(error.message),
			}
		}
		return {
			completed: true as const,
			quoteId: data.quoteId,
			success: true as const,
		}
	})

export const logFailedInspection = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			quoteId: z.string(),
			advisorId: z.string().min(1),
			reason: z.string().min(3),
			proofUrl: z.string().min(1),
			securityMethod: z.enum(['password', 'qr']),
			securityToken: z.string().min(1),
		}),
	)
	.handler(async ({ data }) => {
		if (!isUuid(data.quoteId)) {
			return { success: false as const, error: 'Order not found' }
		}
		const auth = await getInternalSupabaseClient()
		const advisorCheck = await getWarehouseAdvisor(
			auth.client,
			data.advisorId,
			data.securityMethod,
			data.securityToken,
		)
		if (!advisorCheck.success) return advisorCheck
		const supabaseData = await getSupabaseLoadingData(data.quoteId)
		const task = supabaseData.tasks[0]
		if (!task) return { success: false as const, error: 'Order not found' }
		const { error } = await auth.client.rpc('warehouse_reject_loading', {
			p_loading_task_id: task.id,
			p_proof: {
				advisor_id: data.advisorId,
				proof_url: data.proofUrl.trim(),
				security_method: data.securityMethod,
			},
			p_reason: data.reason.trim(),
		})
		if (error) return { success: false as const, error: error.message }
		return { success: true as const }
	})

export const resetWarehouseOrder = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ quoteId: z.string() }))
	.handler(async ({ data }) => {
		if (!isUuid(data.quoteId)) {
			return { success: false as const, error: 'Order not found' }
		}
		const auth = await getInternalSupabaseClient()
		const { error } = await auth.client.rpc('warehouse_reset_loading', {
			p_order_id: data.quoteId,
		})
		if (error) return { success: false as const, error: error.message }
		return { success: true as const }
	})

export const passOrderToDispatch = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ quoteId: z.string() }))
	.handler(async ({ data }) => {
		if (!isUuid(data.quoteId)) {
			return { success: false as const, error: 'Order not found' }
		}
		const supabaseData = await getSupabaseLoadingData(data.quoteId)
		const task = supabaseData.tasks[0]
		if (!task) return { success: false as const, error: 'Order not found' }
		if (task.status !== 'approved') {
			return {
				success: false as const,
				error: 'Must sign off before dispatch',
			}
		}
		return { success: true as const }
	})

// ═══ WAREHOUSE RECEIVING (supplier deliveries) ═════════════
//
// Incoming supplier deals — finance has paid at least a partial, the
// truck arrived at the dock, the advisor inspects every item and
// accepts or rejects each one.
//
// Per-item binary model:
//   • Accepted  → item.received flips true, stock increments by agreedQty
//   • Rejected  → item stays received=false, logged in receivingAttempts,
//                 deal remains in the queue for the next delivery attempt
// When every item on a deal is received, the deal auto-advances to
// `delivered` and drops off the receiving queue.

interface ReceivingItemView {
	productSlug: string
	productName: string
	sku: string
	unit: string
	agreedQty: number
	agreedRawCost: number
	lineTotal: number
	received: boolean
	receivedAt: string | null
}

export interface ReceivingDealRowView {
	dealId: string
	supplierName: string
	itemCount: number
	receivedCount: number
	pendingCount: number
	totalDue: number
	paymentStatus: string
	createdHoursAgo: number
	headlineProductName: string
	previousAttemptCount: number
}

export interface ReceivingDealDetailView extends ReceivingDealRowView {
	items: ReceivingItemView[]
	previousAttempts: {
		attemptedAt: string
		advisorName: string
		acceptedCount: number
		rejectedCount: number
		rejectionReason: string | null
	}[]
}

interface SupabaseReceivingProductRow {
	id: string
	slug: string
	sku: string
	name: string
	unit_of_measure: string
}

interface SupabaseReceivingSupplierRow {
	id: string
	name: string
	status: string
}

interface SupabaseReceivingRefillRow {
	id: string
	product_id: string
	supplier_id: string
	quantity: number
	unit_cost: number
	status: string
	created_at: string
	products: SupabaseReceivingProductRow | SupabaseReceivingProductRow[] | null
	suppliers:
		| SupabaseReceivingSupplierRow
		| SupabaseReceivingSupplierRow[]
		| null
}

interface SupabaseReceivingTaskRow {
	id: string
	refill_request_id: string
	advisor_employee_id: string | null
	status: string
	proof: Record<string, unknown>
	rejection_reason: string | null
	created_at: string
	updated_at: string
	refill_requests:
		| SupabaseReceivingRefillRow
		| SupabaseReceivingRefillRow[]
		| null
	employees:
		| SupabaseWarehouseEmployeeRow
		| SupabaseWarehouseEmployeeRow[]
		| null
}

interface SupabaseReceivingPaymentRow {
	refill_request_id: string
	amount: number
	payment_fraction: number
	created_at: string
}

interface SupabaseReceivingTaskItemRow {
	receiving_task_id: string
	product_id: string
	received_quantity: number
}

function receivingPaymentStatus(
	totalDue: number,
	payments: SupabaseReceivingPaymentRow[],
) {
	const amountPaid = payments.reduce(
		(sum, payment) => sum + Number(payment.amount),
		0,
	)
	if (
		amountPaid >= totalDue ||
		payments.some((payment) => Number(payment.payment_fraction) >= 1)
	) {
		return 'paid'
	}
	return amountPaid > 0 ? 'partial' : 'unpaid'
}

function buildSupabaseReceivingRow(
	task: SupabaseReceivingTaskRow,
	payments: SupabaseReceivingPaymentRow[],
	items: SupabaseReceivingTaskItemRow[],
): ReceivingDealRowView | null {
	const refill = firstRelation(task.refill_requests)
	if (!refill || refill.status !== 'warehouse_receiving') return null
	if (task.status === 'approved') return null
	const product = firstRelation(refill.products)
	const supplier = firstRelation(refill.suppliers)
	if (!product || !supplier) return null
	const totalDue = roundMoney(
		Number(refill.quantity) * Number(refill.unit_cost),
	)
	const receivedCount =
		task.status === 'approved' ||
		items.some((item) => item.product_id === product.id)
			? 1
			: 0
	const previousAttemptCount = task.status === 'rejected' ? 1 : 0
	return {
		dealId: refill.id,
		supplierName: supplier.name,
		itemCount: 1,
		receivedCount,
		pendingCount: receivedCount > 0 ? 0 : 1,
		totalDue,
		paymentStatus: receivingPaymentStatus(totalDue, payments),
		createdHoursAgo: roundedHoursSince(refill.created_at),
		headlineProductName: product.name,
		previousAttemptCount,
	}
}

function buildSupabaseReceivingDetail(
	task: SupabaseReceivingTaskRow,
	payments: SupabaseReceivingPaymentRow[],
	items: SupabaseReceivingTaskItemRow[],
): ReceivingDealDetailView | null {
	const row = buildSupabaseReceivingRow(task, payments, items)
	const refill = firstRelation(task.refill_requests)
	const product = firstRelation(refill?.products ?? null)
	if (!row || !refill || !product) return null
	const receivedItem = items.find((item) => item.product_id === product.id)
	const previousAttempts =
		task.status === 'rejected'
			? [
					{
						attemptedAt: task.updated_at,
						advisorName: supabaseAdvisorName(task),
						acceptedCount: 0,
						rejectedCount: 1,
						rejectionReason: task.rejection_reason,
					},
				]
			: []
	return {
		...row,
		items: [
			{
				productSlug: product.slug,
				productName: product.name,
				sku: product.sku,
				unit: product.unit_of_measure,
				agreedQty: Number(refill.quantity),
				agreedRawCost: Number(refill.unit_cost),
				lineTotal: roundMoney(
					Number(refill.quantity) * Number(refill.unit_cost),
				),
				received: Boolean(receivedItem) || task.status === 'approved',
				receivedAt: receivedItem ? task.updated_at : null,
			},
		],
		previousAttempts,
	}
}

async function getSupabaseReceivingData(
	dealId?: string,
	client?: Parameters<typeof verifyEmployeeCredential>[0]['client'],
) {
	const auth = client ? { client } : await getInternalSupabaseClient()

	let query = auth.client
		.from('receiving_tasks')
		.select(`
			id,
			refill_request_id,
			advisor_employee_id,
			status,
			proof,
			rejection_reason,
			created_at,
			updated_at,
			employees (
				id,
				full_name,
				employee_roles (
					role
				)
			),
			refill_requests (
				id,
				product_id,
				supplier_id,
				quantity,
				unit_cost,
				status,
				created_at,
				products (
					id,
					slug,
					sku,
					name,
					unit_of_measure
				),
				suppliers (
					id,
					name,
					status
				)
			)
		`)
		.in('status', ['pending', 'rejected'])

	if (dealId) query = query.eq('refill_request_id', dealId)

	const { data: taskRows, error: taskError } = await query
	if (taskError) throw new Error(taskError.message)
	const tasks = (taskRows ?? []) as unknown as SupabaseReceivingTaskRow[]
	const refillIds = tasks.map((task) => task.refill_request_id)
	const taskIds = tasks.map((task) => task.id)

	const paymentsByRefill = new Map<string, SupabaseReceivingPaymentRow[]>()
	if (refillIds.length > 0) {
		const { data: paymentRows, error: paymentError } = await auth.client
			.from('supplier_payments')
			.select('refill_request_id, amount, payment_fraction, created_at')
			.in('refill_request_id', refillIds)
			.eq('status', 'recorded')
		if (paymentError) throw new Error(paymentError.message)
		for (const payment of (paymentRows ??
			[]) as SupabaseReceivingPaymentRow[]) {
			const list = paymentsByRefill.get(payment.refill_request_id) ?? []
			list.push(payment)
			paymentsByRefill.set(payment.refill_request_id, list)
		}
	}

	const itemsByTask = new Map<string, SupabaseReceivingTaskItemRow[]>()
	if (taskIds.length > 0) {
		const { data: itemRows, error: itemError } = await auth.client
			.from('receiving_task_items')
			.select('receiving_task_id, product_id, received_quantity')
			.in('receiving_task_id', taskIds)
		if (itemError) throw new Error(itemError.message)
		for (const item of (itemRows ?? []) as SupabaseReceivingTaskItemRow[]) {
			const list = itemsByTask.get(item.receiving_task_id) ?? []
			list.push(item)
			itemsByTask.set(item.receiving_task_id, list)
		}
	}

	return { auth, tasks, paymentsByRefill, itemsByTask }
}

export const getReceivingQueue = createServerFn({ method: 'POST' })
	.inputValidator(z.object({}))
	.handler(async () => {
		const supabaseData = await getSupabaseReceivingData()
		const deals = supabaseData.tasks
			.map((task) =>
				buildSupabaseReceivingRow(
					task,
					supabaseData.paymentsByRefill.get(task.refill_request_id) ?? [],
					supabaseData.itemsByTask.get(task.id) ?? [],
				),
			)
			.filter((deal): deal is ReceivingDealRowView => deal !== null)
			.sort((a, b) => {
				if (a.previousAttemptCount !== b.previousAttemptCount) {
					return b.previousAttemptCount - a.previousAttemptCount
				}
				return b.createdHoursAgo - a.createdHoursAgo
			})
		return {
			deals,
			totals: {
				total: deals.length,
				retrying: deals.filter((d) => d.previousAttemptCount > 0).length,
				fresh: deals.filter((d) => d.previousAttemptCount === 0).length,
			},
		}
	})

export const getReceivingDealDetail = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ dealId: z.string() }))
	.handler(async ({ data }) => {
		if (!isUuid(data.dealId)) return null
		const supabaseData = await getSupabaseReceivingData(data.dealId)
		const task = supabaseData.tasks[0]
		if (!task) return null
		return buildSupabaseReceivingDetail(
			task,
			supabaseData.paymentsByRefill.get(task.refill_request_id) ?? [],
			supabaseData.itemsByTask.get(task.id) ?? [],
		)
	})

/**
 * Commit a receiving attempt. Every item on the deal gets a binary
 * decision: received (stock +=) or rejected (stays on the deal).
 * If anything was rejected, a reason is required. The advisor's
 * security token is validated the same way as outgoing signoff.
 */
export const recordReceivingAttempt = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			dealId: z.string(),
			advisorId: z.string().min(1),
			decisions: z
				.array(
					z.object({
						productSlug: z.string(),
						accepted: z.boolean(),
					}),
				)
				.min(1),
			rejectionReason: z.string().optional(),
			proofUrl: z.string().min(1),
			securityMethod: z.enum(['password', 'qr']),
			securityToken: z.string().min(1),
		}),
	)
	.handler(async ({ data }) => {
		if (!isUuid(data.dealId)) {
			return { success: false as const, error: 'Deal not found' }
		}
		const actionAuth = await getWarehouseCredentialClient(
			data.advisorId,
			data.securityMethod,
			data.securityToken,
		)
		if (!actionAuth.success) return actionAuth

		const supabaseData = await getSupabaseReceivingData(
			data.dealId,
			actionAuth.client,
		)
		const task = supabaseData.tasks[0]
		if (!task) return { success: false as const, error: 'Deal not found' }
		const detail = buildSupabaseReceivingDetail(
			task,
			supabaseData.paymentsByRefill.get(task.refill_request_id) ?? [],
			supabaseData.itemsByTask.get(task.id) ?? [],
		)
		if (!detail) return { success: false as const, error: 'Deal not found' }

		const pendingSlugs = new Set(
			detail.items
				.filter((item) => !item.received)
				.map((item) => item.productSlug),
		)
		const accepted = data.decisions.filter(
			(decision) => pendingSlugs.has(decision.productSlug) && decision.accepted,
		)
		const rejected = data.decisions.filter(
			(decision) =>
				pendingSlugs.has(decision.productSlug) && !decision.accepted,
		)
		if (accepted.length + rejected.length === 0) {
			return {
				success: false as const,
				error: 'No pending items were decided',
			}
		}
		if (
			rejected.length > 0 &&
			(!data.rejectionReason || data.rejectionReason.trim().length < 3)
		) {
			return {
				success: false as const,
				error: 'Rejection reason required (min 3 chars)',
			}
		}

		const proof = {
			proof_url: data.proofUrl.trim(),
			security_method: data.securityMethod,
			advisor_id: data.advisorId,
		}
		if (rejected.length > 0) {
			const { error } = await actionAuth.client.rpc(
				'warehouse_reject_receiving',
				{
					p_receiving_task_id: task.id,
					p_reason: data.rejectionReason?.trim() ?? '',
					p_proof: proof,
				},
			)
			if (error) throw new Error(error.message)
			return {
				success: true as const,
				dealId: data.dealId,
				fullyReceived: false,
				acceptedCount: 0,
				rejectedCount: rejected.length,
			}
		}

		const product = firstRelation(
			firstRelation(task.refill_requests)?.products ?? null,
		)
		if (!product) return { success: false as const, error: 'Deal not found' }
		const acceptedItems = accepted
			.map((decision) =>
				detail.items.find((item) => item.productSlug === decision.productSlug),
			)
			.filter((item): item is ReceivingItemView => item !== undefined)
		if (acceptedItems.length === 0) {
			return {
				success: false as const,
				error: 'No pending items were decided',
			}
		}

		const { error: insertError } = await actionAuth.client
			.from('receiving_task_items')
			.insert(
				acceptedItems.map((item) => ({
					receiving_task_id: task.id,
					product_id: product.id,
					received_quantity: item.agreedQty,
				})),
			)
		if (insertError) throw new Error(insertError.message)
		const { error } = await actionAuth.client.rpc(
			'warehouse_approve_receiving',
			{
				p_receiving_task_id: task.id,
				p_proof: proof,
			},
		)
		if (error) throw new Error(error.message)
		return {
			success: true as const,
			dealId: data.dealId,
			fullyReceived: true,
			acceptedCount: acceptedItems.length,
			rejectedCount: 0,
		}
	})
