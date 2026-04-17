import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from '@tanstack/react-router'
import { useEffect } from 'react'
import { I18nProvider } from 'react-aria-components'
import { SelectionCopy } from '../components/shared/SelectionCopy'
import { registerServiceWorker } from '../lib/registerSW'
import '../styles.css'

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000,
			retry: 1,
		},
	},
})

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ name: 'apple-mobile-web-app-capable', content: 'yes' },
			{ name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
			{ name: 'apple-mobile-web-app-title', content: 'HyperQuote' },
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
				sizes: 'any',
				href: '/favicon.svg',
			},
			{ rel: 'icon', href: '/favicon.ico' },
			{ rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
			{ rel: 'manifest', href: '/site.webmanifest' },
			{
				rel: 'preconnect',
				href: 'https://fonts.googleapis.com',
			},
			{
				rel: 'preconnect',
				href: 'https://fonts.gstatic.com',
				crossOrigin: 'anonymous',
			},
			{
				rel: 'stylesheet',
				href: 'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Inter:wght@400;500;600&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap',
			},
		],
	}),
	component: RootComponent,
})

function RootComponent() {
	useEffect(() => {
		registerServiceWorker()
	}, [])

	// Disable right-click context menu and Ctrl+A outside inputs. Attached at
	// the document level rather than <body> so Biome's a11y rules stay clean.
	useEffect(() => {
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
		<html lang="ar" dir="rtl">
			<head>
				<HeadContent />
			</head>
			<body className="bg-[var(--color-bg)] text-[var(--color-text)] antialiased">
				<QueryClientProvider client={queryClient}>
					<I18nProvider locale="ar-EG">
						<Outlet />
						<SelectionCopy />
					</I18nProvider>
				</QueryClientProvider>
				<Scripts />
			</body>
		</html>
	)
}
