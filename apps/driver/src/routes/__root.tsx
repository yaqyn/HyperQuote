import {
	createRootRoute,
	Outlet,
	useLocation,
	useNavigate,
} from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PowerSyncProvider } from '@/providers/PowerSyncProvider'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

function RootLayout() {
	const { i18n } = useTranslation()
	const initTheme = useThemeStore((s) => s.init)
	const initAuth = useAuthStore((s) => s.initAuth)
	const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
	const isInitializing = useAuthStore((s) => s.isInitializing)
	const navigate = useNavigate()
	const location = useLocation()
	const [authReady, setAuthReady] = useState(false)

	// Set dir and lang
	useEffect(() => {
		const dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
		document.documentElement.setAttribute('dir', dir)
		document.documentElement.setAttribute('lang', i18n.language)
	}, [i18n.language])

	// Initialize theme and auth
	useEffect(() => {
		initTheme()
		initAuth().then(() => setAuthReady(true))
	}, [initTheme, initAuth])

	// Route guard
	useEffect(() => {
		if (!authReady) return

		const isLoginRoute = location.pathname === '/login'

		if (!isAuthenticated && !isLoginRoute) {
			navigate({ to: '/login' })
		} else if (isAuthenticated && isLoginRoute) {
			navigate({ to: '/home' })
		}
	}, [authReady, isAuthenticated, location.pathname, navigate])

	// Disable right-click and Ctrl+A outside text inputs
	useEffect(() => {
		const handleContextMenu = (e: MouseEvent) => e.preventDefault()
		const handleKeyDown = (e: KeyboardEvent) => {
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
		}
		document.addEventListener('contextmenu', handleContextMenu)
		document.addEventListener('keydown', handleKeyDown)
		return () => {
			document.removeEventListener('contextmenu', handleContextMenu)
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [])

	// Show splash while initializing
	if (isInitializing || !authReady) {
		return (
			<div className="flex min-h-dvh flex-col items-center justify-center gap-4">
				<h1 className="text-2xl font-bold text-[var(--color-blue)]">
					HyperQuote
				</h1>
				<div
					className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-blue)] border-t-transparent"
					role="status"
					aria-label="Loading"
				/>
			</div>
		)
	}

	return (
		<PowerSyncProvider>
			<div className="min-h-dvh">
				<Outlet />
			</div>
		</PowerSyncProvider>
	)
}

export const Route = createRootRoute({
	component: RootLayout,
})
