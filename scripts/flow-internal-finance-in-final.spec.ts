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

interface CustomerFixture {
	id: string
	name: string
}

interface ProductFixture {
	id: string
	name: string
	unit: string
	unitAr: string
	unitPrice: number
}

interface OrderFixture {
	customer: CustomerFixture
	id: string
	orderNumber: string
	quantity: number
	requestId: string
	requestNumber: string
	totalAmount: number
}

interface FinanceInFixture {
	fullOrder: OrderFixture
	guardOrder: OrderFixture
	partialOrder: OrderFixture
	runId: string
}

const DEFAULT_PASSWORD = ['hyperquote', 'local', 'only', '2026'].join('-')

const URLS = {
	internal: process.env.FLOW_INTERNAL_URL ?? 'http://localhost:3002',
}

const COOKIE_NAMES = {
	internal: 'hyperquote_internal_auth',
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

test.describe.configure({ mode: 'serial' })
test.use({ actionTimeout: 15_000, navigationTimeout: 30_000 })

test('finance IN records customer follow-up, 50 percent receipt, full receipt, and inventory handoff from real orders', async ({
	browser,
}) => {
	test.setTimeout(240_000)
	const env = readLocalSupabaseEnv()
	const service = createLocalServiceClient(env)
	const financeAuth = await signInLocal(env, LOCAL_FINANCE)
	const inventoryAuth = await signInLocal(env, LOCAL_INVENTORY)
	const salesAuth = await signInLocal(env, LOCAL_SALES)
	const financeEmployee = await employeeByEmail(service, LOCAL_FINANCE.email)
	const fixture = await createFinanceInFixture(service)

	const invalidRolePayment = await salesAuth.client.rpc(
		'record_customer_payment',
		{
			p_amount: fixture.guardOrder.totalAmount,
			p_order_id: fixture.guardOrder.id,
			p_payment_fraction: 1,
			p_proof_path: `finance-in/sales-bypass-${fixture.runId}.pdf`,
		},
	)
	expect(invalidRolePayment.error?.message).toContain(
		'insufficient_finance_permission',
	)

	const emptyProofPayment = await financeAuth.client.rpc(
		'record_customer_payment',
		{
			p_amount: fixture.guardOrder.totalAmount,
			p_order_id: fixture.guardOrder.id,
			p_payment_fraction: 1,
			p_proof_path: '',
		},
	)
	expect(emptyProofPayment.error?.message).toContain(
		'customer_payment_proof_required',
	)

	const wrongAmountPayment = await financeAuth.client.rpc(
		'record_customer_payment',
		{
			p_amount: fixture.guardOrder.totalAmount - 1,
			p_order_id: fixture.guardOrder.id,
			p_payment_fraction: 1,
			p_proof_path: `finance-in/wrong-amount-${fixture.runId}.pdf`,
		},
	)
	expect(wrongAmountPayment.error?.message).toContain(
		'customer_payment_amount_must_match_fraction',
	)

	const finance = await openInternalPage(browser, LOCAL_FINANCE)
	try {
		await finance.page.getByRole('button', { name: /^Finance$/i }).click()
		await expect(
			finance.page.getByRole('navigation', { name: /Finance registers/i }),
		).toBeVisible({ timeout: 20_000 })
		await finance.page.getByRole('button', { name: /^In\b/i }).click()

		await expectFinanceRow(finance.page, fixture.partialOrder.customer.name)
		await expectFinanceRow(finance.page, fixture.fullOrder.customer.name)

		const partialRow = financeRow(
			finance.page,
			fixture.partialOrder.customer.name,
		)
		await partialRow.getByRole('button', { name: /Record receipt/i }).click()
		const paymentPanel = finance.page.getByRole('dialog', {
			name: /Finance payment recorder/i,
		})
		await expect(paymentPanel).toBeVisible({ timeout: 20_000 })
		await expect(
			paymentPanel.getByRole('button', { name: /Review payment/i }),
		).toBeDisabled()

		await expect(
			paymentPanel.getByRole('button', { name: /Save follow-up/i }),
		).toBeDisabled()
		const followUpDueAt = futureLocalDateTime()
		await paymentPanel
			.getByRole('combobox', { name: /^State$/i })
			.selectOption('waiting')
		await paymentPanel
			.getByRole('textbox', { name: /Follow-up due/i })
			.fill(followUpDueAt)
		await paymentPanel
			.getByRole('textbox', { name: /^Outcome$/i })
			.fill(`Customer promised bank transfer ${fixture.runId}`)
		await paymentPanel
			.getByRole('textbox', { name: /^Notes$/i })
			.fill(
				`Customer finance team confirmed the first half and needs a balance reminder for ${fixture.runId}.`,
			)
		await paymentPanel.getByRole('button', { name: /Save follow-up/i }).click()
		await expect(paymentPanel).toContainText('Follow-up saved', {
			timeout: 20_000,
		})
		await expectCustomerFollowUp(service, {
			followUpState: 'waiting',
			orderId: fixture.partialOrder.id,
			recordedByEmployeeId: financeEmployee.id,
			runId: fixture.runId,
		})

		const partialProof = `finance-in/customer-partial-${fixture.runId}.pdf`
		await paymentPanel
			.getByRole('textbox', { name: /Payment proof/i })
			.fill(partialProof)
		await paymentPanel.getByRole('button', { name: /Review payment/i }).click()
		await expect(paymentPanel).toContainText('Partial payment recorded')
		await paymentPanel.getByRole('button', { name: /^Record .* EGP$/i }).click()
		await expectCustomerPayments(service, {
			expectedAmountPaid: fixture.partialOrder.totalAmount / 2,
			expectedCount: 1,
			expectedRemaining: fixture.partialOrder.totalAmount / 2,
			orderId: fixture.partialOrder.id,
			recordedByEmployeeId: financeEmployee.id,
		})
		await expectInventoryCleared(inventoryAuth.client, fixture.partialOrder.id)
		await finance.guard.expectClean('finance partial customer payment')

		await expectFinanceRow(finance.page, fixture.partialOrder.customer.name)
		await expect(
			financeRow(finance.page, fixture.partialOrder.customer.name),
		).toContainText(
			`${formatDecimalEgp(fixture.partialOrder.totalAmount / 2)} EGP balance due`,
		)
		await financeRow(finance.page, fixture.partialOrder.customer.name)
			.getByRole('button', { name: /Record receipt/i })
			.click()
		const reopenedPanel = finance.page.getByRole('dialog', {
			name: /Finance payment recorder/i,
		})
		await expect(reopenedPanel).toContainText('previous partial')
		await expect(reopenedPanel).toContainText(partialProof)
		await expect(reopenedPanel).toContainText(`by ${financeEmployee.fullName}`)
		await expect(reopenedPanel).toContainText('waiting')
		await expect(reopenedPanel).toContainText(
			`Customer promised bank transfer ${fixture.runId}`,
		)
		await finance.page.getByRole('button', { name: /Close panel/i }).click()

		await financeRow(finance.page, fixture.fullOrder.customer.name)
			.getByRole('button', { name: /Record receipt/i })
			.click()
		const fullPanel = finance.page.getByRole('dialog', {
			name: /Finance payment recorder/i,
		})
		await fullPanel.getByRole('button', { name: /settle full/i }).click()
		const fullProof = `finance-in/customer-full-${fixture.runId}.pdf`
		await fullPanel
			.getByRole('textbox', { name: /Payment proof/i })
			.fill(fullProof)
		await fullPanel.getByRole('button', { name: /Review payment/i }).click()
		await expect(fullPanel).toContainText('Paid in full')
		await fullPanel.getByRole('button', { name: /^Record .* EGP$/i }).click()
		await expectCustomerPayments(service, {
			expectedAmountPaid: fixture.fullOrder.totalAmount,
			expectedCount: 1,
			expectedRemaining: 0,
			orderId: fixture.fullOrder.id,
			recordedByEmployeeId: financeEmployee.id,
		})
		await expectInventoryCleared(inventoryAuth.client, fixture.fullOrder.id)
		await expect(
			financeRow(finance.page, fixture.fullOrder.customer.name),
		).toHaveCount(0, {
			timeout: 20_000,
		})
		await finance.guard.expectClean('finance full customer payment')
	} finally {
		await finance.context.close()
	}

	const duplicateFull = await financeAuth.client.rpc(
		'record_customer_payment',
		{
			p_amount: 1,
			p_order_id: fixture.fullOrder.id,
			p_payment_fraction: 0.5,
			p_proof_path: `finance-in/duplicate-${fixture.runId}.pdf`,
		},
	)
	expect(duplicateFull.error?.message).toContain(
		'customer_payment_already_settled',
	)

	await Promise.all([
		financeAuth.client.auth.signOut({ scope: 'local' }),
		inventoryAuth.client.auth.signOut({ scope: 'local' }),
		salesAuth.client.auth.signOut({ scope: 'local' }),
	])
})

async function createFinanceInFixture(
	service: SupabaseClient,
): Promise<FinanceInFixture> {
	const runId = `finance-in-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
	const product = await createProduct(service, runId)
	const partialOrder = await createOrder(service, {
		customer: await createCustomer(service, runId, 'partial'),
		label: 'partial',
		product,
		quantity: 10,
		runId,
	})
	const fullOrder = await createOrder(service, {
		customer: await createCustomer(service, runId, 'full'),
		label: 'full',
		product,
		quantity: 8,
		runId,
	})
	const guardOrder = await createOrder(service, {
		customer: await createCustomer(service, runId, 'guard'),
		label: 'guard',
		product,
		quantity: 6,
		runId,
	})

	return { fullOrder, guardOrder, partialOrder, runId }
}

async function createCustomer(
	service: SupabaseClient,
	runId: string,
	label: string,
): Promise<CustomerFixture> {
	const { data, error } = await service
		.from('customers')
		.insert({
			company_name: `Flow Finance ${label} ${runId}`,
			contact_name: `Finance ${label}`,
			email: `flow-finance-${label}-${runId}@example.test`,
			phone: `+204${Date.now().toString().slice(-10)}${label.length}`,
			status: 'active',
		})
		.select('id, company_name')
		.single()
	if (error || !data) throw new Error(error?.message ?? 'Customer missing')
	return { id: String(data.id), name: String(data.company_name) }
}

async function createProduct(
	service: SupabaseClient,
	runId: string,
): Promise<ProductFixture> {
	const unit = 'bag'
	const unitAr = 'شيكارة'
	const unitPrice = 100
	const { data, error } = await service
		.from('products')
		.insert({
			availability_status: 'available',
			category: 'cement',
			description: `Final Flow finance customer payment product ${runId}`,
			description_ar: `منتج اختبار دفع العميل ${runId}`,
			image_urls: [],
			is_active: true,
			is_stockable: true,
			name: `Flow Finance Payment ${runId}`,
			name_ar: `اختبار دفع ${runId}`,
			price_range_max: unitPrice,
			price_range_min: unitPrice,
			sku: `FLOW-FINANCE-IN-${runId}`.toUpperCase(),
			slug: `flow-finance-in-${runId}`,
			specifications: { flow: 'finance-in' },
			specifications_ar: { flow: 'finance-in' },
			subcategory: 'cement',
			subcategory_ar: 'أسمنت',
			unit_of_measure: unit,
			unit_of_measure_ar: unitAr,
		})
		.select('id, name')
		.single()
	if (error || !data) throw new Error(error?.message ?? 'Product missing')
	return {
		id: String(data.id),
		name: String(data.name),
		unit,
		unitAr,
		unitPrice,
	}
}

async function createOrder(
	service: SupabaseClient,
	input: {
		customer: CustomerFixture
		label: string
		product: ProductFixture
		quantity: number
		runId: string
	},
): Promise<OrderFixture> {
	const deliveryDate = new Date(Date.now() + 5 * 86_400_000)
		.toISOString()
		.slice(0, 10)
	const { data: quoteRequest, error: quoteRequestError } = await service
		.from('quote_requests')
		.insert({
			customer_id: input.customer.id,
			delivery_date: deliveryDate,
			notes: `Final Flow finance IN ${input.label} ${input.runId}`,
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
			customer_id: input.customer.id,
			quote_request_id: quoteRequest.id,
			status: 'confirmed_for_inventory',
			total_amount: totalAmount,
		})
		.select('id, order_number')
		.single()
	if (orderError || !order) {
		throw new Error(orderError?.message ?? 'Order missing')
	}

	return {
		customer: input.customer,
		id: String(order.id),
		orderNumber: String(order.order_number),
		quantity: input.quantity,
		requestId: String(quoteRequest.id),
		requestNumber: String(quoteRequest.request_number),
		totalAmount,
	}
}

function financeRow(page: Page, customerName: string) {
	return page.locator('li').filter({ hasText: customerName }).first()
}

async function expectFinanceRow(page: Page, customerName: string) {
	await expect(financeRow(page, customerName)).toBeVisible({ timeout: 20_000 })
}

async function expectCustomerFollowUp(
	service: SupabaseClient,
	expected: {
		followUpState: string
		orderId: string
		recordedByEmployeeId: string
		runId: string
	},
) {
	const { data, error } = await service
		.from('finance_payment_followups')
		.select(
			'id, recorded_by_employee_id, contact_channel, outcome, notes, follow_up_state, follow_up_due_at, created_at',
		)
		.eq('target_type', 'customer_order')
		.eq('order_id', expected.orderId)
		.order('created_at', { ascending: false })
		.limit(1)
		.single()
	if (error || !data) throw new Error(error?.message ?? 'Follow-up missing')
	expect(data.recorded_by_employee_id).toBe(expected.recordedByEmployeeId)
	expect(data.contact_channel).toBe('phone')
	expect(data.follow_up_state).toBe(expected.followUpState)
	expect(String(data.outcome)).toContain(expected.runId)
	expect(String(data.notes)).toContain(expected.runId)
	expect(isIsoTimestamp(data.follow_up_due_at)).toBe(true)
	expect(isIsoTimestamp(data.created_at)).toBe(true)

	const activity = await latestActivity(service, {
		action: 'customer_payment_followup_recorded',
		entityId: expected.orderId,
		entityType: 'order',
	})
	expect(activity.actorEmployeeId).toBe(expected.recordedByEmployeeId)
	expect(String(activity.details.follow_up_state)).toBe(expected.followUpState)
}

async function expectCustomerPayments(
	service: SupabaseClient,
	expected: {
		expectedAmountPaid: number
		expectedCount: number
		expectedRemaining: number
		orderId: string
		recordedByEmployeeId: string
	},
) {
	await expect
		.poll(
			async () => {
				const { data, error } = await service
					.from('customer_payments')
					.select('amount, recorded_by_employee_id, status')
					.eq('order_id', expected.orderId)
					.eq('status', 'recorded')
				if (error) return `error:${error.message}`
				const amount = (data ?? []).reduce(
					(sum, payment) => sum + Number(payment.amount),
					0,
				)
				const wrongRecorder = (data ?? []).some(
					(payment) =>
						payment.recorded_by_employee_id !== expected.recordedByEmployeeId,
				)
				return `${data?.length ?? 0}:${amount}:${wrongRecorder ? 'wrong' : 'ok'}`
			},
			{ timeout: 30_000 },
		)
		.toBe(`${expected.expectedCount}:${expected.expectedAmountPaid}:ok`)

	const { data: order, error: orderError } = await service
		.from('orders')
		.select('total_amount')
		.eq('id', expected.orderId)
		.single()
	if (orderError || !order)
		throw new Error(orderError?.message ?? 'Order missing')
	expect(
		Math.max(0, Number(order.total_amount) - expected.expectedAmountPaid),
	).toBe(expected.expectedRemaining)

	const activity = await latestActivity(service, {
		action: 'customer_payment_recorded',
		entityId: expected.orderId,
		entityType: 'order',
	})
	expect(activity.actorEmployeeId).toBe(expected.recordedByEmployeeId)
	expect(String(activity.details.employee_id)).toBe(
		expected.recordedByEmployeeId,
	)
	expect(Number(activity.details.remaining_amount)).toBe(
		expected.expectedRemaining,
	)
}

async function expectInventoryCleared(
	inventoryClient: SupabaseClient,
	orderId: string,
) {
	const { data, error } = await inventoryClient.rpc(
		'inventory_finance_cleared_order_ids',
		{ p_order_ids: [orderId] },
	)
	expect(error).toBeNull()
	expect((data ?? []).map((row) => String(row.order_id))).toContain(orderId)
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

async function employeeByEmail(service: SupabaseClient, email: string) {
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function isIsoTimestamp(value: unknown) {
	if (typeof value !== 'string') return false
	return !Number.isNaN(Date.parse(value))
}

function futureLocalDateTime() {
	const due = new Date(Date.now() + 2 * 86_400_000)
	due.setMinutes(0, 0, 0)
	const offsetMs = due.getTimezoneOffset() * 60_000
	return new Date(due.getTime() - offsetMs).toISOString().slice(0, 16)
}

function formatDecimalEgp(value: number) {
	return value.toLocaleString('en-EG', {
		maximumFractionDigits: 2,
		minimumFractionDigits: 2,
	})
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
