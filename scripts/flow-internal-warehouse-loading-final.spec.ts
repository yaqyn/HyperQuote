import { spawnSync } from 'node:child_process'
import { type Browser, expect, type Page, test } from '@playwright/test'
import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createActorFlowClient } from './flow-test-rpc'

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

interface DriverTruckFixture {
	driverId: string
	driverName: string
	plateNumber: string
	truckId: string
	truckSuffix: string
}

interface WarehouseLoadingFixture {
	customerName: string
	metal: ProductFixture
	orderId: string
	orderNumber: string
	requestId: string
	runId: string
	truckMetal: DriverTruckFixture
	truckWood: DriverTruckFixture
	wood: ProductFixture
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

test('warehouse loading splits reserved items across drivers, records issue retry, signs off, and preserves stock until delivery', async ({
	browser,
}) => {
	test.setTimeout(420_000)
	const env = readLocalSupabaseEnv()
	const service = createLocalServiceClient(env)
	const inventoryAuth = await signInLocal(env, LOCAL_INVENTORY)
	const dispatchAuth = await signInLocal(env, LOCAL_DISPATCH)
	const warehouseEmployee = await employeeByEmail(
		service,
		LOCAL_WAREHOUSE.email,
	)
	const financeEmployee = await employeeByEmail(service, LOCAL_FINANCE.email)
	const fixture = await createWarehouseLoadingFixture(service, {
		financeEmployeeId: financeEmployee.id,
	})

	const reserved = await inventoryAuth.client.rpc('reserve_order_stock', {
		p_order_id: fixture.orderId,
	})
	expect(reserved.error).toBeNull()
	expect(reserved.data?.status).toBe('inventory_reserved')
	await expectReservedStock(service, fixture)

	const warehouse = await openInternalPage(browser, LOCAL_WAREHOUSE)
	try {
		await warehouse.page.getByRole('button', { name: /^Warehouse$/i }).click()
		await warehouse.page.locator('[data-tab-id="loading"]').click()
		await expect(warehouse.page.locator('body')).toContainText(
			fixture.customerName,
			{ timeout: 30_000 },
		)
		const queueCard = warehouse.page
			.locator('button', { hasText: fixture.customerName })
			.first()
		await expect(queueCard).toContainText('Awaiting truck')
		await queueCard.click()

		await expect(warehouse.page.locator('body')).toContainText(
			fixture.orderNumber,
			{ timeout: 20_000 },
		)

		await pickTruck(warehouse.page, fixture.truckWood)
		await warehouse.page
			.getByRole('button', { name: /Need another truck/i })
			.click()
		await pickTruck(warehouse.page, fixture.truckMetal)
		await expect(warehouse.page.locator('body')).toContainText(
			fixture.wood.name,
			{ timeout: 20_000 },
		)
		await expect(warehouse.page.locator('body')).toContainText(
			fixture.metal.name,
		)
		await expect(
			warehouse.page.getByRole('button', { name: /Truck .* is empty/i }),
		).toBeDisabled()

		await assignItemToTruck(warehouse.page, fixture.wood, fixture.truckWood)
		await assignItemToTruck(warehouse.page, fixture.metal, fixture.truckMetal)
		await expect(
			warehouse.page.getByRole('button', { name: /Next .* Signoff/i }),
		).toBeEnabled({ timeout: 20_000 })
		await expectLoadingAssignments(service, fixture, {
			expectedStatus: 'loading',
		})

		await warehouse.page
			.getByRole('button', { name: /Next .* Signoff/i })
			.click()
		await expect(warehouse.page.locator('body')).toContainText(
			'Advisor + quality signoff',
			{ timeout: 20_000 },
		)

		await signoffFailAndRetry(warehouse.page, warehouseEmployee, fixture)
		await expectLoadingIssueState(service, fixture, warehouseEmployee)
		await expectReservedStock(service, fixture)
		await expect(warehouse.page.locator('body')).toContainText(
			'Previous failed inspections',
			{ timeout: 20_000 },
		)

		await warehouse.page
			.getByRole('button', { name: /Next .* Signoff/i })
			.click()
		await expect(warehouse.page.locator('body')).toContainText(
			'Advisor + quality signoff',
			{ timeout: 20_000 },
		)
		await signoffPass(warehouse.page, warehouseEmployee, fixture)
		await expectWarehouseApproved(service, fixture, warehouseEmployee)
		await expectReservedStock(service, fixture)
		await warehouse.guard.expectClean('warehouse loading split signoff')
	} finally {
		await warehouse.context.close()
	}

	const completed = await dispatchAuth.client.rpc(
		'dispatch_complete_loaded_order',
		{
			p_order_id: fixture.orderId,
			p_proof: {
				delivery_note: `flow-warehouse-delivery-${fixture.runId}`,
				source: 'warehouse-loading-final',
			},
		},
	)
	expect(completed.error).toBeNull()
	await expectDeliveredAndConsumed(service, fixture, String(completed.data?.id))

	await Promise.all([
		inventoryAuth.client.auth.signOut({ scope: 'local' }),
		dispatchAuth.client.auth.signOut({ scope: 'local' }),
	])
})

async function createWarehouseLoadingFixture(
	service: SupabaseClient,
	input: { financeEmployeeId: string },
): Promise<WarehouseLoadingFixture> {
	const runId = `warehouse-loading-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
	const customerName = `Flow Warehouse Customer ${runId}`
	const { data: customer, error: customerError } = await service
		.from('customers')
		.insert({
			company_name: customerName,
			contact_name: `Warehouse Contact ${runId}`,
			email: `flow-warehouse-${runId}@example.test`,
			phone: `+206${Date.now().toString().slice(-10)}`,
			status: 'active',
		})
		.select('id')
		.single()
	if (customerError || !customer) {
		throw new Error(customerError?.message ?? 'Customer missing')
	}

	const wood = await createStockedProduct(service, {
		key: 'wood',
		quantity: 3,
		runId,
		stock: 12,
		unitPrice: 80,
	})
	const metal = await createStockedProduct(service, {
		key: 'metal',
		quantity: 2,
		runId,
		stock: 7,
		unitPrice: 125,
	})

	const deliveryDate = new Date(Date.now() + 3 * 86_400_000)
		.toISOString()
		.slice(0, 10)
	const { data: request, error: requestError } = await service
		.from('quote_requests')
		.insert({
			customer_id: customer.id,
			delivery_date: deliveryDate,
			notes: `Final Flow warehouse loading ${runId}`,
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
		.insert([quoteItem(request.id, wood, 1), quoteItem(request.id, metal, 2)])
	if (itemError) throw new Error(itemError.message)

	const totalAmount =
		wood.quantity * wood.unitPrice + metal.quantity * metal.unitPrice
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
			proof_path: `warehouse-loading/customer-paid-${runId}.pdf`,
			recorded_by_employee_id: input.financeEmployeeId,
			status: 'recorded',
		})
	if (paymentError) throw new Error(paymentError.message)

	const truckWood = await createDriverTruck(service, runId, {
		driverName: `Flow Ahmed Wood ${runId}`,
		platePrefix: 'WOOD',
		phonePrefix: '+207',
		suffix: 'W1',
	})
	const truckMetal = await createDriverTruck(service, runId, {
		driverName: `Flow Saleh Metal ${runId}`,
		platePrefix: 'METL',
		phonePrefix: '+208',
		suffix: 'M2',
	})

	return {
		customerName,
		metal,
		orderId: String(order.id),
		orderNumber: String(order.order_number),
		requestId: String(request.id),
		runId,
		truckMetal,
		truckWood,
		wood,
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
	const name = `Flow Warehouse ${input.key} ${input.runId}`
	const slug = `flow-warehouse-${input.key}-${input.runId}`
	const unit = input.key === 'wood' ? 'bundle' : 'bar'
	const unitAr = input.key === 'wood' ? 'حزمة' : 'سيخ'
	const { data: product, error: productError } = await service
		.from('products')
		.insert({
			availability_status: 'available',
			category: input.key === 'wood' ? 'wood' : 'steel',
			description: `Final Flow warehouse loading product ${input.runId}`,
			description_ar: `منتج اختبار تحميل المستودع ${input.runId}`,
			image_urls: [],
			is_active: true,
			is_stockable: true,
			name,
			name_ar: `اختبار تحميل ${input.key} ${input.runId}`,
			price_range_max: input.unitPrice,
			price_range_min: input.unitPrice,
			sku: `FLOW-WH-${input.key}-${input.runId}`.toUpperCase(),
			slug,
			specifications: { flow: 'warehouse-loading', key: input.key },
			specifications_ar: { flow: 'warehouse-loading', key: input.key },
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
	runId: string,
	input: {
		driverName: string
		phonePrefix: string
		platePrefix: string
		suffix: string
	},
): Promise<DriverTruckFixture> {
	const unique = `${Date.now().toString().slice(-6)}${Math.random().toString(36).slice(2, 5)}`
	const { data: driver, error: driverError } = await service
		.from('drivers')
		.insert({
			email: `${input.platePrefix.toLowerCase()}-${runId}-${unique}@hyperquote.local`,
			full_name: input.driverName,
			phone: `${input.phonePrefix}${Date.now().toString().slice(-9)}${input.suffix.length}`,
			status: 'available',
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
		driverId: String(driver.id),
		driverName: input.driverName,
		plateNumber,
		truckId: String(truck.id),
		truckSuffix: plateNumber.split('-').pop() ?? plateNumber,
	}
}

async function pickTruck(page: Page, truck: DriverTruckFixture) {
	const truckButton = page
		.locator('button', { hasText: truck.driverName })
		.filter({ hasText: truck.plateNumber })
		.first()
	await expect(truckButton).toBeVisible({ timeout: 20_000 })
	await truckButton.click()
	await expect(page.locator('body')).toContainText(truck.driverName, {
		timeout: 20_000,
	})
}

async function assignItemToTruck(
	page: Page,
	product: ProductFixture,
	truck: DriverTruckFixture,
) {
	const itemRow = page
		.getByText(product.name, { exact: true })
		.locator('xpath=ancestor::div[contains(@class, "border-y-2")][1]')
	await expect(itemRow).toBeVisible({ timeout: 20_000 })
	await expect(itemRow).toContainText(product.sku)
	await itemRow
		.locator('button')
		.filter({ hasText: truck.truckSuffix })
		.first()
		.click()
	await expect(itemRow).toContainText(product.name)
}

async function signoffFailAndRetry(
	page: Page,
	employee: EmployeeRef,
	fixture: WarehouseLoadingFixture,
) {
	await selectAdvisor(page, employee)
	await page.getByPlaceholder('Your password').fill(LOCAL_WAREHOUSE.password)
	await page.getByRole('button', { name: /Fail .*off/i }).click()
	await page
		.getByLabel(/What failed/i)
		.fill(`Metal bundle count mismatch during ${fixture.runId}`)
	await page
		.getByLabel(/Proof of load/i)
		.fill(`warehouse-loading/fail-${fixture.runId}.jpg`)
	await page.getByRole('button', { name: /Log fail.*retry/i }).click()
	await expect(page.locator('body')).toContainText(
		'Previous failed inspections',
		{
			timeout: 30_000,
		},
	)
}

async function signoffPass(
	page: Page,
	employee: EmployeeRef,
	fixture: WarehouseLoadingFixture,
) {
	await selectAdvisor(page, employee)
	await page.getByPlaceholder('Your password').fill(LOCAL_WAREHOUSE.password)
	await page.getByRole('button', { name: /Pass .*inspected/i }).click()
	await page
		.getByLabel(/Proof of load/i)
		.fill(`warehouse-loading/pass-${fixture.runId}.jpg`)
	await page.getByRole('button', { name: /Lock signoff/i }).click()
	await expect(page.locator('body')).not.toContainText(fixture.customerName, {
		timeout: 30_000,
	})
}

async function selectAdvisor(page: Page, employee: EmployeeRef) {
	const advisorButton = page
		.locator('button', { hasText: employee.fullName })
		.filter({ hasText: employee.id })
		.first()
	await expect(advisorButton).toBeVisible({ timeout: 20_000 })
	await advisorButton.click()
}

async function expectLoadingAssignments(
	service: SupabaseClient,
	fixture: WarehouseLoadingFixture,
	expected: { expectedStatus: string },
) {
	const task = await loadingTask(service, fixture.orderId)
	expect(task.status).toBe(expected.expectedStatus)
	const { data, error } = await service
		.from('loading_task_drivers')
		.select('driver_id, truck_id, assigned_items')
		.eq('loading_task_id', task.id)
	if (error || !data) {
		throw new Error(error?.message ?? 'Loading assignments missing')
	}
	expect(data).toHaveLength(2)
	const byTruck = new Map(data.map((row) => [String(row.truck_id), row]))
	expect(byTruck.get(fixture.truckWood.truckId)?.driver_id).toBe(
		fixture.truckWood.driverId,
	)
	expect(byTruck.get(fixture.truckMetal.truckId)?.driver_id).toBe(
		fixture.truckMetal.driverId,
	)
	expect(byTruck.get(fixture.truckWood.truckId)?.assigned_items).toEqual([
		fixture.wood.slug,
	])
	expect(byTruck.get(fixture.truckMetal.truckId)?.assigned_items).toEqual([
		fixture.metal.slug,
	])
}

async function expectLoadingIssueState(
	service: SupabaseClient,
	fixture: WarehouseLoadingFixture,
	employee: EmployeeRef,
) {
	const task = await loadingTask(service, fixture.orderId)
	expect(task.status).toBe('rejected')
	expect(String(task.rejection_reason)).toContain(fixture.runId)
	const proof = expectRecord(task.proof, 'loading rejection proof')
	expect(proof.advisor_id).toBe(employee.id)
	expect(String(proof.proof_url)).toContain(`fail-${fixture.runId}`)
	await expectOrderStatus(service, fixture.orderId, 'warehouse_loading')

	const activity = await latestActivity(service, {
		action: 'warehouse_loading_rejected',
		entityId: task.id,
		entityType: 'loading_task',
	})
	expect(activity.actorEmployeeId).toBe(employee.id)
	expect(String(activity.details.reason)).toContain(fixture.runId)
}

async function expectWarehouseApproved(
	service: SupabaseClient,
	fixture: WarehouseLoadingFixture,
	employee: EmployeeRef,
) {
	await expectOrderStatus(service, fixture.orderId, 'dispatch_ready')
	const task = await loadingTask(service, fixture.orderId)
	expect(task.status).toBe('approved')
	expect(task.advisor_employee_id).toBe(employee.id)
	const proof = expectRecord(task.proof, 'loading approval proof')
	expect(proof.advisor_id).toBe(employee.id)
	expect(String(proof.proof_url)).toContain(`pass-${fixture.runId}`)

	const activity = await latestActivity(service, {
		action: 'warehouse_loading_approved',
		entityId: task.id,
		entityType: 'loading_task',
	})
	expect(activity.actorEmployeeId).toBe(employee.id)
	expect(activity.details.to_status).toBe('dispatch_ready')
}

async function expectReservedStock(
	service: SupabaseClient,
	fixture: WarehouseLoadingFixture,
) {
	await expectStock(service, fixture.wood, {
		onHand: fixture.wood.stock,
		reserved: fixture.wood.quantity,
	})
	await expectStock(service, fixture.metal, {
		onHand: fixture.metal.stock,
		reserved: fixture.metal.quantity,
	})
}

async function expectDeliveredAndConsumed(
	service: SupabaseClient,
	fixture: WarehouseLoadingFixture,
	deliveryId: string,
) {
	await expectOrderStatus(service, fixture.orderId, 'delivered')
	await expectStock(service, fixture.wood, {
		onHand: fixture.wood.stock - fixture.wood.quantity,
		reserved: 0,
	})
	await expectStock(service, fixture.metal, {
		onHand: fixture.metal.stock - fixture.metal.quantity,
		reserved: 0,
	})
	const { data: reservations, error } = await service
		.from('inventory_reservations')
		.select('product_id, quantity, status')
		.eq('order_id', fixture.orderId)
		.eq('status', 'consumed')
	if (error || !reservations) {
		throw new Error(error?.message ?? 'Consumed reservations missing')
	}
	expect(reservations).toHaveLength(2)
	const consumedByProduct = new Map(
		reservations.map((row) => [String(row.product_id), Number(row.quantity)]),
	)
	expect(consumedByProduct.get(fixture.wood.id)).toBe(fixture.wood.quantity)
	expect(consumedByProduct.get(fixture.metal.id)).toBe(fixture.metal.quantity)

	const activity = await latestActivity(service, {
		action: 'dispatch_delivery_completed',
		entityId: deliveryId,
		entityType: 'delivery',
	})
	expect(activity.details.order_id).toBe(fixture.orderId)
}

async function expectStock(
	service: SupabaseClient,
	product: ProductFixture,
	expected: { onHand: number; reserved: number },
) {
	const { data, error } = await service
		.from('inventory_stock')
		.select('on_hand_quantity, reserved_quantity, available_quantity')
		.eq('product_id', product.id)
		.single()
	if (error || !data) throw new Error(error?.message ?? 'Stock missing')
	expect(Number(data.on_hand_quantity)).toBe(expected.onHand)
	expect(Number(data.reserved_quantity)).toBe(expected.reserved)
	expect(Number(data.available_quantity)).toBe(
		expected.onHand - expected.reserved,
	)
}

async function loadingTask(service: SupabaseClient, orderId: string) {
	const { data, error } = await service
		.from('loading_tasks')
		.select('id, status, advisor_employee_id, proof, rejection_reason')
		.eq('order_id', orderId)
		.single()
	if (error || !data) throw new Error(error?.message ?? 'Loading task missing')
	return data
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
	const { data, error } = await client.auth.signInWithPassword(account)
	if (error) {
		throw new Error(`Could not sign in ${account.email}: ${error.message}`)
	}
	return {
		client: createActorFlowClient(client, createLocalServiceClient(env), {
			actorPool: 'internal',
			actorUserId: data.user.id,
		}),
	}
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
