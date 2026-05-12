import {
	createFileRoute,
	Outlet,
	redirect,
	useNavigate,
} from '@tanstack/react-router'
import { PanelLeft } from 'lucide-react'
import { AnimatePresence, cubicBezier, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChatSidebar } from '../components/sidebar/ChatSidebar'
import { useShortcut } from '../hooks/useShortcut'
import { checkPortalAuth } from '../lib/auth'
import { usePortalStore } from '../stores/portal'

const SMOOTH_EASE = cubicBezier(0.22, 1, 0.36, 1)
const COLLAPSE_EASE = cubicBezier(0.36, 0, 0.66, -0.2)

export const Route = createFileRoute('/_portal')({
	beforeLoad: async ({ location }) => {
		const { auth, isInternalUser } = await checkPortalAuth()

		if (!auth && !isInternalUser) {
			throw redirect({
				to: '/login',
				search: { redirect: location.href },
			})
		}

		return { auth, isInternalUser }
	},
	component: PortalLayout,
})

function PortalLayout() {
	const { auth, isInternalUser } = Route.useRouteContext()
	const { t, i18n } = useTranslation('portal')
	const isSigningOut = usePortalStore((s) => s.isSigningOut)
	const isSidebarOpen = usePortalStore((s) => s.isSidebarOpen)
	const toggleSidebar = usePortalStore((s) => s.toggleSidebar)
	const setSidebarOpen = usePortalStore((s) => s.setSidebarOpen)
	const isCompactViewport = useCompactViewport()

	useEffect(() => {
		if (!isCompactViewport || !isSidebarOpen) return

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				setSidebarOpen(false)
			}
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [isCompactViewport, isSidebarOpen, setSidebarOpen])

	if (isInternalUser) {
		return (
			<div className="flex flex-col items-center justify-center h-dvh gap-4 bg-[var(--p-bg)]">
				<p className="text-base text-[var(--p-text-secondary)]">
					{t('auth.noPortalAccess')}
				</p>
				<a
					href={
						import.meta.env.VITE_INTERNAL_URL ??
						'https://internal.hyperquote.net'
					}
					className="px-5 py-2.5 rounded-xl bg-[var(--p-accent)] text-white text-sm font-medium"
				>
					{t('auth.goInternal')}
				</a>
			</div>
		)
	}

	const userName = auth?.user?.user_metadata?.name ?? ''
	const companyName = auth?.user?.user_metadata?.company_name ?? undefined
	const roles: string[] = auth?.user?.user_metadata?.roles ?? []
	const hasSupplierRole = roles.includes('supplier')
	const sidebarInitialX = i18n.dir() === 'rtl' ? 24 : -24

	return (
		<div
			id="main"
			className="relative h-dvh w-full flex overflow-hidden bg-[var(--p-bg)]"
		>
			{/* Office atmosphere — fades the whole interface during sign-out */}
			<motion.div
				initial={false}
				animate={isSigningOut ? { opacity: 0 } : { opacity: 1 }}
				transition={
					isSigningOut
						? { duration: 0.6, ease: COLLAPSE_EASE }
						: { duration: 0.7, ease: SMOOTH_EASE }
				}
				className="relative flex flex-1 overflow-hidden"
			>
				{/* Very soft warm wash from above — pendant still on somewhere */}
				<motion.div
					className="pointer-events-none absolute inset-0 z-[1]"
					initial={false}
					animate={{ opacity: 1 }}
					transition={{ duration: 1.4, delay: 0.1, ease: 'easeOut' }}
					style={{
						background:
							'radial-gradient(ellipse 70% 30% at 50% 0%, rgba(243,214,163,0.035) 0%, transparent 70%)',
					}}
				/>
				<AnimatePresence initial={false}>
					{isSidebarOpen && (
						<motion.button
							key="sidebar-scrim"
							type="button"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.18, ease: 'easeOut' }}
							className="fixed inset-0 z-30 bg-black/45 backdrop-blur-[2px] lg:hidden"
							aria-label={t('sidebar.hide')}
							onClick={() => setSidebarOpen(false)}
						/>
					)}
					{isSidebarOpen && (
						<motion.aside
							key="sidebar"
							initial={{ x: sidebarInitialX, opacity: 0 }}
							animate={{ x: 0, opacity: 1 }}
							exit={{ x: sidebarInitialX, opacity: 0 }}
							transition={{ duration: 0.28, ease: SMOOTH_EASE }}
							className="fixed inset-y-0 start-0 z-40 h-dvh w-[calc(100vw-3.5rem)] max-w-80 overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] lg:relative lg:z-[2] lg:h-full lg:w-[260px] lg:max-w-none lg:shrink-0 lg:p-0"
							aria-label={t('sidebar.label')}
						>
							<ChatSidebar
								userName={userName}
								companyName={companyName}
								hasSupplierRole={hasSupplierRole}
								closeOnNavigate={isCompactViewport}
							/>
						</motion.aside>
					)}
				</AnimatePresence>

				{/* Show-sidebar handle — only when hidden */}
				{!isSidebarOpen && (
					<motion.button
						type="button"
						onClick={toggleSidebar}
						initial={false}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.6, delay: 0.6, ease: 'easeOut' }}
						className="absolute top-[calc(env(safe-area-inset-top)+0.75rem)] start-3 z-20 inline-flex h-11 w-11 items-center justify-center rounded-md text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)] lg:top-3 lg:h-9 lg:w-9"
						aria-label={t('sidebar.show')}
						aria-keyshortcuts="["
					>
						<PanelLeft size={16} strokeWidth={1.5} />
					</motion.button>
				)}
				{/* Main content — leads when sidebar is hidden by default */}
				<motion.main
					initial={false}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.75, delay: 0.2, ease: SMOOTH_EASE }}
					className="relative z-[2] flex min-w-0 flex-1 flex-col"
					style={{ viewTransitionName: 'lang-content' }}
				>
					<div
						className="relative z-[1] flex min-h-0 flex-1 flex-col"
						style={{ viewTransitionName: 'panel-content' }}
					>
						<Outlet />
					</div>
				</motion.main>
			</motion.div>
			<PortalShortcuts />
		</div>
	)
}

function useCompactViewport() {
	const [isCompact, setIsCompact] = useState(false)

	useEffect(() => {
		const media = window.matchMedia('(max-width: 1023px)')
		const update = () => setIsCompact(media.matches)

		update()
		media.addEventListener('change', update)
		return () => media.removeEventListener('change', update)
	}, [])

	return isCompact
}

function PortalShortcuts() {
	const navigate = useNavigate()
	const activeRole = usePortalStore((s) => s.activeRole)

	useShortcut('O', () => navigate({ to: '/orders' }), {
		enabled: activeRole === 'customer',
	})
	useShortcut('M', () => navigate({ to: '/market' }), {
		enabled: activeRole === 'customer',
	})
	useShortcut('S', () => navigate({ to: '/supplier/stock' }), {
		enabled: activeRole === 'supplier',
	})
	useShortcut('P', () => navigate({ to: '/supplier/orders' }), {
		enabled: activeRole === 'supplier',
	})
	useShortcut('A', () => navigate({ to: '/supplier/analytics' }), {
		enabled: activeRole === 'supplier',
	})
	useShortcut('N', () => navigate({ to: '/notifications' }))
	useShortcut('[', () => usePortalStore.getState().toggleSidebar())
	useShortcut('/', () => {
		const el = document.querySelector<HTMLTextAreaElement>('[data-chat-input]')
		el?.focus()
	})

	return null
}
