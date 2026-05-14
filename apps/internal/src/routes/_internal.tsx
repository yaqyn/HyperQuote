import type { AuthSession } from '@hyperquote/auth'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { InternalShortcuts } from '../components/shell/InternalShortcuts'
import { ModuleWindow } from '../components/shell/ModuleWindow'
import { NotificationsWindow } from '../components/shell/NotificationsWindow'
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications'
import { InternalAuthProvider } from '../lib/internal-auth'
import { useInternalStore } from '../stores/internal'
import { keyboardScopeStore } from '../stores/keyboard-scope'
import { useNotificationStore } from '../stores/notifications'

const getAuthSession = createServerFn({ method: 'GET' }).handler(
	async (): Promise<AuthSession> => {
		const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
		const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
		if (!supabaseUrl || !supabaseAnonKey) {
			// Dev-mode stub. No Supabase configured → mock an internal admin
			// session so the app is usable without live auth. The Session + User
			// shapes are faked just enough to satisfy consumers that only read
			// `user.id`, `user.user_metadata.name`, `pool`, and `roles`.
			return {
				session: {
					access_token: 'dev',
					refresh_token: 'dev',
					expires_in: 0,
					expires_at: 0,
					token_type: 'bearer',
					user: {} as AuthSession['user'],
				} as AuthSession['session'],
				user: {
					id: 'dev-user',
					app_metadata: {},
					user_metadata: { name: 'Dev User' },
					aud: 'authenticated',
					created_at: new Date().toISOString(),
				} as AuthSession['user'],
				pool: 'internal',
				roles: ['admin'],
				tenantId: 'dev-tenant',
			}
		}

		const { authGuard } = await import('@hyperquote/auth/guard')
		return authGuard({
			supabaseUrl,
			supabaseAnonKey,
			requiredPool: 'internal',
			loginPath: '/login',
		})
	},
)

export const Route = createFileRoute('/_internal')({
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

	// Keep the most recently opened module id around during the exit fade
	// so ModuleWindow still has content to render while it animates out.
	// Without this, ModuleWindow would be unmounted before AnimatePresence
	// can play the exit.
	const [lastOpenedModule, setLastOpenedModule] = useState<string | null>(null)
	useEffect(() => {
		if (activeModule) setLastOpenedModule(activeModule)
	}, [activeModule])

	// Notification store
	const isWindowOpen = useNotificationStore((s) => s.isWindowOpen)
	const _toggleWindow = useNotificationStore((s) => s.toggleWindow)
	const closeWindow = useNotificationStore((s) => s.closeWindow)

	// Supabase Realtime notifications
	useRealtimeNotifications({
		userId: auth.user?.id ?? 'dev-user',
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
			<div id="main" className="relative h-dvh w-full overflow-hidden">
				<InternalShortcuts auth={auth} />

				{/* Notifications window */}
				<NotificationsWindow isOpen={isWindowOpen} onClose={closeWindow} />

				{/* Module window system — always mounted so GlassWindow can run its
          open/close fade. `isOpen` drives visibility; `moduleId` falls back
          to the last opened module so content stays stable during the
          exit animation. */}
				{(activeModule || lastOpenedModule) && (
					<ModuleWindow
						moduleId={activeModule ?? lastOpenedModule ?? ''}
						isOpen={!!activeModule}
						onClose={() => setActiveModule(null)}
					/>
				)}

				<main className="h-full">
					<Outlet />
				</main>
			</div>
		</InternalAuthProvider>
	)
}
