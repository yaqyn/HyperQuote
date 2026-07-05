import { spawnSync } from 'node:child_process'
import { type Browser, expect, type Page, test } from '@playwright/test'
import { createServerClient } from '@supabase/ssr'

interface LocalSupabaseEnv {
	anonKey: string
	apiUrl: string
}

interface SupabaseCookieToSet {
	name: string
	options?: { maxAge?: number }
	value: string
}

const CUSTOMER = {
	email: 'customer@hyperquote.net',
	password: process.env.HYPERQUOTE_LOCAL_PRIMARY_PASSWORD ?? '123456',
}

const PORTAL_URL = process.env.FLOW_PORTAL_URL ?? 'http://localhost:3001'
const CUSTOMER_COOKIE = 'hyperquote_customer_auth'

test('portal AI keeps draft desk and chat thread across route navigation and save', async ({
	browser,
}) => {
	test.setTimeout(300_000)
	const env = readLocalSupabaseEnv()
	const { context, page } = await openCustomerPortal(browser, env)
	try {
		await sendPortalChat(page, 'i want 1000 wood')
		await chooseProduct(page, 'Wood')
		await expectChatText(page, /i want 1000 wood/i)
		await expectDraftLine(page, 'Wood', 1000)

		await page.goto(`${PORTAL_URL}/orders`, { waitUntil: 'domcontentloaded' })
		await expect(page).toHaveURL(/\/orders/)
		await page.goto(PORTAL_URL, { waitUntil: 'domcontentloaded' })
		await waitForHydration(page)
		await expectChatText(page, /i want 1000 wood/i)
		await expectDraftLine(page, 'Wood', 1000)

		await page.getByRole('button', { name: /^save$/i }).click()
		await expectSavedDraftWorkspace(page)
		await expectDraftLine(page, 'Wood', 1000)

		await page.goto(`${PORTAL_URL}/orders`, { waitUntil: 'domcontentloaded' })
		await expect(page).toHaveURL(/\/orders/)
		await page.goto(PORTAL_URL, { waitUntil: 'domcontentloaded' })
		await waitForHydration(page)
		await expectChatText(page, /i want 1000 wood/i)
		await expectDraftLine(page, 'Wood', 1000)
	} finally {
		await context.close()
	}
})

async function openCustomerPortal(browser: Browser, env: LocalSupabaseEnv) {
	const context = await browser.newContext({
		viewport: { height: 1000, width: 1440 },
	})
	await context.addCookies(
		await createAuthCookies(env, CUSTOMER, CUSTOMER_COOKIE, PORTAL_URL),
	)
	const page = await context.newPage()
	await page.goto(PORTAL_URL, { waitUntil: 'domcontentloaded' })
	await page.evaluate(() => {
		window.localStorage.removeItem('hq-portal-chat')
		window.sessionStorage.removeItem('hq-portal-chat-draft-workspace:v1')
	})
	await page.reload({ waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	if (/\/login/.test(page.url())) {
		await signInWithEmailPassword(page)
	}
	await expect(page).not.toHaveURL(/\/login/)
	return { context, page }
}

async function signInWithEmailPassword(page: Page) {
	await page
		.getByRole('button', { name: /email|password/i })
		.click({ timeout: 10_000 })
		.catch(() => undefined)
	await page.getByLabel(/email/i).fill(CUSTOMER.email)
	await page.getByLabel(/password/i).fill(CUSTOMER.password)
	await page.getByRole('button', { name: /sign in|continue/i }).click()
	await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 })
	await waitForHydration(page)
}

async function sendPortalChat(page: Page, text: string) {
	await waitForPortalChatIdle(page)
	const input = page.locator('[data-chat-input]').last()
	await expect(input).toBeEnabled({ timeout: 30_000 })
	await input.fill(text)
	await input.press('Enter')
	await expect(input).toHaveValue('', { timeout: 10_000 })
	await waitForPortalChatIdle(page)
}

async function chooseProduct(page: Page, productName: string) {
	await waitForPortalChatIdle(page)
	await expect(page.getByText(/Product choices/i).last()).toBeVisible({
		timeout: 30_000,
	})
	const button = page
		.getByRole('button', { name: new RegExp(`^${escapeRegex(productName)}$`) })
		.last()
	await expect(button).toBeVisible({ timeout: 30_000 })
	await button.click()
	await waitForPortalChatIdle(page)
}

async function expectChatText(page: Page, text: RegExp) {
	await expect(page.locator('body')).toContainText(text, { timeout: 30_000 })
}

async function expectDraftLine(page: Page, name: string, quantity: number) {
	await expect(page.getByText('Draft materials').last()).toBeVisible({
		timeout: 30_000,
	})
	await page.waitForFunction(
		({ lineName, lineQuantity }) => {
			const inputs = Array.from(
				document.querySelectorAll<HTMLInputElement>('input[aria-label]'),
			)
			return inputs.some((input) => {
				const label = input.getAttribute('aria-label') ?? ''
				if (!label.toLowerCase().includes(lineName.toLowerCase())) return false
				const rect = input.getBoundingClientRect()
				const visible =
					rect.width > 0 &&
					rect.height > 0 &&
					getComputedStyle(input).visibility !== 'hidden' &&
					getComputedStyle(input).display !== 'none'
				return visible && input.value === String(lineQuantity)
			})
		},
		{ lineName: name, lineQuantity: quantity },
		{ timeout: 30_000 },
	)
}

async function expectSavedDraftWorkspace(page: Page) {
	await page.waitForFunction(
		() => {
			const raw = window.sessionStorage.getItem(
				'hq-portal-chat-draft-workspace:v1',
			)
			if (!raw) return false
			try {
				const value: unknown = JSON.parse(raw)
				if (!value || typeof value !== 'object' || Array.isArray(value)) {
					return false
				}
				const workspace = value as Record<string, unknown>
				if (
					typeof workspace.activeDraftKey !== 'string' ||
					workspace.activeDraftKey.length === 0
				) {
					return false
				}
				const editor = workspace.editor
				if (!editor || typeof editor !== 'object' || Array.isArray(editor)) {
					return false
				}
				const editorValue = editor as Record<string, unknown>
				return (
					typeof editorValue.id === 'string' &&
					editorValue.id.length > 0 &&
					editorValue.sessionKey === `draft:${editorValue.id}`
				)
			} catch {
				return false
			}
		},
		undefined,
		{ timeout: 30_000 },
	)
}

async function waitForPortalChatIdle(page: Page) {
	await expect(
		page.getByRole('button', { name: /stop generating/i }).last(),
	).toBeHidden({ timeout: 45_000 })
}

async function waitForHydration(page: Page) {
	await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {
		return undefined
	})
	await page.waitForTimeout(600)
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

function readLocalSupabaseEnv(): LocalSupabaseEnv {
	const result = spawnSync('supabase', ['status', '-o', 'env'], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	})
	if (result.status !== 0) {
		throw new Error(
			result.stderr.trim() ||
				'Local Supabase is not running. Start it before browser smoke.',
		)
	}

	const env: Record<string, string> = {}
	for (const line of result.stdout.split('\n')) {
		const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
		if (!match) continue
		env[match[1]] = stripEnvQuotes(match[2])
	}

	if (!env.API_URL || !env.ANON_KEY) {
		throw new Error('Could not read local Supabase API URL/anon key.')
	}
	return { anonKey: env.ANON_KEY, apiUrl: env.API_URL }
}

function stripEnvQuotes(value: string) {
	if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1)
	return value
}

function escapeRegex(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
