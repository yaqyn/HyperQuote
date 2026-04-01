import { useEffect } from 'react'
import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRoute,
} from '@tanstack/react-router'
import { I18nProvider } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { OfflineBanner } from '../components/layout/OfflineBanner'
import styles from '../styles.css?url'
import { setupI18n } from '../lib/i18n'
import { initTheme } from '../lib/theme'

function detectLocale(request?: Request): 'ar' | 'en' {
	// Client-side: read from localStorage or current i18n state
	if (!request) {
		if (typeof localStorage !== 'undefined') {
			const stored = localStorage.getItem('hq-locale')
			if (stored === 'ar' || stored === 'en') return stored
		}
		return 'en'
	}

	// Server-side: check cookie → Accept-Language → default
	const cookieHeader = request.headers.get('cookie') ?? ''
	const match = cookieHeader.match(/hq-locale=(ar|en)/)
	if (match) return match[1] as 'ar' | 'en'

	return 'en'
}

export const Route = createRootRoute({
	beforeLoad: async ({ context }) => {
		const request = (context as Record<string, unknown>).request as Request | undefined
		const locale = detectLocale(request)
		await setupI18n(locale)
		return { locale }
	},
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
		],
		links: [{ rel: 'stylesheet', href: styles }],
	}),
	component: RootComponent,
})

function RootComponent() {
	const { i18n, t } = useTranslation('website')
	const routeContext = Route.useRouteContext() as { locale?: 'ar' | 'en' }
	const locale = routeContext.locale ?? (i18n.language === 'ar' ? 'ar' : 'en')
	const dir = locale === 'ar' ? 'rtl' : 'ltr'

	useEffect(() => {
		initTheme()
	}, [])

	return (
		<html lang={locale} dir={dir}>
			<head>
				<HeadContent />
				<script
					dangerouslySetInnerHTML={{
						__html: '(function(){var t=localStorage.getItem("hq-theme");if(t)document.documentElement.setAttribute("data-theme",t);})()',
					}}
				/>
			</head>
			<body className="bg-[var(--color-base)] text-[var(--color-text)] transition-colors">
				<OfflineBanner />
				<a
					href="#main"
					className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-[var(--color-primary)] focus:text-white"
				>
					{t('a11y.skipToContent')}
				</a>
				<I18nProvider locale={locale}>
					<Outlet />
				</I18nProvider>
				<Scripts />
			</body>
		</html>
	)
}
