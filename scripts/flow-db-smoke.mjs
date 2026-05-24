#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const FLOW_PASSWORD =
	process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ??
	['hyperquote', 'local', 'only', '2026'].join('-')

const ACCOUNTS = {
	customer: { email: 'customer@customer.customer', password: 'customer' },
	driver: { email: 'local-driver@hyperquote.local', password: FLOW_PASSWORD },
	employee: { email: 'admin@admin.admin', password: 'admin1' },
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error))
	process.exit(1)
})

async function main() {
	const env = readLocalSupabaseEnv()
	const anon = createAnonClient(env)
	const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

	await cleanupInterruptedFlowSmokeRuns(env)
	await assertSupportUsesServerBoundary(env, anon, runId)
	const smokeProduct = await assertMarketCategoriesAreDatabaseDriven(
		env,
		anon,
		runId,
	)
	const customer = await signIn(env, ACCOUNTS.customer)
	await assertCustomerCannotReadInternalEmployees(customer.authClient)
	const auditTargets = await assertCustomerToSalesToDeliveryFlow(
		env,
		customer,
		runId,
		smokeProduct,
	)
	await assertActivityRecorded(env, auditTargets)
	await assertDriverCannotReadOrders(env, auditTargets.order.id)
	await assertAiAuditBoundaries(env, anon, customer)

	console.log('Flow DB smoke passed.')
}

async function assertSupportUsesServerBoundary(env, anon, runId) {
	const service = createServiceClient(env)
	const denied = await anon.from('support_tickets').insert({
		requester_email: `blocked-${runId}@hyperquote.local`,
		subject: 'Direct insert should fail',
	})
	assert(denied.error, 'anon direct support ticket insert must be rejected')

	const deniedRpc = await anon.rpc('create_support_ticket', {
		p_client_key: `blocked:${runId}`,
		p_message: `Direct public RPC should fail for ${runId}.`,
		p_requester_email: `blocked-rpc-${runId}@hyperquote.local`,
		p_requester_name: 'Flow Smoke',
		p_requester_phone: null,
		p_source: 'website',
		p_subject: 'flow-smoke',
	})
	assert(deniedRpc.error, 'anon direct support ticket RPC must be rejected')

	const requesterEmail = `flow-${runId}@hyperquote.local`
	for (let attempt = 1; attempt <= 5; attempt += 1) {
		const { data, error } = await service.rpc('create_support_ticket', {
			p_client_key: `flow-db-smoke:${runId}`,
			p_message: `Flow smoke support message ${attempt} for ${runId}.`,
			p_requester_email: requesterEmail,
			p_requester_name: 'Flow Smoke',
			p_requester_phone: null,
			p_source: 'website',
			p_subject: 'flow-smoke',
		})
		if (error) throw new Error(`support ticket RPC failed: ${error.message}`)
		assert(data?.reference, 'support ticket RPC must return a public reference')
	}

	const limited = await service.rpc('create_support_ticket', {
		p_client_key: `flow-db-smoke:${runId}`,
		p_message: `Flow smoke support rate limit check for ${runId}.`,
		p_requester_email: requesterEmail,
		p_requester_name: 'Flow Smoke',
		p_requester_phone: null,
		p_source: 'website',
		p_subject: 'flow-smoke',
	})
	assert(
		limited.error?.message.includes('support_ticket_rate_limited'),
		'support ticket RPC must rate-limit repeated requester emails',
	)
}

async function assertCustomerCannotReadInternalEmployees(authClient) {
	const { data, error } = await authClient.from('employees').select('id')
	assert(
		error || (data ?? []).length === 0,
		'customer browser credentials must not read internal employee rows',
	)
}

async function assertCustomerToSalesToDeliveryFlow(
	env,
	customer,
	runId,
	smokeProduct,
) {
	const service = createServiceClient(env)
	const { data: customerRow, error: customerError } = await service
		.from('customers')
		.select('id')
		.eq('user_id', customer.user.id)
		.single()
	if (customerError || !customerRow) {
		throw new Error(customerError?.message ?? 'Customer row not found')
	}

	const product = smokeProduct ?? (await findOrderableSmokeProduct(service))
	const supplierId = await ensureSmokeSupplierSpecialty(env, service, product)
	await refreshProductPriceForSmoke(env, product.id, supplierId, runId)

	const { data: draft, error: draftError } = await service
		.from('quote_requests')
		.insert({
			customer_id: customerRow.id,
			notes: `flow-smoke:${runId}`,
			status: 'draft',
		})
		.select('id, request_number, status')
		.single()
	if (draftError || !draft) {
		throw new Error(draftError?.message ?? 'Failed to create customer draft')
	}

	const { error: itemError } = await service
		.from('quote_request_items')
		.insert({
			customer_description: product.name,
			product_id: product.id,
			quantity: 2,
			quote_request_id: draft.id,
			sort_order: 0,
			unit_of_measure: product.unit_of_measure,
			unit_of_measure_ar: product.unit_of_measure_ar,
		})
	if (itemError)
		throw new Error(`Failed to create draft item: ${itemError.message}`)

	const directStatus = await customer.authClient
		.from('quote_requests')
		.update({ status: 'rejected' })
		.eq('id', draft.id)
	assert(
		directStatus.error,
		'customer browser credentials must not update workflow status directly',
	)

	const { data: submitted, error: submitError } = await customer.client.rpc(
		'customer_submit_saved_quote_request',
		{ p_quote_request_id: draft.id },
	)
	if (submitError || !submitted) {
		throw new Error(submitError?.message ?? 'Failed to submit customer draft')
	}
	assert(
		submitted.status === 'submitted',
		'customer submit RPC must submit draft',
	)

	const employee = await signIn(env, ACCOUNTS.employee)
	await mustRpc(employee.client, 'set_employee_presence', {
		p_active_panel: 'sales',
		p_status: 'online',
	})
	const { data: claimed, error: claimError } = await employee.client.rpc(
		'sales_claim_order',
		{ p_order_id: draft.id },
	)
	if (claimError || !claimed) {
		throw new Error(
			claimError?.message ?? 'Sales claim did not return an order',
		)
	}
	assert(claimed.id === draft.id, 'sales claim must claim the submitted draft')

	const { data: quoteVersion, error: quoteVersionError } =
		await employee.client.rpc('sales_save_quote_version', {
			p_items: [
				{
					productId: product.id,
					productName: product.name,
					quantity: 2,
					sellPrice: 75,
					unit: product.unit_of_measure,
				},
			],
			p_notes: `flow-smoke:${runId}`,
			p_order_id: claimed.id,
		})
	if (quoteVersionError || !quoteVersion) {
		throw new Error(
			quoteVersionError?.message ?? 'Sales quote version creation failed',
		)
	}
	assert(
		Number(quoteVersion.total) > 0,
		'sales quote version must create a positive total',
	)

	const { data: order, error: confirmError } = await employee.client.rpc(
		'sales_confirm_order',
		{
			p_order_id: claimed.id,
			p_quote_version_id: quoteVersion.id,
		},
	)
	if (confirmError || !order) {
		throw new Error(confirmError?.message ?? 'Sales confirm failed')
	}
	const orderTotal = Number(order.total_amount)
	assert(orderTotal > 0, 'sales confirm must create a positive order total')
	await assertCustomerDraftSaveAudit(
		customer.client,
		customerRow.id,
		product,
		runId,
		'website',
	)
	await assertCustomerDraftSaveAudit(
		customer.client,
		customerRow.id,
		product,
		runId,
		'portal',
	)
	await assertCustomerOrderSaveAsDraftAudit(
		customer.client,
		customerRow.id,
		product,
		runId,
		draft.id,
		order.id,
	)
	const viewAudit = await customer.client.rpc(
		'customer_record_portal_order_viewed',
		{
			p_order_id: order.id,
			p_quote_request_id: draft.id,
		},
	)
	if (viewAudit.error) {
		throw new Error(
			`Portal order view audit failed: ${viewAudit.error.message}`,
		)
	}

	const unpaidReserve = await employee.client.rpc('reserve_order_stock', {
		p_order_id: order.id,
	})
	assert(
		unpaidReserve.error?.message.includes(
			'customer_payment_required_before_inventory',
		),
		'inventory reservation must require a recorded customer payment',
	)

	const { error: paymentError } = await employee.client.rpc(
		'record_customer_payment',
		{
			p_amount: orderTotal,
			p_order_id: order.id,
			p_payment_fraction: 1,
			p_proof_path: `local/payment-proofs/${runId}.pdf`,
		},
	)
	if (paymentError)
		throw new Error(`Customer payment failed: ${paymentError.message}`)

	const { data: reserved, error: reserveError } = await employee.client.rpc(
		'reserve_order_stock',
		{ p_order_id: order.id },
	)
	if (reserveError || !reserved) {
		throw new Error(reserveError?.message ?? 'Inventory reservation failed')
	}
	assert(
		reserved.status === 'inventory_reserved',
		'inventory reservation must move order to inventory_reserved',
	)

	const { data: loading, error: loadingError } = await employee.client.rpc(
		'warehouse_start_loading',
		{ p_order_id: order.id },
	)
	if (loadingError || !loading) {
		throw new Error(loadingError?.message ?? 'Warehouse loading failed')
	}

	const { data: driverRow, error: driverReadError } = await employee.client
		.from('drivers')
		.select('id')
		.eq('email', ACCOUNTS.driver.email)
		.single()
	if (driverReadError || !driverRow) {
		throw new Error(driverReadError?.message ?? 'Driver row not found')
	}
	const { data: truckRow, error: truckReadError } = await employee.client
		.from('trucks')
		.select('id')
		.eq('driver_id', driverRow.id)
		.single()
	if (truckReadError || !truckRow) {
		throw new Error(truckReadError?.message ?? 'Driver truck not found')
	}
	await resetDriverTruckForSmoke(employee.client, truckRow.id)

	const driver = await signIn(env, ACCOUNTS.driver)
	await assertDriverTeamChannelUsesSupabase(driver.client, runId)
	const { error: offlineError } = await driver.client.rpc('driver_set_online', {
		p_online: false,
	})
	if (offlineError)
		throw new Error(`Driver offline failed: ${offlineError.message}`)

	const offlineAssign = await employee.client.rpc(
		'warehouse_assign_loading_driver',
		{
			p_driver_id: driverRow.id,
			p_order_id: order.id,
			p_truck_id: truckRow.id,
		},
	)
	assert(
		offlineAssign.error?.message.includes('driver_not_available') ||
			offlineAssign.error?.message.includes('driver_not_online'),
		'warehouse must reject drivers that are not online',
	)

	const { error: onlineError } = await driver.client.rpc('driver_set_online', {
		p_online: true,
	})
	if (onlineError)
		throw new Error(`Driver online failed: ${onlineError.message}`)

	const { error: assignError } = await employee.client.rpc(
		'warehouse_assign_loading_driver',
		{
			p_driver_id: driverRow.id,
			p_order_id: order.id,
			p_truck_id: truckRow.id,
		},
	)
	if (assignError) {
		throw new Error(
			`Warehouse driver assignment failed: ${assignError.message}`,
		)
	}
	const preSignoffDelivery = await employee.client
		.from('deliveries')
		.select('id')
		.eq('order_id', order.id)
		.eq('driver_id', driverRow.id)
		.maybeSingle()
	if (preSignoffDelivery.error) {
		throw new Error(
			`Pre-signoff delivery visibility check failed: ${preSignoffDelivery.error.message}`,
		)
	}
	assert(
		preSignoffDelivery.data === null,
		'warehouse driver choice must not create a driver-visible delivery before signoff',
	)
	const preSignoffDashboard = await driver.client.rpc('driver_app_dashboard')
	if (preSignoffDashboard.error) {
		throw new Error(
			`Pre-signoff driver dashboard failed: ${preSignoffDashboard.error.message}`,
		)
	}
	assert(
		preSignoffDashboard.data?.nextDelivery === null &&
			preSignoffDashboard.data?.activeDelivery === null &&
			preSignoffDashboard.data?.openDeliveries === 0 &&
			Array.isArray(preSignoffDashboard.data?.deliveries),
		'driver dashboard must not expose open deliveries until warehouse signoff',
	)
	await mustRpc(employee.client, 'warehouse_toggle_loading_item', {
		p_order_id: order.id,
		p_product_slug: product.slug,
		p_truck_id: truckRow.id,
	})
	await mustRpc(employee.client, 'warehouse_mark_loading_ready', {
		p_order_id: order.id,
	})

	const { error: approveError } = await employee.client.rpc(
		'warehouse_approve_loading',
		{
			p_loading_task_id: loading.id,
			p_proof: { checklist: 'flow-smoke' },
		},
	)
	if (approveError) {
		throw new Error(`Warehouse approval failed: ${approveError.message}`)
	}

	const { data: delivery, error: deliveryReadError } = await employee.client
		.from('deliveries')
		.select('id, status')
		.eq('order_id', order.id)
		.eq('driver_id', driverRow.id)
		.in('status', ['assigned', 'accepted', 'in_transit', 'arrived'])
		.single()
	if (deliveryReadError || !delivery) {
		throw new Error(deliveryReadError?.message ?? 'Delivery assignment missing')
	}

	const otherDeliveryLocation = await driver.client.rpc(
		'driver_update_location',
		{
			p_accuracy_meters: null,
			p_delivery_id: crypto.randomUUID(),
			p_heading: null,
			p_latitude: 30.0444,
			p_longitude: 31.2357,
			p_speed_kmh: null,
		},
	)
	assert(
		otherDeliveryLocation.error?.message.includes(
			'delivery_not_assigned_to_driver',
		),
		'driver location updates must be scoped to assigned deliveries',
	)

	if (delivery.status === 'assigned') {
		await mustRpc(driver.client, 'driver_accept_delivery', {
			p_delivery_id: delivery.id,
		})
		await mustRpc(driver.client, 'driver_start_delivery', {
			p_delivery_id: delivery.id,
		})
	} else if (delivery.status === 'accepted') {
		await mustRpc(driver.client, 'driver_start_delivery', {
			p_delivery_id: delivery.id,
		})
	} else {
		assert(
			delivery.status === 'in_transit',
			'warehouse signoff must leave delivery assigned, accepted, or in transit',
		)
	}
	const deliverySecret = deliverySecretCode(order.id)
	assert(
		/^[2-9A-HJ-NP-Z]{8}$/.test(deliverySecret),
		'driver delivery secret must be 8-character alphanumeric code',
	)
	const wrongSecret = await driver.client.rpc(
		'driver_confirm_arrival_secret_result',
		{
			p_code: '00000000',
			p_delivery_id: delivery.id,
		},
	)
	assert(
		wrongSecret.error?.message.includes('invalid_delivery_secret') ||
			wrongSecret.data?.error === 'invalid_delivery_secret',
		'driver arrival must reject wrong secret code',
	)
	await mustRpc(driver.client, 'driver_confirm_arrival_secret_result', {
		p_code: deliverySecret,
		p_delivery_id: delivery.id,
	})

	const wrongCompletionSecret = await driver.client.rpc(
		'driver_confirm_delivery',
		{
			p_code: '00000000',
			p_delivery_id: delivery.id,
			p_latitude: 30.0444,
			p_longitude: 31.2357,
			p_signature_path: null,
			p_signer_name: null,
		},
	)
	assert(
		wrongCompletionSecret.error?.message.includes('invalid_delivery_secret'),
		'driver completion must reject wrong secret code',
	)

	const completed = await mustRpc(driver.client, 'driver_confirm_delivery', {
		p_code: deliverySecret,
		p_delivery_id: delivery.id,
		p_latitude: 30.0444,
		p_longitude: 31.2357,
		p_signature_path: null,
		p_signer_name: null,
	})
	assert(
		completed.status === 'completed',
		'driver completion must complete delivery',
	)

	const { data: finalOrder, error: finalOrderError } = await employee.client
		.from('orders')
		.select('status')
		.eq('id', order.id)
		.single()
	if (finalOrderError || !finalOrder) {
		throw new Error(finalOrderError?.message ?? 'Final order not found')
	}
	assert(
		finalOrder.status === 'delivered',
		'driver completion must deliver order',
	)

	const { data: reservations, error: reservationError } = await employee.client
		.from('inventory_reservations')
		.select('status')
		.eq('order_id', order.id)
	if (reservationError) {
		throw new Error(`Reservation check failed: ${reservationError.message}`)
	}
	assert(
		(reservations ?? []).every((row) => row.status === 'consumed'),
		'delivered orders must consume reserved inventory',
	)

	return {
		deliveryId: delivery.id,
		order,
		quoteRequestId: draft.id,
	}
}

async function assertCustomerDraftSaveAudit(
	client,
	customerId,
	product,
	runId,
	source,
) {
	const { data: draft, error: draftError } = await client
		.from('quote_requests')
		.insert({
			customer_id: customerId,
			notes: `flow-smoke:${source}-draft:${runId}`,
			status: 'draft',
		})
		.select('id, request_number')
		.single()
	if (draftError || !draft) {
		throw new Error(draftError?.message ?? `${source} draft insert failed`)
	}

	const { error: itemError } = await client.from('quote_request_items').insert({
		customer_description: product.name,
		product_id: product.id,
		quantity: source === 'website' ? 3 : 4,
		quote_request_id: draft.id,
		sort_order: 0,
		unit_of_measure: product.unit_of_measure,
		unit_of_measure_ar: product.unit_of_measure_ar,
	})
	if (itemError) {
		throw new Error(`${source} draft item insert failed: ${itemError.message}`)
	}

	const { error: activityError } = await client.rpc(
		'customer_record_quote_request_draft_saved',
		{
			p_context: { item_count: 1, source_test: true },
			p_quote_request_id: draft.id,
			p_source: source,
		},
	)
	if (activityError) {
		throw new Error(`${source} draft audit failed: ${activityError.message}`)
	}

	return draft.id
}

async function assertCustomerOrderSaveAsDraftAudit(
	client,
	customerId,
	product,
	runId,
	sourceQuoteRequestId,
	sourceOrderId,
) {
	const { data: draft, error: draftError } = await client
		.from('quote_requests')
		.insert({
			customer_id: customerId,
			notes: `flow-smoke:save-as-draft:${runId}`,
			status: 'draft',
		})
		.select('id, request_number')
		.single()
	if (draftError || !draft) {
		throw new Error(draftError?.message ?? 'save-as-draft insert failed')
	}

	const { error: itemError } = await client.from('quote_request_items').insert({
		customer_description: product.name,
		product_id: product.id,
		quantity: 5,
		quote_request_id: draft.id,
		sort_order: 0,
		unit_of_measure: product.unit_of_measure,
		unit_of_measure_ar: product.unit_of_measure_ar,
	})
	if (itemError) {
		throw new Error(`save-as-draft item insert failed: ${itemError.message}`)
	}

	const { error: activityError } = await client.rpc(
		'customer_record_order_saved_as_draft',
		{
			p_draft_quote_request_id: draft.id,
			p_source: 'portal',
			p_source_order_id: sourceOrderId,
			p_source_quote_request_id: sourceQuoteRequestId,
		},
	)
	if (activityError) {
		throw new Error(`save-as-draft audit failed: ${activityError.message}`)
	}

	return draft.id
}

async function findOrderableSmokeProduct(service) {
	const { data: categories, error: categoryError } = await service
		.from('categories')
		.select('slug')
	if (categoryError) {
		throw new Error(`Smoke category lookup failed: ${categoryError.message}`)
	}
	const categorySlugs = (categories ?? [])
		.map((category) => category.slug)
		.filter(Boolean)
	if (categorySlugs.length === 0) {
		throw new Error('No categories available for smoke product lookup')
	}

	const { data: products, error } = await service
		.from('products')
		.select('id, category, name, slug, unit_of_measure, unit_of_measure_ar')
		.eq('is_active', true)
		.not('availability_status', 'in', '("hidden","out_of_stock")')
		.in('category', categorySlugs)
		.order('created_at', { ascending: true })
		.limit(25)
	if (error || !products || products.length === 0) {
		throw new Error(
			error?.message ?? 'No orderable product with a valid category for smoke',
		)
	}

	const { data: stockRows, error: stockError } = await service
		.from('inventory_stock')
		.select('product_id, available_quantity')
		.in(
			'product_id',
			products.map((product) => product.id),
		)
		.gte('available_quantity', 2)
	if (stockError) {
		throw new Error(`Smoke stock lookup failed: ${stockError.message}`)
	}
	const stockedProductIds = new Set(
		(stockRows ?? []).map((stock) => stock.product_id),
	)
	const product = products.find((candidate) =>
		stockedProductIds.has(candidate.id),
	)
	if (!product) {
		throw new Error(
			'No orderable product with at least 2 available stock units for smoke',
		)
	}
	return product
}

async function ensureSmokeSupplierSpecialty(env, service, product) {
	const { data: specialties, error: specialtyError } = await service
		.from('supplier_specialties')
		.select('supplier_id, product_slug')
		.eq('category_slug', product.category)
	if (specialtyError) {
		throw new Error(
			`Product supplier specialty lookup failed: ${specialtyError.message}`,
		)
	}
	const existingSpecialty = (specialties ?? []).find(
		(row) => row.product_slug === null || row.product_slug === product.slug,
	)
	if (existingSpecialty) return existingSpecialty.supplier_id

	const { data: supplier, error: supplierError } = await service
		.from('suppliers')
		.select('id')
		.eq('status', 'active')
		.limit(1)
		.single()
	if (supplierError || !supplier) {
		throw new Error(supplierError?.message ?? 'Active supplier not found')
	}

	runLocalSql(
		env,
		`
			begin;
			select set_config('app.audited_registry_write', 'on', true);
			insert into public.supplier_specialties (
				supplier_id,
				category_slug,
				product_slug
			)
			values (
				${sqlLiteral(supplier.id)}::uuid,
				${sqlLiteral(product.category)},
				${sqlLiteral(product.slug)}
			)
			on conflict do nothing;
			commit;
		`,
	)
	return supplier.id
}

async function refreshProductPriceForSmoke(env, productId, supplierId, runId) {
	const employee = await signIn(env, ACCOUNTS.employee)
	const { error } = await employee.client.rpc('inventory_update_price', {
		p_new_price: 75,
		p_notes: `flow-smoke:${runId}`,
		p_product_id: productId,
		p_proof_path: `local/price-updates/${runId}.pdf`,
		p_supplier_id: supplierId,
	})
	if (error) {
		throw new Error(`Inventory price refresh failed: ${error.message}`)
	}
}

async function assertMarketCategoriesAreDatabaseDriven(env, anon, runId) {
	const employee = await signIn(env, ACCOUNTS.employee)
	const service = createServiceClient(env)
	const categorySlug = `flow-smoke-${runId}`
	const productSlug = `flow-smoke-product-${runId}`
	const deniedCategorySlug = `flow-smoke-direct-${runId}`

	const deniedCategory = await employee.authClient.from('categories').insert({
		name: `Flow Smoke Direct ${runId}`,
		name_ar: `تصنيف مباشر ${runId}`,
		slug: deniedCategorySlug,
	})
	assert(
		deniedCategory.error,
		'employee browser credentials must not insert market categories directly',
	)

	const { error: categoryError } = await service.from('categories').insert({
		name: `Flow Smoke ${runId}`,
		name_ar: `تصنيف اختبار ${runId}`,
		slug: categorySlug,
	})
	if (categoryError)
		throw new Error(`Market category insert failed: ${categoryError.message}`)

	const { data: product, error: productError } = await service
		.from('products')
		.insert({
			availability_status: 'available',
			category: categorySlug,
			description: `Flow smoke dynamic category product ${runId}`,
			description_ar: `وصف منتج اختبار ${runId}`,
			is_active: true,
			is_stockable: true,
			name: `Flow Smoke Product ${runId}`,
			name_ar: `منتج اختبار ${runId}`,
			price_range_max: 2,
			price_range_min: 1,
			price_tier: 'budget',
			sku: `FLOW-${runId}`,
			slug: productSlug,
			subcategory: categorySlug,
			subcategory_ar: `فئة اختبار ${runId}`,
			specifications: { grade: 'smoke' },
			specifications_ar: { الدرجة: 'smoke' },
			unit_of_measure: 'piece',
			unit_of_measure_ar: 'قطعة',
		})
		.select('id, category, name, slug, unit_of_measure, unit_of_measure_ar')
		.single()
	if (productError || !product)
		throw new Error(
			productError?.message ?? 'Market product insert did not return a row',
		)

	const { error: stockError } = await service.from('inventory_stock').upsert(
		{
			good_quantity: 20,
			minimum_quantity: 0,
			on_hand_quantity: 20,
			product_id: product.id,
			reserved_quantity: 0,
		},
		{ onConflict: 'product_id' },
	)
	if (stockError)
		throw new Error(`Market product stock setup failed: ${stockError.message}`)

	const publicCategory = await anon
		.from('categories')
		.select('slug')
		.eq('slug', categorySlug)
		.single()
	assert(
		publicCategory.error,
		'anon browser credentials must not read raw market categories directly',
	)

	const publicProduct = await anon
		.from('products')
		.select('slug, category')
		.eq('slug', productSlug)
		.eq('category', categorySlug)
		.single()
	assert(
		publicProduct.error,
		'anon browser credentials must not read raw market products directly',
	)

	const { data: serviceProduct, error: serviceProductError } = await service
		.from('products')
		.select('slug, category')
		.eq('slug', productSlug)
		.eq('category', categorySlug)
		.single()
	if (serviceProductError || !serviceProduct) {
		throw new Error(
			serviceProductError?.message ??
				'Market product was not visible through the server boundary',
		)
	}

	return product
}

async function assertDriverTeamChannelUsesSupabase(client, runId) {
	const body = `flow-smoke driver message ${runId}`
	const { data: sent, error: sendError } = await client.rpc(
		'driver_send_team_message',
		{ p_body: body },
	)
	if (sendError || !sent) {
		throw new Error(sendError?.message ?? 'Driver team message send failed')
	}
	assert(
		sent.body?.en === body,
		'driver team message RPC must return the persisted body',
	)

	const { data: messages, error: listError } = await client.rpc(
		'driver_list_team_messages',
	)
	if (listError || !Array.isArray(messages)) {
		throw new Error(listError?.message ?? 'Driver team message list failed')
	}
	assert(
		messages.some(
			(message) => message.id === sent.id && message.body?.en === body,
		),
		'driver team message list must read back the Supabase row',
	)

	const { data: drivers, error: driversError } = await client.rpc(
		'driver_list_active_drivers',
	)
	if (driversError || !Array.isArray(drivers)) {
		throw new Error(driversError?.message ?? 'Driver list RPC failed')
	}
	assert(
		drivers.some((driver) => driver.id === sent.authorDriverId),
		'driver active list must include the message author from Supabase',
	)
}

async function resetDriverTruckForSmoke(client, truckId) {
	const { error } = await client
		.from('trucks')
		.update({ status: 'available' })
		.eq('id', truckId)
	if (error) {
		throw new Error(`Driver truck availability reset failed: ${error.message}`)
	}
}

async function assertActivityRecorded(env, auditTargets) {
	const { client } = await signIn(env, ACCOUNTS.employee)
	const { data, error } = await client
		.from('activity_events')
		.select('action')
		.eq('entity_id', auditTargets.quoteRequestId)
	if (error) throw new Error(`Activity audit check failed: ${error.message}`)
	const actions = new Set((data ?? []).map((row) => row.action))
	assert(
		actions.has('order_submitted'),
		'quote submission must write activity history',
	)
	assert(
		actions.has('sales_order_claimed'),
		'sales claim must write activity history',
	)
	assert(
		actions.has('sales_order_confirmed'),
		'sales confirmation must write activity history',
	)
	await assertEntityHasActivity(
		client,
		auditTargets.order.id,
		'customer_payment_recorded',
	)
	await assertEntityHasActivity(
		client,
		auditTargets.order.id,
		'order_stock_reserved',
	)
	await assertEntityHasActivity(
		client,
		auditTargets.order.id,
		'warehouse_loading_started',
	)
	await assertEntityHasActivity(
		client,
		auditTargets.deliveryId,
		'driver_delivery_confirmed',
	)
}

async function assertEntityHasActivity(client, entityId, action) {
	const { data, error } = await client
		.from('activity_events')
		.select('action')
		.eq('entity_id', entityId)
		.eq('action', action)
	if (error) throw new Error(`Activity audit check failed: ${error.message}`)
	assert((data ?? []).length > 0, `${action} must write activity history`)
}

async function assertDriverCannotReadOrders(env, deliveredOrderId) {
	const driver = await signIn(env, ACCOUNTS.driver)
	const { data, error } = await driver.authClient
		.from('orders')
		.select('id')
		.eq('id', deliveredOrderId)
	assert(
		error || (data ?? []).length === 0,
		'driver browser credentials must not read raw order rows',
	)
}

async function assertAiAuditBoundaries(env, anon, customer) {
	const service = createServiceClient(env)
	const directWebsiteAudit = await anon.rpc('record_ai_tool_call', {
		p_agent_scope: 'website',
		p_approved_by_user: false,
		p_input_summary: { prompt: 'public question' },
		p_output_summary: { response: 'public answer' },
		p_read_entities: ['website_index'],
		p_tool_name: 'website_public_answer',
		p_write_entity_id: null,
		p_write_entity_type: null,
	})
	assert(
		directWebsiteAudit.error,
		'anon browser credentials must not call raw AI audit RPCs directly',
	)

	const websiteAudit = await service.rpc('record_ai_tool_call', {
		p_agent_scope: 'website',
		p_approved_by_user: false,
		p_input_summary: { prompt: 'public question' },
		p_output_summary: { response: 'public answer' },
		p_read_entities: ['website_index'],
		p_tool_name: 'website_public_answer',
		p_write_entity_id: null,
		p_write_entity_type: null,
	})
	if (websiteAudit.error || !websiteAudit.data) {
		throw new Error(
			websiteAudit.error?.message ?? 'Website AI audit insert failed',
		)
	}

	const directAuditInsert = await customer.authClient
		.from('ai_tool_call_audit')
		.insert({
			agent_scope: 'portal',
			tool_name: 'direct_insert',
		})
	assert(
		directAuditInsert.error,
		'AI audit rows must be written through the audit RPC, not direct table insert',
	)

	const customerSearch = await customer.client.rpc('record_ai_tool_call', {
		p_agent_scope: 'search',
		p_approved_by_user: false,
		p_input_summary: {},
		p_output_summary: {},
		p_read_entities: ['ceo_order_summary'],
		p_tool_name: 'ceo_search_query',
		p_write_entity_id: null,
		p_write_entity_type: null,
	})
	assert(
		customerSearch.error?.message.includes('employee_required_for_ai') ||
			customerSearch.error?.message.includes('ceo_required_for_search_ai'),
		'customer accounts must not audit or execute Search AI calls',
	)

	const employee = await signIn(env, ACCOUNTS.employee)
	const employeeSearch = await employee.client.rpc('record_ai_tool_call', {
		p_agent_scope: 'search',
		p_approved_by_user: false,
		p_input_summary: { query: 'orders today' },
		p_output_summary: { rows: 0 },
		p_read_entities: ['ceo_order_summary'],
		p_tool_name: 'ceo_search_query',
		p_write_entity_id: null,
		p_write_entity_type: null,
	})
	if (employeeSearch.error || !employeeSearch.data) {
		throw new Error(employeeSearch.error?.message ?? 'Search AI audit failed')
	}

	const searchWrite = await employee.client.rpc('record_ai_tool_call', {
		p_agent_scope: 'search',
		p_approved_by_user: true,
		p_input_summary: {},
		p_output_summary: {},
		p_read_entities: ['ceo_order_summary'],
		p_tool_name: 'ceo_search_write_attempt',
		p_write_entity_id: crypto.randomUUID(),
		p_write_entity_type: 'orders',
	})
	assert(
		searchWrite.error?.message.includes('search_ai_is_read_only'),
		'Search AI must remain read-only even with user approval',
	)
}

async function mustRpc(client, name, args) {
	const { data, error } = await client.rpc(name, args)
	if (error || !data) throw new Error(`${name} failed: ${error?.message}`)
	return data
}

async function signIn(env, account) {
	const authClient = createAnonClient(env)
	const { data, error } = await authClient.auth.signInWithPassword({
		email: account.email,
		password: account.password,
	})
	if (error || !data.user) {
		throw new Error(error?.message ?? `Failed to sign in ${account.email}`)
	}
	const actorPool = actorPoolForAccount(account, data.user)
	const client = createActorServiceClient(env, data.user.id, actorPool)
	return { authClient, client, user: data.user }
}

function createAnonClient({ anonKey, apiUrl }) {
	return createClient(apiUrl, anonKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	})
}

function createServiceClient({ apiUrl, serviceRoleKey }) {
	return createClient(apiUrl, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	})
}

function createActorServiceClient(env, actorUserId, actorPool) {
	const service = createServiceClient(env)
	const actorRpcNames = getActorRpcNames()
	return new Proxy(service, {
		get(target, property, receiver) {
			if (property !== 'rpc') return Reflect.get(target, property, receiver)
			return (functionName, args, options) => {
				if (
					typeof functionName === 'string' &&
					actorRpcNames.has(functionName)
				) {
					return target.rpc(
						`service_${functionName}`,
						{
							...(args ?? {}),
							p_actor_pool: actorPool,
							p_actor_user_id: actorUserId,
						},
						options,
					)
				}
				return target.rpc(functionName, args, options)
			}
		},
	})
}

function actorPoolForAccount(account, user) {
	const metadataPool = user.app_metadata?.pool
	if (['driver', 'external', 'internal'].includes(metadataPool)) {
		return metadataPool
	}
	if (account.email === ACCOUNTS.driver.email) return 'driver'
	if (account.email === ACCOUNTS.employee.email) return 'internal'
	return 'external'
}

let actorRpcNamesCache = null
function getActorRpcNames() {
	if (actorRpcNamesCache) return actorRpcNamesCache
	const source = readFileSync('packages/auth/src/server.ts', 'utf8')
	const start = source.indexOf('const ACTOR_RPC_NAMES')
	const end = source.indexOf('export function createActorServiceRoleClient')
	if (start < 0 || end < 0 || end <= start) {
		throw new Error('Could not locate ACTOR_RPC_NAMES in auth server helper')
	}
	actorRpcNamesCache = new Set(
		[...source.slice(start, end).matchAll(/'([a-zA-Z0-9_]+)'/g)].map(
			(match) => match[1],
		),
	)
	return actorRpcNamesCache
}

function runLocalSql(env, sql) {
	const result = spawnSync(
		'psql',
		[env.dbUrl, '-X', '-v', 'ON_ERROR_STOP=1', '-Atqc', sql],
		{ encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
	)
	if (result.status !== 0) {
		throw new Error(result.stderr.trim() || 'Local SQL command failed')
	}
}

async function cleanupInterruptedFlowSmokeRuns(env) {
	const employee = await signIn(env, ACCOUNTS.employee)
	const proof = {
		evidenceText: 'Flow DB smoke interrupted-run cleanup.',
		reason: 'interrupted_flow_smoke_cleanup',
		source: 'flow-db-smoke',
	}

	const activeDeliveries = queryLocalJson(
		env,
		`
			select coalesce(jsonb_agg(jsonb_build_object('id', d.id) order by d.created_at), '[]'::jsonb)
			from public.deliveries d
			join public.orders o on o.id = d.order_id
			join public.quote_requests qr on qr.id = o.quote_request_id
			where qr.notes like 'flow-smoke:%'
			  and d.status in ('assigned', 'accepted', 'in_transit', 'arrived')
		`,
	)
	for (const delivery of activeDeliveries) {
		await mustRpc(employee.client, 'dispatch_complete_delivery', {
			p_delivery_id: delivery.id,
			p_proof: proof,
		})
	}

	const loadedOrders = queryLocalJson(
		env,
		`
			select coalesce(jsonb_agg(jsonb_build_object('id', o.id) order by o.created_at), '[]'::jsonb)
			from public.orders o
			join public.quote_requests qr on qr.id = o.quote_request_id
			where qr.notes like 'flow-smoke:%'
			  and o.status in ('dispatch_ready', 'dispatch_assigned', 'out_for_delivery')
			  and exists (
				select 1
				from public.loading_tasks lt
				where lt.order_id = o.id
				  and lt.status = 'approved'
			  )
		`,
	)
	for (const order of loadedOrders) {
		await mustRpc(employee.client, 'dispatch_complete_loaded_order', {
			p_order_id: order.id,
			p_proof: proof,
		})
	}

	const loadingOrders = queryLocalJson(
		env,
		`
			select coalesce(jsonb_agg(jsonb_build_object('id', o.id) order by o.created_at), '[]'::jsonb)
			from public.orders o
			join public.quote_requests qr on qr.id = o.quote_request_id
			where qr.notes like 'flow-smoke:%'
			  and o.status = 'warehouse_loading'
			  and exists (
				select 1
				from public.loading_tasks lt
				where lt.order_id = o.id
				  and lt.status <> 'approved'
			  )
		`,
	)
	for (const order of loadingOrders) {
		await mustRpc(employee.client, 'warehouse_reset_loading', {
			p_order_id: order.id,
		})
	}
}

function queryLocalJson(env, sql) {
	const result = spawnSync(
		'psql',
		[env.dbUrl, '-X', '-v', 'ON_ERROR_STOP=1', '-Atqc', sql],
		{ encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
	)
	if (result.status !== 0) {
		throw new Error(result.stderr.trim() || 'Local SQL query failed')
	}
	const text = result.stdout.trim()
	return text ? JSON.parse(text) : null
}

function sqlLiteral(value) {
	return `'${String(value).replace(/'/g, "''")}'`
}

function deliverySecretCode(orderId) {
	const env = readLocalSupabaseEnv()
	const result = spawnSync(
		'psql',
		[
			env.dbUrl,
			'-At',
			'-c',
			`select code from app_private.order_delivery_secrets where order_id = '${String(orderId).replace(/'/g, "''")}'::uuid`,
		],
		{ encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
	)
	if (result.status !== 0) {
		throw new Error(result.stderr.trim() || 'Delivery secret lookup failed')
	}
	const code = result.stdout.trim()
	if (!code) throw new Error('Delivery secret missing')
	return code
}

function readLocalSupabaseEnv() {
	const result = spawnSync('supabase', ['status', '-o', 'env'], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	})
	if (result.status !== 0) {
		throw new Error(
			'Local Supabase is not running. Run `bun run db:start` first.',
		)
	}

	const parsed = {}
	for (const line of result.stdout.split('\n')) {
		const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
		if (!match) continue
		parsed[match[1]] = stripEnvQuotes(match[2])
	}

	if (
		!parsed.API_URL ||
		!parsed.ANON_KEY ||
		!parsed.DB_URL ||
		!parsed.SERVICE_ROLE_KEY
	) {
		throw new Error(
			'Could not read local Supabase API URL/anon key/DB URL/service role key.',
		)
	}
	return {
		anonKey: parsed.ANON_KEY,
		apiUrl: parsed.API_URL,
		dbUrl: parsed.DB_URL,
		serviceRoleKey: parsed.SERVICE_ROLE_KEY,
	}
}

function stripEnvQuotes(value) {
	if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1)
	return value
}

function assert(condition, message) {
	if (!condition) throw new Error(message)
}
