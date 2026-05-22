import { spawnSync } from 'node:child_process'
import { type Browser, expect, type Page, test } from '@playwright/test'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { createActorFlowClient, type FlowActorPool } from './flow-test-rpc'

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

interface ProductRow {
	id: string
	name: string
	unit_of_measure: string
	unit_of_measure_ar: string
}

interface CustomerFixture {
	client: ReturnType<typeof createClient>
	customerId: string
	email: string
	password: string
}

interface QuoteFixture {
	id: string
	orderId?: string
	productName: string
	reference: string
}

const DEFAULT_PASSWORD = ['hyperquote', 'local', 'only', '2026'].join('-')

const URLS = {
	portal: process.env.FLOW_PORTAL_URL ?? 'http://localhost:3001',
}

const LOCAL_CUSTOMER = {
	email: 'local-customer@hyperquote.local',
	password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
}

const LOCAL_EMPLOYEE = {
	email: 'local-admin@hyperquote.local',
	password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
}

const PORTAL_COOKIE = 'hyperquote_customer_auth'

test('portal customer cannot access or mutate another customer drafts and orders', async ({
	browser,
}) => {
	test.setTimeout(180_000)
	const env = readLocalSupabaseEnv()
	const service = createLocalServiceClient(env)
	const product = await firstProduct(service)
	const otherCustomer = await createSecondaryCustomer(env, service)
	const localCustomer = await signInLocal(env, LOCAL_CUSTOMER)
	const otherDraft = await createCustomerDraft(
		otherCustomer.client,
		service,
		otherCustomer.customerId,
		product,
		'draft',
	)
	const otherSubmitted = await createCustomerDraft(
		otherCustomer.client,
		service,
		otherCustomer.customerId,
		product,
		'submitted',
	)
	const otherConfirmed = await createCustomerDraft(
		otherCustomer.client,
		service,
		otherCustomer.customerId,
		product,
		'confirmed',
	)
	await confirmQuoteRequest(env, otherConfirmed.id)
	const confirmedOrderId = await expectConfirmedOrder(
		service,
		otherConfirmed.id,
	)
	otherConfirmed.orderId = confirmedOrderId

	await expectDirectCrossCustomerDenials({
		attackerClient: localCustomer.client,
		ownerCustomerId: otherCustomer.customerId,
		service,
		targetDraft: otherDraft,
		targetOrder: otherConfirmed,
	})

	const portal = await openPortalAsLocalCustomer(browser)
	try {
		await expectPortalDetailDenied(portal.page, otherSubmitted)
		await expectPortalDetailDenied(portal.page, otherConfirmed)
		await expectPortalEditDenied(portal.page, otherDraft)
		await portal.guard.expectClean('portal cross-customer denial')
	} finally {
		await portal.context.close()
	}
})

async function expectDirectCrossCustomerDenials({
	attackerClient,
	ownerCustomerId,
	service,
	targetDraft,
	targetOrder,
}: {
	attackerClient: ReturnType<typeof createClient>
	ownerCustomerId: string
	service: ReturnType<typeof createLocalServiceClient>
	targetDraft: QuoteFixture
	targetOrder: QuoteFixture
}) {
	const quoteRead = await attackerClient
		.from('quote_requests')
		.select('id')
		.eq('id', targetDraft.id)
	expect(quoteRead.error?.message).toContain(
		'permission denied for schema public',
	)

	const orderRead = await attackerClient
		.from('orders')
		.select('id')
		.eq('id', targetOrder.orderId)
	expect(orderRead.error?.message).toContain(
		'permission denied for schema public',
	)

	const hackedNotes = `cross-customer edit ${Date.now()}`
	const updateAttempt = await attackerClient
		.from('quote_requests')
		.update({ notes: hackedNotes })
		.eq('id', targetDraft.id)
		.select('id')
	expect(updateAttempt.error?.message).toContain(
		'permission denied for schema public',
	)
	await expectQuoteNotesUnchanged(service, targetDraft.id, hackedNotes)

	const deleteAttempt = await attackerClient
		.from('quote_requests')
		.delete()
		.eq('id', targetDraft.id)
		.select('id')
	expect(deleteAttempt.error?.message).toContain(
		'permission denied for schema public',
	)
	await expectQuoteRequestExists(service, targetDraft.id)

	const submitAttempt = await attackerClient.rpc(
		'customer_submit_saved_quote_request',
		{ p_quote_request_id: targetDraft.id, p_source: 'portal' },
	)
	expect(submitAttempt.error?.message).toContain(
		'quote_request_not_found_or_not_draft',
	)
	await expectQuoteRequestStatus(service, targetDraft.id, 'draft')

	const crossCreateAttempt = await attackerClient
		.from('quote_requests')
		.insert({
			customer_id: ownerCustomerId,
			notes: 'cross-customer create from another customer order',
		})
		.select('id')
	expect(crossCreateAttempt.error).toBeTruthy()
}

async function expectPortalDetailDenied(page: Page, target: QuoteFixture) {
	const id = target.orderId ?? target.id
	await page.goto(`${URLS.portal}/orders/${id}`, {
		waitUntil: 'domcontentloaded',
	})
	await waitForHydration(page)
	await expect(page.locator('body')).not.toContainText(target.reference)
	await expect(page.locator('body')).not.toContainText(target.productName)
	await expect(page.locator('body')).toContainText(/retry|orders|error/i)
}

async function expectPortalEditDenied(page: Page, target: QuoteFixture) {
	await page.goto(`${URLS.portal}/orders/edit/${target.id}`, {
		waitUntil: 'domcontentloaded',
	})
	await waitForHydration(page)
	await expect(page.locator('body')).not.toContainText(target.reference)
	await expect(page.locator('body')).not.toContainText(target.productName)
	await expect(page.locator('body')).toContainText(/orders|error|back/i)
}

async function openPortalAsLocalCustomer(browser: Browser) {
	const context = await browser.newContext({
		viewport: { height: 1000, width: 1440 },
	})
	await context.addCookies(
		await createAuthCookies(LOCAL_CUSTOMER, PORTAL_COOKIE, URLS.portal),
	)
	const page = await context.newPage()
	const guard = installBrowserErrorGuard(page)
	await page.goto(`${URLS.portal}/orders`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await expect(page).not.toHaveURL(/\/login/)
	return { context, guard, page }
}

async function createSecondaryCustomer(
	env: LocalSupabaseEnv,
	service: ReturnType<typeof createLocalServiceClient>,
): Promise<CustomerFixture> {
	const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
	const email = `flow-cross-${stamp}@hyperquote.local`
	const password = `Flow-cross-${stamp}-123456`
	const phone = `+201${String(Date.now()).slice(-9)}`
	const { data: user, error: createUserError } =
		await service.auth.admin.createUser({
			app_metadata: { pool: 'external', roles: ['customer'] },
			email,
			email_confirm: true,
			password,
			phone,
			user_metadata: {
				company_name: `Flow Cross ${stamp}`,
				name: 'Flow Cross Customer',
				phone,
			},
		})
	if (createUserError || !user.user) {
		throw new Error(
			createUserError?.message ?? 'Failed to create customer user',
		)
	}

	const { data: customer, error: customerError } = await service
		.from('customers')
		.insert({
			company_name: `Flow Cross ${stamp}`,
			contact_name: 'Flow Cross Customer',
			email,
			phone,
			user_id: user.user.id,
		})
		.select('id')
		.single()
	if (customerError || !customer) {
		throw new Error(customerError?.message ?? 'Failed to create customer row')
	}

	const { error: updateError } = await service.auth.admin.updateUserById(
		user.user.id,
		{
			app_metadata: {
				customer_id: customer.id,
				pool: 'external',
				roles: ['customer'],
			},
		},
	)
	if (updateError) throw new Error(updateError.message)

	const signedIn = await signInLocal(env, { email, password })
	return {
		client: signedIn.client,
		customerId: customer.id,
		email,
		password,
	}
}

async function createCustomerDraft(
	customerClient: ReturnType<typeof createClient>,
	service: ReturnType<typeof createLocalServiceClient>,
	customerId: string,
	product: ProductRow,
	variant: 'confirmed' | 'draft' | 'submitted',
): Promise<QuoteFixture> {
	const { data: draft, error: draftError } = await service
		.from('quote_requests')
		.insert({
			customer_id: customerId,
			notes: `flow-cross-customer:${variant}:${Date.now()}`,
		})
		.select('id, request_number')
		.single()
	if (draftError || !draft) {
		throw new Error(draftError?.message ?? 'Failed to create cross draft')
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
	if (itemError) throw new Error(itemError.message)

	if (variant !== 'draft') {
		const { error: submitError } = await customerClient.rpc(
			'customer_submit_saved_quote_request',
			{ p_quote_request_id: draft.id, p_source: 'portal' },
		)
		if (submitError) throw new Error(submitError.message)
	}

	return {
		id: draft.id,
		productName: product.name,
		reference: draft.request_number,
	}
}

async function confirmQuoteRequest(
	env: LocalSupabaseEnv,
	quoteRequestId: string,
) {
	const employee = await signInLocal(env, LOCAL_EMPLOYEE, 'internal')
	const { error } = await employee.client.rpc('sales_confirm_order', {
		p_order_id: quoteRequestId,
		p_quote_version_id: null,
	})
	if (error) throw new Error(error.message)
}

async function expectConfirmedOrder(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
) {
	const { data, error } = await service
		.from('orders')
		.select('id, status')
		.eq('quote_request_id', quoteRequestId)
		.single()
	if (error || !data)
		throw new Error(error?.message ?? 'Confirmed order missing')
	expect(data.status).toBe('confirmed_for_inventory')
	return String(data.id)
}

async function expectQuoteNotesUnchanged(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
	notes: string,
) {
	const { data, error } = await service
		.from('quote_requests')
		.select('notes')
		.eq('id', quoteRequestId)
		.single()
	if (error || !data) throw new Error(error?.message ?? 'Quote request missing')
	expect(data.notes).not.toBe(notes)
}

async function expectQuoteRequestExists(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
) {
	const { data, error } = await service
		.from('quote_requests')
		.select('id')
		.eq('id', quoteRequestId)
		.single()
	if (error || !data) throw new Error(error?.message ?? 'Quote request missing')
}

async function expectQuoteRequestStatus(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
	status: string,
) {
	const { data, error } = await service
		.from('quote_requests')
		.select('status')
		.eq('id', quoteRequestId)
		.single()
	if (error || !data) throw new Error(error?.message ?? 'Quote request missing')
	expect(data.status).toBe(status)
}

async function firstProduct(
	service: ReturnType<typeof createLocalServiceClient>,
) {
	const { data, error } = await service
		.from('products')
		.select('id, name, unit_of_measure, unit_of_measure_ar')
		.eq('is_active', true)
		.neq('availability_status', 'hidden')
		.limit(1)
		.single()
	if (error || !data) throw new Error(error?.message ?? 'Product missing')
	return data as ProductRow
}

async function signInLocal(
	env: LocalSupabaseEnv,
	account: { email: string; password: string },
	actorPool: FlowActorPool = 'external',
) {
	const client = createClient(env.apiUrl, env.anonKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	})
	const { data, error } = await client.auth.signInWithPassword(account)
	if (error)
		throw new Error(`Could not sign in ${account.email}: ${error.message}`)
	return {
		client: createActorFlowClient(client, createLocalServiceClient(env), {
			actorPool,
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
