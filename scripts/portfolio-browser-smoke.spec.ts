import { expect, test } from '@playwright/test'
import demoAccounts from '../supabase/showcase-accounts.json' with {
	type: 'json',
}

test.use({
	launchOptions: {
		executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
	},
})

test('portal keeps a compact desktop card and full-screen tablet/mobile login', async ({
	page,
}) => {
	await page.goto('http://localhost:3001/login')
	await expect(page.locator('.atelier-page')).toBeVisible({ timeout: 15_000 })
	for (const width of [1214, 1024, 941, 640, 390, 320]) {
		await page.setViewportSize({ width, height: 967 })
		await expect(page.locator('.atelier-page')).toBeVisible()
		const panel = await page.locator('.atelier-page').boundingBox()
		expect(panel).not.toBeNull()
		if (!panel) throw new Error('Portal login panel is missing')
		if (width >= 1024) {
			expect(panel.height).toBeLessThan(700)
			expect(panel.width).toBeLessThan(500)
			await expect(page.locator('.auth-desktop-story')).toBeVisible()
		} else {
			expect(panel.x).toBe(0)
			expect(panel.width).toBe(width)
			expect(panel.height).toBeGreaterThanOrEqual(966)
			await expect(page.locator('.auth-desktop-story')).toBeHidden()
		}
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth),
		).toBe(width)
		const footer = await page.locator('.auth-legal-footer').boundingBox()
		const launcher = await page.locator('.hq-portfolio-launcher').boundingBox()
		if (!footer || !launcher)
			throw new Error('Login footer or launcher missing')
		expect(footer.y + footer.height).toBeLessThanOrEqual(launcher.y)
	}
})

test('website tablet hero and material list share the viewport centre', async ({
	page,
}) => {
	await page.goto('http://localhost:3000')
	await expect(page.locator('h1')).toBeVisible()
	for (const width of [768, 941, 1023]) {
		await page.setViewportSize({ width, height: 967 })
		const heading = await page.locator('h1').boundingBox()
		const docket = await page.locator('.hq-material-docket').boundingBox()
		if (!heading || !docket) throw new Error('Website hero is missing')
		expect(Math.abs(heading.x + heading.width / 2 - width / 2)).toBeLessThan(2)
		expect(Math.abs(docket.x + docket.width / 2 - width / 2)).toBeLessThan(2)
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth),
		).toBe(width)
	}
})

for (const [app, port, path] of [
	['website', 3000, '/'],
	['portal', 3001, '/login'],
	['internal', 3002, '/login'],
	['driver', 3003, '/'],
] as const) {
	test(`${app} launcher expands into five icons and opens accessible demo info`, async ({
		page,
	}) => {
		await page.setViewportSize({ width: 320, height: 740 })
		await page.goto(`http://localhost:${port}${path}`)
		const dock = page.getByRole('navigation', {
			name: 'Explore the HyperQuote apps',
		})
		await expect(dock).toHaveAttribute('data-expanded', 'false')
		const toggle = dock.getByRole('button', {
			name: 'Explore HyperQuote',
			exact: true,
		})
		await expect(toggle).toBeEnabled({ timeout: 15_000 })
		await toggle.focus()
		await page.keyboard.press('Enter')
		await expect(dock).toHaveAttribute('data-expanded', 'true')
		await expect(dock.locator('a, button')).toHaveCount(5)
		await expect(dock.locator('[aria-current]')).toHaveCount(1)
		await expect(dock.locator('.hq-portfolio-app-icon')).toHaveCount(4)
		const bounds = await dock.boundingBox()
		if (!bounds) throw new Error('Portfolio dock is missing')
		expect(bounds.x).toBeGreaterThanOrEqual(0)
		expect(bounds.x + bounds.width).toBeLessThanOrEqual(320)
		await dock
			.getByRole('button', { name: 'About the project and demo access' })
			.click()
		const info = page.getByRole('dialog', {
			name: 'About the project and demo access',
		})
		await expect(info).toBeVisible()
		for (const account of Object.values(demoAccounts))
			await expect(info).toContainText(account.email)
		await expect(info.locator('dl')).toHaveCount(
			Object.keys(demoAccounts).length,
		)
		await page.keyboard.press('Escape')
		await expect(info).toBeHidden()
		await expect(dock).toHaveAttribute('data-expanded', 'true')
		await dock.locator('[aria-current]').focus()
		await page.keyboard.press('Escape')
		await expect(dock).toHaveAttribute('data-expanded', 'false')
		await expect(toggle).toBeFocused()
	})
}
