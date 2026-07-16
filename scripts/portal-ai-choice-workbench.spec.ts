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
			/Beshay Rebar[\s\S]*Cemex Ready Mix[\s\S]*Egyptian Steel Mesh[\s\S]*Film Faced Plywood[\s\S]*Lafarge Portland Cement[\s\S]*Marine Plywood/i,
		prompt:
			"boss mode, what do u have in products rn? quick catalog dump, don't freestyle",
	},
	{
		expectDraft: [
			{ name: 'Film Faced Plywood 18mm', quantity: 200 },
			{ name: 'Egyptian Steel Mesh A142', quantity: 2000 },
			{ name: 'Lafarge Portland Cement', quantity: 10 },
		],
		expectAbsentDraft: ['Milk'],
		expectText: /did not add: milk/i,
		prompt:
			'hook me up with 200 wood, 1000 milk and 2000 steel... maybe also some 10 cement just for good old days',
		selections: [
			'Plywood',
			'Film Faced Plywood 18mm',
			'Steel Mesh',
			'Egyptian Steel Mesh A142',
			'Portland Cement',
			'Lafarge Portland Cement',
		],
	},
	{
		expectDraft: [
			{ name: 'Film Faced Plywood 18mm', quantity: 200 },
			{ name: 'Egyptian Steel Mesh A142', quantity: 2000 },
			{ name: 'Lafarge Portland Cement', quantity: 10 },
			{ name: 'Ezz Al Arab White Cement', quantity: 44 },
			{ name: 'Cemex Ready Mix Concrete C25', quantity: 12 },
		],
		prompt: 'also add 44 white cement and 12 ready mix to that same thing, thx',
		selections: ['Ezz Al Arab White Cement', 'Cemex Ready Mix Concrete C25'],
	},
	{
		expectDraft: [
			{ name: 'Film Faced Plywood 18mm', quantity: 200 },
			{ name: 'Egyptian Steel Mesh A142', quantity: 2000 },
			{ name: 'Lafarge Portland Cement', quantity: 10 },
			{ name: 'Ezz Al Arab White Cement', quantity: 44 },
			{ name: 'Cemex Ready Mix Concrete C25', quantity: 12 },
			{ name: 'Beshay Rebar 16mm', quantity: 800 },
			{ name: 'Swedish Pine Timber', quantity: 90 },
		],
		prompt:
			'how about some 800 steel too, plus 90 timber, same draft, moving fast',
		selections: [
			'Rebar',
			'Beshay Rebar 16mm',
			'Structural Timber',
			'Swedish Pine Timber',
		],
	},
	{
		expectDraft: [
			{ name: 'Film Faced Plywood 18mm', quantity: 200 },
			{ name: 'Egyptian Steel Mesh A142', quantity: 2000 },
			{ name: 'Lafarge Portland Cement', quantity: 10 },
			{ name: 'Ezz Al Arab White Cement', quantity: 44 },
			{ name: 'Cemex Ready Mix Concrete C25', quantity: 12 },
			{ name: 'Beshay Rebar 16mm', quantity: 800 },
			{ name: 'Swedish Pine Timber', quantity: 90 },
			{ name: 'Suez Steel Angle Profile', quantity: 75 },
		],
		prompt:
			'forgot profiles: put 75 steel angle in there, dont wipe the old stuff',
	},
	{
		expectDraft: [
			{ name: 'Film Faced Plywood 18mm', quantity: 1800 },
			{ name: 'Egyptian Steel Mesh A142', quantity: 2000 },
			{ name: 'Lafarge Portland Cement', quantity: 10 },
			{ name: 'Ezz Al Arab White Cement', quantity: 44 },
			{ name: 'Cemex Ready Mix Concrete C25', quantity: 12 },
			{ name: 'Beshay Rebar 16mm', quantity: 800 },
			{ name: 'Swedish Pine Timber', quantity: 90 },
			{ name: 'Suez Steel Angle Profile', quantity: 75 },
		],
		prompt: 'repeat check: make plywood 1800. plywood one eight zero zero.',
	},
	{
		expectDraft: [
			{ name: 'Film Faced Plywood 18mm', quantity: 1800 },
			{ name: 'Egyptian Steel Mesh A142', quantity: 2000 },
			{ name: 'Lafarge Portland Cement', quantity: 10 },
			{ name: 'Ezz Al Arab White Cement', quantity: 44 },
			{ name: 'Beshay Rebar 16mm', quantity: 800 },
			{ name: 'Swedish Pine Timber', quantity: 90 },
			{ name: 'Suez Steel Angle Profile', quantity: 75 },
		],
		expectAbsentDraft: ['Ready Mix'],
		prompt: 'deduct ready mix from this draft, actually remove ready mix',
	},
	{
		expectDraft: [
			{ name: 'Film Faced Plywood 18mm', quantity: 1800 },
			{ name: 'Egyptian Steel Mesh A142', quantity: 2000 },
			{ name: 'Lafarge Portland Cement', quantity: 10 },
			{ name: 'Ezz Al Arab White Cement', quantity: 44 },
			{ name: 'Beshay Rebar 16mm', quantity: 800 },
			{ name: 'Swedish Pine Timber', quantity: 125 },
			{ name: 'Suez Steel Angle Profile', quantity: 75 },
		],
		expectAbsentDraft: ['Ready Mix'],
		prompt: 'make timber beam 125, repeat: timber beam one two five',
	},
	{
		expectDraft: [
			{ name: 'Film Faced Plywood 18mm', quantity: 1800 },
			{ name: 'Lafarge Portland Cement', quantity: 10 },
			{ name: 'Ezz Al Arab White Cement', quantity: 44 },
			{ name: 'Beshay Rebar 16mm', quantity: 800 },
			{ name: 'Swedish Pine Timber', quantity: 125 },
			{ name: 'Suez Steel Angle Profile', quantity: 75 },
		],
		expectAbsentDraft: ['Ready Mix', 'Steel Mesh'],
		prompt: 'drop steel mesh too; too much mesh, remove it',
	},
	{
		expectDraft: [
			{ name: 'Film Faced Plywood 18mm', quantity: 1800 },
			{ name: 'Lafarge Portland Cement', quantity: 10 },
			{ name: 'Ezz Al Arab White Cement', quantity: 44 },
			{ name: 'Beshay Rebar 16mm', quantity: 800 },
			{ name: 'Swedish Pine Timber', quantity: 125 },
			{ name: 'Suez Steel Angle Profile', quantity: 75 },
			{ name: 'Romanian Whitewood Timber', quantity: 33 },
		],
		expectAbsentDraft: ['Ready Mix', 'Steel Mesh'],
		prompt: 'now add 33 wood pieces, not plywood, actual wood line',
		selections: ['Structural Timber', 'Romanian Whitewood Timber'],
	},
]

test.describe.configure({ mode: 'serial' })

test('portal command desk is discoverable and guides command details locally', async ({
	browser,
}) => {
	test.setTimeout(90_000)
	const env = readLocalSupabaseEnv()
	const { context, page } = await openCustomerPortal(browser, env)
	try {
		await page
			.getByRole('button', { exact: true, name: 'Lyon commands' })
			.click()
		const desk = page
			.locator('section')
			.filter({ hasText: 'What should we do next?' })
			.last()
		await expect(desk).toBeVisible()
		await expect(desk).toContainText('Start here')
		await expect(desk.getByText('/plan-quote', { exact: true })).toBeVisible()
		await expect(
			desk.getByText('/search-products', { exact: true }),
		).toBeVisible()
		await expect(desk.getByText('/add-to-cart', { exact: true })).toBeVisible()
		await expect(desk.getByText('/edit-cart', { exact: true })).toBeVisible()
		await expect(desk.getByText('/ticket', { exact: true })).toBeVisible()
		await page.screenshot({
			fullPage: true,
			path: '/tmp/hyperquote-command-desk.png',
		})

		const editCard = desk
			.getByText('/edit-cart', { exact: true })
			.locator('xpath=ancestor::div[./button][1]')
		await editCard.getByRole('button', { name: 'Tell Lyon' }).click()
		const input = page.locator('[data-chat-input]').last()
		await expect(input).toHaveValue('/edit-cart ')
		await expect(input).toHaveAttribute('placeholder', /what should change/i)
		await expect(
			page.getByText(/missing details are asked one at a time/i),
		).toBeVisible()

		await input.fill('/does-not-exist')
		await input.press('Enter')
		await expect(
			page.getByRole('heading', { name: 'Command not found' }),
		).toBeVisible()
		await expect(page.getByText(/nothing ran/i)).toBeVisible()
	} finally {
		await context.close()
	}
})

test('portal AI keeps known facts and asks only for a missing quantity', async ({
	browser,
}) => {
	test.setTimeout(180_000)
	const env = readLocalSupabaseEnv()
	const { context, page } = await openCustomerPortal(browser, env)
	try {
		await sendPortalChat(page, 'i want plywood')
		await expectProductChoiceCard(page)
		const productChoice = page.locator('[data-product-choice-list]').last()
		const startingQuantity = await readCartQuantity(
			page,
			'Film Faced Plywood 18mm',
		)
		await expect(productChoice.locator('input')).toHaveCount(0)
		await productChoice
			.getByRole('button', {
				name: productChoiceButtonRegex('Film Faced Plywood 18mm'),
			})
			.click()
		const quantity = productChoice.getByLabel(/quantity for plywood/i)
		await expect(quantity).toBeFocused()
		await expect(page.getByText('Draft materials')).toHaveCount(0)
		await quantity.fill('80')
		await quantity.press('Enter')
		await waitForPortalChatIdle(page)
		await expectDraftLine(page, {
			name: 'Film Faced Plywood 18mm',
			quantity: startingQuantity + 80,
		})
	} finally {
		await context.close()
	}
})

test('portal AI does not ask for a quantity it already understood', async ({
	browser,
}) => {
	test.setTimeout(180_000)
	const env = readLocalSupabaseEnv()
	const { context, page } = await openCustomerPortal(browser, env)
	try {
		await sendPortalChat(page, 'I need 2000 wood')
		await expectProductChoiceCard(page)
		const startingQuantity = await readCartQuantity(page, 'Marine Plywood 18mm')
		await expect(
			page.locator('[data-product-choice-list]').last().locator('input'),
		).toHaveCount(0)
		await chooseProduct(page, 'Plywood')
		await chooseProduct(page, 'Marine Plywood 18mm')
		await expectDraftLine(page, {
			name: 'Marine Plywood 18mm',
			quantity: startingQuantity + 2000,
		})
	} finally {
		await context.close()
	}
})

test('portal AI resolves mixed Arabic and misspelled catalog requests', async ({
	browser,
}) => {
	test.setTimeout(180_000)
	const env = readLocalSupabaseEnv()
	const { context, page } = await openCustomerPortal(browser, env)
	try {
		await sendPortalChat(page, 'عايز 25 plywod أبلكاش')
		await expectProductChoiceCard(page)
		const startingQuantity = await readCartQuantity(page, 'Marine Plywood 18mm')
		await expect(
			page.getByRole('button', {
				name: productChoiceButtonRegex('Film Faced Plywood 18mm'),
			}),
		).toBeVisible()
		await chooseProduct(page, 'Marine Plywood 18mm')
		await expectDraftLine(page, {
			name: 'Marine Plywood 18mm',
			quantity: startingQuantity + 25,
		})
	} finally {
		await context.close()
	}
})

test('portal AI drafts a support ticket and submits it only after confirmation', async ({
	browser,
}) => {
	test.setTimeout(180_000)
	const env = readLocalSupabaseEnv()
	const { context, page } = await openCustomerPortal(browser, env)
	try {
		await sendPortalChat(
			page,
			'Please draft a support ticket: the delivery address on my latest order is wrong.',
		)
		await expect(
			page.getByRole('button', { name: 'Submit ticket' }),
		).toBeVisible({
			timeout: 30_000,
		})
		await expect(page.getByText(/Support ticket submitted/i)).toHaveCount(0)
		await page.getByRole('button', { name: 'Submit ticket' }).click()
		const confirmation = page.getByRole('dialog', { name: 'Confirm action' })
		await expect(confirmation).toBeVisible()
		await expect(page.locator('body')).not.toContainText(/SUP-/i)
		await confirmation.getByRole('button', { name: 'Submit ticket' }).click()
		await waitForPortalChatIdle(page)
		await expect(
			page.getByText(/support ticket has been created/i).last(),
		).toBeVisible({
			timeout: 30_000,
		})
		await expect(page.locator('body')).toContainText(/TK-\d{4}-[A-Z0-9]+/i)
	} finally {
		await context.close()
	}
})

test('portal AI progressively clarifies an underspecified cart edit', async ({
	browser,
}) => {
	test.setTimeout(240_000)
	const env = readLocalSupabaseEnv()
	const { context, page } = await openCustomerPortal(browser, env)
	try {
		let startingPlywood = await readCartQuantity(
			page,
			'Film Faced Plywood 18mm',
		)
		let startingMesh = await readCartQuantity(page, 'Egyptian Steel Mesh A142')
		if (startingPlywood <= 25) {
			await sendPortalChat(page, 'I want 100 Film Faced Plywood 18mm')
			startingPlywood += 100
			await expectDraftLine(page, {
				name: 'Film Faced Plywood 18mm',
				quantity: startingPlywood,
			})
			await closeCartIfOpen(page)
		}
		if (startingMesh <= 0) {
			await sendPortalChat(page, 'add 50 Egyptian Steel Mesh A142 to my cart')
			startingMesh += 50
			await expectDraftLine(page, {
				name: 'Egyptian Steel Mesh A142',
				quantity: startingMesh,
			})
			await closeCartIfOpen(page)
		}

		await sendPortalChat(page, 'edit an item in my cart')
		const sheet = await expectClarificationSheet(page)
		await expect(
			sheet.getByRole('button', { name: 'Add to its quantity' }),
		).toBeVisible()
		await expect(
			sheet.getByText(/Film Faced Plywood 18mm · \d+(?:\.\d+)? sheet/),
		).toHaveCount(0)
		await sheet
			.getByRole('button', { name: 'Deduct from its quantity' })
			.click()
		const plywoodLine = sheet.getByRole('button', {
			name: /Film Faced Plywood 18mm · \d+(?:\.\d+)? sheet/,
		})
		await expect(plywoodLine).toBeVisible()
		const quantityBeforeEdit = Number.parseFloat(
			(await plywoodLine.textContent())?.match(/·\s*(\d+(?:\.\d+)?)/)?.[1] ??
				'',
		)
		expect(quantityBeforeEdit).toBeGreaterThan(25)
		await expect(plywoodLine).toHaveClass(/red-500/)
		await plywoodLine.click()
		const quantity = sheet.getByLabel('How much should I deduct?')
		await expect(quantity).toBeFocused()
		await expect(quantity.locator('xpath=..')).toHaveClass(/red-500/)
		await quantity.fill('25')
		await sheet.getByRole('button', { name: 'Apply this change' }).click()
		await waitForPortalChatIdle(page)
		await expect(
			page.getByText(/I deducted 25 from Film Faced Plywood 18mm/i).last(),
		).toBeVisible({ timeout: 30_000 })
		await page.waitForTimeout(800)
		const quantityAfterEdit = await readCartQuantity(
			page,
			'Film Faced Plywood 18mm',
		)
		expect(
			quantityAfterEdit,
			`Expected ${quantityBeforeEdit} - 25 in the live cart`,
		).toBe(quantityBeforeEdit - 25)
	} finally {
		await context.close()
	}
})

test('portal AI labels new and additive product choices', async ({
	browser,
}) => {
	test.setTimeout(180_000)
	const env = readLocalSupabaseEnv()
	const { context, page } = await openCustomerPortal(browser, env)
	try {
		await removeCartLineIfPresent(page, 'Marine Plywood 18mm')
		let startingPlywood = await readCartQuantity(
			page,
			'Film Faced Plywood 18mm',
		)
		if (startingPlywood <= 0) {
			await sendPortalChat(page, 'I want 100 Film Faced Plywood 18mm')
			startingPlywood = 100
			await expectDraftLine(page, {
				name: 'Film Faced Plywood 18mm',
				quantity: startingPlywood,
			})
		}
		await sendPortalChat(page, 'add 20 plywood to my cart')
		await expectProductChoiceCard(page)
		await expect(
			page.getByText(`Add to existing · ${startingPlywood}`),
		).toBeVisible()
		await expect(page.getByText('New market item').first()).toBeVisible()
		const increaseButton = page.getByRole('button', {
			name: productChoiceButtonRegex('Film Faced Plywood 18mm'),
		})
		await expect(increaseButton).toHaveClass(/emerald-600/)
	} finally {
		await context.close()
	}
})

test('portal AI keeps one shared quantity across multiple requested materials', async ({
	browser,
}) => {
	test.setTimeout(180_000)
	const env = readLocalSupabaseEnv()
	const { context, page } = await openCustomerPortal(browser, env)
	try {
		await sendPortalChat(page, 'i want rebar and steel both 400')
		await expectProductChoiceCard(page)
		const productChoice = page.locator('[data-product-choice-list]').last()
		await expect(
			productChoice.getByText(/quantity you gave: 400/i),
		).toBeVisible()
		await expect(productChoice.locator('input')).toHaveCount(0)
		await expect(page.getByText(/options for 2 items/i).first()).toBeVisible()
	} finally {
		await context.close()
	}
})

test('portal AI product-choice workbench survives one 10-prompt pre-production stress session', async ({
	browser,
}) => {
	test.setTimeout(900_000)
	const env = readLocalSupabaseEnv()

	const { context, page } = await openCustomerPortal(browser, env)
	try {
		await clearCartForWorkbench(page)
		for (const workbenchCase of STRESS_SESSION_CASES) {
			await runWorkbenchCase(page, workbenchCase)
		}
	} finally {
		await context.close()
	}
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
				'Steel Mesh',
				'Steel Profiles',
				'Plywood',
				'Formwork Boards',
				'Structural Timber',
			],
			present: ['Portland Cement', 'Ready Mix Concrete', 'White Cement'],
			prompt: '301 cement. make it fast :D',
		},
		{
			absent: [
				'Portland Cement',
				'Ready Mix Concrete',
				'White Cement',
				'Plywood',
				'Formwork Boards',
				'Structural Timber',
			],
			present: ['Rebar', 'Steel Mesh', 'Steel Profiles'],
			prompt: '222 steel. rush please',
		},
		{
			absent: [
				'Portland Cement',
				'Ready Mix Concrete',
				'White Cement',
				'Rebar',
				'Steel Mesh',
				'Steel Profiles',
			],
			present: ['Plywood', 'Formwork Boards', 'Structural Timber'],
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
		await clearCartForWorkbench(page)
		await sendPortalChat(page, 'hey, i want some cement')
		await expectProductChoiceCard(page)
		await expect(
			page.getByText(/If you did not give a quantity/i).last(),
		).toBeVisible({ timeout: 30_000 })
		await expect(page.getByLabel(/quantity for .*cement/i)).toHaveCount(0)
		await page
			.getByRole('button', {
				name: productChoiceButtonRegex('Portland Cement'),
			})
			.last()
			.click()
		await expectProductChoiceCard(page)
		await page
			.getByRole('button', {
				name: productChoiceButtonRegex('Lafarge Portland Cement'),
			})
			.last()
			.click()
		const quantityInput = page.getByLabel(/quantity for .*cement/i).last()
		await expect(quantityInput).toBeVisible({ timeout: 30_000 })
		await expect(quantityInput).toBeFocused()
		await quantityInput.fill('0')
		await expect(page.getByLabel(/quantity for .*cement/i)).toHaveCount(0)
		await expect(page.getByText('Draft materials')).toHaveCount(0, {
			timeout: 3_000,
		})
		await expectProductChoiceCard(page)
		await page
			.getByRole('button', {
				name: productChoiceButtonRegex('Lafarge Portland Cement'),
			})
			.last()
			.click()
		const reopenedQuantityInput = page
			.getByLabel(/quantity for .*cement/i)
			.last()
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
		await expectDraftLine(page, {
			name: 'Lafarge Portland Cement',
			quantity: 301,
		})
	} finally {
		await context.close()
	}
})

test('portal AI asks before adding ambiguous follow-up materials to an active draft', async ({
	browser,
}) => {
	test.setTimeout(360_000)
	const env = readLocalSupabaseEnv()
	const { context, page } = await openCustomerPortal(browser, env)
	try {
		await clearCartForWorkbench(page)
		await sendPortalChat(page, 'hey, i want some wood')
		await expectProductChoiceCard(page)
		await chooseProduct(page, 'Plywood')
		await chooseProductWithQuantity(
			page,
			'Film Faced Plywood 18mm',
			/quantity for .*wood/i,
			500,
		)
		await expectDraftLine(page, {
			name: 'Film Faced Plywood 18mm',
			quantity: 500,
		})

		await sendPortalChat(page, 'how about some cement')
		await expectProductChoiceCard(page)
		await expectDraftLine(page, {
			name: 'Film Faced Plywood 18mm',
			quantity: 500,
		})
		for (const productName of [
			'Lafarge Portland Cement',
			'Cemex Ready Mix Concrete C25',
			'Ezz Al Arab White Cement',
		]) {
			await expectNoDraftLine(page, productName)
		}

		await chooseProduct(page, 'Portland Cement')
		await chooseProductWithQuantity(
			page,
			'Lafarge Portland Cement',
			/quantity for .*cement/i,
			301,
		)
		await expectDraftLine(page, {
			name: 'Film Faced Plywood 18mm',
			quantity: 500,
		})
		await expectDraftLine(page, {
			name: 'Lafarge Portland Cement',
			quantity: 301,
		})
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

test('portal AI treats no-quantity material requests as product choices', async ({
	browser,
}) => {
	test.setTimeout(180_000)
	const env = readLocalSupabaseEnv()
	const { context, page } = await openCustomerPortal(browser, env)
	try {
		await sendPortalChat(page, 'hey give me wood')
		await expectProductChoiceCard(page)
		await expect(page.locator('body')).not.toContainText(
			/type of wood|dimensions|quantity do you need/i,
			{ timeout: 3_000 },
		)
		await chooseProductWithQuantity(page, 'Plywood', /quantity for wood/i, 25)
		await expectDraftLine(page, { name: 'Plywood', quantity: 25 })
		await expectDraftLineCount(page, 1)
	} finally {
		await context.close()
	}
})

test('portal AI asks for quantity before drafting a specific product without one', async ({
	browser,
}) => {
	test.setTimeout(180_000)
	const env = readLocalSupabaseEnv()
	const { context, page } = await openCustomerPortal(browser, env)
	try {
		await sendPortalChat(page, 'i want plywood')
		await expectProductChoiceCard(page)
		await expect(page.getByText('Draft materials')).toHaveCount(0, {
			timeout: 3_000,
		})
		await page
			.getByRole('button', { name: productChoiceButtonRegex('Plywood') })
			.last()
			.click()
		const quantityInput = page.getByLabel(/quantity for plywood/i).last()
		await expect(quantityInput).toBeVisible({ timeout: 30_000 })
		await expect(quantityInput).toBeFocused()
		await quantityInput.fill('80')
		await quantityInput.press('Enter')
		await waitForPortalChatIdle(page)
		await expectDraftLine(page, { name: 'Plywood', quantity: 80 })
		await expectDraftLineCount(page, 1)
	} finally {
		await context.close()
	}
})

test('portal AI merges repeated catalog products in the active draft', async ({
	browser,
}) => {
	test.setTimeout(180_000)
	const env = readLocalSupabaseEnv()
	const { context, page } = await openCustomerPortal(browser, env)
	try {
		await sendPortalChat(page, 'give me 400 plywood and 40 ready mix')
		await expectDraftLine(page, { name: 'Plywood', quantity: 400 })
		await expectDraftLine(page, { name: 'Ready Mix', quantity: 40 })
		await expectDraftLineCount(page, 2)

		await sendPortalChat(page, 'add 20 plywood')
		await expectDraftLine(page, { name: 'Plywood', quantity: 420 })
		await expectDraftLine(page, { name: 'Ready Mix', quantity: 40 })
		await expectDraftLineCount(page, 2)
	} finally {
		await context.close()
	}
})

test('portal AI appends plain follow-up product requests to the active draft', async ({
	browser,
}) => {
	test.setTimeout(240_000)
	const env = readLocalSupabaseEnv()
	const { context, page } = await openCustomerPortal(browser, env)
	try {
		await sendPortalChat(page, 'give me 100 wood')
		await chooseProduct(page, 'Plywood')
		await expectDraftLine(page, { name: 'Plywood', quantity: 100 })
		await expectDraftLineCount(page, 1)

		await sendPortalChat(page, 'i want steel')
		await expectProductChoiceCard(page)
		await expectDraftLine(page, { name: 'Plywood', quantity: 100 })
		await chooseProductWithQuantity(
			page,
			'Steel Mesh',
			/quantity for steel/i,
			25,
		)
		await expectDraftLine(page, { name: 'Plywood', quantity: 100 })
		await expectDraftLine(page, { name: 'Steel Mesh', quantity: 25 })
		await expectDraftLineCount(page, 2)
	} finally {
		await context.close()
	}
})

test('portal AI applies bare quantity additions to the single active draft line', async ({
	browser,
}) => {
	test.setTimeout(180_000)
	const env = readLocalSupabaseEnv()
	const { context, page } = await openCustomerPortal(browser, env)
	try {
		await sendPortalChat(page, 'give me 2000 steel angle')
		await expectDraftLine(page, { name: 'Steel Angle', quantity: 2000 })
		await expectDraftLineCount(page, 1)

		await sendPortalChat(page, 'add 20')
		await expectDraftLine(page, { name: 'Steel Angle', quantity: 2020 })
		await expectDraftLineCount(page, 1)
		await expect(page.locator('body')).not.toContainText(
			/could not find an available product for add/i,
			{ timeout: 3_000 },
		)
	} finally {
		await context.close()
	}
})

test('portal AI resolves Arabic and mixed-language product names to the same catalog products', async ({
	browser,
}) => {
	test.setTimeout(180_000)
	const env = readLocalSupabaseEnv()
	const { context, page } = await openCustomerPortal(browser, env)
	try {
		await sendPortalChat(page, 'عايز 400 أبلكاش, 40 خرسانة جاهزة')
		await expectDraftLine(page, { name: 'Plywood', quantity: 400 })
		await expectDraftLine(page, { name: 'Ready Mix', quantity: 40 })
		await expectDraftLineCount(page, 2)

		await sendPortalChat(page, 'add 20 أبلكاش')
		await expectDraftLine(page, { name: 'Plywood', quantity: 420 })
		await expectDraftLine(page, { name: 'Ready Mix', quantity: 40 })
		await expectDraftLineCount(page, 2)
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
	await context.addInitScript(() => {
		window.localStorage.removeItem('hq-portal-chat')
		window.sessionStorage.removeItem('hq-portal-chat-draft-workspace:v1')
	})
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
	await closeCartIfOpen(page)
	const input = page.locator('[data-chat-input]').last()
	await expect(input).toBeEnabled({ timeout: 30_000 })
	await input.fill(text)
	await input.press('Enter')
	await expect(input).toHaveValue('', { timeout: 10_000 })
	await waitForPortalChatIdle(page)
}

async function chooseProduct(page: Page, productName: string) {
	await waitForPortalChatIdle(page)
	await closeCartIfOpen(page)
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
	await closeCartIfOpen(page)
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
	await expect(page.locator('[data-product-choice-list]').last()).toBeVisible({
		timeout: 30_000,
	})
}

async function expectClarificationSheet(page: Page) {
	const sheet = page.locator('[data-clarification-sheet]').last()
	await expect(sheet).toBeVisible({ timeout: 30_000 })
	return sheet
}

function productChoiceButtonRegex(productName: string): RegExp {
	return new RegExp(
		`^(?:(?:Add more|Add|Use|Open)\\s+|Next:\\s*)?${escapeRegex(productName)}$`,
		'i',
	)
}

async function expectDraftLine(page: Page, expected: ExpectedDraftLine) {
	await expect(page.getByText('Draft materials').last()).toBeVisible({
		timeout: 30_000,
	})
	const openCart = page.getByRole('button', { name: 'Open cart' }).last()
	if (await openCart.isVisible().catch(() => false)) await openCart.click()
	try {
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
	} catch (error) {
		throw new Error(
			`${error instanceof Error ? error.message : error}\n${await readWorkbenchDebugState(page)}`,
		)
	}
}

async function readCartQuantity(page: Page, productName: string) {
	const input = page.getByLabel(
		new RegExp(`quantity for ${escapeRegex(productName)}`, 'i'),
	)
	if ((await input.count()) === 0) return 0
	const value = Number.parseInt(await input.last().inputValue(), 10)
	return Number.isFinite(value) ? value : 0
}

async function removeCartLineIfPresent(page: Page, productName: string) {
	const input = page
		.getByLabel(new RegExp(`quantity for ${escapeRegex(productName)}`, 'i'))
		.last()
	if (!(await input.isVisible().catch(() => false))) return
	const row = input.locator(
		'xpath=ancestor::div[.//button[@aria-label="Remove item"]][1]',
	)
	await row.getByRole('button', { name: 'Remove item' }).click()
	await expect(input).toBeHidden({ timeout: 10_000 })
	await page.waitForTimeout(800)
}

async function clearCartForWorkbench(page: Page) {
	const quantityInputs = page.locator('input[aria-label^="Quantity for "]')
	if ((await quantityInputs.count()) === 0) return
	const clearButton = page.getByRole('button', { name: 'Clear Cart' }).last()
	await expect(clearButton).toBeEnabled({ timeout: 10_000 })
	await clearButton.click()
	await expect(quantityInputs).toHaveCount(0, { timeout: 10_000 })
	await page.waitForTimeout(800)
}

async function closeCartIfOpen(page: Page) {
	const cartDialog = page.getByRole('dialog', { name: 'Cart' })
	for (let attempt = 0; attempt < 3; attempt += 1) {
		if (!(await cartDialog.isVisible().catch(() => false))) return
		await page.keyboard.press('Escape')
		if (await cartDialog.isVisible().catch(() => false)) {
			await cartDialog
				.getByRole('button', { name: 'Close cart' })
				.evaluate((button: HTMLButtonElement) => button.click())
		}
		await expect(cartDialog).toBeHidden({ timeout: 5_000 })
		await page.waitForTimeout(250)
	}
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
