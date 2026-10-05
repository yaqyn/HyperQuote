import arCommon from '@hyperquote/i18n/locales/ar/common'
import enCommon from '@hyperquote/i18n/locales/en/common'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type PortfolioApp = 'website' | 'portal' | 'internal' | 'driver'

interface PortfolioEnvironment {
	DEV?: boolean
	VITE_PORTFOLIO_MODE?: string
	VITE_WEBSITE_URL?: string
	VITE_PORTAL_URL?: string
	VITE_INTERNAL_URL?: string
	VITE_DRIVER_URL?: string
}

const destinations = [
	{ id: 'website', variable: 'VITE_WEBSITE_URL', port: 3000 },
	{ id: 'portal', variable: 'VITE_PORTAL_URL', port: 3001 },
	{ id: 'internal', variable: 'VITE_INTERNAL_URL', port: 3002 },
	{ id: 'driver', variable: 'VITE_DRIVER_URL', port: 3003 },
] as const

export function portfolioLinks(env: PortfolioEnvironment) {
	return destinations.map(({ id, variable, port }) => {
		const configured = env[variable]?.trim()
		const candidate = configured || (env.DEV ? `http://localhost:${port}` : '')
		try {
			const url = new URL(candidate)
			const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
			const allowed =
				url.protocol === 'https:' ||
				(env.DEV && local && url.protocol === 'http:')
			return {
				id,
				href: allowed && !url.username && !url.password ? url.href : undefined,
			}
		} catch {
			return { id, href: undefined }
		}
	})
}

export function PortfolioShell({
	app,
	env,
	children,
}: {
	app: PortfolioApp
	env: PortfolioEnvironment
	children: ReactNode
}) {
	const { i18n } = useTranslation()
	const enabled =
		env.VITE_PORTFOLIO_MODE === undefined
			? env.DEV
			: env.VITE_PORTFOLIO_MODE === 'true'
	if (!enabled) return children

	const labels = i18n.language.startsWith('ar')
		? arCommon.portfolio
		: enCommon.portfolio

	return (
		<>
			<nav
				className="hq-portfolio-bar"
				aria-label={labels.navigation}
				dir={i18n.dir()}
			>
				<p className="hq-portfolio-title">{labels.title}</p>
				<div className="hq-portfolio-links">
					{portfolioLinks(env).map(({ id, href }) =>
						id === app || href ? (
							<a
								key={id}
								href={id === app ? '/' : href}
								aria-current={id === app ? 'true' : undefined}
							>
								{labels[id]}
							</a>
						) : (
							<span key={id} aria-disabled="true" title={labels.unavailable}>
								{labels[id]}
							</span>
						),
					)}
				</div>
			</nav>
			<div className="hq-portfolio-surface" data-portfolio-app={app}>
				{children}
			</div>
		</>
	)
}
