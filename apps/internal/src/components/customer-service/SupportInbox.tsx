import { CheckCircle2, Inbox, Mail, Plus, Search } from 'lucide-react'
import { type ReactNode, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSupportStore } from '../../stores/customer-service'
import type { Conversation } from '../../types/customer-service'
import {
	EmployeeSearchField,
	EmployeeStatusPill,
} from '../shared/EmployeeControls'
import { ConversationItem } from './ConversationItem'

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

function hasAttention(conversation: Conversation): boolean {
	return conversation.priority === 'urgent' || conversation.slaBreached
}

function compareRecent(a: Conversation, b: Conversation): number {
	return (
		new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
	)
}

function compareEmailTicket(a: Conversation, b: Conversation): number {
	const aUnread = a.unreadCount > 0
	const bUnread = b.unreadCount > 0
	if (aUnread !== bUnread) return aUnread ? -1 : 1
	const aNeedsAttention = hasAttention(a)
	const bNeedsAttention = hasAttention(b)
	if (aNeedsAttention !== bNeedsAttention) return aNeedsAttention ? -1 : 1
	return compareRecent(a, b)
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
	const canComposeEmail =
		selectedConversation?.channel === 'email' &&
		selectedConversation.status !== 'closed' &&
		selectedConversation.status !== 'resolved'

	const counts = useMemo(() => {
		const next = {
			email: 0,
			urgent: 0,
		}

		for (const conv of conversations) {
			if (conv.channel === 'email') {
				next.email++
				if (!isResolved(conv) && hasAttention(conv)) next.urgent++
			}
		}

		return next
	}, [conversations])

	const emailGroups = useMemo(() => {
		let result = conversations.filter((c) => c.channel === 'email')

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

		const open = result.filter((c) => !isResolved(c)).sort(compareEmailTicket)
		const closed = result.filter(isResolved).sort(compareRecent)
		return {
			closed,
			open,
			all: [...open, ...closed],
		}
	}, [conversations, searchQuery])

	const filtered = emailGroups.all

	useEffect(() => {
		if (!autoSelect) return

		const currentInTab = selectedId && filtered.some((c) => c.id === selectedId)
		const head = filtered[0]
		if (!currentInTab) setSelectedConversation(head?.id ?? null)
	}, [selectedId, filtered, autoSelect, setSelectedConversation])

	const queueLabel = 'email tickets'

	return (
		<>
			<div className="shrink-0 border-b border-black/[0.06] px-3 py-3 dark:border-white/[0.08] sm:px-4 lg:px-6 lg:py-4">
				<div className="flex flex-col gap-3 lg:hidden">
					<EmailQueueButton count={counts.email} iconSize={16} />

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

					<EmailQueueButton count={counts.email} iconSize={15} />

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
							Try another customer name, subject, or status.
						</p>
					</div>
				) : (
					<div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
						{emailGroups.open.map((conversation) => (
							<ConversationItem
								key={conversation.id}
								conversation={conversation}
								isSelected={conversation.id === selectedId}
								isLocked={false}
								queuePosition={0}
								onSelect={() => {
									setSelectedConversation(conversation.id)
									onConversationSelect?.()
								}}
							/>
						))}
						{emailGroups.closed.length > 0 && (
							<div
								data-email-closed-separator="true"
								className="flex items-center gap-3 bg-[var(--color-surface)]/80 px-4 py-3 sm:px-5"
							>
								<span className="h-px flex-1 bg-black/[0.1] dark:bg-white/[0.12]" />
								<span className="font-[family-name:var(--font-archivo)] text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
									Closed
								</span>
								<span className="h-px flex-1 bg-black/[0.1] dark:bg-white/[0.12]" />
							</div>
						)}
						{emailGroups.closed.map((conversation) => (
							<ConversationItem
								key={conversation.id}
								conversation={conversation}
								isSelected={conversation.id === selectedId}
								isLocked={false}
								queuePosition={0}
								onSelect={() => {
									setSelectedConversation(conversation.id)
									onConversationSelect?.()
								}}
								isFaded
							/>
						))}
					</div>
				)}
			</div>
		</>
	)
}

function EmailQueueButton({
	count,
	iconSize,
}: {
	count: number
	iconSize: number
}) {
	return (
		<MobileQueueButton active label="Email" count={count}>
			<Mail size={iconSize} strokeWidth={2.2} />
		</MobileQueueButton>
	)
}

function MobileQueueButton({
	active,
	label,
	count,
	children,
}: {
	active: boolean
	label: string
	count: number
	children: ReactNode
}) {
	return (
		<button
			type="button"
			aria-pressed={active}
			aria-label={`${label}: ${count} tickets`}
			data-channel-tab="email"
			className={`inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-md border px-2 font-[family-name:var(--font-archivo)] text-[12px] font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 disabled:cursor-not-allowed disabled:opacity-60 ${
				active
					? 'border-transparent bg-[var(--color-primary)] text-white'
					: 'border-black/[0.08] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/35 hover:text-[var(--color-text)] dark:border-white/[0.1]'
			}`}
		>
			<span aria-hidden="true" className="shrink-0">
				{children}
			</span>
			<span className="flex min-w-0 flex-col items-start leading-none">
				<span className="max-w-full truncate font-[family-name:var(--font-archivo)] text-[10.5px]">
					{label}
				</span>
				<span className="mt-1 max-w-full truncate font-[family-name:var(--font-geist-mono)] text-[9.5px]">
					{count} tickets
				</span>
			</span>
		</button>
	)
}
