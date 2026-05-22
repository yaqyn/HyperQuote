import { spawnSync } from 'node:child_process'
import { expect, type Page, test } from '@playwright/test'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { createActorFlowClient } from './flow-test-rpc'

interface LocalSupabaseEnv {
	anonKey: string
	apiUrl: string
	serviceRoleKey: string
}

interface SupabaseCookieToSet {
	name: string
	options?: { maxAge?: number }
	value: string
}

const DEFAULT_PASSWORD = ['hyperquote', 'local', 'only', '2026'].join('-')
const INTERNAL_COOKIE = 'hyperquote_internal_auth'
const URLS = {
	internal: process.env.FLOW_INTERNAL_URL ?? 'http://localhost:3002',
}
const ACCOUNTS = {
	ceo: {
		email: 'local-ceo@hyperquote.local',
		password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
	},
	customer: {
		email: 'local-customer@hyperquote.local',
		password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
	},
	sales: {
		email: 'local-sales@hyperquote.local',
		password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
	},
}

const SUMMARY_VIEWS = [
	'ceo_order_summary',
	'ceo_quote_request_summary',
	'ceo_customer_summary',
	'ceo_finance_summary',
	'ceo_inventory_summary',
	'ceo_warehouse_summary',
	'ceo_dispatch_summary',
	'ceo_driver_summary',
	'ceo_support_summary',
	'ceo_supplier_summary',
	'ceo_employee_summary',
	'ceo_activity_summary',
] as const

const SEARCH_VTABLES = [
	'ceo_search_order_vtable',
	'ceo_search_quote_request_vtable',
	'ceo_search_warehouse_vtable',
	'ceo_search_receiving_vtable',
] as const

test('CEO Search reads summary views, links to source panels, and stays read-only', async ({
	browser,
}) => {
	test.setTimeout(240_000)
	const env = readLocalSupabaseEnv()
	const ceoClient = await createAuthenticatedClient(env, ACCOUNTS.ceo)
	const salesClient = await createAuthenticatedClient(env, ACCOUNTS.sales)
	const customerClient = await createAuthenticatedClient(env, ACCOUNTS.customer)
	const service = createLocalServiceClient(env)
	await ensureSearchSupportFixture(service)
	const auditStartedAt = new Date().toISOString()

	const ceoAccess = await ceoClient.rpc('can_access_ceo_search')
	expect(ceoAccess.error).toBeNull()
	expect(ceoAccess.data).toBe(true)

	const salesAccess = await salesClient.rpc('can_access_ceo_search')
	expect(salesAccess.error).toBeNull()
	expect(salesAccess.data).toBe(false)

	for (const view of SUMMARY_VIEWS) {
		const { count, error } = await service
			.from(view)
			.select('*', { count: 'exact', head: true })
		expect(error, `${view} CEO read`).toBeNull()
		expect(count ?? 0, `${view} should have final-flow data`).toBeGreaterThan(0)
	}

	for (const view of SEARCH_VTABLES) {
		const { count, error } = await service
			.from(view)
			.select('*', { count: 'exact', head: true })
		expect(error, `${view} CEO read`).toBeNull()
		expect(
			count ?? 0,
			`${view} should have searchable business rows`,
		).toBeGreaterThan(0)
	}

	for (const searchCase of [
		{ label: 'product names', tokens: ['wood'] },
		{ label: 'human dates', tokens: ['20', 'may'] },
		{ label: 'customer/address words', tokens: ['local', 'cairo'] },
		{ label: 'document codes', tokens: ['2026'] },
	]) {
		let request = service
			.from('ceo_search_index')
			.select('entity_type, title, metadata, search_text')
			.limit(5)
		for (const token of searchCase.tokens) {
			request = request.ilike('search_text', `%${token}%`)
		}
		const { data, error } = await request
		expect(error, `${searchCase.label} search`).toBeNull()
		expect(
			data ?? [],
			`${searchCase.label} search should find rich business data`,
		).not.toHaveLength(0)
	}

	const salesSearchRead = await salesClient
		.from('ceo_search_index')
		.select('entity_type')
		.limit(1)
	expect(salesSearchRead.error?.message).toContain(
		'permission denied for schema public',
	)

	const customerSearchRead = await customerClient
		.from('ceo_search_index')
		.select('entity_type')
		.limit(1)
	expect(customerSearchRead.error?.message).toContain(
		'permission denied for schema public',
	)

	const salesCompensationRead = await salesClient
		.from('employee_compensation')
		.select('employee_id')
		.limit(1)
	expect(salesCompensationRead.error?.message).toContain(
		'permission denied for schema public',
	)

	const salesAuditDenied = await salesClient.rpc(
		'record_search_query_executed',
		{
			p_context: { source: 'wrong-role-test' },
			p_query: 'blocked search',
			p_result_count: 0,
			p_table_count: 0,
		},
	)
	expect(salesAuditDenied.error?.message).toContain(
		'permission denied for schema public',
	)

	const customerSearchAiDenied = await customerClient.rpc(
		'record_ai_tool_call',
		{
			p_agent_scope: 'search',
			p_approved_by_user: false,
			p_input_summary: { query: 'blocked' },
			p_output_summary: {},
			p_read_entities: ['ceo_search_index'],
			p_tool_name: 'ceo_search_query',
			p_write_entity_id: null,
			p_write_entity_type: null,
		},
	)
	expect(customerSearchAiDenied.error?.message).toMatch(
		/employee_required_for_ai|ceo_required_for_search_ai/,
	)

	const searchWriteDenied = await ceoClient.rpc('record_ai_tool_call', {
		p_agent_scope: 'search',
		p_approved_by_user: true,
		p_input_summary: { query: 'try to write from search' },
		p_output_summary: {},
		p_read_entities: ['ceo_search_index'],
		p_tool_name: 'ceo_search_write_attempt',
		p_write_entity_id: crypto.randomUUID(),
		p_write_entity_type: 'orders',
	})
	expect(searchWriteDenied.error?.message).toContain('search_ai_is_read_only')

	const context = await browser.newContext({
		viewport: { height: 1000, width: 1400 },
	})
	await context.addCookies(
		await createAuthCookies(ACCOUNTS.ceo, INTERNAL_COOKIE, URLS.internal, env),
	)
	const page = await context.newPage()
	const guard = installBrowserErrorGuard(page)
	await page.goto(URLS.internal, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await page.getByRole('button', { name: /^Search$/i }).click()
	const searchInput = page.getByLabel('Search internal database')
	await expect(searchInput).toBeVisible({ timeout: 20_000 })
	for (const label of [
		'Sales',
		'Inventory',
		'Warehouse',
		'Finance',
		'Dispatch',
		'Customer service',
	]) {
		await expect(page.locator('body')).toContainText(label)
	}

	await page.getByRole('button', { name: /Open activity feed/i }).click()
	await expect(page.locator('body')).toContainText('All activity', {
		timeout: 20_000,
	})
	await expect(page.locator('body')).toContainText('Procurement')
	await expect(page.locator('body')).toContainText('Admin')
	await expect(page.locator('body')).toContainText(/May 2026|2026|AM|PM/i)
	await page.getByRole('button', { name: /^Back$/i }).click()

	const salesSummaryButton = page
		.locator('button')
		.filter({ hasText: 'Sales' })
		.filter({ hasText: 'Submitted orders' })
		.first()
	await expect(salesSummaryButton).toBeVisible({ timeout: 15_000 })
	await salesSummaryButton.click()
	await expect(page.locator('body')).toContainText('Orders')
	await expect(page.locator('body')).toContainText('Submitted orders')
	await expect(page.locator('body')).toContainText('Accepted orders')
	await page.getByRole('button', { name: /^Back$/i }).click()

	await searchInput.fill('Local Cairo')
	await expect(page.locator('body')).toContainText('Local Cairo Contractors', {
		timeout: 20_000,
	})
	await expect(page.locator('body')).toContainText('Customers')
	await page
		.locator('button')
		.filter({ hasText: 'Local Cairo Contractors' })
		.filter({ hasText: 'Customers' })
		.first()
		.click()
	await expect(
		page.getByRole('dialog', { name: /Local Cairo Contractors details/i }),
	).toBeVisible({ timeout: 15_000 })
	await page.getByRole('button', { name: /^Open Sales$/i }).click()
	await expect(page.getByRole('button', { name: /^Sales$/i })).toBeVisible({
		timeout: 15_000,
	})
	await guard.expectClean('internal CEO search browser')
	await context.close()

	const { count: searchActivityCount, error: searchActivityError } =
		await service
			.from('activity_events')
			.select('id', { count: 'exact', head: true })
			.eq('action', 'search_query_executed')
			.gte('created_at', auditStartedAt)
	expect(searchActivityError).toBeNull()
	expect(searchActivityCount ?? 0).toBe(0)

	const salesContext = await browser.newContext({
		viewport: { height: 900, width: 1280 },
	})
	await salesContext.addCookies(
		await createAuthCookies(
			ACCOUNTS.sales,
			INTERNAL_COOKIE,
			URLS.internal,
			env,
		),
	)
	const salesPage = await salesContext.newPage()
	const salesGuard = installBrowserErrorGuard(salesPage)
	await salesPage.goto(URLS.internal, { waitUntil: 'domcontentloaded' })
	await waitForHydration(salesPage)
	await expect(
		salesPage.getByRole('button', { name: /^Search$/i }),
	).not.toBeVisible()
	await salesGuard.expectClean('internal non-search employee browser')
	await salesContext.close()
})

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
		const url = request.url()
		if (errorText.includes('ERR_ABORTED')) return
		if (
			url.startsWith('https://fonts.googleapis.com/') ||
			url.startsWith('https://fonts.gstatic.com/')
		) {
			return
		}
		browserErrors.push(`${request.method()} ${url} ${errorText}`)
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

function createLocalServiceClient(env = readLocalSupabaseEnv()) {
	return createClient(env.apiUrl, env.serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	})
}

async function ensureSearchSupportFixture(
	service: ReturnType<typeof createLocalServiceClient>,
) {
	const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
	const { data: customer, error: customerError } = await service
		.from('customers')
		.select('id, company_name, contact_name, email, phone')
		.eq('email', ACCOUNTS.customer.email)
		.single()
	if (customerError || !customer) {
		throw new Error(customerError?.message ?? 'Search customer missing')
	}

	const { data: ticket, error: ticketError } = await service
		.from('support_tickets')
		.insert({
			customer_id: customer.id,
			requester_email: customer.email,
			requester_name: customer.contact_name ?? customer.company_name,
			requester_phone: customer.phone,
			source: 'portal',
			status: 'open',
			subject: `Flow search support ${runId}`,
		})
		.select('id')
		.single()
	if (ticketError || !ticket) {
		throw new Error(ticketError?.message ?? 'Search support ticket missing')
	}

	const { error: activityError } = await service
		.from('activity_events')
		.insert({
			action: 'support_ticket_created',
			details: { run_id: runId, source: 'flow-internal-search-final' },
			entity_id: ticket.id,
			entity_type: 'support_ticket',
		})
	if (activityError) throw new Error(activityError.message)

	const { data: product, error: productError } = await service
		.from('products')
		.select('id')
		.eq('is_active', true)
		.limit(1)
		.single()
	if (productError || !product) {
		throw new Error(productError?.message ?? 'Search product missing')
	}
	const { data: supplier, error: supplierError } = await service
		.from('suppliers')
		.select('id')
		.eq('status', 'active')
		.limit(1)
		.single()
	if (supplierError || !supplier) {
		throw new Error(supplierError?.message ?? 'Search supplier missing')
	}
	const { data: advisor, error: advisorError } = await service
		.from('employees')
		.select('id')
		.eq('email', 'local-warehouse@hyperquote.local')
		.single()
	if (advisorError || !advisor) {
		throw new Error(advisorError?.message ?? 'Search advisor missing')
	}

	const { data: refill, error: refillError } = await service
		.from('refill_requests')
		.insert({
			product_id: product.id,
			proof: { source: 'flow-internal-search-final' },
			quantity: 1,
			requested_by_employee_id: advisor.id,
			status: 'warehouse_receiving',
			supplier_id: supplier.id,
			unit_cost: 1,
		})
		.select('id')
		.single()
	if (refillError || !refill) {
		throw new Error(refillError?.message ?? 'Search refill missing')
	}
	const { error: receivingError } = await service
		.from('receiving_tasks')
		.insert({
			advisor_employee_id: advisor.id,
			refill_request_id: refill.id,
			status: 'pending',
		})
	if (receivingError) throw new Error(receivingError.message)
}

async function createAuthenticatedClient(
	env: LocalSupabaseEnv,
	account: { email: string; password: string },
) {
	const client = createClient(env.apiUrl, env.anonKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	})
	const { data, error } = await client.auth.signInWithPassword(account)
	if (error)
		throw new Error(`Could not sign in ${account.email}: ${error.message}`)
	return createActorFlowClient(client, createLocalServiceClient(env), {
		actorPool: account.email.includes('customer') ? 'external' : 'internal',
		actorUserId: data.user.id,
	})
}

async function createAuthCookies(
	account: { email: string; password: string },
	cookieName: string,
	url: string,
	env: LocalSupabaseEnv,
) {
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

	const parsed: Record<string, string> = {}
	for (const line of result.stdout.split('\n')) {
		const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
		if (!match) continue
		parsed[match[1]] = stripEnvQuotes(match[2])
	}

	const apiUrl = parsed.API_URL
	const anonKey = parsed.ANON_KEY
	const serviceRoleKey = parsed.SERVICE_ROLE_KEY
	if (!apiUrl || !anonKey || !serviceRoleKey) {
		throw new Error('Could not read local Supabase URL/API keys.')
	}
	return { anonKey, apiUrl, serviceRoleKey }
}

function stripEnvQuotes(value: string) {
	if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1)
	return value
}
