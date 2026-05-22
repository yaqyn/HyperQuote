#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const LOCAL_DEV_PASSWORD =
	process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ??
	['hyperquote', 'local', 'only', '2026'].join('-')

const ACCOUNTS = {
	customer: 'local-customer@hyperquote.local',
	driver: 'local-driver@hyperquote.local',
	employee: 'local-admin@hyperquote.local',
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error))
	process.exit(1)
})

async function main() {
	const env = readLocalSupabaseEnv()
	const anon = createAnonClient(env)
	const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

	await assertAnonSupportUsesRpc(anon, runId)
	await assertMarketCategoriesAreDatabaseDriven(env, anon, runId)
	const customer = await signIn(env, ACCOUNTS.customer)
	await assertCustomerCannotReadInternalEmployees(customer.client)
	const auditTargets = await assertCustomerToSalesToDeliveryFlow(
		env,
		customer.client,
		runId,
	)
	await assertActivityRecorded(env, auditTargets)
	await assertDriverCannotReadOrders(env, auditTargets.order.id)
	await assertAiAuditBoundaries(env, anon, customer.client)

	console.log('Flow DB smoke passed.')
}

async function assertAnonSupportUsesRpc(anon, runId) {
	const denied = await anon.from('support_tickets').insert({
		requester_email: `blocked-${runId}@hyperquote.local`,
		subject: 'Direct insert should fail',
	})
	assert(denied.error, 'anon direct support ticket insert must be rejected')

	const requesterEmail = `flow-${runId}@hyperquote.local`
	for (let attempt = 1; attempt <= 5; attempt += 1) {
		const { data, error } = await anon.rpc('create_support_ticket', {
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

	const limited = await anon.rpc('create_support_ticket', {
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

async function assertCustomerCannotReadInternalEmployees(client) {
	const { data, error } = await client.from('employees').select('id')
	if (error)
		throw new Error(`customer employee read check failed: ${error.message}`)
	assert(
		(data ?? []).length === 0,
		'customer role must not read internal employee rows',
	)
}

async function assertCustomerToSalesToDeliveryFlow(env, customerClient, runId) {
	const { data: product, error: productError } = await customerClient
		.from('products')
		.select('id, name, slug, unit_of_measure, unit_of_measure_ar')
		.eq('is_active', true)
		.limit(1)
		.single()
	if (productError || !product) {
		throw new Error(productError?.message ?? 'No product available for smoke')
	}

	const { data: draft, error: draftError } = await customerClient
		.from('quote_requests')
		.insert({
			notes: `flow-smoke:${runId}`,
			status: 'draft',
		})
		.select('id, request_number, status')
		.single()
	if (draftError || !draft) {
		throw new Error(draftError?.message ?? 'Failed to create customer draft')
	}

	const { error: itemError } = await customerClient
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

	const directStatus = await customerClient
		.from('quote_requests')
		.update({ status: 'rejected' })
		.eq('id', draft.id)
	assert(
		directStatus.error?.message.includes('state_updates_must_use_rpc'),
		'customer direct workflow status update must be rejected',
	)

	const { data: submitted, error: submitError } = await customerClient.rpc(
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
	await assertCustomerDraftSaveAudit(customerClient, product, runId, 'website')
	await assertCustomerDraftSaveAudit(customerClient, product, runId, 'portal')
	await assertCustomerOrderSaveAsDraftAudit(
		customerClient,
		product,
		runId,
		draft.id,
		order.id,
	)
	const viewAudit = await customerClient.rpc(
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
		.eq('email', ACCOUNTS.driver)
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

	await mustRpc(driver.client, 'driver_accept_delivery', {
		p_delivery_id: delivery.id,
	})
	await mustRpc(driver.client, 'driver_start_delivery', {
		p_delivery_id: delivery.id,
	})
	const deliverySecret = deliverySecretCode(order.id)
	assert(
		/^[2-9A-HJ-NP-Z]{8}$/.test(deliverySecret),
		'driver delivery secret must be 8-character alphanumeric code',
	)
	const wrongSecret = await driver.client.rpc('driver_confirm_arrival_secret', {
		p_code: '00000000',
		p_delivery_id: delivery.id,
	})
	assert(
		wrongSecret.error?.message.includes('invalid_delivery_secret'),
		'driver arrival must reject wrong secret code',
	)
	await mustRpc(driver.client, 'driver_confirm_arrival_secret', {
		p_code: deliverySecret,
		p_delivery_id: delivery.id,
	})

	const completed = await mustRpc(driver.client, 'driver_confirm_delivery', {
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

async function assertCustomerDraftSaveAudit(client, product, runId, source) {
	const { data: draft, error: draftError } = await client
		.from('quote_requests')
		.insert({
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
	product,
	runId,
	sourceQuoteRequestId,
	sourceOrderId,
) {
	const { data: draft, error: draftError } = await client
		.from('quote_requests')
		.insert({
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

async function assertMarketCategoriesAreDatabaseDriven(env, anon, runId) {
	const { client: employeeClient } = await signIn(env, ACCOUNTS.employee)
	const service = createServiceClient(env)
	const categorySlug = `flow-smoke-${runId}`
	const productSlug = `flow-smoke-product-${runId}`
	const deniedCategorySlug = `flow-smoke-direct-${runId}`

	const deniedCategory = await employeeClient.from('categories').insert({
		name: `Flow Smoke Direct ${runId}`,
		name_ar: `تصنيف مباشر ${runId}`,
		slug: deniedCategorySlug,
	})
	assert(
		deniedCategory.error?.message.includes(
			'registry_writes_must_use_audited_server_function',
		),
		'employee direct market category insert must be rejected',
	)

	const { error: categoryError } = await service.from('categories').insert({
		name: `Flow Smoke ${runId}`,
		name_ar: `تصنيف اختبار ${runId}`,
		slug: categorySlug,
	})
	if (categoryError)
		throw new Error(`Market category insert failed: ${categoryError.message}`)

	const { error: productError } = await service.from('products').insert({
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
	if (productError)
		throw new Error(`Market product insert failed: ${productError.message}`)

	const { data: publicCategory, error: publicCategoryError } = await anon
		.from('categories')
		.select('slug')
		.eq('slug', categorySlug)
		.single()
	if (publicCategoryError || !publicCategory) {
		throw new Error(
			publicCategoryError?.message ??
				'Public market category was not visible from Supabase',
		)
	}

	const { data: publicProduct, error: publicProductError } = await anon
		.from('products')
		.select('slug, category')
		.eq('slug', productSlug)
		.eq('category', categorySlug)
		.single()
	if (publicProductError || !publicProduct) {
		throw new Error(
			publicProductError?.message ??
				'Public market product was not visible from Supabase',
		)
	}
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
	const { data, error } = await driver.client
		.from('orders')
		.select('id')
		.eq('id', deliveredOrderId)
	if (error) throw new Error(`Driver order read check failed: ${error.message}`)
	assert((data ?? []).length === 0, 'drivers must not read raw order rows')
}

async function assertAiAuditBoundaries(env, anon, customerClient) {
	const websiteAudit = await anon.rpc('record_ai_tool_call', {
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

	const directAuditInsert = await customerClient
		.from('ai_tool_call_audit')
		.insert({
			agent_scope: 'portal',
			tool_name: 'direct_insert',
		})
	assert(
		directAuditInsert.error,
		'AI audit rows must be written through the audit RPC, not direct table insert',
	)

	const customerSearch = await customerClient.rpc('record_ai_tool_call', {
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

	const { client: employeeClient } = await signIn(env, ACCOUNTS.employee)
	const employeeSearch = await employeeClient.rpc('record_ai_tool_call', {
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

	const searchWrite = await employeeClient.rpc('record_ai_tool_call', {
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

async function signIn(env, email) {
	const client = createAnonClient(env)
	const { data, error } = await client.auth.signInWithPassword({
		email,
		password: LOCAL_DEV_PASSWORD,
	})
	if (error || !data.user) {
		throw new Error(error?.message ?? `Failed to sign in ${email}`)
	}
	return { client, user: data.user }
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
