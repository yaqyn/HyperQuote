import {
	installableAppLinks,
	installableAppMeta,
} from '@hyperquote/ui/head/pwa'
import { registerServiceWorker } from '@hyperquote/ui/pwa/service-worker'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
	useRouterState,
} from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { I18nProvider } from 'react-aria-components/I18nProvider'
import { SelectionCopy } from '../components/shared/SelectionCopy'
import '../lib/i18n'
import { internalHead } from '../lib/page-meta'
import styles from '../styles.css?url'

export const Route = createRootRoute({
	head: () => {
		const baseHead = internalHead({
			title: 'HyperQuote Internal Ops',
			description:
				'Private HyperQuote operations console for sales, procurement, warehouse, finance, dispatch, customer service, admin, and search teams.',
			path: '/',
		})
		return {
			...baseHead,
			meta: [
				...installableAppMeta({
					appName: 'Base',
					includeApplicationName: false,
					tileColor: '#ffffff',
					themeColor: '#0A0A0A',
				}),
				...baseHead.meta,
			],
			links: [
				...baseHead.links,
				...installableAppLinks({
					lightIconHref: '/brand/logos/LyonBlack.svg',
					darkIconHref: '/brand/logos/LyonWhite.svg',
					extraLinks: [
						{ rel: 'stylesheet', href: styles },
						{
							rel: 'stylesheet',
							href: 'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&display=swap',
						},
						{
							rel: 'stylesheet',
							href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
						},
						{
							rel: 'stylesheet',
							href: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..900,0..100;1,9..144,300..900,0..100&display=swap',
						},
						{
							rel: 'stylesheet',
							href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..800&display=swap',
						},
						{
							rel: 'stylesheet',
							href: 'https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400..700;1,7..72,400..700&display=swap',
						},
						{
							rel: 'stylesheet',
							href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap',
						},
						{
							rel: 'stylesheet',
							href: 'https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap',
						},
					],
				}),
			],
		}
	},
	component: RootComponent,
})

function RootComponent() {
	const isAuthScreen = useRouterState({
		select: (state) => state.location.pathname === '/login',
	})
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						// Real-time defaults: every query is instantly stale, refetches
						// on mount + window focus, and polls every 3s so writes from
						// any panel show up in every other panel within one tick.
						// Individual queries can still override if they need a longer
						// cadence.
						staleTime: 0,
						gcTime: 5 * 60 * 1000,
						refetchOnMount: 'always',
						refetchOnWindowFocus: true,
						refetchOnReconnect: true,
						refetchInterval: 3000,
						refetchIntervalInBackground: false,
						retry: 1,
					},
				},
			}),
	)

	// Global UX hardening: block right-click + suppress Ctrl/Cmd+A outside
	// editable fields. Attached at the document level so <body> stays a
	// pure landmark (biome's noStaticElementInteractions flags handlers on
	// the body element otherwise).
	useEffect(() => {
		if (import.meta.env.PROD) registerServiceWorker()

		function handleContextMenu(e: MouseEvent) {
			e.preventDefault()
		}
		function handleKeyDown(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
				const target = e.target as HTMLElement | null
				const tag = target?.tagName
				if (
					tag !== 'INPUT' &&
					tag !== 'TEXTAREA' &&
					!target?.isContentEditable
				) {
					e.preventDefault()
				}
			}
		}
		document.addEventListener('contextmenu', handleContextMenu)
		document.addEventListener('keydown', handleKeyDown)
		return () => {
			document.removeEventListener('contextmenu', handleContextMenu)
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [])

	return (
		<html lang="en" dir="ltr">
			<head>
				<HeadContent />
				<script
					dangerouslySetInnerHTML={{
						__html:
							'(function(){var raw=localStorage.getItem("hq-theme");var t=(raw==="night-light"||raw==="paper"||raw==="dark")?"night-light":raw==="light"?"light":"light";if(t==="night-light")document.documentElement.setAttribute("data-theme","night-light");if(t!==raw){try{localStorage.setItem("hq-theme",t);}catch(e){}}})()',
					}}
				/>
			</head>
			<body className="bg-[var(--color-surface)] text-[var(--color-text)] font-[var(--font-inter)]">
				<QueryClientProvider client={queryClient}>
					<I18nProvider locale="en">
						<Outlet />
					</I18nProvider>
				</QueryClientProvider>
				<SelectionCopy isDisabled={isAuthScreen} />
				<Scripts />
			</body>
		</html>
	)
}
