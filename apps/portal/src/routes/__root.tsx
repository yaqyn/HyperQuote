import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { I18nProvider } from 'react-aria-components/I18nProvider'
import { I18nextProvider, useTranslation } from 'react-i18next'
import { SelectionCopy } from '../components/shared/SelectionCopy'
import { i18n, setupI18n } from '../lib/i18n'
import { portalHead } from '../lib/page-meta'
import { registerPortalServiceWorker } from '../lib/pwa'
import {
	applyPortalTheme,
	detectPortalTheme,
	type PortalTheme,
	portalThemeColor,
	readStoredPortalTheme,
} from '../lib/theme'
import styles from '../styles.css?url'

function detectLocale(request?: Request): 'ar' | 'en' {
	if (!request) {
		if (typeof localStorage !== 'undefined') {
			const stored = localStorage.getItem('hq-locale')
			if (stored === 'ar' || stored === 'en') return stored
		}
		if (typeof document !== 'undefined') {
			if (document.documentElement.dir === 'rtl') return 'ar'
			const match = document.cookie.match(/hq-locale=(ar|en)/)
			if (match) return match[1] as 'ar' | 'en'
		}
		return 'en'
	}

	const cookieHeader = request.headers.get('cookie') ?? ''
	const match = cookieHeader.match(/hq-locale=(ar|en)/)
	if (match) return match[1] as 'ar' | 'en'

	return 'en'
}

const getServerBootstrap = createServerFn({ method: 'GET' }).handler(
	async () => {
		const { getRequest } = await import('@tanstack/react-start/server')
		const request = getRequest()
		return {
			locale: detectLocale(request),
			theme: detectPortalTheme(request),
		}
	},
)

async function getPortalBootstrap(context: unknown): Promise<{
	locale: 'ar' | 'en'
	theme: PortalTheme
}> {
	const contextRequest = (context as { request?: unknown }).request
	if (contextRequest instanceof Request) {
		return {
			locale: detectLocale(contextRequest),
			theme: detectPortalTheme(contextRequest),
		}
	}
	if (!import.meta.env.SSR) {
		return {
			locale: detectLocale(),
			theme: detectPortalTheme(),
		}
	}

	try {
		return await getServerBootstrap()
	} catch {
		return {
			locale: detectLocale(),
			theme: detectPortalTheme(),
		}
	}
}

export const Route = createRootRoute({
	beforeLoad: async ({ context }) => {
		const { locale, theme } = await getPortalBootstrap(context)
		await setupI18n(locale)
		return { locale, theme }
	},
	head: () => {
		const baseHead = portalHead({
			title: 'HyperQuote Portal',
			description:
				'Private HyperQuote customer portal for quote requests, order tracking, documents, account settings, and support.',
			path: '/',
		})
		return {
			...baseHead,
			meta: [
				{ charSet: 'utf-8' },
				{
					name: 'viewport',
					content: 'width=device-width, initial-scale=1, viewport-fit=cover',
				},
				...baseHead.meta,
				{ name: 'mobile-web-app-capable', content: 'yes' },
				{ name: 'apple-mobile-web-app-capable', content: 'yes' },
				{ name: 'apple-mobile-web-app-status-bar-style', content: 'black' },
				{ name: 'apple-mobile-web-app-title', content: 'Lyon' },
				{ name: 'format-detection', content: 'telephone=no' },
				{ name: 'color-scheme', content: 'light dark' },
				{ name: 'msapplication-TileColor', content: '#2563EB' },
				{ name: 'msapplication-TileImage', content: '/mstile-150x150.png' },
				{ name: 'msapplication-config', content: '/browserconfig.xml' },
			],
			links: [
				...baseHead.links,
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
				{
					rel: 'apple-touch-icon',
					sizes: '152x152',
					href: '/apple-touch-icon-152x152.png',
				},
				{
					rel: 'apple-touch-icon',
					sizes: '167x167',
					href: '/apple-touch-icon-167x167.png',
				},
				{
					rel: 'apple-touch-icon',
					sizes: '180x180',
					href: '/apple-touch-icon-180x180.png',
				},
				{ rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
				{ rel: 'mask-icon', href: '/favicon.svg', color: '#2563EB' },
				{ rel: 'manifest', href: '/site.webmanifest' },
				{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
				{
					rel: 'preconnect',
					href: 'https://fonts.gstatic.com',
					crossOrigin: 'anonymous',
				},
				{
					rel: 'stylesheet',
					href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Fraunces:ital,opsz,wght@0,9..144,300..500;1,9..144,300..500&family=Sora:wght@400;500;600;700&display=swap',
				},
				{ rel: 'stylesheet', href: styles },
			],
		}
	},
	component: RootComponent,
})

function RootComponent() {
	const routeContext = Route.useRouteContext() as {
		locale?: 'ar' | 'en'
		theme?: PortalTheme
	}
	const locale = routeContext.locale ?? 'en'
	const theme = routeContext.theme ?? 'light'
	const [queryClient] = useState(() => new QueryClient())

	useEffect(() => {
		applyPortalTheme(readStoredPortalTheme() ?? theme)
		if (import.meta.env.PROD) registerPortalServiceWorker()
	}, [theme])

	useEffect(() => {
		void setupI18n(locale)
		document.documentElement.setAttribute('lang', locale)
		document.documentElement.setAttribute(
			'dir',
			locale === 'ar' ? 'rtl' : 'ltr',
		)
	}, [locale])

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
		<html
			lang={locale}
			dir={locale === 'ar' ? 'rtl' : 'ltr'}
			data-theme={theme}
		>
			<head>
				<HeadContent />
				<meta name="theme-color" content={portalThemeColor(theme)} />
			</head>
			<body
				className={`bg-[var(--p-bg)] text-[var(--p-text)] antialiased ${locale === 'ar' ? 'font-arabic' : 'font-sans'}`}
			>
				<QueryClientProvider client={queryClient}>
					<I18nextProvider i18n={i18n}>
						<SkipLink />
						<I18nProvider locale={locale}>
							<Outlet />
						</I18nProvider>
					</I18nextProvider>
				</QueryClientProvider>
				<SelectionCopy />
				<Scripts />
			</body>
		</html>
	)
}

function SkipLink() {
	const { t } = useTranslation('portal')

	return (
		<a
			href="#main"
			className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-[var(--p-accent)] focus:text-[var(--p-accent-contrast)]"
		>
			{t('a11y.skipToContent')}
		</a>
	)
}
