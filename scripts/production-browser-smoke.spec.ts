import { expect, test } from '@playwright/test'
import accounts from '../supabase/showcase-accounts.json' with { type: 'json' }

test.use({
	launchOptions: {
		executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
	},
})

for (const [app, origin, account, path] of [
	['website', 'https://www.hyperquote.net', accounts.customer, '/login'],
	['portal', 'https://portal.hyperquote.net', accounts.customer, '/login'],
	['internal', 'https://internal.hyperquote.net', accounts.admin, '/login'],
	['driver', 'https://driver.hyperquote.net', accounts.driver, '/'],
] as const) {
	test(`${app} authenticates the showcase account and retains its session`, async ({
		page,
	}) => {
		test.setTimeout(90_000)
		const errors: string[] = []
		page.on('pageerror', (error) => errors.push(error.message))
		const health = await page.request.get(`${origin}/api/health`)
		expect(health.ok()).toBe(true)
		expect(await health.json()).toMatchObject({ ok: true })
		await page.goto(`${origin}${path}`)
		const email = page.locator('input[type="email"]')
		const password = page.locator('input[type="password"]')
		await expect(email).toBeEditable({ timeout: 30_000 })
		await email.fill(account.email)
		await password.fill(account.password)
		if (app === 'website')
			await page
				.getByRole('main')
				.getByRole('button', { name: 'Sign in', exact: true })
				.click()
		else if (app === 'portal')
			await page.getByRole('button', { name: 'Sign In', exact: true }).click()
		else await page.locator('button[type="submit"]').click()
		await expect(email).toBeHidden({ timeout: 30_000 })
		if (app !== 'driver') await expect(page).not.toHaveURL(/\/login/)
		else
			await expect(
				page.getByRole('button', { name: /^(Online|Offline)\./ }),
			).toBeVisible({ timeout: 30_000 })
		await page.reload()
		if (app !== 'driver') await expect(page).not.toHaveURL(/\/login/)
		else
			await expect(
				page.getByRole('button', { name: /^(Online|Offline)\./ }),
			).toBeVisible({ timeout: 30_000 })
		await expect(email).toBeHidden({ timeout: 30_000 })
		await expect(page.locator('body')).not.toContainText(
			/Something went wrong|Unable to load your dashboard|Internal Server Error/,
		)
		expect(errors).toEqual([])
	})
}
