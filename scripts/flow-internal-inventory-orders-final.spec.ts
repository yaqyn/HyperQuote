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

interface AuthHandle {
	client: SupabaseClient
}

interface ProductFixture {
	id: string
	name: string
	sku: string
	slug: string
	unit: string
	unitAr: string
	unitPrice: number
}

interface OrderFixture {
	id: string
	orderNumber: string
	quantity: number
	requestId: string
	requestNumber: string
	totalAmount: number
}

interface DriverTruckFixture {
	driverId: string
	truckId: string
}

interface InventoryOrdersFixture {
	customerName: string
	deliveryOrder: OrderFixture
	deliveryProduct: ProductFixture
	fillOrder: OrderFixture
	primaryProduct: ProductFixture
	raceOrders: [OrderFixture, OrderFixture]
	raceProduct: ProductFixture
	runId: string
	secondOrder: OrderFixture
	unpaidOrder: OrderFixture
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

const LOCAL_SALES = {
	email: 'local-sales@hyperquote.local',
	password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
}

const LOCAL_WAREHOUSE = {
	email: 'local-warehouse@hyperquote.local',
	password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
}

test.describe.configure({ mode: 'serial' })

test('inventory orders are finance-gated, filled into reservations, released on cancel, and consumed only on delivery', async ({
	browser,
}) => {
	test.setTimeout(420_000)
	const env = readLocalSupabaseEnv()
	const service = createLocalServiceClient(env)
	const inventoryAuth = await signInLocal(env, LOCAL_INVENTORY)
	const financeAuth = await signInLocal(env, LOCAL_FINANCE)
	const salesAuth = await signInLocal(env, LOCAL_SALES)
	const warehouseAuth = await signInLocal(env, LOCAL_WAREHOUSE)
	const dispatchAuth = await signInLocal(env, LOCAL_DISPATCH)
	const financeEmployeeId = await employeeIdByEmail(
		service,
		LOCAL_FINANCE.email,
	)
	const inventoryEmployeeId = await employeeIdByEmail(
		service,
		LOCAL_INVENTORY.email,
	)
	const fixture = await createInventoryOrdersFixture(service, {
		financeEmployeeId,
	})

	const inventory = await openInternalPage(browser, LOCAL_INVENTORY)
	try {
		await inventory.page.getByRole('button', { name: /^Inventory$/i }).click()
		await expect(
			inventory.page.getByRole('navigation', {
				name: /Inventory sections/i,
			}),
		).toBeVisible({ timeout: 20_000 })
		await inventory.page.getByRole('button', { name: /^Orders$/i }).click()

		await inventory.page
			.getByLabel(/Search orders/i)
			.fill(fixture.unpaidOrder.orderNumber)
		await expect(inventory.page.locator('body')).toContainText(
			'No orders found',
			{ timeout: 20_000 },
		)
		await inventory.guard.expectClean('unpaid order stays out of inventory UI')

		const unpaidReserve = await inventoryAuth.client.rpc(
			'reserve_order_stock',
			{
				p_order_id: fixture.unpaidOrder.id,
			},
		)
		expect(unpaidReserve.error?.message).toContain(
			'customer_payment_required_before_inventory',
		)

		const salesBypass = await salesAuth.client.rpc('reserve_order_stock', {
			p_order_id: fixture.secondOrder.id,
		})
		expect(salesBypass.error?.message).toContain(
			'insufficient_inventory_permission',
		)

		await inventory.page
			.getByLabel(/Search orders/i)
			.fill(fixture.fillOrder.orderNumber)
		await expect(inventory.page.locator('body')).toContainText(
			fixture.customerName,
			{ timeout: 20_000 },
		)
		await expect(inventory.page.locator('body')).toContainText(
			fixture.fillOrder.orderNumber,
		)
		await expect(inventory.page.locator('body')).toContainText('Ready')
		await inventory.page.getByRole('button', { name: /^Open$/i }).click()
		await expect(inventory.page.locator('body')).toContainText('Order prep', {
			timeout: 20_000,
		})
		await expect(inventory.page.locator('body')).toContainText(
			fixture.primaryProduct.name,
		)
		await expect(
			inventory.page.getByRole('button', { name: /^Fill order$/i }),
		).toBeEnabled()
		await inventory.page.getByRole('button', { name: /^Fill order$/i }).click()
		await expectOrderReserved(service, {
			actorEmployeeId: inventoryEmployeeId,
			expectedQuantity: fixture.fillOrder.quantity,
			onHand: 2000,
			orderId: fixture.fillOrder.id,
			productId: fixture.primaryProduct.id,
			reserved: 2000,
		})
		await inventory.guard.expectClean('inventory fill order')

		await inventory.page
			.getByLabel(/Search orders/i)
			.fill(fixture.secondOrder.orderNumber)
		await expect(inventory.page.locator('body')).toContainText(
			fixture.secondOrder.orderNumber,
			{ timeout: 20_000 },
		)
		await expect(inventory.page.locator('body')).toContainText('1 short')
		await inventory.page.getByRole('button', { name: /^Open$/i }).click()
		await expect(
			inventory.page.getByRole('button', { name: /^Fill order$/i }),
		).toBeDisabled()
		await expect(
			inventory.page.getByRole('button', { name: /^Contact supplier$/i }),
		).toBeVisible()
		await inventory.page
			.getByRole('button', { name: /^Contact supplier$/i })
			.click()
		await expect(
			inventory.page.getByRole('dialog', { name: /Refill stock/i }),
		).toBeVisible({ timeout: 20_000 })
		await inventory.guard.expectClean('shortage contact supplier')
	} finally {
		await inventory.context.close()
	}

	const shortageReserve = await inventoryAuth.client.rpc(
		'reserve_order_stock',
		{
			p_order_id: fixture.secondOrder.id,
		},
	)
	expect(shortageReserve.error?.message).toContain(
		`insufficient_stock_for_product_${fixture.primaryProduct.id}`,
	)

	await expectConcurrentReservationGuard(inventoryAuth.client, service, fixture)

	const directStatusUpdate = await inventoryAuth.client
		.from('orders')
		.update({ status: 'delivered' })
		.eq('id', fixture.secondOrder.id)
		.select('id, status')
	expect(directStatusUpdate.error).toBeNull()
	expect(directStatusUpdate.data ?? []).toEqual([])
	await expectOrderStatus(
		service,
		fixture.secondOrder.id,
		'confirmed_for_inventory',
	)

	const triggerGuard = await service
		.from('orders')
		.update({ status: 'delivered' })
		.eq('id', fixture.secondOrder.id)
		.select('id')
	expect(triggerGuard.error?.message).toContain('state_updates_must_use_rpc')
	await expectOrderStatus(
		service,
		fixture.secondOrder.id,
		'confirmed_for_inventory',
	)

	const canceled = await financeAuth.client.rpc(
		'finance_cancel_customer_order',
		{
			p_order_id: fixture.fillOrder.id,
			p_proof: {
				reference: `flow-inventory-cancel-${fixture.runId}`,
				source: 'final-flow-test',
			},
			p_reason: `Final Flow cancellation releases reserved inventory ${fixture.runId}`,
		},
	)
	expect(canceled.error).toBeNull()
	expect(canceled.data?.status).toBe('canceled')
	await expectOrderReleased(service, {
		orderId: fixture.fillOrder.id,
		productId: fixture.primaryProduct.id,
		releasedQuantity: fixture.fillOrder.quantity,
	})

	const deliveryReserve = await inventoryAuth.client.rpc(
		'reserve_order_stock',
		{
			p_order_id: fixture.deliveryOrder.id,
		},
	)
	expect(deliveryReserve.error).toBeNull()
	expect(deliveryReserve.data?.status).toBe('inventory_reserved')
	await expectStockSnapshot(service, fixture.deliveryProduct.id, {
		available: 3,
		onHand: 5,
		reserved: 2,
	})

	const truck = await createDriverTruckFixture(service, fixture.runId)
	const delivery = await moveReservedOrderToDelivered({
		dispatchClient: dispatchAuth.client,
		order: fixture.deliveryOrder,
		product: fixture.deliveryProduct,
		service,
		truck,
		warehouseClient: warehouseAuth.client,
	})
	await expectDeliveredConsumed(service, {
		deliveryId: delivery.id,
		orderId: fixture.deliveryOrder.id,
		productId: fixture.deliveryProduct.id,
	})

	await Promise.all([
		inventoryAuth.client.auth.signOut({ scope: 'local' }),
		financeAuth.client.auth.signOut({ scope: 'local' }),
		salesAuth.client.auth.signOut({ scope: 'local' }),
		warehouseAuth.client.auth.signOut({ scope: 'local' }),
		dispatchAuth.client.auth.signOut({ scope: 'local' }),
	])
})

async function createInventoryOrdersFixture(
	service: SupabaseClient,
	input: { financeEmployeeId: string },
): Promise<InventoryOrdersFixture> {
	const runId = `orders-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
	const customer = await localCustomer(service)
	const address = await ensureCustomerAddress(service, customer.id, runId)
	const supplierId = await createSupplier(service, runId)
	const primaryProduct = await createStockedProduct(service, {
		initialStock: 2000,
		key: 'primary',
		runId,
		supplierId,
		unitPrice: 210,
	})
	const deliveryProduct = await createStockedProduct(service, {
		initialStock: 5,
		key: 'delivery',
		runId,
		supplierId,
		unitPrice: 150,
	})
	const raceProduct = await createStockedProduct(service, {
		initialStock: 2000,
		key: 'race',
		runId,
		supplierId,
		unitPrice: 175,
	})

	const unpaidOrder = await createCustomerOrder(service, {
		addressId: address.id,
		customerId: customer.id,
		financeEmployeeId: input.financeEmployeeId,
		label: 'unpaid',
		paid: false,
		product: primaryProduct,
		quantity: 1,
		runId,
	})
	const fillOrder = await createCustomerOrder(service, {
		addressId: address.id,
		customerId: customer.id,
		financeEmployeeId: input.financeEmployeeId,
		label: 'fill',
		paid: true,
		product: primaryProduct,
		quantity: 2000,
		runId,
	})
	const secondOrder = await createCustomerOrder(service, {
		addressId: address.id,
		customerId: customer.id,
		financeEmployeeId: input.financeEmployeeId,
		label: 'second',
		paid: true,
		product: primaryProduct,
		quantity: 1,
		runId,
	})
	const deliveryOrder = await createCustomerOrder(service, {
		addressId: address.id,
		customerId: customer.id,
		financeEmployeeId: input.financeEmployeeId,
		label: 'delivery',
		paid: true,
		product: deliveryProduct,
		quantity: 2,
		runId,
	})
	const raceOrders = [
		await createCustomerOrder(service, {
			addressId: address.id,
			customerId: customer.id,
			financeEmployeeId: input.financeEmployeeId,
			label: 'race-a',
			paid: true,
			product: raceProduct,
			quantity: 2000,
			runId,
		}),
		await createCustomerOrder(service, {
			addressId: address.id,
			customerId: customer.id,
			financeEmployeeId: input.financeEmployeeId,
			label: 'race-b',
			paid: true,
			product: raceProduct,
			quantity: 2000,
			runId,
		}),
	] satisfies [OrderFixture, OrderFixture]

	return {
		customerName: customer.company_name,
		deliveryOrder,
		deliveryProduct,
		fillOrder,
		primaryProduct,
		raceOrders,
		raceProduct,
		runId,
		secondOrder,
		unpaidOrder,
	}
}

async function createSupplier(service: SupabaseClient, runId: string) {
	const { data, error } = await service
		.from('suppliers')
		.insert({
			email: `flow-inventory-orders-${runId}@example.test`,
			name: `Flow Inventory Orders Supplier ${runId}`,
			notes: `Final Flow inventory order supplier ${runId}`,
			phone: `+206${Date.now().toString().slice(-10)}`,
			status: 'active',
		})
		.select('id')
		.single()
	if (error || !data) throw new Error(error?.message ?? 'Supplier missing')
	return String(data.id)
}

async function createStockedProduct(
	service: SupabaseClient,
	input: {
		initialStock: number
		key: string
		runId: string
		supplierId: string
		unitPrice: number
	},
): Promise<ProductFixture> {
	const name = `Flow Inventory ${input.key} ${input.runId}`
	const slug = `flow-inventory-${input.key}-${input.runId}`
	const unit = 'piece'
	const unitAr = 'قطعة'
	const { data: product, error: productError } = await service
		.from('products')
		.insert({
			availability_status: 'available',
			category: 'cement',
			description: `Final Flow inventory orders product ${input.runId}`,
			description_ar: `منتج اختبار تدفق المخزون ${input.runId}`,
			image_urls: [],
			is_active: true,
			is_stockable: true,
			name,
			name_ar: `اختبار مخزون ${input.key} ${input.runId}`,
			price_range_max: input.unitPrice,
			price_range_min: input.unitPrice,
			sku: `FLOW-INV-${input.key}-${input.runId}`.toUpperCase(),
			slug,
			specifications: { flow: 'inventory-orders', key: input.key },
			specifications_ar: { flow: 'inventory-orders', key: input.key },
			subcategory: 'cement',
			subcategory_ar: 'أسمنت',
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
		on_hand_quantity: input.initialStock,
		product_id: product.id,
		reserved_quantity: 0,
	})
	if (stockError) throw new Error(stockError.message)

	const { error: linkError } = await service
		.from('supplier_product_links')
		.insert({
			is_primary: true,
			last_quoted_at: new Date().toISOString(),
			lead_time_days: 1,
			min_order_qty: 1,
			notes: `Final Flow inventory orders supplier link ${input.runId}`,
			product_id: product.id,
			raw_cost: input.unitPrice,
			supplier_id: input.supplierId,
		})
	if (linkError) throw new Error(linkError.message)

	return {
		id: String(product.id),
		name: String(product.name),
		sku: String(product.sku),
		slug: String(product.slug),
		unit,
		unitAr,
		unitPrice: input.unitPrice,
	}
}

async function createCustomerOrder(
	service: SupabaseClient,
	input: {
		addressId: string
		customerId: string
		financeEmployeeId: string
		label: string
		paid: boolean
		product: ProductFixture
		quantity: number
		runId: string
	},
): Promise<OrderFixture> {
	const deliveryDate = new Date(Date.now() + 6 * 86_400_000)
		.toISOString()
		.slice(0, 10)
	const { data: quoteRequest, error: quoteRequestError } = await service
		.from('quote_requests')
		.insert({
			customer_id: input.customerId,
			delivery_address_id: input.addressId,
			delivery_date: deliveryDate,
			notes: `Final Flow inventory order ${input.label} ${input.runId}`,
			status: 'quoted',
			submitted_at: new Date().toISOString(),
			urgency: 'urgent',
		})
		.select('id, request_number')
		.single()
	if (quoteRequestError || !quoteRequest) {
		throw new Error(quoteRequestError?.message ?? 'Quote request missing')
	}

	const { error: itemError } = await service
		.from('quote_request_items')
		.insert({
			currency: 'EGP',
			customer_description: input.product.name,
			is_unmatched: false,
			match_confidence: 1,
			price_range_max: input.product.unitPrice,
			price_range_min: input.product.unitPrice,
			product_id: input.product.id,
			quantity: input.quantity,
			quote_request_id: quoteRequest.id,
			sort_order: 1,
			unit_of_measure: input.product.unit,
			unit_of_measure_ar: input.product.unitAr,
		})
	if (itemError) throw new Error(itemError.message)

	const totalAmount = input.quantity * input.product.unitPrice
	const { data: order, error: orderError } = await service
		.from('orders')
		.insert({
			customer_id: input.customerId,
			quote_request_id: quoteRequest.id,
			status: 'confirmed_for_inventory',
			total_amount: totalAmount,
		})
		.select('id, order_number')
		.single()
	if (orderError || !order) {
		throw new Error(orderError?.message ?? 'Order missing')
	}

	if (input.paid) {
		const { error: paymentError } = await service
			.from('customer_payments')
			.insert({
				amount: totalAmount,
				order_id: order.id,
				payment_fraction: 1,
				proof_path: `payment-proofs/final-flow-${input.label}-${input.runId}.pdf`,
				recorded_by_employee_id: input.financeEmployeeId,
				status: 'recorded',
			})
		if (paymentError) throw new Error(paymentError.message)
	}

	return {
		id: String(order.id),
		orderNumber: String(order.order_number),
		quantity: input.quantity,
		requestId: String(quoteRequest.id),
		requestNumber: String(quoteRequest.request_number),
		totalAmount,
	}
}

async function expectOrderReserved(
	service: SupabaseClient,
	input: {
		actorEmployeeId: string
		expectedQuantity: number
		onHand: number
		orderId: string
		productId: string
		reserved: number
	},
) {
	await expect
		.poll(
			async () => {
				const { data: order, error: orderError } = await service
					.from('orders')
					.select('status, reserved_at')
					.eq('id', input.orderId)
					.single()
				if (orderError) return `error:${orderError.message}`
				const { data: stock, error: stockError } = await service
					.from('inventory_stock')
					.select('on_hand_quantity, reserved_quantity, available_quantity')
					.eq('product_id', input.productId)
					.single()
				if (stockError) return `error:${stockError.message}`
				const { data: reservation, error: reservationError } = await service
					.from('inventory_reservations')
					.select('quantity, status')
					.eq('order_id', input.orderId)
					.eq('product_id', input.productId)
					.eq('status', 'reserved')
					.maybeSingle()
				if (reservationError) return `error:${reservationError.message}`
				return [
					order.status,
					order.reserved_at ? 'reserved_at' : 'missing_reserved_at',
					Number(stock.on_hand_quantity),
					Number(stock.reserved_quantity),
					Number(stock.available_quantity),
					Number(reservation?.quantity ?? 0),
					reservation?.status ?? 'missing',
				].join('|')
			},
			{ timeout: 30_000 },
		)
		.toBe(
			[
				'inventory_reserved',
				'reserved_at',
				input.onHand,
				input.reserved,
				input.onHand - input.reserved,
				input.expectedQuantity,
				'reserved',
			].join('|'),
		)

	const activity = await latestActivity(service, {
		action: 'order_stock_reserved',
		entityId: input.orderId,
		entityType: 'order',
	})
	expect(activity.actorEmployeeId).toBe(input.actorEmployeeId)
	expect(String(activity.details.employee_id)).toBe(input.actorEmployeeId)
	expect(String(activity.details.to_status)).toBe('inventory_reserved')
}

async function expectConcurrentReservationGuard(
	inventoryClient: SupabaseClient,
	service: SupabaseClient,
	fixture: InventoryOrdersFixture,
) {
	const attempts = await Promise.all([
		inventoryClient.rpc('reserve_order_stock', {
			p_order_id: fixture.raceOrders[0].id,
		}),
		inventoryClient.rpc('reserve_order_stock', {
			p_order_id: fixture.raceOrders[1].id,
		}),
	])
	const successCount = attempts.filter((attempt) => !attempt.error).length
	const insufficientCount = attempts.filter((attempt) =>
		attempt.error?.message.includes(
			`insufficient_stock_for_product_${fixture.raceProduct.id}`,
		),
	).length
	expect(successCount).toBe(1)
	expect(insufficientCount).toBe(1)

	const { data: stock, error: stockError } = await service
		.from('inventory_stock')
		.select('on_hand_quantity, reserved_quantity, available_quantity')
		.eq('product_id', fixture.raceProduct.id)
		.single()
	if (stockError || !stock)
		throw new Error(stockError?.message ?? 'Race stock missing')
	expect(Number(stock.on_hand_quantity)).toBe(2000)
	expect(Number(stock.reserved_quantity)).toBe(2000)
	expect(Number(stock.available_quantity)).toBe(0)

	const { data: orders, error: ordersError } = await service
		.from('orders')
		.select('id, status')
		.in(
			'id',
			fixture.raceOrders.map((order) => order.id),
		)
	if (ordersError || !orders)
		throw new Error(ordersError?.message ?? 'Race orders missing')
	const statuses = orders.map((order) => String(order.status)).sort()
	expect(statuses).toEqual(['confirmed_for_inventory', 'inventory_reserved'])
}

async function expectOrderReleased(
	service: SupabaseClient,
	input: { orderId: string; productId: string; releasedQuantity: number },
) {
	await expect
		.poll(
			async () => {
				const { data: stock, error: stockError } = await service
					.from('inventory_stock')
					.select('on_hand_quantity, reserved_quantity, available_quantity')
					.eq('product_id', input.productId)
					.single()
				if (stockError) return `error:${stockError.message}`
				const { data: reservation, error: reservationError } = await service
					.from('inventory_reservations')
					.select('quantity, status')
					.eq('order_id', input.orderId)
					.eq('product_id', input.productId)
					.eq('status', 'released')
					.maybeSingle()
				if (reservationError) return `error:${reservationError.message}`
				return [
					Number(stock.on_hand_quantity),
					Number(stock.reserved_quantity),
					Number(stock.available_quantity),
					Number(reservation?.quantity ?? 0),
					reservation?.status ?? 'missing',
				].join('|')
			},
			{ timeout: 30_000 },
		)
		.toBe(`2000|0|2000|${input.releasedQuantity}|released`)

	const activity = await latestActivity(service, {
		action: 'sales_order_canceled',
		entityId: input.orderId,
		entityType: 'order',
	})
	expect(String(activity.details.to_status)).toBe('canceled')
	expect(JSON.stringify(activity.details.released_reservations)).toContain(
		input.productId,
	)
}

async function createDriverTruckFixture(
	service: SupabaseClient,
	runId: string,
): Promise<DriverTruckFixture> {
	const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
	const { data: driver, error: driverError } = await service
		.from('drivers')
		.insert({
			email: `flow-driver-${runId}-${unique}@hyperquote.local`,
			full_name: `Flow Driver ${runId}`,
			phone: `+205${Date.now().toString().slice(-10)}`,
			status: 'available',
			vehicle_label: `Flow Truck ${runId}`,
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

	const { data: truck, error: truckError } = await service
		.from('trucks')
		.insert({
			body_type: 'flatbed',
			capacity_tons: 20,
			driver_id: driver.id,
			plate_number: `FLOW-${unique}`.toUpperCase().slice(0, 18),
			status: 'available',
		})
		.select('id')
		.single()
	if (truckError || !truck) {
		throw new Error(truckError?.message ?? 'Truck missing')
	}

	return {
		driverId: String(driver.id),
		truckId: String(truck.id),
	}
}

async function moveReservedOrderToDelivered(input: {
	dispatchClient: SupabaseClient
	order: OrderFixture
	product: ProductFixture
	service: SupabaseClient
	truck: DriverTruckFixture
	warehouseClient: SupabaseClient
}) {
	const assigned = await input.warehouseClient.rpc(
		'warehouse_assign_loading_driver',
		{
			p_driver_id: input.truck.driverId,
			p_order_id: input.order.id,
			p_truck_id: input.truck.truckId,
		},
	)
	expect(assigned.error).toBeNull()
	expect(assigned.data?.driver_id).toBe(input.truck.driverId)

	const toggled = await input.warehouseClient.rpc(
		'warehouse_toggle_loading_item',
		{
			p_order_id: input.order.id,
			p_product_slug: input.product.slug,
			p_truck_id: input.truck.truckId,
		},
	)
	expect(toggled.error).toBeNull()

	const ready = await input.warehouseClient.rpc(
		'warehouse_mark_loading_ready',
		{
			p_order_id: input.order.id,
		},
	)
	expect(ready.error).toBeNull()
	const loadingTaskId = expectString(ready.data?.id, 'loading task id')

	const approved = await input.warehouseClient.rpc(
		'warehouse_approve_loading',
		{
			p_loading_task_id: loadingTaskId,
			p_proof: {
				checked_by: 'final-flow-inventory-orders',
				order_id: input.order.id,
			},
		},
	)
	expect(approved.error).toBeNull()
	expect(approved.data?.status).toBe('approved')

	await expectOrderStatus(input.service, input.order.id, 'dispatch_ready')
	const completed = await input.dispatchClient.rpc(
		'dispatch_complete_loaded_order',
		{
			p_order_id: input.order.id,
			p_proof: {
				delivery_note: `final-flow-dispatch-${input.order.id}`,
				source: 'final-flow-test',
			},
		},
	)
	expect(completed.error).toBeNull()
	expect(completed.data?.status).toBe('completed')
	return {
		id: expectString(completed.data?.id, 'completed delivery id'),
	}
}

async function expectDeliveredConsumed(
	service: SupabaseClient,
	input: { deliveryId: string; orderId: string; productId: string },
) {
	await expectOrderStatus(service, input.orderId, 'delivered')
	await expectStockSnapshot(service, input.productId, {
		available: 3,
		onHand: 3,
		reserved: 0,
	})
	const { data: reservation, error: reservationError } = await service
		.from('inventory_reservations')
		.select('quantity, status')
		.eq('order_id', input.orderId)
		.eq('product_id', input.productId)
		.eq('status', 'consumed')
		.single()
	if (reservationError || !reservation) {
		throw new Error(reservationError?.message ?? 'Consumed reservation missing')
	}
	expect(Number(reservation.quantity)).toBe(2)

	const activity = await latestActivity(service, {
		action: 'dispatch_delivery_completed',
		entityId: input.deliveryId,
		entityType: 'delivery',
	})
	expect(String(activity.details.order_id)).toBe(input.orderId)
}

async function expectOrderStatus(
	service: SupabaseClient,
	orderId: string,
	expectedStatus: string,
) {
	await expect
		.poll(
			async () => {
				const { data, error } = await service
					.from('orders')
					.select('status')
					.eq('id', orderId)
					.single()
				if (error) return `error:${error.message}`
				return String(data.status)
			},
			{ timeout: 30_000 },
		)
		.toBe(expectedStatus)
}

async function expectStockSnapshot(
	service: SupabaseClient,
	productId: string,
	expected: { available: number; onHand: number; reserved: number },
) {
	await expect
		.poll(
			async () => {
				const { data, error } = await service
					.from('inventory_stock')
					.select('on_hand_quantity, reserved_quantity, available_quantity')
					.eq('product_id', productId)
					.single()
				if (error) return `error:${error.message}`
				return [
					Number(data.on_hand_quantity),
					Number(data.reserved_quantity),
					Number(data.available_quantity),
				].join('|')
			},
			{ timeout: 30_000 },
		)
		.toBe(`${expected.onHand}|${expected.reserved}|${expected.available}`)
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

async function localCustomer(service: SupabaseClient) {
	const { data, error } = await service
		.from('customers')
		.select('id, company_name')
		.eq('email', 'local-customer@hyperquote.local')
		.single()
	if (error || !data) {
		throw new Error(error?.message ?? 'Local customer not found')
	}
	return {
		company_name: String(data.company_name),
		id: String(data.id),
	}
}

async function ensureCustomerAddress(
	service: SupabaseClient,
	customerId: string,
	runId: string,
) {
	const { data: existing, error: readError } = await service
		.from('customer_addresses')
		.select('id')
		.eq('customer_id', customerId)
		.order('is_default', { ascending: false })
		.limit(1)
		.maybeSingle()
	if (readError) throw new Error(readError.message)
	if (existing?.id) return { id: String(existing.id) }

	const { data: created, error: createError } = await service
		.from('customer_addresses')
		.insert({
			area: 'New Cairo',
			city: 'Cairo',
			customer_id: customerId,
			governorate: 'Cairo',
			is_default: true,
			label: `Flow Orders ${runId}`,
			street: `Flow Orders ${runId} Street`,
		})
		.select('id')
		.single()
	if (createError || !created) {
		throw new Error(createError?.message ?? 'Failed to create customer address')
	}
	return { id: String(created.id) }
}

async function employeeIdByEmail(service: SupabaseClient, email: string) {
	const { data, error } = await service
		.from('employees')
		.select('id')
		.eq('email', email)
		.single()
	if (error || !data) {
		throw new Error(error?.message ?? `Employee ${email} not found`)
	}
	return String(data.id)
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
): Promise<AuthHandle> {
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

function expectRecord(value: unknown, label: string): Record<string, unknown> {
	expect(isRecord(value), label).toBe(true)
	return value as Record<string, unknown>
}

function expectString(value: unknown, label: string): string {
	expect(typeof value === 'string' && value.length > 0, label).toBe(true)
	return String(value)
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
		throw new Error('Could not read local Supabase URL/API keys.')
	}
	return { anonKey, apiUrl, serviceRoleKey }
}

function stripEnvQuotes(value: string) {
	if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1)
	return value
}

function createLocalServiceClient(env = readLocalSupabaseEnv()) {
	return createClient(env.apiUrl, env.serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	})
}
