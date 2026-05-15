import { useQuery } from '@tanstack/react-query'
import { useMatches, useNavigate } from '@tanstack/react-router'
import {
	ClipboardList,
	Globe,
	Info,
	LifeBuoy,
	LogOut,
	MessageSquare,
	Moon,
	PanelLeft,
	Plus,
	Save,
	Send,
	Share2,
	ShoppingBag,
	Star,
	Sun,
	Trash2,
	User,
	X,
} from 'lucide-react'
import { motion } from 'motion/react'
import {
	type ReactNode,
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { getAllCustomerOrders } from '../../lib/server/orders'
import { getCurrentPortalTheme, setPortalTheme } from '../../lib/theme'
import { type Conversation, useChatStore } from '../../stores/chat'
import { useDraftQuoteStore } from '../../stores/draft-quote'
import { usePortalStore } from '../../stores/portal'

interface ChatSidebarProps {
	userName: string
	companyName?: string
	hasSupplierRole: boolean
	closeOnNavigate?: boolean
}

const NAV_ITEMS = [
	{ labelKey: 'sidebar.nav.chat', icon: MessageSquare, to: '/' as const },
	{ labelKey: 'sidebar.nav.market', icon: ShoppingBag, to: '/market' as const },
	{
		labelKey: 'sidebar.nav.orders',
		icon: ClipboardList,
		to: '/orders' as const,
	},
	{ labelKey: 'sidebar.nav.support', icon: LifeBuoy, to: '/support' as const },
]

type NavTarget = (typeof NAV_ITEMS)[number]['to']

export function ChatSidebar({
	userName,
	companyName,
	hasSupplierRole,
	closeOnNavigate = false,
}: ChatSidebarProps) {
	const { t } = useTranslation('portal')
	const navigate = useNavigate()
	const matches = useMatches()
	const activeRole = usePortalStore((s) => s.activeRole)
	const setActiveRole = usePortalStore((s) => s.setActiveRole)
	const [favoritesOpen, setFavoritesOpen] = useState(true)
	const [chatsOpen, setChatsOpen] = useState(true)

	const conversations = useChatStore((s) =>
		activeRole === 'customer'
			? s.customerConversations
			: s.supplierConversations,
	)
	const activeConversationId = useChatStore(
		(s) => s.activeConversationId[activeRole],
	)
	const loadConversation = useChatStore((s) => s.loadConversation)
	const clearActive = useChatStore((s) => s.clearActive)

	const favorites = conversations.filter((c) => c.pinned)
	const recent = conversations.filter((c) => !c.pinned)
	const firstName = userName?.trim().split(/\s+/)[0] ?? ''
	const currentPath = matches[matches.length - 1]?.pathname ?? '/'

	const closeSidebarAfterNavigate = useCallback(() => {
		if (closeOnNavigate) {
			usePortalStore.getState().setSidebarOpen(false)
		}
	}, [closeOnNavigate])

	const handleNewChat = useCallback(() => {
		clearActive(activeRole)
		if (closeOnNavigate) {
			navigate({ to: '/' })
			closeSidebarAfterNavigate()
		}
	}, [
		clearActive,
		activeRole,
		closeOnNavigate,
		navigate,
		closeSidebarAfterNavigate,
	])

	const handleSelect = useCallback(
		(id: string) => {
			loadConversation(activeRole, id)
			if (closeOnNavigate) {
				navigate({ to: '/' })
				closeSidebarAfterNavigate()
			}
		},
		[
			loadConversation,
			activeRole,
			closeOnNavigate,
			navigate,
			closeSidebarAfterNavigate,
		],
	)

	const handleNavigate = useCallback(
		(to: NavTarget) => {
			navigate({ to })
			closeSidebarAfterNavigate()
		},
		[navigate, closeSidebarAfterNavigate],
	)

	const stagger = (i: number) => ({
		initial: { opacity: 0, y: 6 } as const,
		animate: { opacity: 1, y: 0 } as const,
		transition: {
			duration: 0.28,
			delay: 0.08 + i * 0.035,
			ease: 'easeOut' as const,
		},
	})

	return (
		<div className="relative flex h-full min-h-0 w-full max-w-full shrink-0 flex-col overflow-hidden border-e border-[var(--p-border)] bg-[var(--p-sidebar)] shadow-[var(--p-sidebar-shadow)] lg:shadow-none">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0"
				style={{
					background:
						'radial-gradient(ellipse 120% 60% at 0% 0%, var(--p-sidebar-wash), transparent 56%), linear-gradient(180deg, var(--p-sidebar-sheen), transparent 34%)',
				}}
			/>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-y-0 end-0 w-px bg-gradient-to-b from-[var(--p-border-strong)] via-[var(--p-border)] to-transparent"
			/>

			<div className="relative flex h-full min-h-0 flex-col px-3 py-3 sm:px-4 sm:py-4">
				<motion.header {...stagger(0)} className="shrink-0">
					<div className="flex items-center justify-between gap-3">
						<div className="flex min-w-0 items-center gap-3">
							<span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--p-border)] bg-[var(--p-surface)] text-[var(--p-accent)] shadow-[var(--p-mark-shadow)]">
								<span
									aria-hidden
									className="absolute inset-1 rounded-xl bg-[var(--p-accent-dim)]"
								/>
								<_NibMonogram />
							</span>
							<div className="min-w-0">
								<p className="voice-mono truncate text-[9px] uppercase tracking-[0.26em] text-[var(--p-text-faint)]">
									{t('sidebar.welcome')}
								</p>
								<p className="truncate text-[17px] font-semibold leading-tight text-[var(--p-text)]">
									{firstName}
								</p>
							</div>
						</div>

						<div className="flex shrink-0 items-center gap-1">
							<button
								type="button"
								onClick={handleNewChat}
								className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] text-[var(--p-text-muted)] transition-colors hover:border-[var(--p-border-strong)] hover:bg-[var(--p-hover)] hover:text-[var(--p-accent)]"
								aria-label={t('sidebar.newChat')}
							>
								<Plus size={15} strokeWidth={1.8} />
							</button>
							<button
								type="button"
								onClick={() => usePortalStore.getState().setSidebarOpen(false)}
								className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-accent)]"
								aria-label={t('sidebar.hide')}
								aria-keyshortcuts="["
							>
								<PanelLeft size={16} strokeWidth={1.5} />
							</button>
						</div>
					</div>
				</motion.header>

				<motion.nav
					{...stagger(1)}
					className="mt-5 grid grid-cols-4 gap-1 lg:grid-cols-1"
					aria-label={t('sidebar.label')}
				>
					{NAV_ITEMS.map((item) => {
						const isActive =
							item.to === '/'
								? currentPath === '/'
								: currentPath.startsWith(item.to)
						const Icon = item.icon
						return (
							<button
								key={item.labelKey}
								type="button"
								onClick={() => handleNavigate(item.to)}
								aria-current={isActive ? 'page' : undefined}
								className={`group relative flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-2.5 text-center transition-colors lg:h-11 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-xl lg:px-3 lg:text-start ${
									isActive
										? 'bg-[var(--p-accent-dim)] text-[var(--p-accent)] shadow-[inset_0_0_0_1px_var(--p-active-ring)]'
										: 'text-[var(--p-text-muted)] hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]'
								}`}
							>
								<span
									aria-hidden
									className={`absolute start-2 top-2 hidden h-1.5 w-1.5 rounded-full transition-colors lg:block ${
										isActive ? 'bg-[var(--p-accent)]' : 'bg-transparent'
									}`}
								/>
								<span
									className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-colors lg:h-8 lg:w-8 ${
										isActive
											? 'bg-[var(--p-accent-dim)] text-[var(--p-accent)]'
											: 'bg-transparent text-[var(--p-text-faint)] group-hover:text-[var(--p-text-muted)]'
									}`}
								>
									<Icon size={16} strokeWidth={1.65} />
								</span>
								<span className="min-w-0 max-w-full truncate text-[10px] font-medium leading-tight text-current lg:text-[13px]">
									{t(item.labelKey)}
								</span>
							</button>
						)
					})}
				</motion.nav>

				{hasSupplierRole && (
					<motion.div {...stagger(2)} className="mt-3 shrink-0">
						<div className="grid grid-cols-2 gap-1 rounded-2xl border border-[var(--p-border)] bg-[var(--p-surface)] p-1">
							{(['customer', 'supplier'] as const).map((role) => (
								<button
									key={role}
									type="button"
									onClick={() => setActiveRole(role)}
									className={`h-8 rounded-xl text-[11px] font-semibold transition-colors ${
										activeRole === role
											? 'bg-[var(--p-accent)] text-[var(--p-accent-contrast)]'
											: 'text-[var(--p-text-muted)] hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]'
									}`}
								>
									{t(`role.${role}`)}
								</button>
							))}
						</div>
					</motion.div>
				)}

				<div className="my-4 h-px shrink-0 bg-gradient-to-r from-transparent via-[var(--p-border)] to-transparent" />

				<motion.div
					{...stagger(3)}
					className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-2"
				>
					<DraftSection closeOnNavigate={closeOnNavigate} />

					{favorites.length > 0 && (
						<>
							<SectionHeader
								label={t('sidebar.starredChats')}
								icon={<Star size={12} className="text-[var(--p-text-muted)]" />}
								count={favorites.length}
								open={favoritesOpen}
								onToggle={() => setFavoritesOpen(!favoritesOpen)}
							/>
							{favoritesOpen && (
								<div className="mb-2 flex flex-col gap-1">
									{favorites.map((conv) => (
										<ConversationItem
											key={conv.id}
											conversation={conv}
											isActive={conv.id === activeConversationId}
											onSelect={() => handleSelect(conv.id)}
										/>
									))}
								</div>
							)}
						</>
					)}

					<SectionHeader
						label={t('sidebar.chatHistory')}
						count={recent.length}
						open={chatsOpen}
						onToggle={() => setChatsOpen(!chatsOpen)}
					/>
					{chatsOpen && (
						<div className="mb-2 flex flex-col gap-1">
							{recent.length > 0 ? (
								recent.map((conv) => (
									<ConversationItem
										key={conv.id}
										conversation={conv}
										isActive={conv.id === activeConversationId}
										onSelect={() => handleSelect(conv.id)}
									/>
								))
							) : (
								<p className="rounded-xl px-3 py-2 text-[13px] text-[var(--p-text-muted)]">
									{t('sidebar.noChats')}
								</p>
							)}
						</div>
					)}
				</motion.div>

				<motion.footer
					{...stagger(4)}
					className="relative shrink-0 border-t border-[var(--p-border)] pt-3"
				>
					<ProfileMenu
						userName={userName}
						companyName={companyName}
						closeOnNavigate={closeOnNavigate}
					/>
				</motion.footer>
			</div>
		</div>
	)
}

function useDraftModalFullscreen() {
	const [isFullscreen, setIsFullscreen] = useState(() => {
		if (typeof window === 'undefined') return false
		return window.matchMedia('(max-width: 1023px)').matches
	})

	useEffect(() => {
		const media = window.matchMedia('(max-width: 1023px)')
		const update = () => setIsFullscreen(media.matches)

		update()
		media.addEventListener('change', update)
		return () => media.removeEventListener('change', update)
	}, [])

	return isFullscreen
}

/* ============================================================================ */

function _NibMonogram() {
	return (
		<svg
			viewBox="0 0 16 16"
			width="14"
			height="14"
			xmlns="http://www.w3.org/2000/svg"
			role="img"
			aria-label="Lyon"
			className="shrink-0 text-[var(--p-accent)]"
		>
			<title>Lyon</title>
			<path
				d="M 3.5 1.5 L 13 3.5 L 8 14 Z"
				fill="none"
				stroke="currentColor"
				strokeWidth="0.9"
				strokeLinejoin="round"
			/>
			<line
				x1="8"
				y1="5.2"
				x2="8"
				y2="14"
				stroke="currentColor"
				strokeWidth="0.7"
			/>
			<circle cx="8" cy="6.2" r="0.85" fill="currentColor" />
		</svg>
	)
}

function DisclosureGlyph({ open }: { open: boolean }) {
	return (
		<span
			aria-hidden
			className="text-[13px] leading-none text-[var(--p-text-faint)] transition-colors group-hover:text-[var(--p-text-muted)]"
		>
			{open ? '-' : '+'}
		</span>
	)
}

function SectionHeader({
	label,
	icon,
	count,
	open,
	onToggle,
}: {
	label: string
	icon?: ReactNode
	count?: number
	open: boolean
	onToggle: () => void
}) {
	return (
		<button
			type="button"
			onClick={onToggle}
			className="group flex w-full items-center gap-2 px-1 pt-5 pb-2 text-start"
		>
			<span className="voice-mono flex min-w-0 items-center gap-2 truncate text-[9px] uppercase tracking-[0.22em] text-[var(--p-text-faint)] transition-colors group-hover:text-[var(--p-text-muted)]">
				{icon}
				<span className="truncate">{label}</span>
			</span>
			<span
				aria-hidden
				className="h-px flex-1 bg-[var(--p-border)] transition-colors group-hover:bg-[var(--p-border-strong)]"
			/>
			{typeof count === 'number' && count > 0 && (
				<span className="voice-mono rounded-full bg-[var(--p-surface)] px-1.5 py-0.5 text-[10px] tabular-nums text-[var(--p-text-muted)]">
					{count}
				</span>
			)}
			<DisclosureGlyph open={open} />
		</button>
	)
}

function ConversationItem({
	conversation,
	isActive,
	onSelect,
}: {
	conversation: Conversation
	isActive: boolean
	onSelect: () => void
}) {
	const { t } = useTranslation('portal')
	const preview = conversation.preview || t('sidebar.newChat')

	return (
		<button
			type="button"
			onClick={onSelect}
			className={`group relative flex min-h-10 w-full items-center gap-2 rounded-xl px-2 py-2 text-start transition-colors ${
				isActive
					? 'bg-[var(--p-accent-dim)] text-[var(--p-accent)] shadow-[inset_0_0_0_1px_var(--p-active-ring-soft)]'
					: 'text-[var(--p-text-muted)] hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]'
			}`}
		>
			<span
				aria-hidden
				className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
					isActive
						? 'bg-[var(--p-accent)]'
						: 'bg-[var(--p-border-strong)] group-hover:bg-[var(--p-accent)]'
				}`}
			/>
			<span className="block min-w-0 flex-1 truncate text-[13px] font-medium leading-tight">
				{preview}
			</span>
		</button>
	)
}

function ProfileMenu({
	userName,
	companyName,
	closeOnNavigate = false,
}: {
	userName: string
	companyName?: string
	closeOnNavigate?: boolean
}) {
	const { t, i18n } = useTranslation('portal')
	const navigate = useNavigate()
	const setSigningOut = usePortalStore((s) => s.setSigningOut)
	const [open, setOpen] = useState(false)
	const [theme, setTheme] = useState(() => getCurrentPortalTheme())
	const menuRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!open) return
		function handleClick(e: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClick)
		return () => document.removeEventListener('mousedown', handleClick)
	}, [open])

	useEffect(() => {
		if (open) {
			setTheme(getCurrentPortalTheme(theme))
		}
	}, [open, theme])

	function handleLanguageToggle() {
		const newLocale = i18n.language === 'ar' ? 'en' : 'ar'
		const apply = () => {
			i18n.changeLanguage(newLocale)
			localStorage.setItem('hq-locale', newLocale)
			// Locale cookie is read by SSR for initial HTML dir/lang attrs.
			const doc = document as unknown as Record<'cookie', string>
			doc.cookie = `hq-locale=${newLocale};path=/;max-age=31536000`
			document.documentElement.setAttribute('lang', newLocale)
			document.body.className = document.body.className.replace(
				/font-(sans|arabic)/,
				newLocale === 'ar' ? 'font-arabic' : 'font-sans',
			)
		}
		// Real crossfade via View Transitions API — old snapshot + new live DOM overlap
		const vtDoc = document as Document & {
			startViewTransition?: (cb: () => void) => void
		}
		if (vtDoc.startViewTransition) {
			vtDoc.startViewTransition(apply)
		} else {
			apply()
		}
	}

	function handleThemeToggle() {
		const newTheme = getCurrentPortalTheme(theme) === 'dark' ? 'light' : 'dark'
		const apply = () => {
			setPortalTheme(newTheme)
			setTheme(newTheme)
		}
		const vtDoc = document as Document & {
			startViewTransition?: (cb: () => void) => void
		}
		if (vtDoc.startViewTransition) {
			vtDoc.startViewTransition(apply)
		} else {
			apply()
		}
	}

	function handleSignOut() {
		setOpen(false)
		setSigningOut(true)
		setTimeout(() => navigate({ to: '/login' }), 800)
	}

	const menuItems = [
		{
			labelKey: 'profile.profile',
			icon: User,
			action: () => navigate({ to: '/profile' }),
		},
		{
			labelKey:
				i18n.language === 'ar' ? 'profile.switchToEn' : 'profile.switchToAr',
			icon: Globe,
			action: handleLanguageToggle,
		},
		{
			labelKey:
				theme === 'dark' ? 'profile.switchToLight' : 'profile.switchToDark',
			icon: theme === 'dark' ? Sun : Moon,
			action: handleThemeToggle,
		},
		{
			labelKey: 'profile.about',
			icon: Info,
			action: () => navigate({ to: '/about' }),
		},
		{ labelKey: 'profile.signOut', icon: LogOut, action: handleSignOut },
	]

	const initial = (userName || '?').charAt(0).toUpperCase()

	return (
		<div ref={menuRef} className="relative">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="group flex w-full min-w-0 items-center gap-3 rounded-2xl px-1 py-1.5 text-start transition-colors hover:bg-[var(--p-hover)]"
			>
				<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--p-border)] bg-[var(--p-surface)] text-[14px] font-semibold text-[var(--p-accent)] transition-colors group-hover:border-[var(--p-border-strong)]">
					{initial}
				</span>
				<div className="min-w-0 flex-1">
					<p className="truncate text-[13px] font-semibold leading-tight text-[var(--p-text)]">
						{userName}
					</p>
					{companyName && (
						<p className="truncate text-[12px] leading-tight text-[var(--p-text-muted)]">
							{companyName}
						</p>
					)}
				</div>
			</button>

			{open && (
				<div className="absolute inset-x-0 bottom-full mb-3 overflow-hidden rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)]/95 p-1 shadow-[var(--p-popover-shadow)] backdrop-blur-xl">
					{menuItems.map((item) => {
						const Icon = item.icon
						return (
							<button
								key={item.labelKey}
								type="button"
								onClick={() => {
									setOpen(false)
									item.action()
									if (closeOnNavigate) {
										usePortalStore.getState().setSidebarOpen(false)
									}
								}}
								className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-start text-[13px] font-medium text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
							>
								<Icon size={15} strokeWidth={1.65} className="shrink-0" />
								<span className="min-w-0 truncate">{t(item.labelKey)}</span>
							</button>
						)
					})}
				</div>
			)}
		</div>
	)
}

function DraftSection({
	closeOnNavigate = false,
}: {
	closeOnNavigate?: boolean
}) {
	const { t } = useTranslation('portal')
	const navigate = useNavigate()
	const items = useDraftQuoteStore((s) => s.items)
	const [sectionOpen, setSectionOpen] = useState(true)
	const [modalOpen, setModalOpen] = useState(false)
	const btnRef = useRef<HTMLButtonElement>(null)

	const { data } = useQuery({
		queryKey: ['customer-orders-all'],
		queryFn: () => getAllCustomerOrders(),
		staleTime: 30_000,
	})

	const savedOrders = data?.orders?.filter((o) => o.type === 'saved') ?? []
	const submittedOrders =
		data?.orders?.filter((o) => o.type === 'submitted') ?? []
	const closeSidebarAfterNavigate = useCallback(() => {
		if (closeOnNavigate) {
			usePortalStore.getState().setSidebarOpen(false)
		}
	}, [closeOnNavigate])

	return (
		<>
			<SectionHeader
				label={t('sidebar.orderHistory')}
				open={sectionOpen}
				onToggle={() => setSectionOpen(!sectionOpen)}
			/>
			{sectionOpen && (
				<div className="mb-2 flex flex-col gap-1">
					{items.length > 0 && (
						<button
							ref={btnRef}
							type="button"
							onClick={() => setModalOpen(!modalOpen)}
							className={`flex min-h-11 w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-start transition-colors ${
								modalOpen
									? 'border-[var(--p-border-strong)] bg-[var(--p-accent-dim)] text-[var(--p-accent)]'
									: 'border-[var(--p-border)] bg-[var(--p-card)] text-[var(--p-text-secondary)] hover:border-[var(--p-border-strong)] hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]'
							}`}
						>
							<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--p-accent-dim)] text-[var(--p-accent)]">
								<ClipboardList size={15} strokeWidth={1.6} />
							</span>
							<span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
								{t('market.draftQuote')}
							</span>
							<span className="voice-mono rounded-full bg-[var(--p-accent)] px-2 py-0.5 text-[11px] tabular-nums text-[var(--p-accent-contrast)]">
								{items.length}
							</span>
						</button>
					)}

					<p className="voice-mono px-1 pt-3 pb-1 text-[9px] uppercase tracking-[0.22em] text-[var(--p-text-faint)]">
						{t('sidebar.savedOrders')}
					</p>
					{savedOrders.length > 0 ? (
						savedOrders.map((order) => (
							<button
								key={order.id}
								type="button"
								onClick={() => {
									navigate({
										to: '/orders/edit/$orderId',
										params: { orderId: order.id },
									})
									closeSidebarAfterNavigate()
								}}
								className="flex min-h-9 w-full items-center gap-2 rounded-xl px-2 py-1.5 text-start text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
							>
								<span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--p-border-strong)]" />
								<span className="min-w-0 flex-1 truncate text-[13px] font-medium">
									{order.name ?? 'Draft'}
								</span>
								<span className="voice-mono shrink-0 text-[11px] tabular-nums text-[var(--p-text-faint)]">
									{order.itemCount}
								</span>
							</button>
						))
					) : (
						<p className="rounded-xl px-2 py-1.5 text-[12px] text-[var(--p-text-faint)]">
							{t('sidebar.noSavedOrders')}
						</p>
					)}

					<p className="voice-mono px-1 pt-3 pb-1 text-[9px] uppercase tracking-[0.22em] text-[var(--p-text-faint)]">
						{t('sidebar.submittedOrders')}
					</p>
					{submittedOrders.length > 0 ? (
						submittedOrders.map((order) => (
							<button
								key={order.id}
								type="button"
								onClick={() => {
									navigate({
										to: '/orders/$orderId',
										params: { orderId: order.id },
									})
									closeSidebarAfterNavigate()
								}}
								className="flex min-h-9 w-full items-center gap-2 rounded-xl px-2 py-1.5 text-start text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
							>
								<span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--p-border-strong)]" />
								<span className="voice-mono min-w-0 flex-1 truncate text-[12px] tabular-nums">
									{order.reference}
								</span>
								<span className="voice-mono shrink-0 text-[11px] tabular-nums text-[var(--p-text-faint)]">
									{order.itemCount}
								</span>
							</button>
						))
					) : (
						<p className="rounded-xl px-2 py-1.5 text-[12px] text-[var(--p-text-faint)]">
							{t('sidebar.noSubmittedOrders')}
						</p>
					)}
				</div>
			)}
			{modalOpen && (
				<DraftQuoteModal
					onClose={() => setModalOpen(false)}
					anchorRef={btnRef}
				/>
			)}
		</>
	)
}

function QtyInput({
	quantity,
	onChange,
}: {
	quantity: number
	onChange: (v: number) => void
}) {
	const [local, setLocal] = useState(String(quantity))

	useEffect(() => {
		setLocal(String(quantity))
	}, [quantity])

	return (
		<input
			type="text"
			inputMode="numeric"
			value={local}
			onChange={(e) => {
				const raw = e.target.value.replace(/[^0-9]/g, '')
				setLocal(raw)
				const v = parseInt(raw, 10)
				if (!Number.isNaN(v) && v > 0) onChange(v)
			}}
			onBlur={() => {
				const v = parseInt(local, 10)
				if (Number.isNaN(v) || v < 1) {
					setLocal('1')
					onChange(1)
				}
			}}
			className="font-mono text-[13px] min-w-[2ch] max-w-[6ch] h-7 text-center text-[var(--p-text)] bg-transparent border-none outline-none"
			style={{ width: `${Math.max(2, local.length + 1)}ch` }}
		/>
	)
}

function DraftQuoteModal({
	onClose,
	anchorRef,
}: {
	onClose: () => void
	anchorRef: RefObject<HTMLButtonElement | null>
}) {
	const { t, i18n } = useTranslation('portal')
	const isAr = i18n.language === 'ar'
	const isCompactViewport = useDraftModalFullscreen()
	const items = useDraftQuoteStore((s) => s.items)
	const updateQuantity = useDraftQuoteStore((s) => s.updateQuantity)
	const remove = useDraftQuoteStore((s) => s.remove)
	const clear = useDraftQuoteStore((s) => s.clear)

	const [pos, setPos] = useState({ top: 0, left: 0 })
	useEffect(() => {
		if (isCompactViewport || !anchorRef.current) return

		function updatePosition() {
			if (!anchorRef.current) return

			const rect = anchorRef.current.getBoundingClientRect()
			const modalWidth = Math.min(380, window.innerWidth - 24)
			const modalHeight = Math.min(window.innerHeight * 0.6, 520)
			const preferredLeft = isAr ? rect.left - modalWidth - 8 : rect.right + 8
			const maxLeft = Math.max(12, window.innerWidth - modalWidth - 12)
			const maxTop = Math.max(12, window.innerHeight - modalHeight - 12)

			setPos({
				top: Math.min(Math.max(rect.top, 12), maxTop),
				left: Math.min(Math.max(preferredLeft, 12), maxLeft),
			})
		}

		updatePosition()
		window.addEventListener('resize', updatePosition)
		return () => window.removeEventListener('resize', updatePosition)
	}, [anchorRef, isAr, isCompactViewport])

	useEffect(() => {
		if (!isCompactViewport) return

		const previousOverflow = document.body.style.overflow
		document.body.style.overflow = 'hidden'

		return () => {
			document.body.style.overflow = previousOverflow
		}
	}, [isCompactViewport])

	useEffect(() => {
		function handleKey(e: KeyboardEvent) {
			if (e.key === 'Escape') onClose()
		}
		document.addEventListener('keydown', handleKey)
		return () => document.removeEventListener('keydown', handleKey)
	}, [onClose])

	const handleShare = async () => {
		const lines = items.map((item) => {
			const name = isAr ? item.nameAr : item.name
			return `${name} — ${item.quantity} ${item.unitOfMeasure}`
		})
		const text = lines.join('\n')
		if (navigator.share) {
			await navigator.share({ title: t('market.draftQuote'), text })
		} else {
			await navigator.clipboard.writeText(text)
		}
	}

	return createPortal(
		<>
			<button
				type="button"
				aria-label={t('window.close')}
				className="fixed inset-0 z-[99] cursor-default bg-transparent"
				onClick={onClose}
			/>
			<motion.div
				initial={
					isCompactViewport ? { opacity: 0, y: 16 } : { opacity: 0, x: -8 }
				}
				animate={
					isCompactViewport ? { opacity: 1, y: 0 } : { opacity: 1, x: 0 }
				}
				transition={{ duration: 0.18, ease: 'easeOut' }}
				style={isCompactViewport ? undefined : { top: pos.top, left: pos.left }}
				role="dialog"
				aria-modal="true"
				aria-labelledby="draft-quote-title"
				className={
					isCompactViewport
						? 'fixed inset-0 z-[100] flex h-dvh w-screen flex-col overflow-hidden border-0 bg-[var(--p-bg)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-none'
						: 'fixed z-[100] flex max-h-[min(60vh,520px)] w-[min(380px,calc(100vw-1.5rem))] flex-col rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] shadow-[var(--p-panel-shadow)]'
				}
			>
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-[var(--p-border)] shrink-0">
					<h2
						id="draft-quote-title"
						className="text-[16px] font-semibold text-[var(--p-text)]"
					>
						{t('market.draftQuote')}
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--p-text-muted)] hover:text-[var(--p-text)] hover:bg-[var(--p-hover)] transition-colors"
					>
						<X size={16} />
					</button>
				</div>

				{/* Items */}
				<div className="flex-1 overflow-y-auto">
					{items.length === 0 ? (
						<div className="flex items-center justify-center py-12">
							<p className="text-[13px] text-[var(--p-text-muted)]">
								{t('market.draftEmpty')}
							</p>
						</div>
					) : (
						items.map((item, idx) => (
							<div
								key={item.productId}
								className={`flex items-center gap-4 px-6 py-3.5 ${
									idx < items.length - 1
										? 'border-b border-[var(--p-border)]'
										: ''
								}`}
							>
								<div className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--p-surface)] shrink-0">
									<img
										src={item.imageUrl}
										alt=""
										className="w-full h-full object-cover"
									/>
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-[13px] font-medium text-[var(--p-text)] truncate">
										{isAr ? item.nameAr : item.name}
									</p>
									<p className="text-[13px] text-[var(--p-text-muted)]">
										{item.unitOfMeasure}
									</p>
								</div>
								<div className="flex items-center gap-1 shrink-0">
									<button
										type="button"
										onClick={() =>
											updateQuantity(item.productId, item.quantity - 1)
										}
										className="w-7 h-7 rounded flex items-center justify-center text-[var(--p-text-muted)] hover:bg-[var(--p-hover)] transition-colors text-[14px]"
									>
										−
									</button>
									<QtyInput
										quantity={item.quantity}
										onChange={(v) => updateQuantity(item.productId, v)}
									/>
									<button
										type="button"
										onClick={() =>
											updateQuantity(item.productId, item.quantity + 1)
										}
										className="w-7 h-7 rounded flex items-center justify-center text-[var(--p-text-muted)] hover:bg-[var(--p-hover)] transition-colors text-[14px]"
									>
										+
									</button>
								</div>
								<button
									type="button"
									onClick={() => remove(item.productId)}
									className="p-1.5 text-[var(--p-text-muted)] hover:text-[var(--p-error)] transition-colors shrink-0"
								>
									<Trash2 size={14} />
								</button>
							</div>
						))
					)}
				</div>

				{/* Footer */}
				{items.length > 0 && (
					<div className="shrink-0 border-t border-[var(--p-border)] px-6 py-4 flex flex-col gap-3">
						<div className="grid grid-cols-2 gap-2 lg:flex lg:items-center">
							<button
								type="button"
								onClick={handleShare}
								className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[var(--p-border)] px-3 text-[13px] font-medium text-[var(--p-text-secondary)] transition-colors hover:text-[var(--p-text)] lg:h-9"
							>
								<Share2 size={13} />
								{t('market.share')}
							</button>
							<button
								type="button"
								onClick={() => {
									/* save — already persisted */
								}}
								className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[var(--p-border)] px-3 text-[13px] font-medium text-[var(--p-text-secondary)] transition-colors hover:text-[var(--p-text)] lg:h-9"
							>
								<Save size={13} />
								{t('market.saveDraft')}
							</button>
							<div className="hidden lg:block lg:flex-1" />
							<button
								type="button"
								onClick={clear}
								className="col-span-2 flex h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-[var(--p-text-muted)] transition-colors hover:text-[var(--p-error)] lg:col-span-1 lg:h-9"
							>
								<Trash2 size={13} />
								{t('market.clearDraft')}
							</button>
						</div>
						<button
							type="button"
							onClick={() => {
								/* submit quote — future */
							}}
							className="h-11 w-full rounded-xl bg-[var(--p-accent)] text-[var(--p-accent-contrast)] text-[14px] font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
						>
							<Send size={15} />
							{t('market.submitQuote')}
						</button>
					</div>
				)}
			</motion.div>
		</>,
		document.body,
	)
}
