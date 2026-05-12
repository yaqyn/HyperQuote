import { useQueryClient } from '@tanstack/react-query'
import {
	ArrowLeft,
	CheckCircle2,
	Clock,
	Mail,
	MessageCircle,
	UserRound,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { updateConversationStatus } from '../../lib/server/customer-service'
import { useSupportStore } from '../../stores/customer-service'
import type { Conversation, Message } from '../../types/customer-service'
import {
	EmployeeActionButton,
	EmployeeStatusPill,
} from '../shared/EmployeeControls'
import { EmailComposer } from './EmailComposer'
import type { EmailAction } from './EmailMessage'
import { EmailMessage } from './EmailMessage'
import { MessageItem } from './MessageItem'
import { ResponseComposer } from './ResponseComposer'
import { PriorityMark, SlaTicker } from './SlaTicker'

interface ConversationViewProps {
	conversation: Conversation
	onOpenInbox?: () => void
	onOpenProfile: () => void
}

function formatCreatedAt(iso: string): string {
	const d = new Date(iso)
	const date = d.toISOString().slice(0, 10)
	const hh = d.getHours().toString().padStart(2, '0')
	const mm = d.getMinutes().toString().padStart(2, '0')
	return `${date} ${hh}:${mm}`
}

function priorityTone(conversation: Conversation) {
	if (conversation.slaBreached || conversation.priority === 'urgent') {
		return 'danger' as const
	}
	if (conversation.priority === 'high') return 'warning' as const
	return 'neutral' as const
}

/**
 * Correspondence — the switchboard's main panel when a line is open.
 *
 * Layout reads top-to-bottom: current customer, issue context, messages,
 * then the action composer the agent uses to respond.
 */
export function ConversationView({
	conversation,
	onOpenInbox,
	onOpenProfile,
}: ConversationViewProps) {
	const { t, i18n } = useTranslation('customer-service')
	const threadRef = useRef<HTMLDivElement>(null)

	const [emailReplyTo, setEmailReplyTo] = useState<Message | null>(null)
	const [emailAction, setEmailAction] = useState<EmailAction | null>(null)
	const [composerOpen, setComposerOpen] = useState(false)

	const isEmail = conversation.channel === 'email'
	const isActive =
		conversation.status !== 'closed' && conversation.status !== 'resolved'
	const threadScrollVersion = `${conversation.id}:${conversation.messages.length}`

	useEffect(() => {
		if (isEmail && isActive) {
			const latest = conversation.messages[conversation.messages.length - 1]
			if (latest) {
				setEmailReplyTo(latest)
				setEmailAction('reply')
				setComposerOpen(true)
			}
		} else {
			setComposerOpen(false)
			setEmailReplyTo(null)
			setEmailAction(null)
		}
	}, [isEmail, isActive, conversation.messages.length, conversation.messages]) // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		if (threadScrollVersion && threadRef.current) {
			threadRef.current.scrollTop = threadRef.current.scrollHeight
		}
	}, [threadScrollVersion])

	const handleEmailAction = useCallback(
		(action: EmailAction, message: Message) => {
			setEmailReplyTo(message)
			setEmailAction(action)
			setComposerOpen(true)
		},
		[],
	)

	const handleDiscardEmail = useCallback(() => {
		setComposerOpen(false)
		setEmailReplyTo(null)
		setEmailAction(null)
	}, [])

	const handleOpenReply = useCallback(() => {
		const latest = conversation.messages[conversation.messages.length - 1]
		if (latest) {
			handleEmailAction('reply', latest)
		}
	}, [conversation.messages, handleEmailAction])

	const queryClient = useQueryClient()
	const setSelected = useSupportStore((s) => s.setSelectedConversation)

	const handleResolve = useCallback(async () => {
		queryClient.setQueryData<{
			conversations: Conversation[]
			metrics: unknown
		}>(['support-inbox'], (old) => {
			if (!old) return old
			return {
				...old,
				conversations: old.conversations.map((c) =>
					c.id === conversation.id ? { ...c, status: 'resolved' as const } : c,
				),
			}
		})
		setSelected(null)
		await updateConversationStatus({
			data: { conversationId: conversation.id, status: 'resolved' },
		})
		await queryClient.invalidateQueries({ queryKey: ['support-inbox'] })
	}, [conversation.id, queryClient, setSelected])

	const customerName =
		i18n.language === 'ar'
			? conversation.customer.nameAr
			: conversation.customer.name
	const companyName =
		i18n.language === 'ar'
			? conversation.customer.companyAr
			: conversation.customer.company

	return (
		<div className="flex h-full min-h-0 flex-col">
			{/* ── Transmission header ─────────────────────────────
          Reads like the top of a letter: recipient framing on the left,
          metadata strip below, actions parked at the trailing edge. */}
			<div className="shrink-0 border-b border-black/[0.06] px-4 py-4 dark:border-white/[0.08] sm:px-6 lg:px-8">
				{/* Eyebrow — mono metadata row */}
				<div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
					<div className="flex flex-wrap items-center gap-2">
						<EmployeeStatusPill
							tone="neutral"
							leading={
								conversation.channel === 'email' ? (
									<Mail size={13} strokeWidth={2.2} />
								) : (
									<MessageCircle size={13} strokeWidth={2.2} />
								)
							}
						>
							{conversation.channel === 'email'
								? 'Email conversation'
								: 'Live chat'}
						</EmployeeStatusPill>
						<EmployeeStatusPill tone="neutral">
							{conversation.ticketId ?? 'No ticket yet'}
						</EmployeeStatusPill>
						<EmployeeStatusPill
							tone={priorityTone(conversation)}
							leading={<PriorityMark priority={conversation.priority} />}
						>
							{t(`priority.${conversation.priority}`)}
						</EmployeeStatusPill>
						{conversation.slaDeadline && (
							<EmployeeStatusPill
								tone={conversation.slaBreached ? 'danger' : 'neutral'}
								leading={<Clock size={13} strokeWidth={2.2} />}
							>
								<SlaTicker
									createdAt={conversation.createdAt}
									deadline={conversation.slaDeadline}
									breached={conversation.slaBreached}
									bare
								/>
							</EmployeeStatusPill>
						)}
					</div>

					<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:shrink-0 lg:justify-end">
						{onOpenInbox && (
							<EmployeeActionButton
								onClick={onOpenInbox}
								aria-label="Open line list"
								tone="neutral"
								size="sm"
								leading={<ArrowLeft size={14} strokeWidth={2.2} />}
								className="lg:hidden"
							>
								Customers
							</EmployeeActionButton>
						)}
						{isActive && !isEmail && (
							<EmployeeActionButton
								onClick={() => {
									void handleResolve()
								}}
								aria-label={t('status.resolved')}
								tone="success"
								size="sm"
								leading={<CheckCircle2 size={14} strokeWidth={2.2} />}
							>
								Sign off chat
							</EmployeeActionButton>
						)}
						<EmployeeActionButton
							onClick={onOpenProfile}
							aria-label={t('profile.title')}
							tone="neutral"
							size="sm"
							leading={<UserRound size={14} strokeWidth={2.2} />}
						>
							Customer file
						</EmployeeActionButton>
					</div>
				</div>

				{/* To: — letter-style recipient line */}
				<p className="mb-1.5 font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
					Customer
				</p>
				<h2
					className="break-words font-[family-name:var(--font-bricolage)] text-[26px] leading-[1.08] text-[var(--color-text)] sm:text-[30px] lg:text-[32px]"
					style={{ fontVariationSettings: '"opsz" 72, "wght" 520' }}
				>
					{customerName}
					{companyName && (
						<span
							className="mt-1 block break-words font-[family-name:var(--font-archivo)] text-[14px] font-medium text-[var(--color-text-muted)] sm:ms-3 sm:inline sm:align-middle"
							style={{ fontVariationSettings: '"opsz" 18, "wght" 400' }}
						>
							· {companyName}
						</span>
					)}
				</h2>

				{/* Subject — italic letter subject */}
				<p
					className="mt-3 break-words font-[family-name:var(--font-archivo)] text-[14px] leading-relaxed text-[var(--color-text-muted)]"
					style={{ fontVariationSettings: '"opsz" 16, "wght" 420' }}
				>
					{conversation.subject}
				</p>
				<p className="mt-2 font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
					Opened {formatCreatedAt(conversation.createdAt)}
				</p>
			</div>

			{/* ── Thread ──────────────────────────────────────────
          Backdrop lines turn the reading area into stationery. */}
			<div
				ref={threadRef}
				className="min-h-0 flex-1 overflow-y-auto bg-line-paper px-4 pb-4 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pt-7"
			>
				<div className="flex max-w-[760px] flex-col gap-6">
					{isEmail
						? conversation.messages.map((message, i) => (
								<EmailMessage
									key={message.id}
									message={message}
									isLatest={i === conversation.messages.length - 1}
									onAction={handleEmailAction}
								/>
							))
						: conversation.messages.map((message, i) => {
								const prev = i > 0 ? conversation.messages[i - 1] : null
								return (
									<MessageItem
										key={message.id}
										message={message}
										conversationChannel={conversation.channel}
										isFirstInGroup={
											!prev ||
											prev.senderName !== message.senderName ||
											prev.channel !== message.channel
										}
									/>
								)
							})}
				</div>
			</div>

			{/* ── Composer ────────────────────────────────────── */}
			{isActive &&
				(isEmail ? (
					composerOpen ? (
						<EmailComposer
							key={conversation.id}
							conversation={conversation}
							replyTo={emailReplyTo}
							action={emailAction}
							onDiscard={handleDiscardEmail}
						/>
					) : (
						<div className="shrink-0 border-t border-black/[0.06] px-4 py-4 dark:border-white/[0.08] sm:px-6 lg:px-10">
							<EmployeeActionButton
								onClick={handleOpenReply}
								aria-label={t('email.reply')}
								tone="primary"
								fullWidthOnMobile
							>
								Reply to customer
							</EmployeeActionButton>
						</div>
					)
				) : (
					<ResponseComposer conversation={conversation} />
				))}
		</div>
	)
}
