import {
	AlertTriangle,
	Lock,
	MailOpen,
	MessageSquare,
	UserRound,
} from 'lucide-react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type {
	Conversation,
	ConversationStatus,
} from '../../types/customer-service'
import { EmployeeStatusPill } from '../shared/EmployeeControls'
import { ChannelCode } from './ChannelIcons'
import { SlaTicker } from './SlaTicker'

interface ConversationItemProps {
	conversation: Conversation
	isSelected: boolean
	isLocked: boolean
	queuePosition: number
	onSelect: () => void
	/** Resolved view — items are visible but muted */
	isFaded?: boolean
}

function queueOpacity(position: number, isLocked: boolean): number {
	if (!isLocked) return 1
	if (position <= 1) return 0.78
	if (position <= 2) return 0.62
	if (position <= 3) return 0.48
	return 0.36
}

function statusTone(status: ConversationStatus) {
	if (status === 'open') return 'neutral' as const
	if (status === 'pending') return 'warning' as const
	return 'success' as const
}

function priorityLabel(conversation: Conversation): {
	label: string
	tone: 'danger' | 'warning' | 'neutral'
} {
	if (conversation.slaBreached) {
		return { label: 'SLA breached', tone: 'danger' }
	}
	if (conversation.priority === 'urgent') {
		return { label: 'Urgent', tone: 'danger' }
	}
	if (conversation.priority === 'high') {
		return { label: 'High priority', tone: 'warning' }
	}
	return { label: conversation.priority, tone: 'neutral' }
}

export function ConversationItem({
	conversation,
	isSelected,
	isLocked,
	queuePosition,
	onSelect,
	isFaded,
}: ConversationItemProps) {
	const { i18n } = useTranslation()
	const hasUnread = conversation.unreadCount > 0
	const name =
		i18n.language === 'ar'
			? conversation.customer.nameAr
			: conversation.customer.name
	const company =
		i18n.language === 'ar'
			? conversation.customer.companyAr
			: conversation.customer.company
	const priority = priorityLabel(conversation)
	const opacity = isFaded ? 0.58 : queueOpacity(queuePosition, isLocked)
	const cardTone =
		priority.tone === 'danger'
			? 'border-s-red-600'
			: priority.tone === 'warning'
				? 'border-s-amber-600'
				: 'border-s-transparent'

	return (
		<Button
			onPress={() => {
				if (!isLocked) onSelect()
			}}
			isDisabled={isLocked}
			aria-label={`${name} — ${conversation.subject}`}
			className={`group w-full border-s-4 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 focus-visible:ring-inset disabled:cursor-not-allowed ${cardTone} ${
				isSelected
					? 'bg-[var(--color-primary)]/[0.075] dark:bg-[var(--color-primary)]/[0.12]'
					: 'bg-[var(--color-surface)]/72 hover:bg-[var(--color-primary)]/[0.045] dark:bg-[var(--color-surface)]/80'
			}`}
			style={{ opacity: isSelected ? 1 : opacity }}
		>
			<div className="flex min-w-0 flex-col gap-3 px-4 py-4 sm:px-5">
				<div className="flex min-w-0 items-start justify-between gap-3">
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<UserRound
								aria-hidden="true"
								size={14}
								strokeWidth={2.2}
								className="shrink-0 text-[var(--color-text-muted)]"
							/>
							<span className="min-w-0 break-words font-[family-name:var(--font-archivo)] text-[14px] font-semibold leading-snug text-[var(--color-text)]">
								{name}
							</span>
							{company && (
								<span className="min-w-0 break-words font-[family-name:var(--font-archivo)] text-[12px] leading-snug text-[var(--color-text-muted)]">
									{company}
								</span>
							)}
						</div>
						<h3 className="mt-2 break-words font-[family-name:var(--font-bricolage)] text-[15px] font-semibold leading-snug text-[var(--color-text)]">
							{conversation.subject}
						</h3>
					</div>

					<div className="flex shrink-0 flex-col items-end gap-2">
						<ChannelCode
							channel={conversation.channel}
							className="rounded-md bg-black/[0.04] px-2 py-1 text-[var(--color-text-muted)] dark:bg-white/[0.06]"
						/>
						{isLocked && (
							<EmployeeStatusPill
								tone="neutral"
								leading={<Lock size={12} strokeWidth={2.2} />}
								className="px-2 py-1 text-[10px]"
							>
								Waiting
							</EmployeeStatusPill>
						)}
					</div>
				</div>

				<p className="break-words font-[family-name:var(--font-archivo)] text-[13px] leading-relaxed text-[var(--color-text-muted)]">
					{conversation.lastMessagePreview}
				</p>

				<div className="flex flex-wrap items-center gap-2">
					<EmployeeStatusPill
						tone={statusTone(conversation.status)}
						leading={
							conversation.status === 'open' ? (
								<MessageSquare size={12} strokeWidth={2.2} />
							) : (
								<MailOpen size={12} strokeWidth={2.2} />
							)
						}
						className="px-2 py-1 text-[10.5px]"
					>
						{conversation.status.replace('_', ' ')}
					</EmployeeStatusPill>
					<EmployeeStatusPill
						tone={priority.tone}
						leading={
							priority.tone === 'danger' ? (
								<AlertTriangle size={12} strokeWidth={2.2} />
							) : undefined
						}
						className="px-2 py-1 text-[10.5px]"
					>
						{priority.label}
					</EmployeeStatusPill>
					{hasUnread && (
						<EmployeeStatusPill
							tone="warning"
							className="px-2 py-1 text-[10.5px]"
						>
							{conversation.unreadCount} unread
						</EmployeeStatusPill>
					)}
					{conversation.slaDeadline && (
						<SlaTicker
							createdAt={conversation.createdAt}
							deadline={conversation.slaDeadline}
							breached={conversation.slaBreached}
							className="rounded-md bg-black/[0.04] px-2 py-1 text-[10.5px] dark:bg-white/[0.06]"
						/>
					)}
				</div>
			</div>
		</Button>
	)
}
