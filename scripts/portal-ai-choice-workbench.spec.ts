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

interface ExpectedDraftLine {
	name: string
	quantity: number
}

interface WorkbenchCase {
	expectDraft?: ExpectedDraftLine[]
	expectNotText?: RegExp
	expectText?: RegExp
	expectNoDraft?: boolean
	prompt: string
	selections?: string[]
}

const CUSTOMER = {
	email: 'customer@hyperquote.net',
	password: process.env.HYPERQUOTE_LOCAL_PRIMARY_PASSWORD ?? '123456',
}

const PORTAL_URL = process.env.FLOW_PORTAL_URL ?? 'http://localhost:3001'
const CUSTOMER_COOKIE = 'hyperquote_customer_auth'

const ISOLATED_CASES: WorkbenchCase[] = [
	{
		expectDraft: [
			{ name: 'Plywood', quantity: 1000 },
			{ name: 'Rebar', quantity: 800 },
		],
		prompt: 'hook me up with some 1000 wood please, and 800 steel',
		selections: ['Plywood', 'Rebar'],
	},
	{
		expectDraft: [
			{ name: 'Cement', quantity: 1000 },
			{ name: 'Rebar', quantity: 800 },
		],
		prompt: 'give me 1000 cement, 800 steel',
		selections: ['Cement', 'Rebar'],
	},
	{
		expectDraft: [{ name: 'Plywood', quantity: 1000 }],
		prompt: 'wood 1000',
		selections: ['Plywood'],
	},
	{ expectNoDraft: true, prompt: 'homie, 1 lol' },
	{ expectNoDraft: true, prompt: "that's wrong" },
	{
		expectDraft: [{ name: 'Plywood', quantity: 1000 }],
		prompt: '1000 plywood',
	},
	{
		expectDraft: [{ name: 'Plywood', quantity: 1000 }],
		prompt: 'Plywood i mean, 1000 sheets',
	},
	{
		expectDraft: [{ name: 'White Cement', quantity: 12 }],
		prompt: 'need 12 white cement',
	},
	{
		expectDraft: [{ name: 'Ready Mix', quantity: 7 }],
		prompt: 'ready mix 7',
	},
	{
		expectDraft: [{ name: 'Steel Mesh', quantity: 800 }],
		prompt: '800 steel mesh',
	},
	{
		expectDraft: [{ name: 'Steel Angle', quantity: 210 }],
		prompt: '210 steel angle',
	},
	{
		expectDraft: [{ name: 'Timber Beam', quantity: 100 }],
		prompt: '100 timber',
	},
	{
		expectNoDraft: true,
		expectNotText:
			/Standard Freight Quote|Express Air Quote|Customs Brokerage/i,
		expectText: /real catalog-backed product|Cement|Ready Mix|Plywood|Rebar/i,
		prompt: 'products?',
	},
	{
		expectDraft: [{ name: 'Ready Mix', quantity: 10 }],
		prompt: 'need 10 concrete',
		selections: ['Ready Mix'],
	},
	{
		expectDraft: [
			{ name: 'Cement', quantity: 5 },
			{ name: 'Plywood', quantity: 6 },
			{ name: 'Rebar', quantity: 7 },
		],
		prompt: 'can you draft 5 cement and 6 wood and 7 steel',
		selections: ['Cement', 'Plywood', 'Rebar'],
	},
]

const SESSION_CASES: WorkbenchCase[] = [
	{
		expectDraft: [
			{ name: 'Plywood', quantity: 100 },
			{ name: 'Rebar', quantity: 200 },
		],
		prompt: 'first build the scratch draft with 100 wood and 200 steel',
		selections: ['Plywood', 'Rebar'],
	},
	{
		expectDraft: [
			{ name: 'Plywood', quantity: 100 },
			{ name: 'Rebar', quantity: 200 },
		],
		expectText: /How much cement should I add/i,
		prompt: 'add cement',
	},
	{
		expectDraft: [
			{ name: 'Plywood', quantity: 100 },
			{ name: 'Rebar', quantity: 200 },
			{ name: 'Cement', quantity: 3000 },
		],
		prompt: 'add 3000 cement',
		selections: ['Cement'],
	},
	{
		expectDraft: [
			{ name: 'Plywood', quantity: 100 },
			{ name: 'Rebar', quantity: 200 },
			{ name: 'Cement', quantity: 3000 },
			{ name: 'Steel Angle', quantity: 12 },
		],
		prompt: 'append 12 metal',
		selections: ['Steel Angle'],
	},
	{
		expectDraft: [
			{ name: 'Plywood', quantity: 100 },
			{ name: 'Rebar', quantity: 200 },
			{ name: 'Cement', quantity: 3000 },
			{ name: 'Steel Angle', quantity: 12 },
			{ name: 'Ready Mix', quantity: 7 },
		],
		prompt: 'include 7 concrete too, same draft',
	},
]

const TOTAL_CASE_COUNT = ISOLATED_CASES.length + SESSION_CASES.length

test.describe.configure({ mode: 'serial' })

test('portal AI product-choice workbench answers 20 hard prompts, including one 5-prompt session', async ({
	browser,
}) => {
	test.setTimeout(600_000)
	const env = readLocalSupabaseEnv()
	const failures: string[] = []
	const caseFilter = process.env.PORTAL_AI_WORKBENCH_CASE?.trim()

	for (const [index, workbenchCase] of ISOLATED_CASES.entries()) {
		const label = `${index + 1}/${TOTAL_CASE_COUNT} ${workbenchCase.prompt}`
		if (
			caseFilter &&
			caseFilter !== String(index + 1) &&
			!workbenchCase.prompt.includes(caseFilter)
		) {
			continue
		}
		try {
			const { context, page } = await openCustomerPortal(browser, env)
			try {
				await runWorkbenchCase(page, workbenchCase)
			} finally {
				await context.close()
			}
		} catch (error) {
			failures.push(
				`${label}: ${error instanceof Error ? error.message : error}`,
			)
		}
	}

	if (!caseFilter || caseFilter === 'session') {
		const { context, page } = await openCustomerPortal(browser, env)
		try {
			for (const [index, workbenchCase] of SESSION_CASES.entries()) {
				const caseNumber = ISOLATED_CASES.length + index + 1
				const label = `${caseNumber}/${TOTAL_CASE_COUNT} session ${index + 1}/5 ${workbenchCase.prompt}`
				try {
					await runWorkbenchCase(page, workbenchCase)
				} catch (error) {
					failures.push(
						`${label}: ${error instanceof Error ? error.message : error}`,
					)
				}
			}
		} finally {
			await context.close()
		}
	}

	expect(failures).toEqual([])
})

async function runWorkbenchCase(page: Page, workbenchCase: WorkbenchCase) {
	await sendPortalChat(page, workbenchCase.prompt)
	for (const selection of workbenchCase.selections ?? []) {
		await chooseProduct(page, selection)
	}
	if (workbenchCase.expectText) {
		await expect(page.locator('body')).toContainText(workbenchCase.expectText, {
			timeout: 30_000,
		})
	}
	if (workbenchCase.expectNotText) {
		await expect(page.locator('body')).not.toContainText(
			workbenchCase.expectNotText,
			{ timeout: 3_000 },
		)
	}
	if (workbenchCase.expectNoDraft) {
		await expectNoDraft(page)
	}
	for (const expected of workbenchCase.expectDraft ?? []) {
		await expectDraftLine(page, expected)
	}
}

async function openCustomerPortal(browser: Browser, env: LocalSupabaseEnv) {
	const context = await browser.newContext({
		viewport: { height: 1000, width: 1440 },
	})
	await context.addCookies(
		await createAuthCookies(env, CUSTOMER, CUSTOMER_COOKIE, PORTAL_URL),
	)
	const page = await context.newPage()
	await page.goto(PORTAL_URL, { waitUntil: 'domcontentloaded' })
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

async function expectDraftLine(page: Page, expected: ExpectedDraftLine) {
	await expect(page.getByText('Draft materials').last()).toBeVisible({
		timeout: 30_000,
	})
	await page.waitForFunction(
		({ name, quantity }) => {
			const inputs = Array.from(
				document.querySelectorAll<HTMLInputElement>('input[aria-label]'),
			)
			return inputs.some((input) => {
				const label = input.getAttribute('aria-label') ?? ''
				if (!label.toLowerCase().includes(name.toLowerCase())) return false
				const rect = input.getBoundingClientRect()
				const visible =
					rect.width > 0 &&
					rect.height > 0 &&
					getComputedStyle(input).visibility !== 'hidden' &&
					getComputedStyle(input).display !== 'none'
				return visible && input.value === String(quantity)
			})
		},
		expected,
		{ timeout: 30_000 },
	)
}

async function expectNoDraft(page: Page) {
	await waitForPortalChatIdle(page)
	await expect(page.getByText('Draft materials')).toHaveCount(0, {
		timeout: 3_000,
	})
	await expect(page.getByText(/Product choices/i)).toHaveCount(0, {
		timeout: 3_000,
	})
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
