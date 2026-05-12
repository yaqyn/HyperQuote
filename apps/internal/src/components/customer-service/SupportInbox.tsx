import { CheckCircle2, Inbox, Mail, MessageCircle, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSupportStore } from '../../stores/customer-service'
import type {
	Conversation,
	ConversationStatus,
} from '../../types/customer-service'
import {
	EmployeeFilterChip,
	EmployeeSearchField,
	EmployeeStatusPill,
} from '../shared/EmployeeControls'
import { ConversationItem } from './ConversationItem'

/** Top-level: Email vs Live Chat. Live Chat has a sub-filter for resolved. */
type ChannelTab = 'email' | 'live'

interface SupportInboxProps {
	conversations: Conversation[]
	selectedId: string | null
	autoSelect?: boolean
	onConversationSelect?: () => void
}

const EMAIL_STATUS_FILTERS: Array<{
	key: ConversationStatus | 'all'
	label: string
}> = [
	{ key: 'all', label: 'All email' },
	{ key: 'open', label: 'Open' },
	{ key: 'pending', label: 'Pending' },
	{ key: 'resolved', label: 'Resolved' },
]

function isResolved(conversation: Conversation): boolean {
	return conversation.status === 'resolved' || conversation.status === 'closed'
}

function statusTone(status: ConversationStatus) {
	if (status === 'open') return 'primary' as const
	if (status === 'pending') return 'warning' as const
	if (status === 'resolved' || status === 'closed') return 'success' as const
	return 'neutral' as const
}

export function SupportInbox({
	conversations,
	selectedId,
	autoSelect = true,
	onConversationSelect,
}: SupportInboxProps) {
	const { t } = useTranslation('customer-service')
	const statusFilter = useSupportStore((s) => s.statusFilter)
	const searchQuery = useSupportStore((s) => s.searchQuery)
	const setStatusFilter = useSupportStore((s) => s.setStatusFilter)
	const setSearchQuery = useSupportStore((s) => s.setSearchQuery)
	const setSelectedConversation = useSupportStore(
		(s) => s.setSelectedConversation,
	)
	const [activeTab, setActiveTab] = useState<ChannelTab>('live')
	const [showResolved, setShowResolved] = useState(false)

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
			status: {
				all: 0,
				open: 0,
				pending: 0,
				resolved: 0,
				closed: 0,
			} satisfies Record<ConversationStatus | 'all', number>,
		}

		for (const conv of conversations) {
			if (conv.priority === 'urgent' || conv.slaBreached) next.urgent++
			if (conv.channel === 'live') {
				if (isResolved(conv)) next.liveResolved++
				else next.live++
				continue
			}
			next.email++
			next.status.all++
			next.status[conv.status]++
		}

		return next
	}, [conversations])

	const filtered = useMemo(() => {
		let result = conversations.filter((c) => c.channel === activeTab)

		if (activeTab === 'live') {
			result = showResolved
				? result.filter(isResolved)
				: result.filter((c) => !isResolved(c))
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

		const sortKey = activeTab === 'live' ? 'createdAt' : 'lastMessageAt'
		return [...result].sort(
			(a, b) => new Date(a[sortKey]).getTime() - new Date(b[sortKey]).getTime(),
		)
	}, [conversations, activeTab, showResolved, statusFilter, searchQuery])

	const isLiveActive = activeTab === 'live' && !showResolved

	const liveQueueHeadId = useMemo(() => {
		if (!isLiveActive) return null
		return filtered[0]?.id ?? null
	}, [isLiveActive, filtered])

	useEffect(() => {
		if (!autoSelect) return
		if (isLiveActive) {
			if (liveQueueHeadId && selectedId !== liveQueueHeadId) {
				setSelectedConversation(liveQueueHeadId)
			}
			return
		}

		const currentInTab = selectedId && filtered.some((c) => c.id === selectedId)
		const head = filtered[0]
		if (!currentInTab && head) setSelectedConversation(head.id)
	}, [
		isLiveActive,
		liveQueueHeadId,
		selectedId,
		filtered,
		autoSelect,
		setSelectedConversation,
	])

	const queueLabel = showResolved
		? 'resolved live chats'
		: activeTab === 'live'
			? 'live chats waiting'
			: 'email conversations'

	return (
		<>
			<div className="shrink-0 border-b border-black/[0.06] px-4 py-4 dark:border-white/[0.08] sm:px-5 lg:px-6">
				<div className="flex flex-col gap-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div className="min-w-0">
							<p className="font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
								Customer service queue
							</p>
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

					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<EmployeeFilterChip
							active={activeTab === 'live' && !showResolved}
							count={counts.live}
							tone="primary"
							onClick={() => handleTabChange('live')}
							className="justify-center"
						>
							<span className="inline-flex items-center gap-2">
								<MessageCircle size={13} strokeWidth={2.2} />
								Live chat
							</span>
						</EmployeeFilterChip>
						<EmployeeFilterChip
							active={activeTab === 'email'}
							count={counts.email}
							tone="primary"
							onClick={() => handleTabChange('email')}
							className="justify-center"
						>
							<span className="inline-flex items-center gap-2">
								<Mail size={13} strokeWidth={2.2} />
								Email
							</span>
						</EmployeeFilterChip>
					</div>

					{activeTab === 'live' && counts.liveResolved > 0 && (
						<div className="flex flex-wrap gap-2">
							<EmployeeFilterChip
								active={showResolved}
								count={counts.liveResolved}
								tone="success"
								onClick={() => setShowResolved((value) => !value)}
							>
								Resolved chats
							</EmployeeFilterChip>
						</div>
					)}

					{activeTab === 'email' && (
						<div className="flex flex-wrap gap-2">
							{EMAIL_STATUS_FILTERS.map((filter) => (
								<EmployeeFilterChip
									key={filter.key}
									active={statusFilter === filter.key}
									count={counts.status[filter.key]}
									tone={
										filter.key === 'all' ? 'neutral' : statusTone(filter.key)
									}
									onClick={() => setStatusFilter(filter.key)}
								>
									{filter.label}
								</EmployeeFilterChip>
							))}
						</div>
					)}

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
