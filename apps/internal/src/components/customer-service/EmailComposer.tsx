import { useQueryClient } from '@tanstack/react-query'
import { Paperclip, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { sendReply } from '../../lib/server/customer-service'
import type { Conversation, Message } from '../../types/customer-service'
import type { EmailAction } from './EmailMessage'

interface EmailComposerProps {
	conversation: Conversation
	replyTo: Message | null
	action: EmailAction | null
	onDiscard: () => void
}

function deriveFields(
	conversation: Conversation,
	replyTo: Message | null,
	action: EmailAction | null,
): { to: string; cc: string; subject: string } {
	const customerEmail = conversation.customer.email ?? ''
	const supportEmail = 'support@hyperquote.io'

	if (!replyTo || !action) {
		return { to: customerEmail, cc: '', subject: `Re: ${conversation.subject}` }
	}

	const originalFrom = (replyTo.metadata.from as string) ?? ''
	const originalCc = (replyTo.metadata.cc as string) ?? ''
	const originalSubject =
		(replyTo.metadata.subject as string) ?? conversation.subject

	switch (action) {
		case 'reply': {
			const replyTo_ =
				replyTo.direction === 'inbound' ? originalFrom : customerEmail
			return {
				to: replyTo_,
				cc: '',
				subject: originalSubject.startsWith('Re:')
					? originalSubject
					: `Re: ${originalSubject}`,
			}
		}
		case 'reply-all': {
			const replyTo_ =
				replyTo.direction === 'inbound' ? originalFrom : customerEmail
			const ccList = [
				originalCc,
				replyTo.direction === 'inbound' ? '' : originalFrom,
			]
				.filter(Boolean)
				.filter((addr) => addr !== replyTo_ && addr !== supportEmail)
				.join(', ')
			return {
				to: replyTo_,
				cc: ccList,
				subject: originalSubject.startsWith('Re:')
					? originalSubject
					: `Re: ${originalSubject}`,
			}
		}
		case 'forward':
			return {
				to: '',
				cc: '',
				subject: originalSubject.startsWith('Fwd:')
					? originalSubject
					: `Fwd: ${originalSubject}`,
			}
		default:
			return {
				to: customerEmail,
				cc: '',
				subject: `Re: ${conversation.subject}`,
			}
	}
}

/**
 * Email letterhead. Address plate sits on top in mono (TO / CC / BCC /
 * SUBJECT), the body drops into a Literata reading column. The "send"
 * and "draft" actions render as text links at the bottom — no boxed
 * buttons, no pill chrome.
 */
export function EmailComposer({
	conversation,
	replyTo,
	action,
	onDiscard,
}: EmailComposerProps) {
	const { t } = useTranslation('customer-service')
	const defaults = deriveFields(conversation, replyTo, action)

	const [to, setTo] = useState(defaults.to)
	const [cc, setCc] = useState(defaults.cc)
	const [bcc, setBcc] = useState('')
	const [subject, setSubject] = useState(defaults.subject)
	const [body, setBody] = useState('')
	const [showCcBcc, setShowCcBcc] = useState(!!defaults.cc)
	const [isDraft, setIsDraft] = useState(false)
	const bodyRef = useRef<HTMLTextAreaElement>(null)
	const queryClient = useQueryClient()

	useEffect(() => {
		bodyRef.current?.focus()
	}, [])

	const handleSend = useCallback(async () => {
		if (!body.trim() || !to.trim()) return
		const text = body.trim()
		setBody('')
		setTo('')
		setCc('')
		setBcc('')
		await sendReply({
			data: {
				conversationId: conversation.id,
				channel: 'email',
				content: text,
				metadata: {
					from: 'support@hyperquote.io',
					to,
					cc: cc || null,
					subject,
				},
			},
		})
		await queryClient.invalidateQueries({ queryKey: ['support-inbox'] })
		onDiscard()
	}, [body, to, cc, subject, conversation.id, queryClient, onDiscard])

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
				e.preventDefault()
				handleSend()
			}
		},
		[handleSend],
	)

	function handleSaveDraft() {
		setIsDraft(true)
		setTimeout(() => setIsDraft(false), 1500)
	}

	function handleBodyInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
		setBody(e.target.value)
		const el = e.target
		el.style.height = 'auto'
		el.style.height = `${Math.min(el.scrollHeight, 260)}px`
	}

	const canSend = body.trim() && to.trim()

	const modeLabel =
		action === 'forward'
			? t('email.forward')
			: action === 'reply-all'
				? t('email.replyAll')
				: t('email.reply')

	const FIELD_INPUT_CLASS =
		'flex-1 bg-transparent outline-none font-[family-name:var(--font-jetbrains-mono)] text-[12px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)]'

	return (
		<div className="shrink-0 border-t border-black/[0.06] dark:border-white/[0.08]">
			{/* Letterhead bar */}
			<div className="flex items-center justify-between px-10 pt-3.5 pb-2">
				<p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-subtle)]">
					broadcasting · {modeLabel}
				</p>
				<Button
					onPress={onDiscard}
					aria-label={t('email.discard')}
					className="flex items-center justify-center w-6 h-6 text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition-colors"
				>
					<X size={13} strokeWidth={1.5} />
				</Button>
			</div>

			{/* Address plate */}
			<div className="px-10 pb-2 space-y-1.5">
				<FieldRow label={t('email.to')}>
					<input
						type="email"
						value={to}
						onChange={(e) => setTo(e.target.value)}
						className={FIELD_INPUT_CLASS}
						placeholder="email@example.com"
					/>
					{!showCcBcc && (
						<Button
							onPress={() => setShowCcBcc(true)}
							aria-label={t('email.showCcBcc')}
							className="font-[family-name:var(--font-jetbrains-mono)] text-[9.5px] uppercase tracking-[0.16em] text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] transition-colors"
						>
							+ cc
						</Button>
					)}
				</FieldRow>

				{showCcBcc && (
					<>
						<FieldRow label={t('email.cc')}>
							<input
								type="text"
								value={cc}
								onChange={(e) => setCc(e.target.value)}
								className={FIELD_INPUT_CLASS}
							/>
						</FieldRow>
						<FieldRow label={t('email.bcc')}>
							<input
								type="text"
								value={bcc}
								onChange={(e) => setBcc(e.target.value)}
								className={FIELD_INPUT_CLASS}
							/>
						</FieldRow>
					</>
				)}

				<FieldRow label={t('email.subject')}>
					<input
						type="text"
						value={subject}
						onChange={(e) => setSubject(e.target.value)}
						className="flex-1 bg-transparent outline-none font-[family-name:var(--font-bricolage)] text-[13px] font-medium text-[var(--color-text)]"
						style={{ fontVariationSettings: '"opsz" 14, "wght" 500' }}
					/>
				</FieldRow>
			</div>

			{/* Body — Literata */}
			<div className="px-10 py-3 border-t border-dashed border-black/[0.08] dark:border-white/[0.1]">
				<textarea
					ref={bodyRef}
					value={body}
					onChange={handleBodyInput}
					onKeyDown={handleKeyDown}
					placeholder={t('email.bodyPlaceholder')}
					rows={4}
					className="w-full resize-none bg-transparent outline-none
            font-[family-name:var(--font-literata)] text-[14.5px] leading-[1.75]
            text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)]
            placeholder:italic"
					style={{ fontVariationSettings: '"opsz" 16, "wght" 400' }}
				/>
			</div>

			{/* Action bar */}
			<div className="flex items-center justify-between px-10 pb-4 pt-2">
				<Button
					aria-label={t('composer.attach')}
					className="flex items-center justify-center w-7 h-7 text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] transition-colors"
				>
					<Paperclip size={13} strokeWidth={1.5} />
				</Button>

				<div className="flex items-center gap-5">
					<Button
						onPress={handleSaveDraft}
						aria-label={t('email.saveDraft')}
						className={`font-[family-name:var(--font-inter)] text-[12px] font-medium transition-colors outline-none border-b border-transparent hover:border-[var(--color-text-muted)]
              ${isDraft ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}
					>
						{isDraft ? t('email.draftSaved') : t('email.saveDraft')}
					</Button>
					<Button
						onPress={handleSend}
						isDisabled={!canSend}
						aria-label={t('composer.send')}
						className={`font-[family-name:var(--font-inter)] text-[13px] font-medium transition-colors outline-none border-b border-transparent focus-visible:border-[var(--color-primary)]
              ${
								canSend
									? 'text-[var(--color-primary)] hover:border-[var(--color-primary)]'
									: 'text-[var(--color-text-subtle)]/60'
							}`}
					>
						Transmit →
					</Button>
				</div>
			</div>
		</div>
	)
}

function FieldRow({
	label,
	children,
}: {
	label: string
	children: React.ReactNode
}) {
	return (
		<div className="flex items-center gap-4">
			<span className="font-[family-name:var(--font-jetbrains-mono)] text-[9.5px] uppercase tracking-[0.2em] text-[var(--color-text-subtle)] w-12 shrink-0">
				{label}
			</span>
			{children}
		</div>
	)
}
