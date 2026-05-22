import { spawnSync } from 'node:child_process'
import { type Browser, expect, type Page, test } from '@playwright/test'
import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

interface SupabaseCookieToSet {
	name: string
	options?: { maxAge?: number }
	value: string
}

interface LocalSupabaseEnv {
	anonKey: string
	apiUrl: string
	serviceRoleKey: string
}

interface InternalPageHandle {
	context: Awaited<ReturnType<Browser['newContext']>>
	guard: ReturnType<typeof installBrowserErrorGuard>
	page: Page
}

interface EmployeeRef {
	fullName: string
	id: string
}

interface DriverAccount {
	email: string
	password: string
}

interface DriverTruckFixture {
	account: DriverAccount
	driverId: string
	driverName: string
	plateNumber: string
	truckId: string
}

interface ProductFixture {
	id: string
	name: string
	quantity: number
	sku: string
	slug: string
	stock: number
	unit: string
	unitAr: string
	unitPrice: number
}

interface DispatchOrderFixture {
	customerName: string
	loadingTaskId: string
	orderId: string
	orderNumber: string
	products: ProductFixture[]
	requestId: string
	runId: string
	trucks: DriverTruckFixture[]
}

const DEFAULT_PASSWORD = ['hyperquote', 'local', 'only', '2026'].join('-')

const URLS = {
	internal: process.env.FLOW_INTERNAL_URL ?? 'http://localhost:3002',
}

const COOKIE_NAMES = {
	internal: 'hyperquote_internal_auth',
}

const LOCAL_DISPATCH = {
	email: 'local-dispatch@hyperquote.local',
	password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
}

const LOCAL_FINANCE = {
	email: 'local-finance@hyperquote.local',
	password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
}

const LOCAL_INVENTORY = {
	email: 'local-inventory@hyperquote.local',
	password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
}

const LOCAL_WAREHOUSE = {
	email: 'local-warehouse@hyperquote.local',
	password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
}

test.describe.configure({ mode: 'serial' })
test.use({ actionTimeout: 15_000, navigationTimeout: 30_000 })

test('dispatch shows live split fleet/order state, blocks driver control access, delivers, and returns orders to warehouse', async ({
	browser,
}) => {
	test.setTimeout(480_000)
	const env = readLocalSupabaseEnv()
	const service = createLocalServiceClient(env)
	const inventoryAuth = await signInLocal(env, LOCAL_INVENTORY)
	const warehouseAuth = await signInLocal(env, LOCAL_WAREHOUSE)
	const financeEmployee = await employeeByEmail(service, LOCAL_FINANCE.email)
	const warehouseEmployee = await employeeByEmail(
		service,
		LOCAL_WAREHOUSE.email,
	)

	const splitRunId = uniqueRunId('dispatch-split')
	const returnRunId = uniqueRunId('dispatch-return')
	const idleTruck = await createDriverTruck(service, {
		driverName: `Flow Idle Dispatch ${splitRunId}`,
		platePrefix: 'IDLE',
		runId: splitRunId,
		suffix: 'I0',
	})
	const ahmedTruck = await createDriverTruck(service, {
		driverName: `Flow Ahmed Dispatch ${splitRunId}`,
		platePrefix: 'AHMD',
		runId: splitRunId,
		suffix: 'A1',
	})
	const salehTruck = await createDriverTruck(service, {
		driverName: `Flow Saleh Dispatch ${splitRunId}`,
		platePrefix: 'SALE',
		runId: splitRunId,
		suffix: 'S2',
	})
	const returnTruck = await createDriverTruck(service, {
		driverName: `Flow Return Dispatch ${returnRunId}`,
		platePrefix: 'RTRN',
		runId: returnRunId,
		suffix: 'R1',
	})

	const splitOrder = await createApprovedDispatchOrder(service, {
		destination: {
			latitude: 30.0444,
			longitude: 31.2357,
		},
		financeEmployeeId: financeEmployee.id,
		inventoryClient: inventoryAuth.client,
		label: 'split',
		runId: splitRunId,
		truckAssignments: [
			{ key: 'wood', truck: ahmedTruck },
			{ key: 'metal', truck: salehTruck },
		],
		warehouseClient: warehouseAuth.client,
	})
	const returnOrder = await createApprovedDispatchOrder(service, {
		destination: {
			latitude: 30.0729,
			longitude: 31.3462,
		},
		financeEmployeeId: financeEmployee.id,
		inventoryClient: inventoryAuth.client,
		label: 'return',
		runId: returnRunId,
		truckAssignments: [{ key: 'wood', truck: returnTruck }],
		warehouseClient: warehouseAuth.client,
	})

	const ahmedAuth = await signInLocal(env, ahmedTruck.account)
	const salehAuth = await signInLocal(env, salehTruck.account)
	const ahmedDeliveryId = await deliveryIdForDriver(
		service,
		splitOrder.orderId,
		ahmedTruck.driverId,
	)
	const salehDeliveryId = await deliveryIdForDriver(
		service,
		splitOrder.orderId,
		salehTruck.driverId,
	)

	await mustRpc(ahmedAuth.client, 'driver_accept_delivery', {
		p_delivery_id: ahmedDeliveryId,
	})
	await mustRpc(ahmedAuth.client, 'driver_start_delivery', {
		p_delivery_id: ahmedDeliveryId,
	})
	await mustRpc(ahmedAuth.client, 'driver_update_location', {
		p_accuracy_meters: 8,
		p_delivery_id: ahmedDeliveryId,
		p_heading: 72,
		p_latitude: 30.038,
		p_longitude: 31.226,
		p_speed_kmh: 42,
	})
	await mustRpc(salehAuth.client, 'driver_accept_delivery', {
		p_delivery_id: salehDeliveryId,
	})
	await mustRpc(salehAuth.client, 'driver_start_delivery', {
		p_delivery_id: salehDeliveryId,
	})
	await mustRpc(salehAuth.client, 'driver_record_arrival', {
		p_delivery_id: salehDeliveryId,
	})
	await mustRpc(salehAuth.client, 'driver_update_location', {
		p_accuracy_meters: 5,
		p_delivery_id: salehDeliveryId,
		p_heading: 10,
		p_latitude: 30.044,
		p_longitude: 31.235,
		p_speed_kmh: 0,
	})
	await expectDriverLocationSource(
		service,
		ahmedDeliveryId,
		ahmedTruck.driverId,
	)

	const driverBypass = await ahmedAuth.client.rpc(
		'dispatch_return_loaded_order',
		{
			p_order_id: splitOrder.orderId,
			p_proof: { proof_url: `dispatch/bypass-${splitRunId}.jpg` },
			p_reason: 'driver tried internal dispatch control',
		},
	)
	expect(driverBypass.error?.message).toContain(
		'insufficient_dispatch_permission',
	)

	const dispatch = await openInternalPage(browser, LOCAL_DISPATCH)
	try {
		await dispatch.page.getByRole('button', { name: /^Dispatch$/i }).click()
		await expect(dispatch.page.locator('body')).toContainText(
			splitOrder.customerName,
			{ timeout: 30_000 },
		)
		await expect(dispatch.page.locator('body')).toContainText(
			returnOrder.customerName,
			{ timeout: 30_000 },
		)

		await expectMapMarker(dispatch.page, ahmedTruck.plateNumber)
		await expectMapMarker(dispatch.page, salehTruck.plateNumber)
		await expectOrderMapMarker(dispatch.page, splitOrder)

		await dispatch.page
			.getByRole('button', { name: /Collapse dispatch panel/i })
			.click()
		await expect(
			dispatch.page.getByRole('button', { name: /Open dispatch panel/i }),
		).toBeVisible({ timeout: 20_000 })
		await dispatch.page
			.getByRole('button', {
				name: `Open live truck ${ahmedTruck.plateNumber}`,
			})
			.first()
			.click()
		await expect(dispatch.page.locator('body')).toContainText(
			ahmedTruck.driverName,
			{ timeout: 20_000 },
		)
		await expect(dispatch.page.locator('body')).toContainText(
			salehTruck.driverName,
		)
		await expect(dispatch.page.locator('body')).toContainText(
			ahmedTruck.plateNumber,
		)
		await expect(dispatch.page.locator('body')).toContainText(
			salehTruck.plateNumber,
		)
		await expect(dispatch.page.locator('body')).toContainText('En route')
		await expect(dispatch.page.locator('body')).toContainText('Arrived')
		await expect(dispatch.page.locator('body')).toContainText('live location')
		for (const product of splitOrder.products) {
			await expect(dispatch.page.locator('body')).toContainText(product.name)
		}

		await dispatch.page
			.getByRole('button', { name: /Back to deliveries/i })
			.click()
		await dispatch.page.getByRole('button', { name: /^Fleet$/i }).click()
		await expect(dispatch.page.locator('body')).toContainText(
			idleTruck.driverName,
			{ timeout: 20_000 },
		)
		await expect(dispatch.page.locator('body')).toContainText(
			idleTruck.plateNumber,
		)
		await expect(dispatch.page.locator('body')).toContainText(
			ahmedTruck.driverName,
		)
		await expect(dispatch.page.locator('body')).toContainText(
			splitOrder.customerName.toLowerCase(),
		)

		await dispatch.page.getByRole('button', { name: /^Deliveries$/i }).click()
		await dispatch.page
			.locator('[role="button"]', { hasText: splitOrder.customerName })
			.first()
			.click()
		await dispatch.page
			.getByRole('button', { name: /Confirm delivered/i })
			.click()
		await expect(
			dispatch.page.getByRole('button', { name: /^Confirm delivery$/i }),
		).toBeDisabled()
		await dispatch.page.locator('select').selectOption(warehouseEmployee.id)
		await dispatch.page.getByPlaceholder('your password').fill('wrong-password')
		await dispatch.page
			.getByPlaceholder('pod-photo.jpg')
			.fill(`dispatch/wrong-${splitRunId}.jpg`)
		await dispatch.page
			.getByRole('button', { name: /^Confirm delivery$/i })
			.click()
		await expect(dispatch.page.locator('body')).toContainText(
			'Invalid employee password',
			{ timeout: 20_000 },
		)
		await dispatch.page
			.getByPlaceholder('your password')
			.fill(LOCAL_WAREHOUSE.password)
		await dispatch.page
			.getByPlaceholder('pod-photo.jpg')
			.fill(`dispatch/delivered-${splitRunId}.jpg`)
		await dispatch.page
			.getByRole('button', { name: /^Confirm delivery$/i })
			.click()
		await expect(dispatch.page.locator('body')).not.toContainText(
			splitOrder.customerName,
			{ timeout: 30_000 },
		)
		await expectSplitOrderDelivered(service, splitOrder)

		await dispatch.page
			.locator('[role="button"]', { hasText: returnOrder.customerName })
			.first()
			.click()
		await dispatch.page
			.getByRole('button', { name: /Return to warehouse/i })
			.click()
		await dispatch.page
			.getByPlaceholder('customer refused, wrong quantities')
			.fill(`Customer refused damaged bundle ${returnRunId}`)
		await dispatch.page.locator('select').selectOption(warehouseEmployee.id)
		await dispatch.page
			.getByPlaceholder('your password')
			.fill(LOCAL_WAREHOUSE.password)
		await dispatch.page
			.getByPlaceholder('pod-photo.jpg')
			.fill(`dispatch/return-${returnRunId}.jpg`)
		await dispatch.page
			.getByRole('button', { name: /^Confirm return$/i })
			.click()
		await expect(dispatch.page.locator('body')).not.toContainText(
			returnOrder.customerName,
			{ timeout: 30_000 },
		)
		await expectReturnedToWarehouse(service, returnOrder, returnRunId)
		await dispatch.guard.expectClean('dispatch final browser flow')
	} finally {
		await dispatch.context.close()
	}

	const warehouse = await openInternalPage(browser, LOCAL_WAREHOUSE)
	try {
		await warehouse.page.getByRole('button', { name: /^Warehouse$/i }).click()
		await warehouse.page.locator('[data-tab-id="loading"]').click()
		await expect(warehouse.page.locator('body')).toContainText(
			returnOrder.customerName,
			{ timeout: 30_000 },
		)
		await warehouse.guard.expectClean('returned delivery warehouse loading')
	} finally {
		await warehouse.context.close()
		await Promise.all([
			inventoryAuth.client.auth.signOut({ scope: 'local' }),
			warehouseAuth.client.auth.signOut({ scope: 'local' }),
			ahmedAuth.client.auth.signOut({ scope: 'local' }),
			salehAuth.client.auth.signOut({ scope: 'local' }),
		])
	}
})

async function createApprovedDispatchOrder(
	service: SupabaseClient,
	input: {
		destination: { latitude: number; longitude: number }
		financeEmployeeId: string
		inventoryClient: SupabaseClient
		label: 'return' | 'split'
		runId: string
		truckAssignments: Array<{
			key: 'metal' | 'wood'
			truck: DriverTruckFixture
		}>
		warehouseClient: SupabaseClient
	},
): Promise<DispatchOrderFixture> {
	const customerName = `Flow Dispatch ${input.label} Customer ${input.runId}`
	const { data: customer, error: customerError } = await service
		.from('customers')
		.insert({
			company_name: customerName,
			contact_name: `Dispatch Contact ${input.runId}`,
			email: `flow-dispatch-${input.label}-${input.runId}@example.test`,
			phone: `+205${Date.now().toString().slice(-10)}`,
			status: 'active',
		})
		.select('id')
		.single()
	if (customerError || !customer) {
		throw new Error(customerError?.message ?? 'Customer missing')
	}

	const { data: address, error: addressError } = await service
		.from('customer_addresses')
		.insert({
			area: 'New Cairo',
			city: 'Cairo',
			customer_id: customer.id,
			governorate: 'Cairo',
			is_default: true,
			label: `Dispatch ${input.label}`,
			latitude: input.destination.latitude,
			longitude: input.destination.longitude,
			phone: `+205${Date.now().toString().slice(-10)}`,
			street: `Dispatch ${input.label} ${input.runId} Street`,
		})
		.select('id')
		.single()
	if (addressError || !address) {
		throw new Error(addressError?.message ?? 'Address missing')
	}

	const uniqueKeys = [
		...new Set(input.truckAssignments.map((entry) => entry.key)),
	]
	const products = await Promise.all(
		uniqueKeys.map((key) =>
			createStockedProduct(service, {
				key,
				quantity: key === 'wood' ? 3 : 2,
				runId: input.runId,
				stock: key === 'wood' ? 12 : 9,
				unitPrice: key === 'wood' ? 90 : 140,
			}),
		),
	)

	const deliveryDate = new Date(Date.now() + 4 * 86_400_000)
		.toISOString()
		.slice(0, 10)
	const { data: request, error: requestError } = await service
		.from('quote_requests')
		.insert({
			customer_id: customer.id,
			delivery_address_id: address.id,
			delivery_date: deliveryDate,
			notes: `Final Flow dispatch ${input.label} ${input.runId}`,
			status: 'quoted',
			submitted_at: new Date().toISOString(),
			urgency: 'urgent',
		})
		.select('id, request_number')
		.single()
	if (requestError || !request) {
		throw new Error(requestError?.message ?? 'Quote request missing')
	}

	const { error: itemError } = await service
		.from('quote_request_items')
		.insert(
			products.map((product, index) =>
				quoteItem(String(request.id), product, index + 1),
			),
		)
	if (itemError) throw new Error(itemError.message)

	const totalAmount = products.reduce(
		(total, product) => total + product.quantity * product.unitPrice,
		0,
	)
	const { data: order, error: orderError } = await service
		.from('orders')
		.insert({
			customer_id: customer.id,
			quote_request_id: request.id,
			status: 'confirmed_for_inventory',
			total_amount: totalAmount,
		})
		.select('id, order_number')
		.single()
	if (orderError || !order) {
		throw new Error(orderError?.message ?? 'Order missing')
	}

	const { error: paymentError } = await service
		.from('customer_payments')
		.insert({
			amount: totalAmount,
			order_id: order.id,
			payment_fraction: 1,
			proof_path: `dispatch/customer-paid-${input.runId}.pdf`,
			recorded_by_employee_id: input.financeEmployeeId,
			status: 'recorded',
		})
	if (paymentError) throw new Error(paymentError.message)

	const reserved = await input.inventoryClient.rpc('reserve_order_stock', {
		p_order_id: order.id,
	})
	expect(reserved.error).toBeNull()
	expect(reserved.data?.status).toBe('inventory_reserved')

	for (const assignment of input.truckAssignments) {
		const assigned = await input.warehouseClient.rpc(
			'warehouse_assign_loading_driver',
			{
				p_driver_id: assignment.truck.driverId,
				p_order_id: order.id,
				p_truck_id: assignment.truck.truckId,
			},
		)
		expect(assigned.error).toBeNull()
		const product = products.find((entry) =>
			entry.slug.includes(assignment.key),
		)
		if (!product) throw new Error(`Product missing for ${assignment.key}`)
		const toggled = await input.warehouseClient.rpc(
			'warehouse_toggle_loading_item',
			{
				p_order_id: order.id,
				p_product_slug: product.slug,
				p_truck_id: assignment.truck.truckId,
			},
		)
		expect(toggled.error).toBeNull()
	}

	const ready = await input.warehouseClient.rpc(
		'warehouse_mark_loading_ready',
		{
			p_order_id: order.id,
		},
	)
	expect(ready.error).toBeNull()
	const loadingTaskId = expectString(ready.data?.id, 'loading task id')
	const approved = await input.warehouseClient.rpc(
		'warehouse_approve_loading',
		{
			p_loading_task_id: loadingTaskId,
			p_proof: {
				checked_by: 'flow-internal-dispatch-final',
				order_id: order.id,
				source: input.label,
			},
		},
	)
	expect(approved.error).toBeNull()
	expect(approved.data?.status).toBe('approved')
	await expectOrderStatus(service, String(order.id), 'dispatch_ready')

	return {
		customerName,
		loadingTaskId,
		orderId: String(order.id),
		orderNumber: String(order.order_number),
		products,
		requestId: String(request.id),
		runId: input.runId,
		trucks: input.truckAssignments.map((entry) => entry.truck),
	}
}

function quoteItem(
	quoteRequestId: string,
	product: ProductFixture,
	sortOrder: number,
) {
	return {
		currency: 'EGP',
		customer_description: product.name,
		is_unmatched: false,
		match_confidence: 1,
		price_range_max: product.unitPrice,
		price_range_min: product.unitPrice,
		product_id: product.id,
		quantity: product.quantity,
		quote_request_id: quoteRequestId,
		sort_order: sortOrder,
		unit_of_measure: product.unit,
		unit_of_measure_ar: product.unitAr,
	}
}

async function createStockedProduct(
	service: SupabaseClient,
	input: {
		key: 'metal' | 'wood'
		quantity: number
		runId: string
		stock: number
		unitPrice: number
	},
): Promise<ProductFixture> {
	const name = `Flow Dispatch ${input.key} ${input.runId}`
	const slug = `flow-dispatch-${input.key}-${input.runId}`
	const unit = input.key === 'wood' ? 'bundle' : 'bar'
	const unitAr = input.key === 'wood' ? 'حزمة' : 'سيخ'
	const { data: product, error: productError } = await service
		.from('products')
		.insert({
			availability_status: 'available',
			category: input.key === 'wood' ? 'wood' : 'steel',
			description: `Final Flow dispatch product ${input.runId}`,
			description_ar: `منتج اختبار التوزيع ${input.runId}`,
			image_urls: [],
			is_active: true,
			is_stockable: true,
			name,
			name_ar: `اختبار توزيع ${input.key} ${input.runId}`,
			price_range_max: input.unitPrice,
			price_range_min: input.unitPrice,
			sku: `FLOW-DISP-${input.key}-${input.runId}`.toUpperCase(),
			slug,
			specifications: { flow: 'dispatch', key: input.key },
			specifications_ar: { flow: 'dispatch', key: input.key },
			subcategory: input.key,
			subcategory_ar: input.key === 'wood' ? 'خشب' : 'حديد',
			unit_of_measure: unit,
			unit_of_measure_ar: unitAr,
		})
		.select('id, name, sku, slug')
		.single()
	if (productError || !product) {
		throw new Error(productError?.message ?? 'Product missing')
	}

	const { error: stockError } = await service.from('inventory_stock').insert({
		minimum_quantity: 0,
		on_hand_quantity: input.stock,
		product_id: product.id,
		reserved_quantity: 0,
	})
	if (stockError) throw new Error(stockError.message)

	return {
		id: String(product.id),
		name: String(product.name),
		quantity: input.quantity,
		sku: String(product.sku),
		slug: String(product.slug),
		stock: input.stock,
		unit,
		unitAr,
		unitPrice: input.unitPrice,
	}
}

async function createDriverTruck(
	service: SupabaseClient,
	input: {
		driverName: string
		platePrefix: string
		runId: string
		suffix: string
	},
): Promise<DriverTruckFixture> {
	const unique = `${Date.now().toString().slice(-6)}${Math.random().toString(36).slice(2, 5)}`
	const email = `${input.platePrefix.toLowerCase()}-${input.runId}-${unique}@hyperquote.local`
	const password = `Flow-${input.runId}-${input.suffix}-Aa123456!`
	const { data: authUser, error: authError } =
		await service.auth.admin.createUser({
			email,
			email_confirm: true,
			password,
		})
	if (authError || !authUser.user) {
		throw new Error(authError?.message ?? 'Driver auth user missing')
	}

	const { data: driver, error: driverError } = await service
		.from('drivers')
		.insert({
			email,
			full_name: input.driverName,
			phone: `+209${Date.now().toString().slice(-9)}${input.suffix.length}`,
			status: 'available',
			user_id: authUser.user.id,
			vehicle_label: `${input.platePrefix} flatbed`,
		})
		.select('id')
		.single()
	if (driverError || !driver) {
		throw new Error(driverError?.message ?? 'Driver missing')
	}

	const { error: onlineError } = await service
		.from('driver_online_states')
		.insert({
			driver_id: driver.id,
			last_seen_at: new Date().toISOString(),
			status: 'online',
		})
	if (onlineError) throw new Error(onlineError.message)

	const plateNumber =
		`${input.platePrefix}-${input.suffix}-${unique}`.toUpperCase()
	const { data: truck, error: truckError } = await service
		.from('trucks')
		.insert({
			body_type: 'flatbed',
			capacity_tons: 20,
			driver_id: driver.id,
			plate_number: plateNumber,
			status: 'available',
		})
		.select('id')
		.single()
	if (truckError || !truck) {
		throw new Error(truckError?.message ?? 'Truck missing')
	}

	return {
		account: { email, password },
		driverId: String(driver.id),
		driverName: input.driverName,
		plateNumber,
		truckId: String(truck.id),
	}
}

async function expectMapMarker(page: Page, plateNumber: string) {
	await expect(
		page.getByRole('button', {
			name: `Open live truck ${plateNumber}`,
		}),
	).toBeVisible({ timeout: 30_000 })
}

async function expectOrderMapMarker(page: Page, order: DispatchOrderFixture) {
	await expect(
		page.getByRole('button', {
			name: `Open dispatch order ${order.orderNumber} for ${order.customerName}`,
		}),
	).toBeVisible({ timeout: 30_000 })
}

async function expectSplitOrderDelivered(
	service: SupabaseClient,
	order: DispatchOrderFixture,
) {
	await expectOrderStatus(service, order.orderId, 'delivered')
	const { data: deliveries, error: deliveryError } = await service
		.from('deliveries')
		.select('id, driver_id, truck_id, status, completed_at')
		.eq('order_id', order.orderId)
		.eq('loading_task_id', order.loadingTaskId)
		.order('created_at')
	if (deliveryError || !deliveries) throw new Error(deliveryError?.message)
	expect(deliveries).toHaveLength(order.trucks.length)
	for (const delivery of deliveries) {
		expect(delivery.status).toBe('completed')
		expect(isIsoTimestamp(delivery.completed_at)).toBe(true)
		const activity = await latestActivity(service, {
			action: 'dispatch_delivery_completed',
			entityId: String(delivery.id),
			entityType: 'delivery',
		})
		expect(String(activity.details.order_id)).toBe(order.orderId)
		expect(String(activity.details.loading_task_id)).toBe(order.loadingTaskId)
	}
	for (const truck of order.trucks) {
		await expectDriverTruckAvailable(service, truck)
	}
	for (const product of order.products) {
		await expectStock(service, product, {
			onHand: product.stock - product.quantity,
			reservationStatus: 'consumed',
			reserved: 0,
		})
	}
}

async function expectReturnedToWarehouse(
	service: SupabaseClient,
	order: DispatchOrderFixture,
	runId: string,
) {
	await expectOrderStatus(service, order.orderId, 'warehouse_loading')
	const { data: task, error: taskError } = await service
		.from('loading_tasks')
		.select('status, rejection_reason, proof')
		.eq('id', order.loadingTaskId)
		.single()
	if (taskError || !task) throw new Error(taskError?.message)
	expect(task.status).toBe('rejected')
	expect(String(task.rejection_reason)).toContain(runId)
	const proof = expectRecord(task.proof, 'return task proof')
	expect(String(proof.proof_url)).toContain(runId)

	const { data: deliveries, error: deliveryError } = await service
		.from('deliveries')
		.select('id, status, rejection_reason, rejection_proof')
		.eq('order_id', order.orderId)
		.eq('loading_task_id', order.loadingTaskId)
	if (deliveryError || !deliveries) throw new Error(deliveryError?.message)
	expect(deliveries).toHaveLength(order.trucks.length)
	for (const delivery of deliveries) {
		expect(delivery.status).toBe('rejected')
		expect(String(delivery.rejection_reason)).toContain(runId)
		const rejectionProof = expectRecord(
			delivery.rejection_proof,
			'delivery rejection proof',
		)
		expect(String(rejectionProof.proof_url)).toContain(runId)
		await latestActivity(service, {
			action: 'dispatch_delivery_rejected',
			entityId: String(delivery.id),
			entityType: 'delivery',
		})
	}
	for (const truck of order.trucks) {
		await expectDriverTruckAvailable(service, truck)
	}
	for (const product of order.products) {
		await expectStock(service, product, {
			onHand: product.stock,
			reservationStatus: 'reserved',
			reserved: product.quantity,
		})
	}
	await latestActivity(service, {
		action: 'delivery_returned_to_warehouse_loading',
		entityId: order.orderId,
		entityType: 'order',
	})
}

async function expectStock(
	service: SupabaseClient,
	product: ProductFixture,
	expected: {
		onHand: number
		reservationStatus: 'consumed' | 'reserved'
		reserved: number
	},
) {
	const { data: stock, error: stockError } = await service
		.from('inventory_stock')
		.select('on_hand_quantity, reserved_quantity')
		.eq('product_id', product.id)
		.single()
	if (stockError || !stock) throw new Error(stockError?.message)
	expect(Number(stock.on_hand_quantity)).toBe(expected.onHand)
	expect(Number(stock.reserved_quantity)).toBe(expected.reserved)
	const { data: reservation, error: reservationError } = await service
		.from('inventory_reservations')
		.select('quantity, status')
		.eq('product_id', product.id)
		.eq('status', expected.reservationStatus)
		.single()
	if (reservationError || !reservation) {
		throw new Error(reservationError?.message ?? 'Reservation missing')
	}
	expect(Number(reservation.quantity)).toBe(product.quantity)
}

async function expectDriverTruckAvailable(
	service: SupabaseClient,
	truck: DriverTruckFixture,
) {
	const { data: driver, error: driverError } = await service
		.from('drivers')
		.select('status')
		.eq('id', truck.driverId)
		.single()
	if (driverError || !driver) throw new Error(driverError?.message)
	expect(driver.status).toBe('available')
	const { data: truckRow, error: truckError } = await service
		.from('trucks')
		.select('status')
		.eq('id', truck.truckId)
		.single()
	if (truckError || !truckRow) throw new Error(truckError?.message)
	expect(truckRow.status).toBe('available')
}

async function expectDriverLocationSource(
	service: SupabaseClient,
	deliveryId: string,
	driverId: string,
) {
	const { data, error } = await service
		.from('driver_locations')
		.select('delivery_id, driver_id, source')
		.eq('delivery_id', deliveryId)
		.eq('driver_id', driverId)
		.order('recorded_at', { ascending: false })
		.limit(1)
		.single()
	if (error || !data) throw new Error(error?.message)
	expect(data.source).toBe('driver_app')
}

async function deliveryIdForDriver(
	service: SupabaseClient,
	orderId: string,
	driverId: string,
) {
	const { data, error } = await service
		.from('deliveries')
		.select('id, status')
		.eq('order_id', orderId)
		.eq('driver_id', driverId)
		.single()
	if (error || !data) throw new Error(error?.message ?? 'Delivery missing')
	expect(data.status).toBe('assigned')
	return String(data.id)
}

async function mustRpc(
	client: SupabaseClient,
	name: string,
	params: Record<string, unknown>,
) {
	const { data, error } = await client.rpc(name, params)
	if (error) throw new Error(`${name}: ${error.message}`)
	return data
}

async function latestActivity(
	service: SupabaseClient,
	input: { action: string; entityId: string; entityType: string },
) {
	const { data, error } = await service
		.from('activity_events')
		.select('actor_employee_id, created_at, details')
		.eq('entity_type', input.entityType)
		.eq('entity_id', input.entityId)
		.eq('action', input.action)
		.order('created_at', { ascending: false })
		.limit(1)
		.single()
	if (error || !data) {
		throw new Error(error?.message ?? `${input.action} activity missing`)
	}
	expect(isIsoTimestamp(data.created_at)).toBe(true)
	return {
		actorEmployeeId:
			typeof data.actor_employee_id === 'string'
				? data.actor_employee_id
				: null,
		details: expectRecord(data.details, `${input.action} details`),
	}
}

async function employeeByEmail(
	service: SupabaseClient,
	email: string,
): Promise<EmployeeRef> {
	const { data, error } = await service
		.from('employees')
		.select('id, full_name')
		.eq('email', email)
		.single()
	if (error || !data) {
		throw new Error(error?.message ?? `Employee ${email} missing`)
	}
	return { fullName: String(data.full_name), id: String(data.id) }
}

async function expectOrderStatus(
	service: SupabaseClient,
	orderId: string,
	status: string,
) {
	const { data, error } = await service
		.from('orders')
		.select('status')
		.eq('id', orderId)
		.single()
	if (error || !data) throw new Error(error?.message ?? 'Order missing')
	expect(data.status).toBe(status)
}

async function openInternalPage(
	browser: Browser,
	account: { email: string; password: string },
): Promise<InternalPageHandle> {
	const context = await browser.newContext({
		viewport: { height: 1000, width: 1440 },
	})
	await context.addCookies(
		await createAuthCookies(account, COOKIE_NAMES.internal, URLS.internal),
	)
	const page = await context.newPage()
	const guard = installBrowserErrorGuard(page)
	await page.goto(URLS.internal, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await expect(page).not.toHaveURL(/\/login/)
	return { context, guard, page }
}

async function signInLocal(
	env: LocalSupabaseEnv,
	account: { email: string; password: string },
) {
	const client = createClient(env.apiUrl, env.anonKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	})
	const { error } = await client.auth.signInWithPassword(account)
	if (error) {
		throw new Error(`Could not sign in ${account.email}: ${error.message}`)
	}
	return { client }
}

async function createAuthCookies(
	account: { email: string; password: string },
	cookieName: string,
	url: string,
) {
	const env = readLocalSupabaseEnv()
	const cookieJar: SupabaseCookieToSet[] = []
	const client = createServerClient(env.apiUrl, env.anonKey, {
		cookieOptions: { name: cookieName, path: '/', sameSite: 'lax' },
		cookies: {
			getAll: () => [],
			setAll: (cookies) => {
				cookieJar.push(...cookies)
			},
		},
	})

	const { error } = await client.auth.signInWithPassword(account)
	if (error) throw new Error(`Could not seed ${cookieName}: ${error.message}`)

	const nowSeconds = Math.floor(Date.now() / 1000)
	return cookieJar.map((cookie) => ({
		expires: nowSeconds + (cookie.options?.maxAge ?? 3600),
		name: cookie.name,
		sameSite: 'Lax' as const,
		url,
		value: cookie.value,
	}))
}

async function waitForHydration(page: Page) {
	await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {
		return undefined
	})
	await page.waitForTimeout(600)
}

function installBrowserErrorGuard(page: Page) {
	const browserErrors: string[] = []

	page.on('console', (message) => {
		if (message.type() !== 'error') return
		browserErrors.push(message.text())
	})
	page.on('pageerror', (error) => {
		browserErrors.push(error.message)
	})
	page.on('requestfailed', (request) => {
		const failure = request.failure()
		const errorText = failure?.errorText ?? 'request failed'
		if (errorText.includes('ERR_ABORTED')) return
		browserErrors.push(`${request.method()} ${request.url()} ${errorText}`)
	})
	page.on('response', (response) => {
		if (response.status() < 500) return
		browserErrors.push(`${response.status()} ${response.url()}`)
	})

	return {
		async expectClean(label: string) {
			await page.waitForTimeout(400)
			expect(browserErrors, `${label} browser errors`).toEqual([])
		},
	}
}

function uniqueRunId(prefix: string) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function expectString(value: unknown, label: string): string {
	expect(typeof value, `${label} must be a string`).toBe('string')
	return String(value)
}

function expectRecord(value: unknown, label: string): Record<string, unknown> {
	expect(isRecord(value), label).toBe(true)
	return value as Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function isIsoTimestamp(value: unknown) {
	if (typeof value !== 'string') return false
	return !Number.isNaN(Date.parse(value))
}

function readLocalSupabaseEnv(): LocalSupabaseEnv {
	const result = spawnSync('supabase', ['status', '-o', 'env'], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	})
	if (result.status !== 0) {
		throw new Error(
			result.stderr.trim() ||
				'Local Supabase is not running. Start it before browser testing.',
		)
	}

	const env: Record<string, string> = {}
	for (const line of result.stdout.split('\n')) {
		const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
		if (!match) continue
		env[match[1]] = stripEnvQuotes(match[2])
	}

	const apiUrl = env.API_URL
	const anonKey = env.ANON_KEY
	const serviceRoleKey = env.SERVICE_ROLE_KEY
	if (!apiUrl || !anonKey || !serviceRoleKey) {
		throw new Error(
			'Local Supabase env is missing API_URL/ANON_KEY/service key',
		)
	}
	return { anonKey, apiUrl, serviceRoleKey }
}

function stripEnvQuotes(value: string) {
	const trimmed = value.trim()
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1)
	}
	return trimmed
}

function createLocalServiceClient(env = readLocalSupabaseEnv()) {
	return createClient(env.apiUrl, env.serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	})
}
