import { useQuery } from '@tanstack/react-query'
import { useMatches, useNavigate } from '@tanstack/react-router'
import {
	ClipboardList,
	Globe,
	Info,
	LifeBuoy,
	LogOut,
	MessageSquare,
	PanelLeft,
	Plus,
	Save,
	Send,
	Share2,
	ShoppingBag,
	Star,
	Trash2,
	User,
	X,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { getAllCustomerOrders } from '../../lib/server/orders'
import { type Conversation, useChatStore } from '../../stores/chat'
import { useDraftQuoteStore } from '../../stores/draft-quote'
import { usePortalStore } from '../../stores/portal'

interface ChatSidebarProps {
	userName: string
	companyName?: string
	hasSupplierRole: boolean
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

export function ChatSidebar({
	userName,
	companyName,
	hasSupplierRole,
}: ChatSidebarProps) {
	const { t } = useTranslation('portal')
	const navigate = useNavigate()
	const matches = useMatches()
	const activeRole = usePortalStore((s) => s.activeRole)
	const setActiveRole = usePortalStore((s) => s.setActiveRole)
	const [collapsed, setCollapsed] = useState(false)
	const [_historyOpen, _setHistoryOpen] = useState(true)
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

	const handleNewChat = useCallback(() => {
		clearActive(activeRole)
	}, [clearActive, activeRole])

	const handleSelect = useCallback(
		(id: string) => {
			loadConversation(activeRole, id)
		},
		[loadConversation, activeRole],
	)

	if (collapsed) {
		return (
			<div className="office-wall flex flex-col items-center w-14 shrink-0 border-e border-[var(--p-border)] py-3 gap-3">
				<button
					type="button"
					onClick={() => setCollapsed(false)}
					className="w-9 h-9 flex items-center justify-center text-[var(--p-text-muted)] hover:text-[var(--p-text)] transition-colors"
					aria-label="Expand sidebar"
				>
					<PanelLeft size={16} strokeWidth={1.5} />
				</button>
				<button
					type="button"
					onClick={handleNewChat}
					className="w-9 h-9 flex items-center justify-center text-[var(--p-text-muted)] hover:text-[var(--p-text)] transition-colors"
					aria-label={t('sidebar.newChat')}
				>
					<Plus size={16} strokeWidth={1.5} />
				</button>
				<div className="flex-1" />
				<div className="w-8 h-8 flex items-center justify-center voice-serif italic text-[15px] text-[var(--p-text-muted)]">
					{(userName || '?').charAt(0).toUpperCase()}.
				</div>
			</div>
		)
	}

	const stagger = (i: number) => ({
		initial: { opacity: 0, y: 8 } as const,
		animate: { opacity: 1, y: 0 } as const,
		transition: {
			duration: 0.35,
			delay: 0.45 + i * 0.07,
			ease: [0.22, 1, 0.36, 1] as const,
		},
	})

	return (
		<div className="office-wall flex h-full w-[260px] shrink-0 flex-col border-e border-[var(--p-border)]">
			{/* Masthead — personal welcome */}
			<motion.div {...stagger(0)} className="px-5 pt-6 pb-4">
				<div className="flex items-center justify-between gap-3">
					<div className="flex flex-col gap-0.5">
						<span className="voice-mono text-[9px] uppercase tracking-[0.32em] text-[var(--p-text-faint)]">
							Welcome
						</span>
						<span className="voice-display text-[20px] leading-none text-[var(--p-text)]">
							{userName?.split(/\s+/)[0] ?? ''}
						</span>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleNewChat}
							className="voice-mono inline-flex h-6 w-6 items-center justify-center border border-[var(--p-border)] text-[var(--p-text-muted)] transition-colors hover:border-[var(--p-border-strong)] hover:text-[var(--p-text)]"
							aria-label={t('sidebar.newChat')}
						>
							<Plus size={12} strokeWidth={1.8} />
						</button>
						<button
							type="button"
							onClick={() => usePortalStore.getState().setSidebarOpen(false)}
							className="inline-flex h-6 w-6 items-center justify-center text-[var(--p-text-muted)] transition-colors hover:text-[var(--p-text)]"
							aria-label="Hide sidebar"
							aria-keyshortcuts="["
						>
							<PanelLeft size={13} strokeWidth={1.5} />
						</button>
					</div>
				</div>
			</motion.div>

			<div className="office-rule mx-5 mb-2" />

			{/* Nav — clean stack with ink-bar active indicator */}
			<nav className="flex flex-col px-3 pb-4">
				{NAV_ITEMS.map((item, idx) => {
					const currentPath = matches[matches.length - 1]?.pathname ?? '/'
					const isActive =
						item.to === '/'
							? currentPath === '/'
							: currentPath.startsWith(item.to)
					return (
						<motion.button
							key={item.labelKey}
							{...stagger(1 + idx)}
							type="button"
							onClick={() => navigate({ to: item.to })}
							aria-current={isActive ? 'page' : undefined}
							className={`voice-mono relative flex h-9 items-center rounded-sm px-3 text-start text-[11px] uppercase tracking-[0.22em] transition-colors ${
								isActive
									? 'bg-[var(--p-hover)] text-[var(--p-text)]'
									: 'text-[var(--p-text-muted)] hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]'
							}`}
						>
							<span
								aria-hidden
								className={`absolute inset-y-1.5 start-0 w-[2px] rounded-full transition-colors ${
									isActive ? 'bg-[var(--p-text)]' : 'bg-transparent'
								}`}
							/>
							<span>{t(item.labelKey)}</span>
						</motion.button>
					)
				})}
			</nav>

			{/* Role toggle */}
			{hasSupplierRole && (
				<motion.div {...stagger(5)} className="px-5 pb-3">
					<div className="flex items-center gap-4 border-y border-[var(--p-border)] py-2">
						{(['customer', 'supplier'] as const).map((role) => (
							<button
								key={role}
								type="button"
								onClick={() => setActiveRole(role)}
								className={`voice-mono flex-1 text-[10px] uppercase tracking-[0.22em] transition-colors ${
									activeRole === role
										? 'text-[var(--p-text)]'
										: 'text-[var(--p-text-muted)] hover:text-[var(--p-text-secondary)]'
								}`}
							>
								{t(`role.${role}`)}
							</button>
						))}
					</div>
				</motion.div>
			)}

			{/* Chat history */}
			<motion.div {...stagger(6)} className="flex-1 overflow-y-auto px-2 pb-2">
				{/* Draft Quote / Order History */}
				<DraftSection />

				{/* Favorites — pinned chats at top */}

				{/* Chat History — favorites float to top */}
				{favorites.length > 0 && (
					<>
						<SectionHeader
							label={t('sidebar.starredChats')}
							icon={<Star size={11} className="text-[var(--p-text-muted)]" />}
							count={favorites.length}
							open={favoritesOpen}
							onToggle={() => setFavoritesOpen(!favoritesOpen)}
						/>
						{favoritesOpen && (
							<div className="flex flex-col gap-px mb-2">
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
					<div className="flex flex-col gap-px mb-2">
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
							<p className="px-3 py-2 text-[13px] text-[var(--p-text-muted)]">
								{t('sidebar.noChats')}
							</p>
						)}
					</div>
				)}
			</motion.div>

			{/* User profile with menu */}
			<motion.div
				{...stagger(7)}
				className="border-t border-[var(--p-border)] px-3 py-3 relative"
			>
				<ProfileMenu userName={userName} companyName={companyName} />
			</motion.div>
		</div>
	)
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
			className="shrink-0 text-[var(--p-text)]"
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
			className="voice-display text-[14px] leading-none text-[var(--p-text-faint)]"
		>
			{open ? '−' : '+'}
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
	icon?: React.ReactNode
	count?: number
	open: boolean
	onToggle: () => void
}) {
	return (
		<button
			type="button"
			onClick={onToggle}
			className="group flex w-full items-center gap-3 px-3 pt-6 pb-2 text-start"
		>
			<span className="voice-mono flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-[var(--p-text-faint)] transition-colors group-hover:text-[var(--p-text-muted)]">
				{icon}
				{label}
			</span>
			<span
				aria-hidden
				className="h-px flex-1 bg-[var(--p-rule)] transition-colors group-hover:bg-[var(--p-rule-strong)]"
			/>
			{typeof count === 'number' && count > 0 && (
				<span className="voice-mono tabular-nums text-[10px] text-[var(--p-text-faint)]">
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
	const preview = conversation.preview || 'New conversation'
	return (
		<button
			type="button"
			onClick={onSelect}
			className={`group relative w-full py-1.5 ps-3 text-start transition-colors ${
				isActive
					? 'text-[var(--p-text)]'
					: 'text-[var(--p-text-muted)] hover:text-[var(--p-text)]'
			}`}
		>
			{/* Folder-tab ruled edge */}
			<span
				aria-hidden
				className={`absolute inset-y-0 start-0 w-px transition-colors ${
					isActive
						? 'bg-[var(--p-text)]'
						: 'bg-[var(--p-rule)] group-hover:bg-[var(--p-rule-strong)]'
				}`}
			/>
			<span className="voice-serif block truncate text-[13px] italic leading-tight">
				{preview}
			</span>
		</button>
	)
}

function ProfileMenu({
	userName,
	companyName,
}: {
	userName: string
	companyName?: string
}) {
	const { t, i18n } = useTranslation('portal')
	const navigate = useNavigate()
	const setSigningOut = usePortalStore((s) => s.setSigningOut)
	const [open, setOpen] = useState(false)
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
				className="-mx-1 flex w-full items-baseline gap-3 px-1 py-1 text-start transition-colors hover:text-[var(--p-text)]"
			>
				<span className="voice-serif shrink-0 text-[20px] italic leading-none text-[var(--p-text-muted)]">
					{initial}.
				</span>
				<div className="min-w-0 flex-1">
					<p className="voice-mono truncate text-[11px] uppercase tracking-[0.16em] text-[var(--p-text)]">
						{userName}
					</p>
					{companyName && (
						<p className="voice-serif truncate text-[13px] italic text-[var(--p-text-muted)]">
							{companyName}
						</p>
					)}
				</div>
			</button>

			{open && (
				<div className="absolute inset-x-0 bottom-full mb-2 overflow-hidden border border-[var(--p-border)] bg-[var(--p-card)] shadow-[0_8px_30px_rgba(0,0,0,0.55)]">
					{menuItems.map((item) => (
						<button
							key={item.labelKey}
							type="button"
							onClick={() => {
								setOpen(false)
								item.action()
							}}
							className="voice-mono flex w-full items-center gap-2 px-4 py-2.5 text-start text-[11px] uppercase tracking-[0.2em] text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
						>
							<span>{t(item.labelKey)}</span>
						</button>
					))}
				</div>
			)}
		</div>
	)
}

function DraftSection() {
	const { t, i18n } = useTranslation('portal')
	const navigate = useNavigate()
	const _isAr = i18n.language === 'ar'
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

	return (
		<>
			<SectionHeader
				label={t('sidebar.orderHistory')}
				open={sectionOpen}
				onToggle={() => setSectionOpen(!sectionOpen)}
			/>
			{sectionOpen && (
				<div className="flex flex-col mb-2">
					{/* Draft */}
					{items.length > 0 && (
						<button
							ref={btnRef}
							type="button"
							onClick={() => setModalOpen(!modalOpen)}
							className="flex items-center gap-2.5 px-3 py-2 rounded-md text-start transition-colors text-[var(--p-text-secondary)] hover:bg-[var(--p-hover)] border border-transparent w-full"
						>
							<ClipboardList
								size={14}
								strokeWidth={1.5}
								className="text-[var(--p-text)]"
							/>
							<span className="flex-1 text-[13px]">
								{t('market.draftQuote')}
							</span>
							<span className="font-mono text-[13px] text-[var(--p-text-muted)]">
								{items.length}
							</span>
						</button>
					)}

					{/* Saved Orders */}
					<p className="px-3 pt-3 pb-1 text-[13px] font-semibold text-[var(--p-text-muted)] uppercase tracking-wider">
						{t('sidebar.savedOrders')}
					</p>
					{savedOrders.length > 0 ? (
						savedOrders.map((order) => (
							<button
								key={order.id}
								type="button"
								onClick={() =>
									navigate({
										to: '/orders/edit/$orderId',
										params: { orderId: order.id },
									})
								}
								className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-start transition-colors text-[var(--p-text-secondary)] hover:bg-[var(--p-hover)] w-full"
							>
								<span className="flex-1 text-[13px] truncate">
									{order.name ?? 'Draft'}
								</span>
								<span className="font-mono text-[13px] text-[var(--p-text-muted)]">
									{order.itemCount}
								</span>
							</button>
						))
					) : (
						<p className="px-3 py-1.5 text-[13px] text-[var(--p-text-muted)]">
							{t('sidebar.noSavedOrders')}
						</p>
					)}

					{/* Submitted Orders */}
					<p className="px-3 pt-3 pb-1 text-[13px] font-semibold text-[var(--p-text-muted)] uppercase tracking-wider">
						{t('sidebar.submittedOrders')}
					</p>
					{submittedOrders.length > 0 ? (
						submittedOrders.map((order) => (
							<button
								key={order.id}
								type="button"
								onClick={() =>
									navigate({
										to: '/orders/$orderId',
										params: { orderId: order.id },
									})
								}
								className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-start transition-colors text-[var(--p-text-secondary)] hover:bg-[var(--p-hover)] w-full"
							>
								<span className="flex-1 text-[13px] font-mono truncate">
									{order.reference}
								</span>
								<span className="font-mono text-[13px] text-[var(--p-text-muted)]">
									{order.itemCount}
								</span>
							</button>
						))
					) : (
						<p className="px-3 py-1.5 text-[13px] text-[var(--p-text-muted)]">
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
	anchorRef: React.RefObject<HTMLButtonElement | null>
}) {
	const { t, i18n } = useTranslation('portal')
	const isAr = i18n.language === 'ar'
	const items = useDraftQuoteStore((s) => s.items)
	const updateQuantity = useDraftQuoteStore((s) => s.updateQuantity)
	const remove = useDraftQuoteStore((s) => s.remove)
	const clear = useDraftQuoteStore((s) => s.clear)

	const [pos, setPos] = useState({ top: 0, left: 0 })
	useEffect(() => {
		if (!anchorRef.current) return
		const rect = anchorRef.current.getBoundingClientRect()
		setPos({
			top: rect.top,
			left: rect.right + 8,
		})
	}, [anchorRef])

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
				initial={{ opacity: 0, x: -8 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.15, ease: 'easeOut' }}
				style={{ top: pos.top, left: pos.left }}
				className="fixed z-[100] w-[380px] max-h-[60vh] flex flex-col rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
			>
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-[var(--p-border)] shrink-0">
					<h2 className="text-[16px] font-semibold text-[var(--p-text)]">
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
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handleShare}
								className="h-9 px-3 rounded-lg border border-[var(--p-border)] text-[var(--p-text-secondary)] text-[13px] font-medium hover:text-[var(--p-text)] transition-colors flex items-center gap-1.5"
							>
								<Share2 size={13} />
								{t('market.share')}
							</button>
							<button
								type="button"
								onClick={() => {
									/* save — already persisted */
								}}
								className="h-9 px-3 rounded-lg border border-[var(--p-border)] text-[var(--p-text-secondary)] text-[13px] font-medium hover:text-[var(--p-text)] transition-colors flex items-center gap-1.5"
							>
								<Save size={13} />
								{t('market.saveDraft')}
							</button>
							<div className="flex-1" />
							<button
								type="button"
								onClick={clear}
								className="h-9 px-3 rounded-lg text-[var(--p-text-muted)] text-[13px] font-medium hover:text-[var(--p-error)] transition-colors flex items-center gap-1.5"
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
							className="h-11 w-full rounded-xl bg-[var(--p-text)] text-[var(--p-bg)] text-[14px] font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
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
