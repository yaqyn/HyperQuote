import type { ParseKeys } from 'i18next'
import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button, Input, SearchField } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useSupportStore } from '../../stores/customer-service'
import type { Conversation } from '../../types/customer-service'
import { ConversationItem } from './ConversationItem'

type CSKey = ParseKeys<'customer-service'>

/** Top-level: Email vs Live Chat. Live Chat has a sub-filter for resolved. */
type ChannelTab = 'email' | 'live'

interface SupportInboxProps {
	conversations: Conversation[]
	selectedId: string | null
}

export function SupportInbox({ conversations, selectedId }: SupportInboxProps) {
	const { t } = useTranslation('customer-service')
	const statusFilter = useSupportStore((s) => s.statusFilter)
	const searchQuery = useSupportStore((s) => s.searchQuery)
	const setSearchQuery = useSupportStore((s) => s.setSearchQuery)
	const setSelectedConversation = useSupportStore(
		(s) => s.setSelectedConversation,
	)
	const [searchOpen, setSearchOpen] = useState(false)
	const [activeTab, setActiveTab] = useState<ChannelTab>('live')
	const [showResolved, setShowResolved] = useState(false)

	// Reset resolved view when switching tabs
	function handleTabChange(tab: ChannelTab) {
		setActiveTab(tab)
		setShowResolved(false)
	}

	const counts = useMemo(() => {
		let live = 0
		let liveResolved = 0
		let email = 0
		for (const conv of conversations) {
			if (conv.channel === 'live') {
				if (conv.status === 'resolved' || conv.status === 'closed')
					liveResolved++
				else live++
			} else {
				email++
			}
		}
		return { email, live, liveResolved }
	}, [conversations])

	const filtered = useMemo(() => {
		let result = conversations.filter((c) => c.channel === activeTab)

		// Live chat: split active vs resolved
		if (activeTab === 'live') {
			if (showResolved) {
				result = result.filter(
					(c) => c.status === 'resolved' || c.status === 'closed',
				)
			} else {
				result = result.filter(
					(c) => c.status !== 'resolved' && c.status !== 'closed',
				)
			}
		}

		if (statusFilter !== 'all' && activeTab === 'email') {
			result = result.filter((c) => c.status === statusFilter)
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase()
			result = result.filter(
				(c) =>
					c.customer.name.toLowerCase().includes(q) ||
					c.customer.nameAr.includes(q) ||
					c.subject.toLowerCase().includes(q) ||
					c.lastMessagePreview.toLowerCase().includes(q),
			)
		}
		// Oldest first — whoever's been waiting longest gets served first.
		// Live queue sorts by createdAt so agent replies don't bump the
		// active conversation out of the queue head (cycling bug).
		const sortKey = activeTab === 'live' ? 'createdAt' : 'lastMessageAt'
		return result.sort(
			(a, b) => new Date(a[sortKey]).getTime() - new Date(b[sortKey]).getTime(),
		)
	}, [conversations, activeTab, showResolved, statusFilter, searchQuery])

	const isLiveActive = activeTab === 'live' && !showResolved

	// Live queue: first conversation is the queue head
	const liveQueueHeadId = useMemo(() => {
		if (!isLiveActive) return null
		return filtered[0]?.id ?? null
	}, [isLiveActive, filtered])

	// Auto-select logic
	useEffect(() => {
		if (isLiveActive) {
			if (liveQueueHeadId && selectedId !== liveQueueHeadId) {
				setSelectedConversation(liveQueueHeadId)
			}
		} else {
			const currentInTab =
				selectedId && filtered.some((c) => c.id === selectedId)
			const head = filtered[0]
			if (!currentInTab && head) {
				setSelectedConversation(head.id)
			}
		}
	}, [
		isLiveActive,
		liveQueueHeadId,
		selectedId,
		filtered,
		setSelectedConversation,
	])

	const tabs: Array<{ key: ChannelTab; code: string; labelKey: CSKey }> = [
		{ key: 'live', code: 'LIV', labelKey: 'channels.live' },
		{ key: 'email', code: 'EML', labelKey: 'channels.email' },
	]

	const eyebrowLabel = showResolved
		? t('status.resolved')
		: t(`channels.${activeTab}`)

	return (
		<>
			{/* ── Masthead ─────────────────────────────────────────
          Operator's station — call sign up top, count as display figure. */}
			<div className="shrink-0 px-6 pt-7 pb-5 border-b border-black/[0.06] dark:border-white/[0.08]">
				<p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.28em] text-[var(--color-text-subtle)] flex items-center gap-2">
					<span>{t('inbox.conversations')}</span>
					<span className="text-[var(--color-border)]">·</span>
					<span>STATION 01</span>
				</p>

				<div className="mt-3 flex items-end justify-between gap-3">
					<div>
						<span
							className="block font-[family-name:var(--font-bricolage)] text-[44px] leading-none tabular-nums tracking-[-0.02em] text-[var(--color-text)]"
							style={{ fontVariationSettings: '"opsz" 96, "wght" 500' }}
						>
							{filtered.length}
						</span>
						<span
							className="block mt-2 font-[family-name:var(--font-literata)] italic text-[13px] leading-snug text-[var(--color-text-muted)]"
							style={{ fontVariationSettings: '"opsz" 12, "wght" 400' }}
						>
							{showResolved
								? t('status.resolved').toLowerCase()
								: eyebrowLabel.toLowerCase()}{' '}
							on the line
						</span>
					</div>
					<Button
						onPress={() => {
							setSearchOpen((o) => !o)
							if (searchOpen) setSearchQuery('')
						}}
						aria-label={t('inbox.search')}
						className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors outline-none mb-0.5
              ${
								searchOpen
									? 'text-[var(--color-text)] bg-black/[0.05] dark:bg-white/[0.06]'
									: 'text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
							}`}
					>
						{searchOpen ? (
							<X size={14} strokeWidth={1.5} />
						) : (
							<Search size={14} strokeWidth={1.5} />
						)}
					</Button>
				</div>

				{/* Channel tabs as mono codes */}
				<div className="mt-5 flex items-center gap-5">
					{tabs.map(({ key, code, labelKey }) => {
						const isActive = activeTab === key && !showResolved
						const count = key === 'live' ? counts.live : counts.email
						return (
							<Button
								key={key}
								onPress={() => handleTabChange(key)}
								aria-label={t(labelKey)}
								className={`relative pb-1.5 outline-none transition-colors font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-medium tracking-[0.14em]
                  ${
										isActive
											? 'text-[var(--color-text)]'
											: 'text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)]'
									}`}
							>
								<span>{code}</span>
								<span className="ms-1.5 opacity-70 tabular-nums">{count}</span>
								{isActive && (
									<span className="absolute -bottom-px start-0 end-0 h-[1.5px] bg-[var(--color-primary)]" />
								)}
							</Button>
						)
					})}

					{/* Resolved sub-tab — only on live channel */}
					{activeTab === 'live' && counts.liveResolved > 0 && (
						<>
							<span
								aria-hidden
								className="text-[var(--color-border)] select-none"
							>
								‖
							</span>
							<Button
								onPress={() => setShowResolved(!showResolved)}
								aria-label={t('status.resolved')}
								className={`relative pb-1.5 outline-none transition-colors font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-medium tracking-[0.14em]
                  ${
										showResolved
											? 'text-[var(--color-text)]'
											: 'text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)]'
									}`}
							>
								<span>RES</span>
								<span className="ms-1.5 opacity-70 tabular-nums">
									{counts.liveResolved}
								</span>
								{showResolved && (
									<span className="absolute -bottom-px start-0 end-0 h-[1.5px] bg-[var(--color-primary)]" />
								)}
							</Button>
						</>
					)}
				</div>

				{/* Search — revealed */}
				{searchOpen && (
					<div className="mt-4">
						<SearchField
							aria-label={t('inbox.search')}
							value={searchQuery}
							onChange={setSearchQuery}
							autoFocus
							className="relative"
						>
							<Search
								size={12}
								className="absolute start-0 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)] pointer-events-none"
							/>
							<Input
								placeholder={t('inbox.searchPlaceholder')}
								className="w-full font-[family-name:var(--font-literata)] italic text-[13px] py-2 ps-5 pe-0 text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none bg-transparent border-b border-black/[0.08] dark:border-white/[0.08] focus:border-[var(--color-text)] transition-colors"
							/>
						</SearchField>
					</div>
				)}
			</div>

			{/* ── Queue list ───────────────────────────────────────
          Line-paper backdrop turns the list into a logbook page. */}
			<div className="flex-1 overflow-y-auto min-h-0 relative bg-line-paper">
				{filtered.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-40 gap-1.5">
						<p
							className="font-[family-name:var(--font-literata)] italic text-[17px] text-[var(--color-text-muted)]"
							style={{ fontVariationSettings: '"opsz" 18' }}
						>
							{t('inbox.noResults')}
						</p>
						<p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
							the line is quiet
						</p>
					</div>
				) : (
					<>
						{filtered.map((conversation, index) => {
							const isLocked = isLiveActive && index > 0
							return (
								<ConversationItem
									key={conversation.id}
									conversation={conversation}
									isSelected={conversation.id === selectedId}
									isLocked={isLocked}
									queuePosition={isLiveActive ? index : 0}
									onSelect={() => setSelectedConversation(conversation.id)}
									isFaded={showResolved}
								/>
							)
						})}

						{/* Queue-depth fade — only when there's a locked tail */}
						{isLiveActive && filtered.length > 1 && (
							<div className="sticky bottom-0 h-16 pointer-events-none bg-gradient-to-t from-[var(--color-surface)] to-transparent" />
						)}
					</>
				)}
			</div>
		</>
	)
}
