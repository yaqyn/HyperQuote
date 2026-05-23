import { createQuoteCartSync } from '@hyperquote/quote-cart'
import {
	createFileRoute,
	Outlet,
	redirect,
	useNavigate,
} from '@tanstack/react-router'
import { AnimatePresence, cubicBezier, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DraftQuoteDrawer } from '../components/shared/DraftQuoteDrawer'
import { ChatSidebar } from '../components/sidebar/ChatSidebar'
import { useShortcut } from '../hooks/useShortcut'
import { checkPortalAuth } from '../lib/auth'
import {
	getPortalQuoteCart,
	savePortalQuoteCart,
} from '../lib/server/cart-sync'
import { useDraftQuoteStore } from '../stores/draft-quote'
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
	const setSidebarOpen = usePortalStore((s) => s.setSidebarOpen)
	const isDraftQuoteOpen = usePortalStore((s) => s.isDraftQuoteOpen)
	const setDraftQuoteOpen = usePortalStore((s) => s.setDraftQuoteOpen)
	const isCompactViewport = useCompactViewport()
	usePortalQuoteCartSync(!isInternalUser)

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
					className="px-5 py-2.5 rounded-xl bg-[var(--p-accent)] text-[var(--p-accent-contrast)] text-sm font-medium"
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
				{/* Very soft wash from above */}
				<motion.div
					className="pointer-events-none absolute inset-0 z-[1]"
					initial={false}
					animate={{ opacity: 1 }}
					transition={{ duration: 1.4, delay: 0.1, ease: 'easeOut' }}
					style={{
						background:
							'radial-gradient(ellipse 70% 30% at 50% 0%, var(--p-layout-wash) 0%, transparent 70%)',
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
							key="mobile-sidebar"
							initial={{ x: sidebarInitialX, opacity: 0 }}
							animate={{ x: 0, opacity: 1 }}
							exit={{ x: sidebarInitialX, opacity: 0 }}
							transition={{ duration: 0.28, ease: SMOOTH_EASE }}
							className="fixed inset-y-0 start-0 z-40 h-dvh w-[calc(100vw-3.5rem)] max-w-80 overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] lg:hidden"
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

				<motion.aside
					initial={false}
					animate={{ width: isSidebarOpen ? 260 : 0 }}
					transition={{ duration: 0.34, ease: SMOOTH_EASE }}
					className="relative z-[2] hidden h-full shrink-0 overflow-hidden lg:block"
					aria-hidden={!isSidebarOpen}
					aria-label={t('sidebar.label')}
				>
					<AnimatePresence initial={false}>
						{isSidebarOpen && (
							<motion.div
								key="desktop-sidebar"
								initial={{ x: sidebarInitialX, opacity: 0 }}
								animate={{ x: 0, opacity: 1 }}
								exit={{ x: sidebarInitialX, opacity: 0 }}
								transition={{ duration: 0.24, ease: SMOOTH_EASE }}
								className="h-full w-[260px]"
							>
								<ChatSidebar
									userName={userName}
									companyName={companyName}
									hasSupplierRole={hasSupplierRole}
								/>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.aside>

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
			<DraftQuoteDrawer
				open={isDraftQuoteOpen}
				onClose={() => setDraftQuoteOpen(false)}
			/>
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

function usePortalQuoteCartSync(enabled: boolean) {
	useEffect(() => {
		if (!enabled) return
		const controller = createQuoteCartSync({
			adapter: {
				load: async () => {
					const result = await getPortalQuoteCart()
					return result.success ? result.cart : null
				},
				save: async (snapshot) => {
					const result = await savePortalQuoteCart({
						data: { ...snapshot, source: 'portal' },
					})
					return result.success ? result.cart : null
				},
			},
			source: 'portal',
			store: useDraftQuoteStore,
		})
		return () => controller.stop()
	}, [enabled])
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
