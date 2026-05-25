import {
	CheckCircle2,
	Inbox,
	Mail,
	MessageCircle,
	Plus,
	Search,
} from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSupportStore } from '../../stores/customer-service'
import type { Conversation } from '../../types/customer-service'
import {
	EmployeeSearchField,
	EmployeeStatusPill,
} from '../shared/EmployeeControls'
import { ConversationItem } from './ConversationItem'

/** Top-level: Email vs WhatsApp. WhatsApp keeps a sub-filter for closed chats. */
type ChannelTab = 'email' | 'whatsapp'

interface SupportInboxProps {
	conversations: Conversation[]
	selectedId: string | null
	autoSelect?: boolean
	onComposeEmail?: () => void
	onConversationSelect?: () => void
	selectedConversation?: Conversation | null
}

function isResolved(conversation: Conversation): boolean {
	return conversation.status === 'resolved' || conversation.status === 'closed'
}

function isWhatsAppLike(conversation: Conversation): boolean {
	return conversation.channel === 'whatsapp' || conversation.channel === 'live'
}

export function SupportInbox({
	conversations,
	selectedId,
	autoSelect = true,
	onComposeEmail,
	onConversationSelect,
	selectedConversation = null,
}: SupportInboxProps) {
	const { t } = useTranslation('customer-service')
	const searchQuery = useSupportStore((s) => s.searchQuery)
	const setSearchQuery = useSupportStore((s) => s.setSearchQuery)
	const setSelectedConversation = useSupportStore(
		(s) => s.setSelectedConversation,
	)
	const [activeTab, setActiveTab] = useState<ChannelTab>('whatsapp')
	const [showResolved, setShowResolved] = useState(false)
	const canComposeEmail =
		selectedConversation?.channel === 'email' &&
		selectedConversation.status !== 'closed' &&
		selectedConversation.status !== 'resolved'

	function handleTabChange(tab: ChannelTab) {
		setActiveTab(tab)
		setShowResolved(false)
	}

	const counts = useMemo(() => {
		const next = {
			live: 0,
			liveResolved: 0,
			email: 0,
			urgent: 0,
		}

		for (const conv of conversations) {
			if (conv.priority === 'urgent' || conv.slaBreached) next.urgent++
			if (isWhatsAppLike(conv)) {
				if (isResolved(conv)) next.liveResolved++
				else next.live++
				continue
			}
			next.email++
		}

		return next
	}, [conversations])

	const filtered = useMemo(() => {
		let result = conversations.filter((c) =>
			activeTab === 'whatsapp' ? isWhatsAppLike(c) : c.channel === activeTab,
		)

		if (activeTab === 'whatsapp') {
			result = showResolved
				? result.filter(isResolved)
				: result.filter((c) => !isResolved(c))
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

		const sortKey = activeTab === 'whatsapp' ? 'createdAt' : 'lastMessageAt'
		return [...result].sort((a, b) => {
			if (activeTab === 'email') {
				const aNeedsAttention = a.priority === 'urgent' || a.slaBreached
				const bNeedsAttention = b.priority === 'urgent' || b.slaBreached
				if (aNeedsAttention !== bNeedsAttention) {
					return aNeedsAttention ? -1 : 1
				}
			}
			return new Date(a[sortKey]).getTime() - new Date(b[sortKey]).getTime()
		})
	}, [conversations, activeTab, showResolved, searchQuery])

	const isLiveActive = activeTab === 'whatsapp' && !showResolved

	const liveQueueHeadId = useMemo(() => {
		if (!isLiveActive) return null
		return filtered[0]?.id ?? null
	}, [isLiveActive, filtered])

	useEffect(() => {
		if (!autoSelect) return
		if (isLiveActive) {
			if (liveQueueHeadId && selectedId !== liveQueueHeadId) {
				setSelectedConversation(liveQueueHeadId)
			} else if (!liveQueueHeadId && selectedId !== null) {
				setSelectedConversation(null)
			}
			return
		}

		const currentInTab = selectedId && filtered.some((c) => c.id === selectedId)
		const head = filtered[0]
		if (!currentInTab) setSelectedConversation(head?.id ?? null)
	}, [
		isLiveActive,
		liveQueueHeadId,
		selectedId,
		filtered,
		autoSelect,
		setSelectedConversation,
	])

	const queueLabel = showResolved
		? 'closed WhatsApp chats'
		: activeTab === 'whatsapp'
			? 'WhatsApp conversations waiting'
			: 'email conversations'

	return (
		<>
			<div className="shrink-0 border-b border-black/[0.06] px-3 py-3 dark:border-white/[0.08] sm:px-4 lg:px-6 lg:py-4">
				<div className="flex flex-col gap-3 lg:hidden">
					<div className="grid grid-cols-3 gap-2">
						<QueueButtonGrid
							counts={counts}
							activeTab={activeTab}
							showResolved={showResolved}
							iconSize={16}
							onLive={() => handleTabChange('whatsapp')}
							onEmail={() => handleTabChange('email')}
							onResolved={() => {
								setActiveTab('whatsapp')
								setShowResolved(true)
							}}
						/>
					</div>

					<EmployeeSearchField
						value={searchQuery}
						onChange={setSearchQuery}
						placeholder={t('inbox.searchPlaceholder')}
						label={t('inbox.search')}
						clearLabel="Clear customer search"
						className="bg-[var(--color-surface)]"
					/>
				</div>

				<div className="hidden flex-col gap-4 lg:flex">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div className="min-w-0">
							<div className="flex min-w-0 items-center gap-2">
								<p className="font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
									Customer service
								</p>
								<button
									type="button"
									onClick={onComposeEmail}
									disabled={!canComposeEmail}
									aria-label={t('email.compose')}
									className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-black/[0.08] text-[var(--color-text-subtle)] transition-colors hover:border-[var(--color-primary)]/35 hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 disabled:pointer-events-none disabled:opacity-35 dark:border-white/[0.1]"
								>
									<Plus size={14} strokeWidth={2.2} />
								</button>
							</div>
							<div className="mt-2 flex flex-wrap items-center gap-2">
								<span className="font-[family-name:var(--font-bricolage)] text-[34px] font-semibold leading-none tabular-nums text-[var(--color-text)]">
									{filtered.length}
								</span>
								<EmployeeStatusPill
									tone={counts.urgent > 0 ? 'danger' : 'success'}
									leading={
										counts.urgent > 0 ? (
											<Inbox size={13} strokeWidth={2.2} />
										) : (
											<CheckCircle2 size={13} strokeWidth={2.2} />
										)
									}
								>
									{counts.urgent > 0
										? `${counts.urgent} urgent now`
										: 'No urgent customers'}
								</EmployeeStatusPill>
							</div>
							<p className="mt-1 font-[family-name:var(--font-archivo)] text-[13px] leading-snug text-[var(--color-text-muted)]">
								{queueLabel}
							</p>
						</div>
					</div>

					<div className="grid grid-cols-3 gap-2">
						<QueueButtonGrid
							counts={counts}
							activeTab={activeTab}
							showResolved={showResolved}
							iconSize={15}
							onLive={() => handleTabChange('whatsapp')}
							onEmail={() => handleTabChange('email')}
							onResolved={() => {
								setActiveTab('whatsapp')
								setShowResolved(true)
							}}
						/>
					</div>

					<EmployeeSearchField
						value={searchQuery}
						onChange={setSearchQuery}
						placeholder={t('inbox.searchPlaceholder')}
						label={t('inbox.search')}
						clearLabel="Clear customer search"
						className="bg-[var(--color-surface)]"
					/>
				</div>
			</div>

			<div className="relative min-h-0 flex-1 overflow-y-auto bg-line-paper">
				{filtered.length === 0 ? (
					<div className="flex min-h-44 flex-col items-center justify-center gap-3 px-5 text-center">
						<EmployeeStatusPill
							tone="neutral"
							leading={<Search size={13} strokeWidth={2.2} />}
						>
							{t('inbox.noResults')}
						</EmployeeStatusPill>
						<p className="max-w-[28ch] font-[family-name:var(--font-archivo)] text-[13px] leading-relaxed text-[var(--color-text-muted)]">
							Try another channel, status, or customer name.
						</p>
					</div>
				) : (
					<div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
						{filtered.map((conversation, index) => {
							const isLocked = isLiveActive && index > 0
							return (
								<ConversationItem
									key={conversation.id}
									conversation={conversation}
									isSelected={conversation.id === selectedId}
									isLocked={isLocked}
									queuePosition={isLiveActive ? index : 0}
									onSelect={() => {
										setSelectedConversation(conversation.id)
										onConversationSelect?.()
									}}
									isFaded={showResolved}
								/>
							)
						})}
					</div>
				)}
			</div>
		</>
	)
}

function QueueButtonGrid({
	counts,
	activeTab,
	showResolved,
	iconSize,
	onLive,
	onEmail,
	onResolved,
}: {
	counts: { live: number; liveResolved: number; email: number }
	activeTab: ChannelTab
	showResolved: boolean
	iconSize: number
	onLive: () => void
	onEmail: () => void
	onResolved: () => void
}) {
	return (
		<>
			<MobileQueueButton
				active={activeTab === 'whatsapp' && !showResolved}
				label="WhatsApp"
				count={counts.live}
				onClick={onLive}
			>
				<MessageCircle size={iconSize} strokeWidth={2.2} />
			</MobileQueueButton>
			<MobileQueueButton
				active={activeTab === 'email'}
				label="Email"
				count={counts.email}
				onClick={onEmail}
			>
				<Mail size={iconSize} strokeWidth={2.2} />
			</MobileQueueButton>
			<MobileQueueButton
				active={activeTab === 'whatsapp' && showResolved}
				label="Closed chats"
				count={counts.liveResolved}
				onClick={onResolved}
			>
				<CheckCircle2 size={iconSize} strokeWidth={2.2} />
			</MobileQueueButton>
		</>
	)
}

function MobileQueueButton({
	active,
	label,
	count,
	onClick,
	children,
}: {
	active: boolean
	label: string
	count: number
	onClick: () => void
	children: ReactNode
}) {
	return (
		<button
			type="button"
			aria-pressed={active}
			aria-label={`${label}: ${count}`}
			onClick={onClick}
			className={`inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-md border font-[family-name:var(--font-archivo)] text-[12px] font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 ${
				active
					? 'border-transparent bg-[var(--color-primary)] text-white'
					: 'border-black/[0.08] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/35 hover:text-[var(--color-text)] dark:border-white/[0.1]'
			}`}
		>
			<span aria-hidden="true" className="shrink-0">
				{children}
			</span>
			<span className="min-w-0 font-[family-name:var(--font-geist-mono)] text-[11px]">
				{count.toString().padStart(2, '0')}
			</span>
		</button>
	)
}
