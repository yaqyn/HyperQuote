import {
	installableAppLinks,
	installableAppMeta,
} from '@hyperquote/ui/head/pwa'
import { registerServiceWorker } from '@hyperquote/ui/pwa/service-worker'
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
		meta: installableAppMeta({
			appName: 'HyperQuote',
			tileColor: '#2563EB',
			themeColor: '#0A0A0A',
		}),
		links: installableAppLinks({
			lightIconHref: '/LyonBlack.svg',
			darkIconHref: '/LyonWhite.svg',
			stylesheetHref: styles,
		}),
	}),
	component: RootComponent,
})

function RootComponent() {
	const routeContext = Route.useRouteContext() as { locale?: 'ar' | 'en' }
	const locale = routeContext.locale ?? (i18n.language === 'ar' ? 'ar' : 'en')
	const dir = locale === 'ar' ? 'rtl' : 'ltr'

	useEffect(() => {
		initTheme()
		if (import.meta.env.PROD) registerServiceWorker()
	}, [])

	return (
		<html lang={locale} dir={dir} data-theme="light" suppressHydrationWarning>
			<head>
				<HeadContent />
				<script
					dangerouslySetInnerHTML={{
						__html: `(function(){
							var g=globalThis;
							var p=g.process;
							if(!p||typeof p!=="object")p=g.process={};
							if(!p.env||typeof p.env!=="object")p.env={};
							if(!p.env.TSS_SERVER_FN_BASE)p.env.TSS_SERVER_FN_BASE="/_serverFn/";
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
