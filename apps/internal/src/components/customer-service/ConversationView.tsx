import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { updateConversationStatus } from '../../lib/server/customer-service'
import { useSupportStore } from '../../stores/customer-service'
import type { Conversation, Message } from '../../types/customer-service'
import { ChannelCode } from './ChannelIcons'
import { EmailComposer } from './EmailComposer'
import type { EmailAction } from './EmailMessage'
import { EmailMessage } from './EmailMessage'
import { MessageItem } from './MessageItem'
import { ResponseComposer } from './ResponseComposer'
import { PriorityMark, SlaTicker } from './SlaTicker'

interface ConversationViewProps {
	conversation: Conversation
	onOpenProfile: () => void
}

function formatCreatedAt(iso: string): string {
	const d = new Date(iso)
	const date = d.toISOString().slice(0, 10)
	const hh = d.getHours().toString().padStart(2, '0')
	const mm = d.getMinutes().toString().padStart(2, '0')
	return `${date} ${hh}:${mm}`
}

/**
 * Correspondence — the switchboard's main panel when a line is open.
 *
 * Layout reads top-to-bottom like a letter: who's writing, meta about the
 * transmission, the subject, then the exchange itself. Actions are text
 * links at the top-right — "Sign off" (resolve) and a "Profile" anchor.
 */
export function ConversationView({
	conversation,
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
		if (threadRef.current) {
			threadRef.current.scrollTop = threadRef.current.scrollHeight
		}
	}, [conversation.id, conversation.messages.length])

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
		<div className="flex flex-col h-full min-h-0">
			{/* ── Transmission header ─────────────────────────────
          Reads like the top of a letter: recipient framing on the left,
          metadata strip below, actions parked at the trailing edge. */}
			<div className="shrink-0 px-10 pt-8 pb-6 border-b border-black/[0.06] dark:border-white/[0.08]">
				{/* Eyebrow — mono metadata row */}
				<div className="flex items-center justify-between gap-4 mb-5">
					<div className="flex items-center gap-3 flex-wrap">
						<ChannelCode
							channel={conversation.channel}
							className="text-[var(--color-text-subtle)]"
						/>
						<span aria-hidden className="text-[var(--color-border)]">
							·
						</span>
						<span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
							{conversation.ticketId ?? '—'}
						</span>
						<span aria-hidden className="text-[var(--color-border)]">
							·
						</span>
						<span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
							{formatCreatedAt(conversation.createdAt)}
						</span>
						{conversation.slaDeadline && (
							<>
								<span aria-hidden className="text-[var(--color-border)]">
									·
								</span>
								<SlaTicker
									createdAt={conversation.createdAt}
									deadline={conversation.slaDeadline}
									breached={conversation.slaBreached}
									className="text-[10px]"
								/>
							</>
						)}
						<span aria-hidden className="text-[var(--color-border)]">
							·
						</span>
						<span className="inline-flex items-center gap-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
							<PriorityMark priority={conversation.priority} />
							{t(`priority.${conversation.priority}`)}
						</span>
					</div>

					<div className="flex items-center gap-5 shrink-0">
						{isActive && !isEmail && (
							<Button
								onPress={handleResolve}
								aria-label={t('status.resolved')}
								className="font-[family-name:var(--font-inter)] text-[12.5px] font-medium text-[var(--color-primary)] border-b border-transparent hover:border-[var(--color-primary)] outline-none focus-visible:border-[var(--color-primary)] transition-colors"
							>
								Sign off →
							</Button>
						)}
						<Button
							onPress={onOpenProfile}
							aria-label={t('profile.title')}
							className="font-[family-name:var(--font-inter)] text-[12.5px] font-medium text-[var(--color-text-muted)] border-b border-transparent hover:text-[var(--color-text)] hover:border-[var(--color-text)] outline-none focus-visible:border-[var(--color-text)] transition-colors"
						>
							{t('profile.title')}
						</Button>
					</div>
				</div>

				{/* To: — letter-style recipient line */}
				<p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.24em] text-[var(--color-text-subtle)] mb-1.5">
					to
				</p>
				<h2
					className="font-[family-name:var(--font-bricolage)] text-[34px] leading-[1.05] tracking-[-0.015em] text-[var(--color-text)]"
					style={{ fontVariationSettings: '"opsz" 72, "wght" 520' }}
				>
					{customerName}
					{companyName && (
						<span
							className="ms-3 align-middle font-[family-name:var(--font-literata)] italic text-[16px] text-[var(--color-text-muted)]"
							style={{ fontVariationSettings: '"opsz" 18, "wght" 400' }}
						>
							· {companyName}
						</span>
					)}
				</h2>

				{/* Subject — italic letter subject */}
				<p
					className="mt-3 font-[family-name:var(--font-literata)] italic text-[15px] leading-relaxed text-[var(--color-text-muted)]"
					style={{ fontVariationSettings: '"opsz" 16, "wght" 420' }}
				>
					Re: {conversation.subject}
				</p>
			</div>

			{/* ── Thread ──────────────────────────────────────────
          Backdrop lines turn the reading area into stationery. */}
			<div
				ref={threadRef}
				className="flex-1 overflow-y-auto min-h-0 px-10 pt-7 pb-4 bg-line-paper"
			>
				<div className="max-w-[680px] flex flex-col gap-6">
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
						<div className="shrink-0 px-10 py-4 border-t border-black/[0.06] dark:border-white/[0.08]">
							<Button
								onPress={handleOpenReply}
								aria-label={t('email.reply')}
								className="w-full text-start font-[family-name:var(--font-literata)] italic text-[13px] text-[var(--color-text-subtle)] py-3 border-b border-dashed border-black/[0.1] dark:border-white/[0.1] hover:text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)] transition-colors outline-none"
							>
								{t('email.clickToReply')}
							</Button>
						</div>
					)
				) : (
					<ResponseComposer conversation={conversation} />
				))}
		</div>
	)
}
