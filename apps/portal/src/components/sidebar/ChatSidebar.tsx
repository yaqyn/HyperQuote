import { useQuery } from '@tanstack/react-query'
import { useMatches, useNavigate } from '@tanstack/react-router'
import type { ParseKeys } from 'i18next'
import {
	ArrowLeft,
	ClipboardList,
	ExternalLink,
	Globe,
	Info,
	LifeBuoy,
	LogOut,
	type LucideIcon,
	MessageSquare,
	Moon,
	ShoppingBag,
	Star,
	Sun,
	User,
} from 'lucide-react'
import { motion } from 'motion/react'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { signOutPortalAccount } from '../../lib/auth'
import { getAllCustomerOrders } from '../../lib/server/orders'
import { getCurrentPortalTheme, setPortalTheme } from '../../lib/theme'
import { type Conversation, useChatStore } from '../../stores/chat'
import { useDraftQuoteStore } from '../../stores/draft-quote'
import { usePortalStore } from '../../stores/portal'
import { DraftQuoteTrigger } from '../shared/DraftQuoteTrigger'

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
] satisfies ReadonlyArray<{
	labelKey: ParseKeys<'portal'>
	icon: LucideIcon
	to: string
}>

type NavTarget = (typeof NAV_ITEMS)[number]['to']

const WEBSITE_HREF =
	import.meta.env.VITE_WEBSITE_URL ?? 'https://www.hyperquote.net'

export function ChatSidebar({
	userName,
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
	const [brandMenuOpen, setBrandMenuOpen] = useState(false)
	const brandMenuRef = useRef<HTMLDivElement>(null)

	const conversations = useChatStore((s) =>
		activeRole === 'customer'
			? s.customerConversations
			: s.supplierConversations,
	)
	const activeConversationId = useChatStore(
		(s) => s.activeConversationId[activeRole],
	)
	const loadConversation = useChatStore((s) => s.loadConversation)

	const favorites = conversations.filter((c) => c.pinned)
	const recent = conversations.filter((c) => !c.pinned)
	const firstName = userName?.trim().split(/\s+/)[0] ?? ''
	const currentPath = matches[matches.length - 1]?.pathname ?? '/'

	useEffect(() => {
		if (!brandMenuOpen) return
		function handleClick(event: MouseEvent) {
			if (
				brandMenuRef.current &&
				!brandMenuRef.current.contains(event.target as Node)
			) {
				setBrandMenuOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClick)
		return () => document.removeEventListener('mousedown', handleClick)
	}, [brandMenuOpen])

	const closeSidebarAfterNavigate = useCallback(() => {
		if (closeOnNavigate) {
			usePortalStore.getState().setSidebarOpen(false)
		}
	}, [closeOnNavigate])

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
		<div className="relative flex h-full min-h-0 w-full max-w-full shrink-0 flex-col overflow-hidden border-e border-[var(--p-border)] bg-[var(--p-bg)] text-[var(--p-text)] shadow-[var(--p-sidebar-shadow)] lg:shadow-none">
			<div className="relative flex h-full min-h-0 flex-col">
				<motion.header
					{...stagger(0)}
					className="shrink-0 border-b border-[var(--p-border)] px-4 py-3"
				>
					<div className="flex items-center justify-between gap-3">
						<div ref={brandMenuRef} className="relative min-w-0">
							<button
								type="button"
								onClick={() => setBrandMenuOpen((open) => !open)}
								className="flex min-h-9 min-w-0 items-center rounded-xl px-1 text-start transition-colors hover:text-[var(--p-text-secondary)]"
								aria-expanded={brandMenuOpen}
							>
								<span className="truncate text-[17px] font-semibold leading-tight text-[var(--p-text)]">
									HyperQuote
								</span>
								<span className="ms-1 truncate text-[17px] font-semibold leading-tight text-[var(--p-text)]">
									Portal
								</span>
							</button>
							{brandMenuOpen && (
								<div className="absolute start-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-1 shadow-[var(--p-popover-shadow)]">
									<a
										href={WEBSITE_HREF}
										target="_blank"
										rel="noreferrer"
										onClick={() => setBrandMenuOpen(false)}
										className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-start text-[13px] font-medium text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
									>
										<ExternalLink
											size={15}
											strokeWidth={1.65}
											className="shrink-0"
										/>
										<span className="min-w-0 truncate">
											{t('sidebar.visitWebsite')}
										</span>
									</a>
								</div>
							)}
						</div>

						<button
							type="button"
							onClick={() => usePortalStore.getState().setSidebarOpen(false)}
							className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
							aria-label={t('sidebar.hide')}
							aria-keyshortcuts="["
						>
							<ArrowLeft size={16} strokeWidth={1.7} />
						</button>
					</div>
				</motion.header>

				<motion.nav
					{...stagger(1)}
					className="grid grid-cols-4 gap-1 border-b border-[var(--p-border)] px-4 py-3 lg:grid-cols-1 lg:gap-2"
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
								className={`group relative flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-center transition-colors lg:h-11 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-start ${
									isActive
										? 'border-[var(--p-border-strong)] bg-[var(--p-card)] text-[var(--p-text)]'
										: 'border-[var(--p-border)] bg-[var(--p-card)] text-[var(--p-text-muted)] hover:border-[var(--p-border-strong)] hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]'
								}`}
							>
								<span
									className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors lg:h-8 lg:w-8 ${
										isActive
											? 'border-[var(--p-border)] bg-[var(--p-bg)] text-[var(--p-text)]'
											: 'border-[var(--p-border)] bg-[var(--p-bg)] text-[var(--p-text-faint)] group-hover:text-[var(--p-text-muted)]'
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
					<motion.div {...stagger(2)} className="shrink-0 px-4 pt-3">
						<div className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-1">
							{(['customer', 'supplier'] as const).map((role) => (
								<button
									key={role}
									type="button"
									onClick={() => setActiveRole(role)}
									className={`h-8 rounded-lg text-[11px] font-semibold transition-colors ${
										activeRole === role
											? 'bg-[var(--p-bg)] text-[var(--p-text)] shadow-[inset_0_0_0_1px_var(--p-border)]'
											: 'text-[var(--p-text-muted)] hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]'
									}`}
								>
									{t(`role.${role}`)}
								</button>
							))}
						</div>
					</motion.div>
				)}

				<motion.div
					{...stagger(3)}
					className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3"
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
					className="relative shrink-0 border-t border-[var(--p-border)] px-4 py-3"
				>
					<div className="flex min-w-0 items-center gap-3">
						<ProfileMenu
							userName={userName}
							closeOnNavigate={closeOnNavigate}
						/>
						<div className="min-w-0">
							<p className="truncate text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--p-text-faint)]">
								{t('sidebar.welcome')}
							</p>
							<p className="truncate text-[15px] font-semibold leading-tight text-[var(--p-text)]">
								{firstName}
							</p>
						</div>
					</div>
				</motion.footer>
			</div>
		</div>
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
			className="group flex w-full items-center gap-2 px-0 pt-5 pb-2 text-start"
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
				<span className="voice-mono rounded-full border border-[var(--p-border)] bg-[var(--p-card)] px-1.5 py-0.5 text-[10px] tabular-nums text-[var(--p-text-secondary)]">
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
			className={`group relative flex min-h-10 w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-start transition-colors ${
				isActive
					? 'border-[var(--p-border-strong)] bg-[var(--p-card)] text-[var(--p-text)]'
					: 'border-[var(--p-border)] bg-[var(--p-card)] text-[var(--p-text-muted)] hover:border-[var(--p-border-strong)] hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]'
			}`}
		>
			<span
				aria-hidden
				className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
					isActive
						? 'bg-[var(--p-text)]'
						: 'bg-[var(--p-border-strong)] group-hover:bg-[var(--p-text-muted)]'
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
	closeOnNavigate = false,
}: {
	userName: string
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

	async function handleSignOut() {
		setOpen(false)
		setSigningOut(true)
		try {
			await signOutPortalAccount()
		} finally {
			setTimeout(() => navigate({ to: '/login', replace: true }), 500)
		}
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
	] satisfies Array<{
		labelKey: ParseKeys<'portal'>
		icon: LucideIcon
		action: () => void
	}>

	const initial = (userName || '?').charAt(0).toUpperCase()

	return (
		<div ref={menuRef} className="relative">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="group inline-flex h-10 w-10 items-center justify-center rounded-xl text-start transition-colors hover:bg-[var(--p-hover)]"
				aria-label={userName}
				title={userName}
			>
				<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] text-[14px] font-semibold text-[var(--p-text)] transition-colors group-hover:border-[var(--p-border-strong)]">
					{initial}
				</span>
			</button>

			{open && (
				<div className="absolute bottom-full start-0 mb-3 w-52 overflow-hidden rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-1 shadow-[var(--p-popover-shadow)]">
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
	const { t, i18n } = useTranslation('portal')
	const navigate = useNavigate()
	const setDraftQuoteOpen = usePortalStore((s) => s.setDraftQuoteOpen)
	const items = useDraftQuoteStore((s) => s.items)
	const [sectionOpen, setSectionOpen] = useState(true)

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
						<DraftQuoteTrigger
							count={items.length}
							isAr={i18n.language === 'ar'}
							onClick={() => {
								setDraftQuoteOpen(true)
							}}
						/>
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
								className="flex min-h-9 w-full items-center gap-2 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-2.5 py-1.5 text-start text-[var(--p-text-muted)] transition-colors hover:border-[var(--p-border-strong)] hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
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
								className="flex min-h-9 w-full items-center gap-2 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-2.5 py-1.5 text-start text-[var(--p-text-muted)] transition-colors hover:border-[var(--p-border-strong)] hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
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
		</>
	)
}
