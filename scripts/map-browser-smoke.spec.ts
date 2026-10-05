import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const sharedMapPath = `/@fs${fileURLToPath(new URL('../packages/ui/src/quote-flow/QuoteLocationMap.tsx', import.meta.url))}`

test.use({
	viewport: { width: 1280, height: 1000 },
	launchOptions: {
		executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
		args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'],
	},
})

for (const surface of ['sales', 'quote'] as const) {
	test(`${surface} map loads its worker and supports click, pan, and zoom`, async ({
		page,
	}) => {
		test.setTimeout(60_000)
		const errors: string[] = []
		page.on('pageerror', (error) => errors.push(error.message))
		page.on('console', (message) => {
			if (
				message.type() === 'error' &&
				/Worker failed|MapLibre|reading 'center'/.test(message.text())
			)
				errors.push(message.text())
		})
		await page.route(
			'https://nominatim.openstreetmap.org/reverse?**',
			(route) =>
				route.fulfill({
					json: {
						display_name: 'Test delivery street, Cairo, Egypt',
						address: {
							road: 'Test delivery street',
							city: 'Cairo',
							country: 'Egypt',
						},
					},
				}),
		)
		await page.goto('http://localhost:3002/login')
		// Mount the actual client map without creating or editing business records.
		await page.evaluate(
			async ({ mapSurface, sharedMapPath }) => {
				const reactPath = '/node_modules/.vite/deps/react.js'
				const domPath = '/node_modules/.vite/deps/react-dom_client.js'
				const componentPath =
					mapSurface === 'sales'
						? '/src/components/sales/quote-builder/DeliveryMap.tsx'
						: sharedMapPath
				const reactModule = await import(reactPath)
				const domModule = await import(domPath)
				const React = reactModule.default ?? reactModule
				const ReactDOM = domModule.default ?? domModule
				const components = await import(componentPath)
				const host = document.createElement('div')
				host.id = 'map-regression-fixture'
				host.style.cssText =
					'position:fixed;inset:0;width:520px;height:800px;z-index:99999'
				document.body.append(host)
				const element =
					mapSurface === 'sales'
						? React.createElement(components.DeliveryMap, {
								address: '',
								coordinates: null,
								onAddressChange: () => {
									host.dataset.confirmed = 'true'
								},
							})
						: React.createElement(components.QuoteLocationMap, {
								focusPoint: null,
								point: null,
								onPointChange: () => {
									host.dataset.selected = 'true'
								},
							})
				ReactDOM.createRoot(host).render(element)
			},
			{ mapSurface: surface, sharedMapPath },
		)
		const canvas = page.locator('#map-regression-fixture .maplibregl-canvas')
		await expect(canvas).toBeVisible({ timeout: 30_000 })
		await canvas.click({ position: { x: 260, y: 360 } })
		if (surface === 'sales') {
			await page
				.getByRole('button', { name: 'Deliver here', exact: true })
				.click()
			await expect(page.locator('#map-regression-fixture')).toHaveAttribute(
				'data-confirmed',
				'true',
			)
		} else {
			await expect(page.locator('#map-regression-fixture')).toHaveAttribute(
				'data-selected',
				'true',
			)
		}
		await canvas.hover({ position: { x: 260, y: 360 } })
		await page.mouse.down()
		await page.mouse.move(340, 420, { steps: 12 })
		await page.mouse.up()
		await page.mouse.wheel(0, -240)
		await expect(canvas).toBeVisible()
		expect(errors).toEqual([])
	})
}
