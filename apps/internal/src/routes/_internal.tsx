import type { AuthSession } from '@hyperquote/auth'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import {
	AnimatePresence,
	cubicBezier,
	motion,
	useReducedMotion,
} from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { InternalShortcuts } from '../components/shell/InternalShortcuts'
import { ModuleWindow } from '../components/shell/ModuleWindow'
import { NotificationsWindow } from '../components/shell/NotificationsWindow'
import { useInternalRealtimeSync } from '../hooks/useInternalRealtimeSync'
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications'
import { InternalAuthProvider } from '../lib/internal-auth'
import { MODULES } from '../lib/modules'
import { internalHead } from '../lib/page-meta'
import { useInternalStore } from '../stores/internal'
import { keyboardScopeStore } from '../stores/keyboard-scope'
import { useNotificationStore } from '../stores/notifications'

const getAuthSession = createServerFn({ method: 'GET' }).handler(
	async (): Promise<AuthSession> => {
		const { resolveSupabaseRuntimeConfig } = await import(
			'@hyperquote/auth/server'
		)
		const config = await resolveSupabaseRuntimeConfig(process.env)
		if (!config) {
			const { redirect } = await import('@tanstack/react-router')
			throw redirect({ to: '/login' })
		}

		const { authGuard } = await import('@hyperquote/auth/guard')
		return authGuard({
			...config,
			requiredPool: 'internal',
			loginPath: '/login',
		})
	},
)

const searchCoverFadeMs = 160
const searchCloseCoverHoldMs = 80

export const Route = createFileRoute('/_internal')({
	head: () =>
		internalHead({
			title: 'HyperQuote Internal Ops',
			description:
				'Private HyperQuote operations shell for opening sales, procurement, warehouse, finance, dispatch, customer service, admin, and search panels.',
			path: '/',
		}),
	beforeLoad: async () => {
		const auth = await getAuthSession()
		return { auth }
	},
	component: InternalLayout,
})

function InternalLayout() {
	const { auth } = Route.useRouteContext()
	const activeModule = useInternalStore((s) => s.activeModule)
	const setActiveModule = useInternalStore((s) => s.setActiveModule)
	const reduceMotion = useReducedMotion()
	const [searchRevealReady, setSearchRevealReady] = useState(false)
	const [searchFadePhase, setSearchFadePhase] = useState<
		'opening' | 'closing' | null
	>(null)
	const [isSearchClosing, setIsSearchClosing] = useState(false)
	const [isSearchReturnReceded, setIsSearchReturnReceded] = useState(false)
	const searchCloseTimersRef = useRef<number[]>([])
	const searchScreenReceding =
		(activeModule === 'search' && !searchRevealReady && !isSearchClosing) ||
		isSearchReturnReceded
	const activeModuleConfig = MODULES.find(
		(module) => module.id === activeModule,
	)
	const activeModuleTitle = activeModuleConfig
		? `${activeModuleConfig.id
				.split('-')
				.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
				.join(' ')} — HyperQuote Internal Ops`
		: 'HyperQuote Internal Ops'

	useEffect(() => {
		document.title = activeModuleTitle
	}, [activeModuleTitle])

	// Keep the most recently opened module id around during the exit fade
	// so ModuleWindow still has content to render while it animates out.
	// Without this, ModuleWindow would be unmounted before AnimatePresence
	// can play the exit.
	const [lastOpenedModule, setLastOpenedModule] = useState<string | null>(null)
	useEffect(() => {
		if (activeModule) setLastOpenedModule(activeModule)
	}, [activeModule])

	const clearSearchCloseTimers = useCallback(() => {
		for (const timer of searchCloseTimersRef.current) {
			window.clearTimeout(timer)
		}
		searchCloseTimersRef.current = []
	}, [])

	useEffect(() => clearSearchCloseTimers, [clearSearchCloseTimers])

	const closeActiveModule = useCallback(() => {
		if (activeModule !== 'search' || reduceMotion) {
			clearSearchCloseTimers()
			setIsSearchClosing(false)
			setIsSearchReturnReceded(false)
			setSearchFadePhase(null)
			setActiveModule(null)
			return
		}

		if (isSearchClosing) return

		clearSearchCloseTimers()
		setIsSearchClosing(true)
		setIsSearchReturnReceded(false)
		setSearchRevealReady(true)
		setSearchFadePhase('closing')

		const closeTimer = window.setTimeout(() => {
			setIsSearchReturnReceded(true)
			setActiveModule(null)

			const revealTimer = window.setTimeout(() => {
				setIsSearchReturnReceded(false)
				setSearchFadePhase(null)

				const cleanupTimer = window.setTimeout(() => {
					setIsSearchClosing(false)
					setSearchRevealReady(false)
				}, searchCoverFadeMs)
				searchCloseTimersRef.current.push(cleanupTimer)
			}, searchCloseCoverHoldMs)
			searchCloseTimersRef.current.push(revealTimer)
		}, searchCoverFadeMs)
		searchCloseTimersRef.current.push(closeTimer)
	}, [
		activeModule,
		clearSearchCloseTimers,
		isSearchClosing,
		reduceMotion,
		setActiveModule,
	])

	useEffect(() => {
		if (activeModule !== 'search') {
			if (!isSearchClosing) {
				setSearchRevealReady(false)
				setSearchFadePhase(null)
			}
			return
		}

		if (isSearchClosing) return

		clearSearchCloseTimers()
		setSearchRevealReady(false)
		setSearchFadePhase('opening')

		const revealDelayMs = reduceMotion ? 0 : searchCoverFadeMs
		const fadeHoldMs = reduceMotion ? 80 : 420
		const revealTimer = window.setTimeout(() => {
			setSearchRevealReady(true)
		}, revealDelayMs)
		const fadeTimer = window.setTimeout(() => {
			setSearchFadePhase(null)
		}, fadeHoldMs)

		return () => {
			window.clearTimeout(revealTimer)
			window.clearTimeout(fadeTimer)
		}
	}, [activeModule, clearSearchCloseTimers, isSearchClosing, reduceMotion])

	// Notification store
	const isWindowOpen = useNotificationStore((s) => s.isWindowOpen)
	const _toggleWindow = useNotificationStore((s) => s.toggleWindow)
	const closeWindow = useNotificationStore((s) => s.closeWindow)

	// Supabase Realtime notifications
	useRealtimeNotifications({
		userId: auth.user.id,
		enabled: !!import.meta.env.VITE_SUPABASE_URL,
	})
	useInternalRealtimeSync({
		enabled: !!import.meta.env.VITE_SUPABASE_URL,
	})

	// Focus/blur event delegation for keyboard scope
	useEffect(() => {
		function handleFocus(e: FocusEvent) {
			const target = e.target as HTMLElement
			if (
				target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.hasAttribute('contenteditable')
			) {
				keyboardScopeStore.send({ type: 'focusInput' })
			}
		}

		function handleBlur(e: FocusEvent) {
			const target = e.target as HTMLElement
			if (
				target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.hasAttribute('contenteditable')
			) {
				keyboardScopeStore.send({ type: 'blurInput' })
			}
		}

		document.addEventListener('focus', handleFocus, { capture: true })
		document.addEventListener('blur', handleBlur, { capture: true })

		return () => {
			document.removeEventListener('focus', handleFocus, { capture: true })
			document.removeEventListener('blur', handleBlur, { capture: true })
		}
	}, [])

	return (
		<InternalAuthProvider auth={auth}>
			<div
				id="main"
				className="relative h-dvh w-full overflow-hidden bg-[#010101]"
			>
				<InternalShortcuts
					auth={auth}
					onCloseActiveModule={closeActiveModule}
				/>

				{/* Notifications window */}
				<NotificationsWindow isOpen={isWindowOpen} onClose={closeWindow} />

				{/* Module window system — always mounted so GlassWindow can run its
          open/close fade. `isOpen` drives visibility; `moduleId` falls back
          to the last opened module so content stays stable during the
          exit animation. */}
				<AnimatePresence>
					{searchFadePhase && (
						<motion.div
							key={`search-${searchFadePhase}-fade`}
							aria-hidden="true"
							className={`fixed inset-0 bg-[#010101] ${
								searchFadePhase === 'closing'
									? 'pointer-events-auto'
									: 'pointer-events-none'
							}`}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{
								duration: reduceMotion ? 0 : searchCoverFadeMs / 1000,
								ease: cubicBezier(0.16, 1, 0.3, 1),
							}}
							style={{ zIndex: searchFadePhase === 'closing' ? 45 : 35 }}
						/>
					)}
				</AnimatePresence>

				{(activeModule || lastOpenedModule) &&
					(activeModule !== 'search' || searchRevealReady) && (
						<ModuleWindow
							moduleId={activeModule ?? lastOpenedModule ?? ''}
							isOpen={!!activeModule}
							onClose={closeActiveModule}
						/>
					)}

				<motion.main
					className="h-full bg-[var(--color-surface)]"
					animate={
						searchScreenReceding && !reduceMotion
							? { opacity: 0.22, scale: 0.955, filter: 'blur(1.35px)' }
							: { opacity: 1, scale: 1, filter: 'blur(0px)' }
					}
					transition={{
						duration: reduceMotion ? 0 : searchCoverFadeMs / 1000,
						ease: cubicBezier(0.16, 1, 0.3, 1),
					}}
					style={{ transformOrigin: '50% 50%' }}
				>
					<Outlet />
				</motion.main>
			</div>
		</InternalAuthProvider>
	)
}
