import { spawnSync } from 'node:child_process'
import { expect, type Page, test } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createActorFlowClient, type FlowActorPool } from './flow-test-rpc'

interface LocalSupabaseEnv {
	anonKey: string
	apiUrl: string
	dbUrl: string
	serviceRoleKey: string
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

interface DriverOrderFixture {
	customerName: string
	deliveryId?: string
	loadingTaskId?: string
	orderId: string
	orderNumber: string
	product: ProductFixture
	requestId: string
	runId: string
}

interface EmployeeRef {
	id: string
}

const DEFAULT_PASSWORD = ['hyperquote', 'local', 'only', '2026'].join('-')

const URLS = {
	driver: process.env.FLOW_DRIVER_URL ?? 'http://localhost:3003',
	internal: process.env.FLOW_INTERNAL_URL ?? 'http://localhost:3002',
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
test.use({
	actionTimeout: 15_000,
	geolocation: { latitude: 30.0479, longitude: 31.2369 },
	navigationTimeout: 30_000,
	permissions: ['geolocation'],
	viewport: { height: 900, width: 430 },
})

test('driver app executes live assignment, GPS, code completion, rejection proof, and server-side scope guards', async ({
	browser,
}) => {
	test.setTimeout(540_000)
	const env = readLocalSupabaseEnv()
	const service = createLocalServiceClient(env)
	const inventoryAuth = await signInLocal(env, LOCAL_INVENTORY)
	const warehouseAuth = await signInLocal(env, LOCAL_WAREHOUSE)
	const financeEmployee = await employeeByEmail(service, LOCAL_FINANCE.email)

	const runId = uniqueRunId('driver-final')
	const primaryTruck = await createDriverTruck(service, {
		driverName: `Flow Driver Primary ${runId}`,
		online: false,
		platePrefix: 'DRV',
		runId,
		suffix: 'P1',
	})
	const otherTruck = await createDriverTruck(service, {
		driverName: `Flow Driver Other ${runId}`,
		online: true,
		platePrefix: 'OTH',
		runId,
		suffix: 'O2',
	})

	const completionOrder = await createReservedOrder(service, {
		financeEmployeeId: financeEmployee.id,
		inventoryClient: inventoryAuth.client,
		key: 'wood',
		label: 'completion',
		runId,
	})
	const rejectionOrder = await createReservedOrder(service, {
		financeEmployeeId: financeEmployee.id,
		inventoryClient: inventoryAuth.client,
		key: 'metal',
		label: 'rejection',
		runId,
	})
	const otherOrder = await createReservedOrder(service, {
		financeEmployeeId: financeEmployee.id,
		inventoryClient: inventoryAuth.client,
		key: 'wood',
		label: 'other-driver',
		runId,
	})

	const offlineAssign = await warehouseAuth.client.rpc(
		'warehouse_assign_loading_driver',
		{
			p_driver_id: primaryTruck.driverId,
			p_order_id: completionOrder.orderId,
			p_truck_id: primaryTruck.truckId,
		},
	)
	expect(offlineAssign.error?.message).toContain('driver_not_online')

	const context = await browser.newContext({
		geolocation: { latitude: 30.0479, longitude: 31.2369 },
		permissions: ['geolocation'],
		viewport: { height: 900, width: 430 },
	})
	const page = await context.newPage()
	const guard = installBrowserErrorGuard(page)
	try {
		await signInThroughDriverUi(page, primaryTruck)
		await expect(page.locator('body')).toContainText(
			'No acceptable stops are open right now.',
			{ timeout: 30_000 },
		)

		await expectDriverOnlineState(service, primaryTruck.driverId, 'online')

		await page.getByRole('button', { name: /Online\. Refresh GPS/i }).click()
		await expectLatestDriverLocation(service, {
			deliveryId: null,
			driverId: primaryTruck.driverId,
		})

		await assignAndApproveOrder(
			warehouseAuth.client,
			completionOrder,
			primaryTruck,
		)
		await assignAndApproveOrder(warehouseAuth.client, otherOrder, otherTruck)
		completionOrder.deliveryId = await deliveryIdForDriver(
			service,
			completionOrder.orderId,
			primaryTruck.driverId,
		)
		otherOrder.deliveryId = await deliveryIdForDriver(
			service,
			otherOrder.orderId,
			otherTruck.driverId,
		)

		await page.reload({ waitUntil: 'domcontentloaded' })
		await waitForHydration(page)
		await expect(page.locator('body')).toContainText(
			completionOrder.customerName,
			{ timeout: 30_000 },
		)
		await expect(page.locator('body')).not.toContainText(
			otherOrder.customerName,
		)
		await latestActivity(service, {
			action: 'driver_assigned_delivery',
			entityId: completionOrder.deliveryId,
			entityType: 'delivery',
		})

		await chooseDriverOption(page, 'Refresh GPS')
		await expectLatestDriverLocation(service, {
			deliveryId: completionOrder.deliveryId,
			driverId: primaryTruck.driverId,
		})

		await page.getByRole('button', { name: 'Details' }).click()
		await expect(page.locator('body')).toContainText(
			completionOrder.orderNumber,
		)
		await expect(page.locator('body')).toContainText(
			completionOrder.product.name,
		)
		await expect(page.locator('body')).toContainText('Customer contact')
		await expect(page.locator('body')).toContainText('Dropoff')
		await expect(page.locator('body')).toContainText(primaryTruck.plateNumber)
		await page.getByRole('button', { name: /Show route UI|Active/i }).click()

		await mustDriverScopeDenials(
			service,
			await signInLocal(env, primaryTruck.account, 'driver'),
			{
				deliveryId: completionOrder.deliveryId,
				loadingTaskId: expectString(
					completionOrder.loadingTaskId,
					'completion loading task',
				),
				orderId: completionOrder.orderId,
				otherDeliveryId: otherOrder.deliveryId,
				productId: completionOrder.product.id,
			},
		)

		await expectDeliveryStatus(
			service,
			completionOrder.deliveryId,
			'in_transit',
		)
		const completionSecret = await deliverySecretCode(
			service,
			completionOrder.orderId,
		)
		await latestActivity(service, {
			action: 'driver_delivery_started',
			entityId: completionOrder.deliveryId,
			entityType: 'delivery',
		})
		await expect(page.locator('body')).toContainText('In transit', {
			timeout: 20_000,
		})
		await expect(page.getByLabel('Customer secret code')).toBeVisible({
			timeout: 20_000,
		})
		await page.getByLabel('Customer secret code').fill('00000000')
		await page.getByRole('button', { name: /Confirm arrival/i }).click()
		await expect(page.locator('body')).toContainText(/invalid_delivery_secret/i)
		await expectDeliveryStatus(
			service,
			completionOrder.deliveryId,
			'in_transit',
		)
		await page.getByLabel('Customer secret code').fill(completionSecret)
		await expectDeliveryStatus(
			service,
			completionOrder.deliveryId,
			'in_transit',
		)
		await page.getByRole('button', { name: /Confirm arrival/i }).click()
		await expectDeliveryStatus(service, completionOrder.deliveryId, 'arrived')
		await latestActivity(service, {
			action: 'driver_delivery_arrived',
			entityId: completionOrder.deliveryId,
			entityType: 'delivery',
		})
		await expect(page.locator('body')).toContainText('Arrived', {
			timeout: 20_000,
		})
		await page.getByRole('button', { name: /Back to route/i }).click()
		await expectDeliveryStatus(
			service,
			completionOrder.deliveryId,
			'in_transit',
		)
		await latestActivity(service, {
			action: 'driver_delivery_route_reopened',
			entityId: completionOrder.deliveryId,
			entityType: 'delivery',
		})
		await page.getByLabel('Customer secret code').fill(completionSecret)
		await page.getByRole('button', { name: /Confirm arrival/i }).click()
		await expectDeliveryStatus(service, completionOrder.deliveryId, 'arrived')

		const completeButton = page.getByRole('button', {
			name: /Complete delivery/i,
		})
		await expect(page.getByLabel('Completion code')).toBeVisible({
			timeout: 20_000,
		})
		await expect(completeButton).toBeDisabled({ timeout: 20_000 })
		await page.getByLabel('Completion code').fill(completionSecret)
		await expectDeliveryStatus(service, completionOrder.deliveryId, 'arrived')
		await expect(completeButton).toBeEnabled({ timeout: 20_000 })
		await completeButton.click()
		await expect(page.locator('body')).toContainText('Delivery completed.', {
			timeout: 30_000,
		})
		await expectCompletedDelivery(service, completionOrder, primaryTruck)
		await latestActivity(service, {
			action: 'driver_delivery_confirmed',
			entityId: completionOrder.deliveryId,
			entityType: 'delivery',
		})

		await assignAndApproveOrder(
			warehouseAuth.client,
			rejectionOrder,
			primaryTruck,
		)
		rejectionOrder.deliveryId = await deliveryIdForDriver(
			service,
			rejectionOrder.orderId,
			primaryTruck.driverId,
		)
		await page.reload({ waitUntil: 'domcontentloaded' })
		await waitForHydration(page)
		await expect(page.locator('body')).toContainText(
			rejectionOrder.customerName,
			{ timeout: 30_000 },
		)
		const rejectButton = page.getByRole('button', {
			name: /Reject delivery/i,
		})
		await rejectButton.click()
		await page.getByLabel('Reason').fill(`Rejected at site ${runId}`)
		const submitRejectButton = page.getByRole('button', {
			name: /Reject delivery/i,
		})
		await expect(submitRejectButton).toBeDisabled()
		await page
			.getByLabel('Evidence')
			.fill(`Blocked access gate and customer refusal photo noted ${runId}`)
		await expect(submitRejectButton).toBeEnabled({ timeout: 20_000 })
		await submitRejectButton.click()
		await expect(page.locator('body')).toContainText(
			'Delivery rejected. Returned to warehouse loading.',
			{ timeout: 30_000 },
		)
		await expectRejectedDelivery(service, rejectionOrder, primaryTruck)

		await latestActivity(service, {
			action: 'driver_delivery_rejected',
			entityId: rejectionOrder.deliveryId,
			entityType: 'delivery',
		})
		await latestActivity(service, {
			action: 'driver_rejection_proof_uploaded',
			entityId: rejectionOrder.deliveryId,
			entityType: 'delivery',
		})
		await latestActivity(service, {
			action: 'delivery_returned_to_warehouse_loading',
			entityId: rejectionOrder.orderId,
			entityType: 'order',
		})

		await chooseDriverOption(page, 'Go offline')
		await expectDriverOnlineState(service, primaryTruck.driverId, 'offline')
		await guard.expectClean('driver final browser flow')
	} finally {
		await context.close()
		await Promise.all([
			inventoryAuth.client.auth.signOut({ scope: 'local' }),
			warehouseAuth.client.auth.signOut({ scope: 'local' }),
		])
	}
})

async function signInThroughDriverUi(page: Page, truck: DriverTruckFixture) {
	await page.goto(URLS.driver, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await expect(page.getByLabel('Driver email')).toBeVisible({
		timeout: 30_000,
	})
	await page.getByLabel('Driver email').fill(truck.account.email)
	await page.getByLabel('Password').fill(truck.account.password)
	await page.getByRole('button', { name: /Enter driver app/i }).click()
}

async function chooseDriverOption(page: Page, name: string) {
	await page.getByRole('button', { name: 'Driver options' }).click()
	await page.getByRole('button', { exact: true, name }).click()
}

async function createReservedOrder(
	service: SupabaseClient,
	input: {
		financeEmployeeId: string
		inventoryClient: SupabaseClient
		key: 'metal' | 'wood'
		label: string
		runId: string
	},
): Promise<DriverOrderFixture> {
	const customerName = `Flow Driver ${input.label} Customer ${input.runId}`
	const { data: customer, error: customerError } = await service
		.from('customers')
		.insert({
			company_name: customerName,
			contact_name: `Driver Site Receiver ${input.runId}`,
			email: `flow-driver-${input.label}-${input.runId}@example.test`,
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
			label: `Driver ${input.label}`,
			latitude: 30.0485,
			longitude: 31.238,
			phone: `+205${Date.now().toString().slice(-10)}`,
			street: `Driver ${input.label} ${input.runId} Street`,
		})
		.select('id')
		.single()
	if (addressError || !address) {
		throw new Error(addressError?.message ?? 'Address missing')
	}

	const product = await createStockedProduct(service, {
		key: input.key,
		label: input.label,
		quantity: input.key === 'wood' ? 3 : 2,
		runId: input.runId,
		stock: input.key === 'wood' ? 12 : 9,
		unitPrice: input.key === 'wood' ? 85 : 135,
	})

	const deliveryDate = new Date(Date.now() + 5 * 86_400_000)
		.toISOString()
		.slice(0, 10)
	const { data: request, error: requestError } = await service
		.from('quote_requests')
		.insert({
			customer_id: customer.id,
			delivery_address_id: address.id,
			delivery_date: deliveryDate,
			notes: `Final Flow driver ${input.label} ${input.runId}`,
			status: 'quoted',
			submitted_at: new Date().toISOString(),
			urgency: 'urgent',
		})
		.select('id')
		.single()
	if (requestError || !request) {
		throw new Error(requestError?.message ?? 'Quote request missing')
	}

	const { error: itemError } = await service
		.from('quote_request_items')
		.insert(quoteItem(String(request.id), product, 1))
	if (itemError) throw new Error(itemError.message)

	const totalAmount = product.quantity * product.unitPrice
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
			proof_path: `driver/customer-paid-${input.label}-${input.runId}.pdf`,
			recorded_by_employee_id: input.financeEmployeeId,
			status: 'recorded',
		})
	if (paymentError) throw new Error(paymentError.message)

	const reserved = await input.inventoryClient.rpc('reserve_order_stock', {
		p_order_id: order.id,
	})
	expect(reserved.error).toBeNull()
	expect(reserved.data?.status).toBe('inventory_reserved')

	return {
		customerName,
		orderId: String(order.id),
		orderNumber: String(order.order_number),
		product,
		requestId: String(request.id),
		runId: input.runId,
	}
}

async function createStockedProduct(
	service: SupabaseClient,
	input: {
		key: 'metal' | 'wood'
		label: string
		quantity: number
		runId: string
		stock: number
		unitPrice: number
	},
): Promise<ProductFixture> {
	const name = `Flow Driver ${input.label} ${input.key} ${input.runId}`
	const slug = `flow-driver-${input.label}-${input.key}-${input.runId}`
	const unit = input.key === 'wood' ? 'bundle' : 'bar'
	const unitAr = input.key === 'wood' ? 'حزمة' : 'سيخ'
	const { data: product, error: productError } = await service
		.from('products')
		.insert({
			availability_status: 'available',
			category: input.key === 'wood' ? 'wood' : 'steel',
			description: `Final Flow driver product ${input.runId}`,
			description_ar: `منتج اختبار السائق ${input.runId}`,
			image_urls: [],
			is_active: true,
			is_stockable: true,
			name,
			name_ar: `اختبار سائق ${input.key} ${input.runId}`,
			price_range_max: input.unitPrice,
			price_range_min: input.unitPrice,
			sku: `FLOW-DRV-${input.label}-${input.key}-${input.runId}`.toUpperCase(),
			slug,
			specifications: { flow: 'driver-final', key: input.key },
			specifications_ar: { flow: 'driver-final', key: input.key },
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

async function createDriverTruck(
	service: SupabaseClient,
	input: {
		driverName: string
		online: boolean
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
			app_metadata: { pool: 'driver', roles: ['driver'] },
			email,
			email_confirm: true,
			password,
			user_metadata: { name: input.driverName },
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

	const { error: metadataError } = await service.auth.admin.updateUserById(
		authUser.user.id,
		{
			app_metadata: {
				driver_id: driver.id,
				pool: 'driver',
				roles: ['driver'],
			},
		},
	)
	if (metadataError) throw new Error(metadataError.message)

	const { error: onlineError } = await service
		.from('driver_online_states')
		.insert({
			driver_id: driver.id,
			last_seen_at: new Date().toISOString(),
			status: input.online ? 'online' : 'offline',
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

async function assignAndApproveOrder(
	warehouseClient: SupabaseClient,
	order: DriverOrderFixture,
	truck: DriverTruckFixture,
) {
	const assigned = await warehouseClient.rpc(
		'warehouse_assign_loading_driver',
		{
			p_driver_id: truck.driverId,
			p_order_id: order.orderId,
			p_truck_id: truck.truckId,
		},
	)
	expect(assigned.error).toBeNull()

	const toggled = await warehouseClient.rpc('warehouse_toggle_loading_item', {
		p_order_id: order.orderId,
		p_product_slug: order.product.slug,
		p_truck_id: truck.truckId,
	})
	expect(toggled.error).toBeNull()

	const ready = await warehouseClient.rpc('warehouse_mark_loading_ready', {
		p_order_id: order.orderId,
	})
	expect(ready.error).toBeNull()
	const loadingTaskId = expectString(ready.data?.id, 'loading task id')

	const approved = await warehouseClient.rpc('warehouse_approve_loading', {
		p_loading_task_id: loadingTaskId,
		p_proof: {
			checked_by: 'flow-driver-final',
			order_id: order.orderId,
			truck_id: truck.truckId,
		},
	})
	expect(approved.error).toBeNull()
	expect(approved.data?.status).toBe('approved')
	order.loadingTaskId = loadingTaskId
}

async function mustDriverScopeDenials(
	service: SupabaseClient,
	driverAuth: { client: SupabaseClient },
	input: {
		deliveryId: string
		loadingTaskId: string
		orderId: string
		otherDeliveryId: string
		productId: string
	},
) {
	try {
		const wrongDelivery = await driverAuth.client.rpc(
			'driver_accept_delivery',
			{
				p_delivery_id: input.otherDeliveryId,
			},
		)
		expect(wrongDelivery.error?.message).toContain(
			'delivery_not_found_or_invalid_transition',
		)

		const unscopedLocation = await driverAuth.client.rpc(
			'driver_update_location',
			{
				p_accuracy_meters: 7,
				p_delivery_id: null,
				p_heading: 24,
				p_latitude: 30.0479,
				p_longitude: 31.2369,
				p_speed_kmh: 11,
			},
		)
		expect(unscopedLocation.error?.message).toContain('delivery_scope_required')

		const wrongScopedLocation = await driverAuth.client.rpc(
			'driver_update_location',
			{
				p_accuracy_meters: 7,
				p_delivery_id: input.otherDeliveryId,
				p_heading: 24,
				p_latitude: 30.0479,
				p_longitude: 31.2369,
				p_speed_kmh: 11,
			},
		)
		expect(wrongScopedLocation.error?.message).toContain(
			'delivery_not_assigned_to_driver',
		)

		const statusBeforeInvalidReject = await currentDeliveryStatus(
			service,
			input.deliveryId,
		)
		const invalidDriverReject = await driverAuth.client.rpc(
			'driver_reject_delivery',
			{
				p_delivery_id: input.deliveryId,
				p_proof: {
					evidenceText: '',
					location: { latitude: 30.0479, longitude: 31.2369 },
					reason: 'missing evidence branch',
				},
				p_reason: 'missing evidence branch',
			},
		)
		expect(invalidDriverReject.error?.message).toContain(
			'driver_rejection_evidence_required',
		)
		await expectDeliveryStatus(
			service,
			input.deliveryId,
			statusBeforeInvalidReject,
		)

		const directDispatch = await driverAuth.client.rpc(
			'dispatch_complete_loaded_order',
			{
				p_order_id: input.orderId,
				p_proof: { proof_url: 'driver-bypass.jpg' },
			},
		)
		expect(directDispatch.error?.message).toContain(
			'insufficient_dispatch_permission',
		)

		const directWarehouse = await driverAuth.client.rpc(
			'warehouse_approve_loading',
			{
				p_loading_task_id: input.loadingTaskId,
				p_proof: { proof_url: 'driver-bypass.jpg' },
			},
		)
		expect(directWarehouse.error?.message).toContain(
			'insufficient_warehouse_permission',
		)

		const directInventory = await driverAuth.client.rpc('reserve_order_stock', {
			p_order_id: input.orderId,
		})
		expect(directInventory.error?.message).toContain(
			'insufficient_inventory_permission',
		)

		const directAdmin = await driverAuth.client.rpc('admin_export_data', {
			p_reason: 'driver bypass attempt',
			p_scope: 'employees',
		})
		expect(directAdmin.error?.message).toContain(
			'insufficient_admin_permission',
		)

		const statusBeforeDirectOrderUpdate = await currentOrderStatus(
			service,
			input.orderId,
		)
		const directOrderUpdate = await driverAuth.client
			.from('orders')
			.update({ status: 'delivered' })
			.eq('id', input.orderId)
			.select('id')
		if (!directOrderUpdate.error) expect(directOrderUpdate.data).toHaveLength(0)
		await expectOrderStatus(
			service,
			input.orderId,
			statusBeforeDirectOrderUpdate,
		)

		const directStockUpdate = await driverAuth.client
			.from('inventory_stock')
			.update({ on_hand_quantity: 999_999 })
			.eq('product_id', input.productId)
			.select('product_id')
		if (!directStockUpdate.error) expect(directStockUpdate.data).toHaveLength(0)
	} finally {
		await driverAuth.client.auth.signOut({ scope: 'local' })
	}
}

async function expectCompletedDelivery(
	service: SupabaseClient,
	order: DriverOrderFixture,
	_truck: DriverTruckFixture,
) {
	await expectOrderStatus(service, order.orderId, 'delivered')
	await expectDeliveryStatus(
		service,
		expectString(order.deliveryId, 'delivery'),
		'completed',
	)
	await expectStock(service, order.product, {
		onHand: order.product.stock - order.product.quantity,
		reservationStatus: 'consumed',
		reserved: 0,
	})
}

async function expectRejectedDelivery(
	service: SupabaseClient,
	order: DriverOrderFixture,
	truck: DriverTruckFixture,
) {
	await expectOrderStatus(service, order.orderId, 'warehouse_loading')
	await expectDeliveryStatus(
		service,
		expectString(order.deliveryId, 'delivery'),
		'rejected',
	)
	const { data: delivery, error: deliveryError } = await service
		.from('deliveries')
		.select('driver_id, truck_id, rejection_reason, rejection_proof')
		.eq('id', order.deliveryId)
		.single()
	if (deliveryError || !delivery) throw new Error(deliveryError?.message)
	expect(delivery.driver_id).toBe(truck.driverId)
	expect(delivery.truck_id).toBe(truck.truckId)
	expect(String(delivery.rejection_reason)).toContain(order.runId)
	const proof = expectRecord(delivery.rejection_proof, 'rejection proof')
	expect(String(proof.reason)).toContain(order.runId)
	expect(String(proof.evidenceText)).toContain('Blocked access gate')
	expectRecord(proof.location, 'rejection location')

	const { data: task, error: taskError } = await service
		.from('loading_tasks')
		.select('status, rejection_reason, proof')
		.eq('id', order.loadingTaskId)
		.single()
	if (taskError || !task) throw new Error(taskError?.message)
	expect(task.status).toBe('rejected')
	expect(String(task.rejection_reason)).toContain(order.runId)
	expectRecord(task.proof, 'loading task proof')

	const { data: assignment, error: assignmentError } = await service
		.from('loading_task_drivers')
		.select('driver_id, truck_id, assigned_items')
		.eq('loading_task_id', order.loadingTaskId)
		.single()
	if (assignmentError || !assignment) throw new Error(assignmentError?.message)
	expect(assignment.driver_id).toBe(truck.driverId)
	expect(assignment.truck_id).toBe(truck.truckId)
	expect(assignment.assigned_items).toEqual([order.product.slug])

	await expectStock(service, order.product, {
		onHand: order.product.stock,
		reservationStatus: 'reserved',
		reserved: order.product.quantity,
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

async function expectLatestDriverLocation(
	service: SupabaseClient,
	input: { deliveryId: string | null; driverId: string },
) {
	await expect
		.poll(
			async () => {
				const { data } = await service
					.from('driver_locations')
					.select('delivery_id')
					.eq('driver_id', input.driverId)
					.order('recorded_at', { ascending: false })
					.limit(1)
					.maybeSingle()
				if (!data) return '__missing__'
				return data.delivery_id ?? '__null__'
			},
			{ timeout: 20_000 },
		)
		.toBe(input.deliveryId ?? '__null__')

	const { data, error } = await service
		.from('driver_locations')
		.select('delivery_id, driver_id, latitude, longitude, source')
		.eq('driver_id', input.driverId)
		.order('recorded_at', { ascending: false })
		.limit(1)
		.single()
	if (error || !data) throw new Error(error?.message)
	expect(data.driver_id).toBe(input.driverId)
	expect(data.delivery_id).toBe(input.deliveryId)
	expect(data.source).toBe('driver_app')
	expect(Number(data.latitude)).toBeCloseTo(30.0479, 3)
	expect(Number(data.longitude)).toBeCloseTo(31.2369, 3)
}

async function expectDriverOnlineState(
	service: SupabaseClient,
	driverId: string,
	status: 'offline' | 'online',
) {
	await expect
		.poll(
			async () => {
				const { data } = await service
					.from('driver_online_states')
					.select('status')
					.eq('driver_id', driverId)
					.single()
				return data?.status ?? null
			},
			{ timeout: 20_000 },
		)
		.toBe(status)

	const { data, error } = await service
		.from('driver_online_states')
		.select('status, last_seen_at')
		.eq('driver_id', driverId)
		.single()
	if (error || !data) throw new Error(error?.message)
	expect(data.status).toBe(status)
	expect(Date.parse(String(data.last_seen_at))).toBeGreaterThan(0)
}

async function expectDeliveryStatus(
	service: SupabaseClient,
	deliveryId: string,
	status: string,
) {
	await expect
		.poll(
			async () => {
				const { data } = await service
					.from('deliveries')
					.select('status')
					.eq('id', deliveryId)
					.single()
				return data?.status ?? null
			},
			{ timeout: 20_000 },
		)
		.toBe(status)

	const { data, error } = await service
		.from('deliveries')
		.select('status')
		.eq('id', deliveryId)
		.single()
	if (error || !data) throw new Error(error?.message ?? 'Delivery missing')
	expect(data.status).toBe(status)
}

async function currentDeliveryStatus(
	service: SupabaseClient,
	deliveryId: string,
) {
	const { data, error } = await service
		.from('deliveries')
		.select('status')
		.eq('id', deliveryId)
		.single()
	if (error || !data) throw new Error(error?.message ?? 'Delivery missing')
	return String(data.status)
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

async function currentOrderStatus(service: SupabaseClient, orderId: string) {
	const { data, error } = await service
		.from('orders')
		.select('status')
		.eq('id', orderId)
		.single()
	if (error || !data) throw new Error(error?.message ?? 'Order missing')
	return String(data.status)
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

async function deliverySecretCode(_service: SupabaseClient, orderId: string) {
	await expect
		.poll(
			async () => {
				return deliverySecretCodeFromSql(orderId)
			},
			{ timeout: 20_000 },
		)
		.toMatch(/^[2-9A-HJ-NP-Z]{8}$/)

	const code = deliverySecretCodeFromSql(orderId)
	if (!code) throw new Error('Delivery secret missing')
	return code
}

function deliverySecretCodeFromSql(orderId: string) {
	const env = readLocalSupabaseEnv()
	const result = spawnSync(
		'psql',
		[
			env.dbUrl,
			'-At',
			'-c',
			`select code from app_private.order_delivery_secrets where order_id = '${orderId.replace(/'/g, "''")}'::uuid`,
		],
		{ encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
	)
	if (result.status !== 0) {
		throw new Error(result.stderr.trim() || 'Delivery secret lookup failed')
	}
	return result.stdout.trim() || null
}

async function latestActivity(
	service: SupabaseClient,
	input: { action: string; entityId: string; entityType: string },
) {
	await expect
		.poll(
			async () => {
				const { data } = await service
					.from('activity_events')
					.select('id')
					.eq('entity_type', input.entityType)
					.eq('entity_id', input.entityId)
					.eq('action', input.action)
					.order('created_at', { ascending: false })
					.limit(1)
					.maybeSingle()
				return data?.id ?? null
			},
			{ timeout: 20_000 },
		)
		.not.toBeNull()

	const { data, error } = await service
		.from('activity_events')
		.select('actor_driver_id, actor_employee_id, created_at, details')
		.eq('entity_type', input.entityType)
		.eq('entity_id', input.entityId)
		.eq('action', input.action)
		.order('created_at', { ascending: false })
		.limit(1)
		.single()
	if (error || !data) {
		throw new Error(error?.message ?? `${input.action} activity missing`)
	}
	expect(Date.parse(String(data.created_at))).toBeGreaterThan(0)
	return {
		actorDriverId:
			typeof data.actor_driver_id === 'string' ? data.actor_driver_id : null,
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
		.select('id')
		.eq('email', email)
		.single()
	if (error || !data) {
		throw new Error(error?.message ?? `Employee ${email} missing`)
	}
	return { id: String(data.id) }
}

async function signInLocal(
	env: LocalSupabaseEnv,
	account: { email: string; password: string },
	actorPool: FlowActorPool = 'internal',
) {
	const client = createClient(env.apiUrl, env.anonKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	})
	const { data, error } = await client.auth.signInWithPassword(account)
	if (error) {
		throw new Error(`Could not sign in ${account.email}: ${error.message}`)
	}
	return {
		client: createActorFlowClient(client, createLocalServiceClient(env), {
			actorPool,
			actorUserId: data.user.id,
		}),
	}
}

function installBrowserErrorGuard(page: Page) {
	const browserErrors: string[] = []

	page.on('console', (message) => {
		if (message.type() !== 'error') return
		const text = message.text()
		if (
			text ===
			'Failed to load resource: the server responded with a status of 400 (Bad Request)'
		) {
			return
		}
		browserErrors.push(text)
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

async function waitForHydration(page: Page) {
	await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {
		return undefined
	})
	await page.waitForTimeout(600)
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
	const dbUrl = env.DB_URL
	const serviceRoleKey = env.SERVICE_ROLE_KEY
	if (!apiUrl || !anonKey || !dbUrl || !serviceRoleKey) {
		throw new Error(
			'Local Supabase env is missing API_URL/ANON_KEY/DB_URL/service key',
		)
	}
	return { anonKey, apiUrl, dbUrl, serviceRoleKey }
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

function uniqueRunId(prefix: string) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
