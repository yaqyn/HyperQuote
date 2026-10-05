import { createInstance } from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it } from 'vitest'
import { PortfolioShell, portfolioLinks } from './PortfolioShell'

describe('portfolio navigation', () => {
	it('uses the four local app ports in development', () => {
		expect(portfolioLinks({ DEV: true }).map(({ href }) => href)).toEqual([
			'http://localhost:3000/',
			'http://localhost:3001/',
			'http://localhost:3002/',
			'http://localhost:3003/',
		])
	})

	it('uses configured destinations and rejects unsafe or missing hosted links', () => {
		expect(
			portfolioLinks({
				VITE_WEBSITE_URL: 'https://website.example.com',
				VITE_PORTAL_URL: 'javascript:alert(1)',
				VITE_INTERNAL_URL: 'https://user:password@internal.example.com',
			}),
		).toEqual([
			{ id: 'website', href: 'https://website.example.com/' },
			{ id: 'portal', href: undefined },
			{ id: 'internal', href: undefined },
			{ id: 'driver', href: undefined },
		])
	})

	it('keeps the normal app markup when portfolio mode is disabled', () => {
		const i18n = createInstance()
		i18n.init({ lng: 'en', initAsync: false })
		expect(
			renderToStaticMarkup(
				<I18nextProvider i18n={i18n}>
					<PortfolioShell
						app="website"
						env={{ DEV: true, VITE_PORTFOLIO_MODE: 'false' }}
					>
						<main>Application</main>
					</PortfolioShell>
				</I18nextProvider>,
			),
		).toBe('<main>Application</main>')
	})
})
