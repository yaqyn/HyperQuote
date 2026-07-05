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
	expectAbsentDraft?: string[]
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

const STRESS_SESSION_CASES: WorkbenchCase[] = [
	{
		expectNoDraft: true,
		expectNotText:
			/Standard Freight Quote|Express Air Quote|Customs Brokerage|six are the only|only six/i,
		expectText:
			/Cement[\s\S]*Plywood[\s\S]*Ready Mix[\s\S]*Rebar[\s\S]*Steel Angle[\s\S]*Steel Mesh[\s\S]*Timber Beam[\s\S]*White Cement[\s\S]*Wood/i,
		prompt:
			"boss mode, what do u have in products rn? quick catalog dump, don't freestyle",
	},
	{
		expectDraft: [
			{ name: 'Plywood', quantity: 200 },
			{ name: 'Steel Mesh', quantity: 2000 },
			{ name: 'Cement', quantity: 10 },
		],
		expectAbsentDraft: ['Milk'],
		expectText: /did not add: milk/i,
		prompt:
			'hook me up with 200 wood, 1000 milk and 2000 steel... maybe also some 10 cement just for good old days',
		selections: ['Plywood', 'Steel Mesh', 'Cement'],
	},
	{
		expectDraft: [
			{ name: 'Plywood', quantity: 200 },
			{ name: 'Steel Mesh', quantity: 2000 },
			{ name: 'Cement', quantity: 10 },
			{ name: 'White Cement', quantity: 44 },
			{ name: 'Ready Mix', quantity: 12 },
		],
		prompt: 'also add 44 white cement and 12 ready mix to that same thing, thx',
	},
	{
		expectDraft: [
			{ name: 'Plywood', quantity: 200 },
			{ name: 'Steel Mesh', quantity: 2000 },
			{ name: 'Cement', quantity: 10 },
			{ name: 'White Cement', quantity: 44 },
			{ name: 'Ready Mix', quantity: 12 },
			{ name: 'Rebar', quantity: 800 },
			{ name: 'Timber Beam', quantity: 90 },
		],
		prompt:
			'how about some 800 steel too, plus 90 timber, same draft, moving fast',
		selections: ['Rebar'],
	},
	{
		expectDraft: [
			{ name: 'Plywood', quantity: 200 },
			{ name: 'Steel Mesh', quantity: 2000 },
			{ name: 'Cement', quantity: 10 },
			{ name: 'White Cement', quantity: 44 },
			{ name: 'Ready Mix', quantity: 12 },
			{ name: 'Rebar', quantity: 800 },
			{ name: 'Timber Beam', quantity: 90 },
			{ name: 'Steel Angle', quantity: 75 },
		],
		prompt:
			'forgot profiles: put 75 steel angle in there, dont wipe the old stuff',
	},
	{
		expectDraft: [
			{ name: 'Plywood', quantity: 1800 },
			{ name: 'Steel Mesh', quantity: 2000 },
			{ name: 'Cement', quantity: 10 },
			{ name: 'White Cement', quantity: 44 },
			{ name: 'Ready Mix', quantity: 12 },
			{ name: 'Rebar', quantity: 800 },
			{ name: 'Timber Beam', quantity: 90 },
			{ name: 'Steel Angle', quantity: 75 },
		],
		prompt: 'repeat check: make plywood 1800. plywood one eight zero zero.',
	},
	{
		expectDraft: [
			{ name: 'Plywood', quantity: 1800 },
			{ name: 'Steel Mesh', quantity: 2000 },
			{ name: 'Cement', quantity: 10 },
			{ name: 'White Cement', quantity: 44 },
			{ name: 'Rebar', quantity: 800 },
			{ name: 'Timber Beam', quantity: 90 },
			{ name: 'Steel Angle', quantity: 75 },
		],
		expectAbsentDraft: ['Ready Mix'],
		prompt: 'deduct ready mix from this draft, actually remove ready mix',
	},
	{
		expectDraft: [
			{ name: 'Plywood', quantity: 1800 },
			{ name: 'Steel Mesh', quantity: 2000 },
			{ name: 'Cement', quantity: 10 },
			{ name: 'White Cement', quantity: 44 },
			{ name: 'Rebar', quantity: 800 },
			{ name: 'Timber Beam', quantity: 125 },
			{ name: 'Steel Angle', quantity: 75 },
		],
		expectAbsentDraft: ['Ready Mix'],
		prompt: 'make timber beam 125, repeat: timber beam one two five',
	},
	{
		expectDraft: [
			{ name: 'Plywood', quantity: 1800 },
			{ name: 'Cement', quantity: 10 },
			{ name: 'White Cement', quantity: 44 },
			{ name: 'Rebar', quantity: 800 },
			{ name: 'Timber Beam', quantity: 125 },
			{ name: 'Steel Angle', quantity: 75 },
		],
		expectAbsentDraft: ['Ready Mix', 'Steel Mesh'],
		prompt: 'drop steel mesh too; too much mesh, remove it',
	},
	{
		expectDraft: [
			{ name: 'Plywood', quantity: 1800 },
			{ name: 'Cement', quantity: 10 },
			{ name: 'White Cement', quantity: 44 },
			{ name: 'Rebar', quantity: 800 },
			{ name: 'Timber Beam', quantity: 125 },
			{ name: 'Steel Angle', quantity: 75 },
			{ name: 'Wood', quantity: 33 },
		],
		expectAbsentDraft: ['Ready Mix', 'Steel Mesh'],
		prompt: 'now add 33 wood pieces, not plywood, actual wood line',
		selections: ['Wood'],
	},
]

test.describe.configure({ mode: 'serial' })

test('portal AI product-choice workbench survives one 10-prompt pre-production stress session', async ({
	browser,
}) => {
	test.setTimeout(600_000)
	const env = readLocalSupabaseEnv()
	const failures: string[] = []

	const { context, page } = await openCustomerPortal(browser, env)
	try {
		for (const [index, workbenchCase] of STRESS_SESSION_CASES.entries()) {
			const label = `${index + 1}/${STRESS_SESSION_CASES.length} ${workbenchCase.prompt}`
			try {
				await runWorkbenchCase(page, workbenchCase)
			} catch (error) {
				const debugState = await readWorkbenchDebugState(page).catch(
					(debugError) =>
						`Could not read page state: ${debugError instanceof Error ? debugError.message : debugError}`,
				)
				failures.push(
					`${label}: ${error instanceof Error ? error.message : error}\n${debugState}`,
				)
			}
		}
	} finally {
		await context.close()
	}

	expect(failures).toEqual([])
})

test('portal AI product choices keep noisy material requests inside the right family', async ({
	browser,
}) => {
	test.setTimeout(180_000)
	const env = readLocalSupabaseEnv()
	for (const materialCase of [
		{
			absent: [
				'Rebar',
				'Steel Angle',
				'Steel Mesh',
				'Plywood',
				'Timber Beam',
				'Wood',
			],
			present: ['Cement', 'Ready Mix', 'White Cement'],
			prompt: '301 cement. make it fast :D',
		},
		{
			absent: [
				'Cement',
				'Ready Mix',
				'White Cement',
				'Plywood',
				'Timber Beam',
				'Wood',
			],
			present: ['Rebar', 'Steel Angle', 'Steel Mesh'],
			prompt: '222 steel. rush please',
		},
		{
			absent: [
				'Cement',
				'Ready Mix',
				'White Cement',
				'Rebar',
				'Steel Angle',
				'Steel Mesh',
			],
			present: ['Plywood', 'Wood'],
			prompt: '333 wood. urgent if possible',
		},
	]) {
		const { context, page } = await openCustomerPortal(browser, env)
		try {
			await sendPortalChat(page, materialCase.prompt)

			await expectProductChoiceCard(page)
			for (const productName of materialCase.present) {
				await expect(
					page
						.getByRole('button', {
							name: productChoiceButtonRegex(productName),
						})
						.last(),
				).toBeVisible({ timeout: 30_000 })
			}
			for (const productName of materialCase.absent) {
				await expect(
					page.getByRole('button', {
						name: productChoiceButtonRegex(productName),
					}),
					materialCase.prompt,
				).toHaveCount(0)
			}
		} finally {
			await context.close()
		}
	}
})

test('portal AI lets customers choose quantity before adding a product choice', async ({
	browser,
}) => {
	test.setTimeout(180_000)
	const env = readLocalSupabaseEnv()
	const { context, page } = await openCustomerPortal(browser, env)
	try {
		await sendPortalChat(page, 'hey, i want some cement')
		await expectProductChoiceCard(page)
		await expect(
			page.getByText(/If you did not give a quantity/i).last(),
		).toBeVisible({ timeout: 30_000 })
		await expect(page.getByLabel(/quantity for cement/i)).toHaveCount(0)
		await page
			.getByRole('button', { name: productChoiceButtonRegex('Cement') })
			.last()
			.click()
		const quantityInput = page.getByLabel(/quantity for cement/i).last()
		await expect(quantityInput).toBeVisible({ timeout: 30_000 })
		await expect(quantityInput).toBeFocused()
		await quantityInput.fill('0')
		await expect(page.getByLabel(/quantity for cement/i)).toHaveCount(0)
		await expect(page.getByText('Draft materials')).toHaveCount(0, {
			timeout: 3_000,
		})
		await expectProductChoiceCard(page)
		await page
			.getByRole('button', { name: productChoiceButtonRegex('Cement') })
			.last()
			.click()
		const reopenedQuantityInput = page.getByLabel(/quantity for cement/i).last()
		await expect(reopenedQuantityInput).toBeVisible({ timeout: 30_000 })
		await reopenedQuantityInput.fill('')
		await reopenedQuantityInput.press('Enter')
		await expect(reopenedQuantityInput).toBeVisible({ timeout: 5_000 })
		await expect(page.getByText('Draft materials')).toHaveCount(0, {
			timeout: 3_000,
		})
		await reopenedQuantityInput.fill('301')
		await reopenedQuantityInput.press('Enter')
		await waitForPortalChatIdle(page)
		await expectDraftLine(page, { name: 'Cement', quantity: 301 })
	} finally {
		await context.close()
	}
})

test('portal AI asks before adding ambiguous follow-up materials to an active draft', async ({
	browser,
}) => {
	test.setTimeout(240_000)
	const env = readLocalSupabaseEnv()
	const { context, page } = await openCustomerPortal(browser, env)
	try {
		await sendPortalChat(page, 'hey, i want some wood')
		await expectProductChoiceCard(page)
		await chooseProductWithQuantity(page, 'Plywood', /quantity for wood/i, 500)
		await expectDraftLine(page, { name: 'Plywood', quantity: 500 })

		await sendPortalChat(page, 'how about some cement')
		await expectProductChoiceCard(page)
		await expectDraftLine(page, { name: 'Plywood', quantity: 500 })
		for (const productName of ['Cement', 'Ready Mix', 'White Cement']) {
			await expectNoDraftLine(page, productName)
		}

		await chooseProductWithQuantity(page, 'Cement', /quantity for cement/i, 301)
		await expectDraftLine(page, { name: 'Plywood', quantity: 500 })
		await expectDraftLine(page, { name: 'Cement', quantity: 301 })
		await expectNoDraftLine(page, 'Ready Mix')
		await expectNoDraftLine(page, 'White Cement')
	} finally {
		await context.close()
	}
})

test('portal AI product choices use a centered mobile quantity flow', async ({
	browser,
}) => {
	test.setTimeout(180_000)
	const env = readLocalSupabaseEnv()
	const { context, page } = await openCustomerPortal(browser, env, {
		height: 844,
		width: 390,
	})
	try {
		await sendPortalChat(page, 'yo, i need some cement, no number yet')
		await expectProductChoiceCard(page)
		const card = page.locator('[data-product-choice-list]').last()
		const box = await card.boundingBox()
		expect(box).not.toBeNull()
		const cardCenter = (box?.y ?? 0) + (box?.height ?? 0) / 2
		expect(Math.abs(cardCenter - 844 / 2)).toBeLessThanOrEqual(96)
		expect(box?.y).toBeGreaterThanOrEqual(0)
		expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(844)

		await page
			.getByRole('button', { name: productChoiceButtonRegex('Cement') })
			.last()
			.click()
		const quantityInput = page.getByLabel(/quantity for cement/i).last()
		await expect(quantityInput).toBeVisible({ timeout: 30_000 })
		await expect(quantityInput).toBeFocused()
		await quantityInput.fill('12')
		await quantityInput.press('Enter')
		await waitForPortalChatIdle(page)
		await expectDraftLine(page, { name: 'Cement', quantity: 12 })
	} finally {
		await context.close()
	}
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
	if (workbenchCase.expectDraft) {
		await expectDraftLineCount(page, workbenchCase.expectDraft.length)
	}
	for (const absentName of workbenchCase.expectAbsentDraft ?? []) {
		await expectNoDraftLine(page, absentName)
	}
}

async function openCustomerPortal(
	browser: Browser,
	env: LocalSupabaseEnv,
	viewport: { height: number; width: number } = { height: 1000, width: 1440 },
) {
	const context = await browser.newContext({
		viewport,
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
	await expectProductChoiceCard(page)
	const button = page
		.getByRole('button', { name: productChoiceButtonRegex(productName) })
		.last()
	await expect(button).toBeVisible({ timeout: 30_000 })
	await button.click()
	await waitForPortalChatIdle(page)
}

async function chooseProductWithQuantity(
	page: Page,
	productName: string,
	quantityLabel: RegExp,
	quantity: number,
) {
	await waitForPortalChatIdle(page)
	await expectProductChoiceCard(page)
	const button = page
		.getByRole('button', { name: productChoiceButtonRegex(productName) })
		.last()
	await expect(button).toBeVisible({ timeout: 30_000 })
	await button.click()
	const input = page.getByLabel(quantityLabel).last()
	await expect(input).toBeVisible({ timeout: 30_000 })
	await expect(input).toBeFocused()
	await input.fill(String(quantity))
	await input.press('Enter')
	await waitForPortalChatIdle(page)
}

async function expectProductChoiceCard(page: Page) {
	await expect(
		page.getByText(/Pick the product that matches your request/i).last(),
	).toBeVisible({ timeout: 30_000 })
}

function productChoiceButtonRegex(productName: string): RegExp {
	return new RegExp(
		`^(?:(?:Add|Use)\\s+|Next:\\s*)?${escapeRegex(productName)}$`,
		'i',
	)
}

async function expectDraftLine(page: Page, expected: ExpectedDraftLine) {
	await expect(page.getByText('Draft materials').last()).toBeVisible({
		timeout: 30_000,
	})
	await page.waitForFunction(
		({ name, quantity }) => {
			const inputs = Array.from(
				document.querySelectorAll<HTMLInputElement>('input[aria-label]'),
			).filter((input) => !input.closest('[data-product-choice-list]'))
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

async function expectNoDraftLine(page: Page, name: string) {
	await expect(page.getByText('Draft materials').last()).toBeVisible({
		timeout: 30_000,
	})
	await page.waitForFunction(
		(nameToFind) => {
			const inputs = Array.from(
				document.querySelectorAll<HTMLInputElement>('input[aria-label]'),
			).filter((input) => !input.closest('[data-product-choice-list]'))
			return inputs.every((input) => {
				const label = input.getAttribute('aria-label') ?? ''
				const rect = input.getBoundingClientRect()
				const visible =
					rect.width > 0 &&
					rect.height > 0 &&
					getComputedStyle(input).visibility !== 'hidden' &&
					getComputedStyle(input).display !== 'none'
				return (
					!visible || !label.toLowerCase().includes(nameToFind.toLowerCase())
				)
			})
		},
		name,
		{ timeout: 30_000 },
	)
}

async function expectDraftLineCount(page: Page, count: number) {
	await page.waitForFunction(
		(expectedCount) => {
			const visibleInputs = Array.from(
				document.querySelectorAll<HTMLInputElement>('input[aria-label]'),
			)
				.filter((input) => !input.closest('[data-product-choice-list]'))
				.filter((input) => {
					const label = input.getAttribute('aria-label') ?? ''
					const rect = input.getBoundingClientRect()
					return (
						label.toLowerCase().startsWith('quantity for ') &&
						rect.width > 0 &&
						rect.height > 0 &&
						getComputedStyle(input).visibility !== 'hidden' &&
						getComputedStyle(input).display !== 'none'
					)
				})
			return visibleInputs.length === expectedCount
		},
		count,
		{ timeout: 30_000 },
	)
}

async function readWorkbenchDebugState(page: Page): Promise<string> {
	return page.evaluate(() => {
		const inputs = Array.from(
			document.querySelectorAll<HTMLInputElement>('input[aria-label]'),
		)
			.map((input) => {
				const rect = input.getBoundingClientRect()
				const visible =
					rect.width > 0 &&
					rect.height > 0 &&
					getComputedStyle(input).visibility !== 'hidden' &&
					getComputedStyle(input).display !== 'none'
				return visible
					? `${input.getAttribute('aria-label') ?? 'input'}=${input.value}`
					: null
			})
			.filter(Boolean)
		const buttons = Array.from(document.querySelectorAll('button'))
			.map((button) => {
				const rect = button.getBoundingClientRect()
				const visible =
					rect.width > 0 &&
					rect.height > 0 &&
					getComputedStyle(button).visibility !== 'hidden' &&
					getComputedStyle(button).display !== 'none'
				return visible ? button.textContent?.trim() || null : null
			})
			.filter(Boolean)
			.slice(-20)
		return `Visible draft inputs: ${inputs.join(' | ') || 'none'}\nVisible buttons: ${buttons.join(' | ') || 'none'}`
	})
}

async function expectNoDraft(page: Page) {
	await waitForPortalChatIdle(page)
	await expect(page.getByText('Draft materials')).toHaveCount(0, {
		timeout: 3_000,
	})
	await expect(
		page.getByText(/Pick the product that matches your request/i),
	).toHaveCount(0, { timeout: 3_000 })
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
