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

interface RoleAccount {
	allowedPanels: string[]
	email: string
	fullName: string
	panelPermissions: string[]
	role: string
}

const DEFAULT_PASSWORD = ['hyperquote', 'local', 'only', '2026'].join('-')

const URLS = {
	driver: process.env.FLOW_DRIVER_URL ?? 'http://localhost:3003',
	internal: process.env.FLOW_INTERNAL_URL ?? 'http://localhost:3002',
	portal: process.env.FLOW_PORTAL_URL ?? 'http://localhost:3001',
	website: process.env.FLOW_WEBSITE_URL ?? 'http://localhost:3000',
}

const PASSWORD = process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD
const DRIVER_PASSWORD =
	process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD

const COOKIE_NAMES = {
	customer: 'hyperquote_customer_auth',
	driver: 'hyperquote_driver_auth',
	internal: 'hyperquote_internal_auth',
}

const ALL_PANEL_LABELS = [
	'Sales',
	'Inventory',
	'Warehouse',
	'Finance',
	'Dispatch',
	'Customer Service',
	'Admin',
	'Search',
]

const ALL_PANEL_PERMISSIONS = [
	'sales',
	'inventory',
	'warehouse',
	'finance',
	'dispatch',
	'customer_service',
	'admin',
	'search',
]

const ROLE_ACCOUNTS: RoleAccount[] = [
	{
		allowedPanels: ALL_PANEL_LABELS,
		email: 'local-panel-admin@hyperquote.local',
		fullName: 'Local Panel Admin',
		panelPermissions: ALL_PANEL_PERMISSIONS,
		role: 'admin',
	},
	{
		allowedPanels: ['Sales'],
		email: 'local-sales@hyperquote.local',
		fullName: 'Local Sales',
		panelPermissions: ['sales'],
		role: 'sales',
	},
	{
		allowedPanels: ['Inventory'],
		email: 'local-inventory@hyperquote.local',
		fullName: 'Local Inventory',
		panelPermissions: ['inventory'],
		role: 'inventory',
	},
	{
		allowedPanels: ['Warehouse'],
		email: 'local-warehouse@hyperquote.local',
		fullName: 'Local Warehouse',
		panelPermissions: ['warehouse'],
		role: 'warehouse',
	},
	{
		allowedPanels: ['Finance'],
		email: 'local-finance@hyperquote.local',
		fullName: 'Local Finance',
		panelPermissions: ['finance'],
		role: 'finance',
	},
	{
		allowedPanels: ['Dispatch'],
		email: 'local-dispatch@hyperquote.local',
		fullName: 'Local Dispatch',
		panelPermissions: ['dispatch'],
		role: 'dispatch',
	},
	{
		allowedPanels: ['Customer Service'],
		email: 'local-customer-service@hyperquote.local',
		fullName: 'Local Customer Service',
		panelPermissions: ['customer_service'],
		role: 'customer_service',
	},
	{
		allowedPanels: ALL_PANEL_LABELS,
		email: 'local-ceo@hyperquote.local',
		fullName: 'Local CEO',
		panelPermissions: ALL_PANEL_PERMISSIONS,
		role: 'ceo',
	},
]

test.describe.configure({ mode: 'serial' })

test('internal role accounts sign in and see only assigned panels', async ({
	browser,
}) => {
	test.setTimeout(240_000)
	const service = createLocalServiceClient()
	await expectSeededInternalActors(service)

	for (const account of ROLE_ACCOUNTS) {
		const context = await browser.newContext({
			viewport: { height: 1000, width: 1440 },
		})
		const page = await context.newPage()
		const guard = installBrowserErrorGuard(page)
		await signInInternal(page, account.email)
		await expect(page.locator('body')).toContainText(/modules|Panels/i, {
			timeout: 15_000,
		})
		await expectPanelVisibility(page, account.allowedPanels)

		for (const panel of account.allowedPanels) {
			await openPanel(page, panel)
			await expectOpenPanel(page, panel)
			await closePanel(page, panel)
		}

		await guard.expectClean(`internal role panels ${account.role}`)
		await context.close()
	}
})

test('internal panel permissions are enforced server-side', async () => {
	const env = readLocalSupabaseEnv()

	for (const account of ROLE_ACCOUNTS) {
		const client = await signInLocal(env, account.email)
		for (const panel of ALL_PANEL_PERMISSIONS) {
			const allowed = account.panelPermissions.includes(panel)
			const { data, error } = await client.rpc('can_access_panel', {
				required_panel: panel,
				write_required: true,
			})
			expect(error, `${account.role} can_access_panel ${panel}`).toBeNull()
			expect(Boolean(data), `${account.role} can_access_panel ${panel}`).toBe(
				allowed,
			)

			const requireAttempt = await client.rpc('require_panel', {
				required_panel: panel,
				write_required: true,
			})
			if (allowed) {
				expect(
					requireAttempt.error,
					`${account.role} require_panel ${panel}`,
				).toBeNull()
				expect(requireAttempt.data).toBeTruthy()
			} else {
				expect(
					requireAttempt.error?.message,
					`${account.role} require_panel ${panel}`,
				).toContain(`insufficient_${panel}_permission`)
			}
		}
	}

	const salesClient = await signInLocal(env, 'local-sales@hyperquote.local')
	const blockedFinanceRead = await salesClient
		.from('customer_payments')
		.select('id')
		.limit(1)
	expect(blockedFinanceRead.error?.message).toContain(
		'permission denied for schema public',
	)

	const customerClient = await signInLocal(
		env,
		'local-customer@hyperquote.local',
	)
	const blockedEmployeeRead = await customerClient
		.from('employees')
		.select('id')
		.limit(1)
	expect(blockedEmployeeRead.error?.message).toContain(
		'permission denied for schema public',
	)

	const randomUuid = '00000000-0000-4000-8000-000000000001'
	const wrongRoleRpc = await salesClient.rpc('record_customer_payment', {
		p_amount: 1,
		p_order_id: randomUuid,
		p_payment_fraction: 1,
		p_proof_path: 'wrong-role-proof',
	})
	expect(wrongRoleRpc.error?.message).toContain(
		'insufficient_finance_permission',
	)
})

test('internal users cannot self-signup or enter customer and driver apps', async ({
	browser,
}) => {
	test.setTimeout(180_000)
	const env = readLocalSupabaseEnv()
	const service = createLocalServiceClient(env)
	const internalAccount = {
		email: 'local-sales@hyperquote.local',
		password: PASSWORD,
	}
	const driverAccount = {
		email: 'local-driver@hyperquote.local',
		password: DRIVER_PASSWORD,
	}

	const internalClient = await signInLocal(env, internalAccount.email)
	const {
		data: { user: internalUser },
	} = await internalClient.auth.getUser()
	expect(internalUser?.app_metadata?.pool).toBe('internal')

	const beforeWrongPoolCustomer = await customerCountForUser(
		service,
		internalUser?.id,
	)

	const website = await browser.newPage()
	const websiteGuard = installBrowserErrorGuard(website)
	await attemptWebsiteCustomerEmailSignIn(
		website,
		internalAccount.email,
		internalAccount.password,
	)
	await expect(website.getByRole('alert')).toBeVisible({ timeout: 15_000 })
	await expect(website).toHaveURL(/\/login/)
	await expect(website.getByLabel(/company/i)).toHaveCount(0)
	await websiteGuard.expectClean('website rejects internal email auth')
	await website.close()

	const portal = await browser.newPage()
	const portalGuard = installBrowserErrorGuard(portal)
	await attemptPortalCustomerEmailSignIn(
		portal,
		internalAccount.email,
		internalAccount.password,
	)
	await expect(portal.getByRole('alert')).toBeVisible({ timeout: 15_000 })
	await expect(portal).toHaveURL(/\/login/)
	await expect(portal.getByLabel(/company/i)).toHaveCount(0)
	await portalGuard.expectClean('portal rejects internal email auth')
	await portal.close()

	const driver = await browser.newPage()
	const driverGuard = installBrowserErrorGuard(driver)
	await attemptDriverSignIn(
		driver,
		internalAccount.email,
		internalAccount.password,
	)
	await expect(driver.locator('body')).not.toContainText(/Local Sales/i)
	await expect(driver.locator('body')).toContainText(/not assigned|driver app/i)
	await driverGuard.expectClean('driver rejects internal email auth')
	await driver.close()

	const driverWebsite = await browser.newPage()
	const driverWebsiteGuard = installBrowserErrorGuard(driverWebsite)
	await attemptWebsiteCustomerEmailSignIn(
		driverWebsite,
		driverAccount.email,
		driverAccount.password,
	)
	await expect(driverWebsite.getByRole('alert')).toBeVisible({
		timeout: 15_000,
	})
	await expect(driverWebsite).toHaveURL(/\/login/)
	await driverWebsiteGuard.expectClean('website rejects driver email auth')
	await driverWebsite.close()

	const crossContext = await browser.newContext({
		viewport: { height: 1000, width: 1440 },
	})
	await crossContext.addCookies([
		...(await createAuthCookies(
			env,
			internalAccount,
			COOKIE_NAMES.customer,
			URLS.portal,
		)),
		...(await createAuthCookies(
			env,
			internalAccount,
			COOKIE_NAMES.driver,
			URLS.driver,
		)),
	])
	const crossPage = await crossContext.newPage()
	const crossGuard = installBrowserErrorGuard(crossPage)
	await crossPage.goto(`${URLS.portal}/market`, {
		waitUntil: 'domcontentloaded',
	})
	await waitForHydration(crossPage)
	await expect(crossPage.locator('body')).toContainText(/portal access/i)
	await expect(crossPage.locator('body')).not.toContainText(/Portland Cement/i)
	await crossPage.goto(URLS.driver, { waitUntil: 'domcontentloaded' })
	await waitForHydration(crossPage)
	await expect(crossPage.locator('body')).not.toContainText(/Local Sales/i)
	await expect(crossPage.getByLabel(/email/i)).toBeVisible({ timeout: 15_000 })
	await crossGuard.expectClean(
		'wrong-pool cookies cannot enter portal or driver',
	)
	await crossContext.close()

	await expect
		.poll(() => customerCountForUser(service, internalUser?.id), {
			timeout: 10_000,
		})
		.toBe(beforeWrongPoolCustomer)
})

async function signInInternal(page: Page, email: string) {
	await page.goto(`${URLS.internal}/login`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await page.locator('#internal-login-email').fill(email)
	await page.locator('#internal-login-password').fill(PASSWORD)
	await page.getByRole('button', { name: /Enter internal ops/i }).click()
	await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
		timeout: 20_000,
	})
	await waitForHydration(page)
}

async function attemptWebsiteCustomerEmailSignIn(
	page: Page,
	email: string,
	password: string,
) {
	await page.goto(`${URLS.website}/login`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await page.getByRole('button', { name: /email/i }).click()
	await page.getByLabel(/email/i).fill(email)
	await page.getByLabel(/password/i).fill(password)
	await page
		.getByRole('button', { name: /sign in/i })
		.last()
		.click()
}

async function attemptPortalCustomerEmailSignIn(
	page: Page,
	email: string,
	password: string,
) {
	await page.goto(`${URLS.portal}/login`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await page.getByRole('button', { name: /email/i }).click()
	await page.getByLabel(/email/i).fill(email)
	await page.getByLabel(/password/i).fill(password)
	await page.getByRole('button', { name: /sign in/i }).click()
}

async function attemptDriverSignIn(
	page: Page,
	email: string,
	password: string,
) {
	await page.goto(URLS.driver, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await page.getByLabel(/email/i).fill(email)
	await page.getByLabel(/password/i).fill(password)
	await page.getByRole('button', { name: /sign in|enter|start/i }).click()
}

async function expectPanelVisibility(page: Page, allowedPanels: string[]) {
	for (const panel of ALL_PANEL_LABELS) {
		const locator = panelButton(page, panel)
		if (allowedPanels.includes(panel)) {
			await expect(locator, `${panel} visible`).toBeVisible({
				timeout: 15_000,
			})
		} else {
			await expect(locator, `${panel} hidden`).toHaveCount(0)
		}
	}
}

async function openPanel(page: Page, panel: string) {
	await panelButton(page, panel).click()
}

async function expectOpenPanel(page: Page, panel: string) {
	if (panel === 'Search') {
		await expect(page.getByLabel('Search internal database')).toBeVisible({
			timeout: 20_000,
		})
		return
	}

	await expect(page.locator('[data-window-header="true"]')).toContainText(
		panel,
		{
			timeout: 20_000,
		},
	)
	switch (panel) {
		case 'Admin':
			await expect(page.locator('body')).toContainText('The Registry', {
				timeout: 20_000,
			})
			break
		case 'Customer Service':
			await expect(page.locator('body')).toContainText(
				/Customer Service|Email/i,
			)
			break
		case 'Inventory':
			await expect(page.locator('body')).toContainText(/Inventory|Stock/i)
			break
		default:
			await expect(page.locator('body')).toContainText(panel)
	}
}

async function closePanel(page: Page, panel: string) {
	if (panel === 'Search') {
		await page.keyboard.press('Escape')
		await expect(page.getByLabel('Search internal database')).toBeHidden({
			timeout: 15_000,
		})
		return
	}

	const header = page.locator('[data-window-header="true"]')
	for (let attempt = 0; attempt < 3; attempt += 1) {
		if (await header.isHidden().catch(() => true)) return
		const closeButton = header.getByRole('button', { name: /^Close$/ })
		if ((await closeButton.count()) === 0) return
		await closeButton.click({ timeout: 5_000 })
		await page.waitForTimeout(350)
		if (await header.isHidden().catch(() => true)) return
	}
	await expect(header).toBeHidden({ timeout: 15_000 })
}

function panelButton(page: Page, panel: string) {
	return page.getByRole('button', {
		exact: true,
		name: panel.toLowerCase(),
	})
}

async function expectSeededInternalActors(
	service: ReturnType<typeof createLocalServiceClient>,
) {
	for (const account of ROLE_ACCOUNTS) {
		const { data: employee, error } = await service
			.from('employees')
			.select('id, full_name, status, is_ceo')
			.eq('email', account.email)
			.single()
		expect(error, account.email).toBeNull()
		expect(employee?.full_name).toBe(account.fullName)
		expect(employee?.status).toBe('active')
		if (account.role === 'ceo') expect(employee?.is_ceo).toBe(true)

		const { data: roles, error: roleError } = await service
			.from('employee_roles')
			.select('role')
			.eq('employee_id', employee?.id)
		expect(roleError, `${account.email} roles`).toBeNull()
		expect((roles ?? []).map((row) => row.role)).toEqual(
			expect.arrayContaining([account.role]),
		)

		const { data: panels, error: panelError } = await service
			.from('employee_panel_permissions')
			.select('panel, can_read, can_write')
			.eq('employee_id', employee?.id)
		expect(panelError, `${account.email} panels`).toBeNull()
		expect(
			(panels ?? [])
				.filter((row) => row.can_read && row.can_write)
				.map((row) => row.panel),
		).toEqual(expect.arrayContaining(account.panelPermissions))
	}
}

async function waitForHydration(page: Page) {
	await page.waitForLoadState('networkidle').catch(() => undefined)
	await page.waitForTimeout(500)
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
		if (
			errorText.includes('ERR_NETWORK_CHANGED') &&
			request.url().startsWith('https://fonts.googleapis.com/')
		) {
			return
		}
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

async function signInLocal(env: LocalSupabaseEnv, email: string) {
	const client = createClient(env.apiUrl, env.anonKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	})
	const { data, error } = await client.auth.signInWithPassword({
		email,
		password: PASSWORD,
	})
	if (error) throw new Error(`Could not sign in ${email}: ${error.message}`)
	return createActorFlowClient(client, createLocalServiceClient(env), {
		actorPool: email.includes('customer') ? 'external' : 'internal',
		actorUserId: data.user.id,
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

async function createAuthCookies(
	env: LocalSupabaseEnv,
	account: { email: string; password: string },
	cookieName: string,
	url: string,
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

async function customerCountForUser(
	service: ReturnType<typeof createLocalServiceClient>,
	userId: string | undefined,
) {
	if (!userId) return -1
	const { count, error } = await service
		.from('customers')
		.select('id', { count: 'exact', head: true })
		.eq('user_id', userId)
	expect(error).toBeNull()
	return count ?? 0
}
