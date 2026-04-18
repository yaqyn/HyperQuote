import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { I18nProvider } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { SelectionCopy } from '../components/shared/SelectionCopy'
import { setupI18n } from '../lib/i18n'
import styles from '../styles.css?url'

function detectLocale(request?: Request): 'ar' | 'en' {
	if (!request) {
		if (typeof localStorage !== 'undefined') {
			const stored = localStorage.getItem('hq-locale')
			if (stored === 'ar' || stored === 'en') return stored
		}
		return 'en'
	}

	const cookieHeader = request.headers.get('cookie') ?? ''
	const match = cookieHeader.match(/hq-locale=(ar|en)/)
	if (match) return match[1] as 'ar' | 'en'

	return 'en'
}

export const Route = createRootRoute({
	beforeLoad: async ({ context }) => {
		const request = (context as Record<string, unknown>).request as
			| Request
			| undefined
		const locale = detectLocale(request)
		await setupI18n(locale)
		return { locale }
	},
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ name: 'title', content: 'HyperQuote' },
			{ name: 'apple-mobile-web-app-capable', content: 'yes' },
			{ name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
			{ name: 'apple-mobile-web-app-title', content: 'HyperQuote' },
			{
				name: 'theme-color',
				content: '#f4efe6',
				media: '(prefers-color-scheme: light)',
			},
			{
				name: 'theme-color',
				content: '#f4efe6',
				media: '(prefers-color-scheme: dark)',
			},
		],
		links: [
			{
				rel: 'icon',
				type: 'image/png',
				sizes: '96x96',
				href: '/favicon-96x96.png',
			},
			{
				rel: 'icon',
				type: 'image/svg+xml',
				sizes: 'any',
				href: '/favicon.svg',
			},
			{ rel: 'icon', href: '/favicon.ico' },
			{ rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
			{ rel: 'manifest', href: '/site.webmanifest' },
			{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
			{
				rel: 'preconnect',
				href: 'https://fonts.gstatic.com',
				crossOrigin: 'anonymous',
			},
			{
				rel: 'stylesheet',
				href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Fraunces:ital,opsz,wght@0,9..144,300..500;1,9..144,300..500&display=swap',
			},
			{ rel: 'stylesheet', href: styles },
		],
	}),
	component: RootComponent,
})

function RootComponent() {
	const { t } = useTranslation('portal')
	const routeContext = Route.useRouteContext() as { locale?: 'ar' | 'en' }
	const locale = routeContext.locale ?? 'en'
	const [queryClient] = useState(() => new QueryClient())

	// Dark theme only — no toggle. The /login atelier-scene is scoped separately.

	// Document-level UX guards: disable right-click menu and block Ctrl/Cmd+A
	// outside text inputs. Attached to document because <body> with interactive
	// handlers violates a11y linting (static element + interactive role).
	useEffect(() => {
		function onContextMenu(e: Event) {
			e.preventDefault()
		}
		function onKeyDown(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
				const target = e.target as HTMLElement | null
				if (!target) return
				const tag = target.tagName
				if (
					tag !== 'INPUT' &&
					tag !== 'TEXTAREA' &&
					!target.isContentEditable
				) {
					e.preventDefault()
				}
			}
		}
		document.addEventListener('contextmenu', onContextMenu)
		document.addEventListener('keydown', onKeyDown)
		return () => {
			document.removeEventListener('contextmenu', onContextMenu)
			document.removeEventListener('keydown', onKeyDown)
		}
	}, [])

	return (
		<html lang={locale} dir="ltr" data-theme="dark">
			<head>
				<HeadContent />
			</head>
			<body
				className={`bg-[var(--p-bg)] text-[var(--p-text)] antialiased ${locale === 'ar' ? 'font-arabic' : 'font-sans'}`}
			>
				<QueryClientProvider client={queryClient}>
					<a
						href="#main"
						className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-[var(--p-accent)] focus:text-white"
					>
						{t('a11y.skipToContent')}
					</a>
					<I18nProvider locale={locale}>
						<Outlet />
					</I18nProvider>
				</QueryClientProvider>
				<SelectionCopy />
				<Scripts />
			</body>
		</html>
	)
}
