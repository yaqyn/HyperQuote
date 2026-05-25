import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useEffect } from 'react'
import { I18nProvider } from 'react-aria-components/I18nProvider'
import { I18nextProvider, useTranslation } from 'react-i18next'
import { ChatWidget } from '../components/chat/ChatWidget'
import { OfflineBanner } from '../components/layout/OfflineBanner'
import { SiteContextMenu } from '../components/layout/SiteContextMenu'
import { SelectionCopy } from '../components/shared/SelectionCopy'
import { i18n, setupI18n } from '../lib/i18n'
import { registerWebsiteServiceWorker } from '../lib/pwa'
import { initTheme } from '../lib/theme'
import styles from '../styles.css?url'

const getServerLocale = createServerFn().handler(async () => {
	const { getCookie } = await import('@tanstack/react-start/server')
	const locale = getCookie('hq-locale')
	return locale === 'ar' || locale === 'en' ? locale : 'en'
})

function detectClientLocale(): 'ar' | 'en' {
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

export const Route = createRootRoute({
	beforeLoad: async () => {
		let locale: 'ar' | 'en'
		if (typeof window === 'undefined') {
			locale = await getServerLocale()
		} else {
			locale = detectClientLocale()
		}
		await setupI18n(locale)
		return { locale }
	},
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ name: 'mobile-web-app-capable', content: 'yes' },
			{ name: 'apple-mobile-web-app-capable', content: 'yes' },
			{ name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
			{ name: 'apple-mobile-web-app-title', content: 'HyperQuote' },
			{ name: 'application-name', content: 'HyperQuote' },
			{ name: 'format-detection', content: 'telephone=no' },
			{ name: 'color-scheme', content: 'light dark' },
			{
				name: 'theme-color',
				content: '#ffffff',
				media: '(prefers-color-scheme: light)',
			},
			{
				name: 'theme-color',
				content: '#0A0A0A',
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
				sizes: 'any' as string,
				href: '/favicon.svg',
			},
			{ rel: 'icon', href: '/favicon.ico' },
			{ rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
			{ rel: 'manifest', href: '/site.webmanifest' },
			{ rel: 'stylesheet', href: styles },
		],
	}),
	component: RootComponent,
})

function RootComponent() {
	const routeContext = Route.useRouteContext() as { locale?: 'ar' | 'en' }
	const locale = routeContext.locale ?? (i18n.language === 'ar' ? 'ar' : 'en')
	const dir = locale === 'ar' ? 'rtl' : 'ltr'

	useEffect(() => {
		initTheme()
		if (import.meta.env.PROD) registerWebsiteServiceWorker()
	}, [])

	return (
		<html lang={locale} dir={dir} data-theme="light" suppressHydrationWarning>
			<head>
				<HeadContent />
				<script
					dangerouslySetInnerHTML={{
						__html: `(function(){
							var d=document.documentElement;
							var t=localStorage.getItem("hq-theme");
							if(t==="dark"||t==="light")d.setAttribute("data-theme",t);
							var l=localStorage.getItem("hq-locale");
							if(l){d.lang=l;d.dir=l==="ar"?"rtl":"ltr";}
						})()`,
					}}
				/>
			</head>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: global UX polish on <body> — cannot be swapped for a button */}
			<body
				className="bg-[var(--color-base)] text-[var(--color-text)] transition-colors"
				onKeyDown={(e) => {
					if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
						const tag = (e.target as HTMLElement).tagName
						if (
							tag !== 'INPUT' &&
							tag !== 'TEXTAREA' &&
							!(e.target as HTMLElement).isContentEditable
						) {
							e.preventDefault()
						}
					}
				}}
			>
				<I18nextProvider i18n={i18n}>
					<OfflineBanner />
					<SkipLink />
					<I18nProvider locale={locale}>
						<Outlet />
						<ChatWidget />
						<SelectionCopy />
						<SiteContextMenu />
					</I18nProvider>
				</I18nextProvider>
				<Scripts />
			</body>
		</html>
	)
}

function SkipLink() {
	const { t } = useTranslation('website')

	return (
		<a
			href="#main"
			className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-[var(--color-primary)] focus:text-white"
		>
			{t('a11y.skipToContent')}
		</a>
	)
}
