import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Paperclip, Save, Send, X } from 'lucide-react'
import {
	type ChangeEvent,
	type KeyboardEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { sendReply } from '../../lib/server/customer-service'
import type { Conversation, Message } from '../../types/customer-service'
import {
	EmployeeActionButton,
	EmployeeFilterChip,
	EmployeeStatusPill,
} from '../shared/EmployeeControls'
import type { EmailAction } from './EmailMessage'

interface EmailComposerProps {
	conversation: Conversation
	replyTo: Message | null
	action: EmailAction | null
	onDiscard: () => void
	variant?: 'dock' | 'screen'
}

function stringMetadata(message: Message, key: string): string {
	const value = message.metadata[key]
	return typeof value === 'string' ? value : ''
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

	const originalFrom = stringMetadata(replyTo, 'from')
	const originalCc = stringMetadata(replyTo, 'cc')
	const originalSubject =
		stringMetadata(replyTo, 'subject') || conversation.subject

	switch (action) {
		case 'reply': {
			const replyTo_ =
				replyTo.direction === 'inbound'
					? originalFrom || customerEmail
					: customerEmail
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
				replyTo.direction === 'inbound'
					? originalFrom || customerEmail
					: customerEmail
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

interface EmailDraft {
	to: string
	cc: string
	bcc: string
	subject: string
	body: string
}

const DRAFT_STORAGE_PREFIX = 'hq-email-draft:'

function draftKey(conversationId: string): string {
	return `${DRAFT_STORAGE_PREFIX}${conversationId}`
}

function loadDraft(conversationId: string): EmailDraft | null {
	if (typeof window === 'undefined') return null
	try {
		const raw = window.localStorage.getItem(draftKey(conversationId))
		if (!raw) return null
		const parsed = JSON.parse(raw) as Partial<EmailDraft>
		return {
			to: parsed.to ?? '',
			cc: parsed.cc ?? '',
			bcc: parsed.bcc ?? '',
			subject: parsed.subject ?? '',
			body: parsed.body ?? '',
		}
	} catch {
		return null
	}
}

export function EmailComposer({
	conversation,
	replyTo,
	action,
	onDiscard,
	variant = 'dock',
}: EmailComposerProps) {
	const { t } = useTranslation('customer-service')
	const defaults = deriveFields(conversation, replyTo, action)
	const savedDraft = loadDraft(conversation.id)

	const [to, setTo] = useState(savedDraft?.to ?? defaults.to)
	const [cc, setCc] = useState(savedDraft?.cc ?? defaults.cc)
	const [bcc, setBcc] = useState(savedDraft?.bcc ?? '')
	const [subject, setSubject] = useState(
		savedDraft?.subject ?? defaults.subject,
	)
	const [body, setBody] = useState(savedDraft?.body ?? '')
	const [showCcBcc, setShowCcBcc] = useState(
		!!(savedDraft?.cc || savedDraft?.bcc || defaults.cc),
	)
	const [isDraft, setIsDraft] = useState(false)
	const [isSending, setIsSending] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const bodyRef = useRef<HTMLTextAreaElement>(null)
	const queryClient = useQueryClient()

	useEffect(() => {
		bodyRef.current?.focus()
	}, [])

	const handleSend = useCallback(async () => {
		if (!body.trim() || !to.trim() || isSending) return
		setIsSending(true)
		setError(null)
		try {
			await sendReply({
				data: {
					conversationId: conversation.id,
					channel: 'email',
					content: body.trim(),
					metadata: {
						from: 'support@hyperquote.io',
						to,
						cc: cc || null,
						bcc: bcc || null,
						subject,
					},
				},
			})
			if (typeof window !== 'undefined') {
				window.localStorage.removeItem(draftKey(conversation.id))
			}
			setBody('')
			setTo('')
			setCc('')
			setBcc('')
			await queryClient.invalidateQueries({ queryKey: ['support-inbox'] })
			onDiscard()
		} catch {
			setError('Email was not sent. Keep the draft and try again.')
		} finally {
			setIsSending(false)
		}
	}, [
		body,
		to,
		cc,
		bcc,
		subject,
		conversation.id,
		isSending,
		queryClient,
		onDiscard,
	])

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
				e.preventDefault()
				void handleSend()
			}
		},
		[handleSend],
	)

	function handleSaveDraft() {
		if (typeof window === 'undefined') return
		const draft: EmailDraft = { to, cc, bcc, subject, body }
		const hasContent =
			to.trim() || cc.trim() || bcc.trim() || body.trim() || subject.trim()
		if (hasContent) {
			window.localStorage.setItem(
				draftKey(conversation.id),
				JSON.stringify(draft),
			)
		} else {
			window.localStorage.removeItem(draftKey(conversation.id))
		}
		setError(null)
		setIsDraft(true)
		window.setTimeout(() => setIsDraft(false), 1500)
	}

	function handleBodyInput(e: ChangeEvent<HTMLTextAreaElement>) {
		setBody(e.target.value)
		setError(null)
		const el = e.target
		el.style.height = 'auto'
		el.style.height = `${Math.min(el.scrollHeight, 300)}px`
	}

	const canSend = body.trim().length > 0 && to.trim().length > 0

	const modeLabel =
		action === 'forward'
			? t('email.forward')
			: action === 'reply-all'
				? t('email.replyAll')
				: t('email.reply')
	const rootClass =
		variant === 'screen'
			? 'flex h-full min-h-0 flex-col overflow-hidden bg-[var(--color-surface)]'
			: 'flex max-h-[44dvh] shrink-0 flex-col overflow-hidden border-t border-black/[0.06] bg-[var(--color-surface)] dark:border-white/[0.08] lg:max-h-none'

	return (
		<div className={rootClass}>
			<div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4 sm:px-6 lg:px-8">
				<div className="min-w-0">
					<p className="font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
						Email reply
					</p>
					<p className="mt-1 break-words font-[family-name:var(--font-archivo)] text-[13px] text-[var(--color-text)]">
						{modeLabel}
					</p>
				</div>
				<button
					type="button"
					onClick={onDiscard}
					aria-label={t('email.discard')}
					className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-black/[0.1] text-[var(--color-text-subtle)] transition-colors hover:border-red-600/30 hover:bg-red-600/[0.06] hover:text-red-700 dark:border-white/[0.12] dark:hover:text-red-300"
				>
					<X size={15} strokeWidth={2.1} />
				</button>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto">
				<div className="space-y-3 px-4 pb-3 sm:px-6 lg:px-8">
					<FieldRow label={t('email.to')}>
						<FieldInput
							type="email"
							value={to}
							onChange={(value) => {
								setTo(value)
								setError(null)
							}}
							placeholder="customer@example.com"
						/>
						{!showCcBcc && (
							<EmployeeFilterChip
								active={false}
								onClick={() => setShowCcBcc(true)}
								className="shrink-0"
							>
								Add cc
							</EmployeeFilterChip>
						)}
					</FieldRow>

					{showCcBcc && (
						<>
							<FieldRow label={t('email.cc')}>
								<FieldInput value={cc} onChange={setCc} />
							</FieldRow>
							<FieldRow label={t('email.bcc')}>
								<FieldInput value={bcc} onChange={setBcc} />
							</FieldRow>
						</>
					)}

					<FieldRow label={t('email.subject')}>
						<FieldTextArea value={subject} onChange={setSubject} />
					</FieldRow>
				</div>

				<div className="border-t border-dashed border-black/[0.08] px-4 py-3 dark:border-white/[0.1] sm:px-6 lg:px-8">
					<textarea
						ref={bodyRef}
						value={body}
						onChange={handleBodyInput}
						onKeyDown={handleKeyDown}
						placeholder={t('email.bodyPlaceholder')}
						rows={3}
						className="max-h-[300px] min-h-28 w-full resize-none rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 py-3 font-[family-name:var(--font-archivo)] text-[14px] leading-relaxed text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]/55 focus:ring-2 focus:ring-[var(--color-primary)]/15 dark:border-white/[0.12]"
					/>
				</div>

				{error && (
					<div className="px-4 pb-3 sm:px-6 lg:px-8">
						<EmployeeStatusPill
							tone="danger"
							leading={<AlertTriangle size={13} strokeWidth={2.2} />}
						>
							{error}
						</EmployeeStatusPill>
					</div>
				)}
			</div>

			<div className="flex shrink-0 items-center gap-2 border-t border-black/[0.06] px-4 py-3 dark:border-white/[0.08] sm:px-6 lg:px-8">
				<button
					type="button"
					aria-label={t('composer.attach')}
					className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-black/[0.1] text-[var(--color-text-subtle)] transition-colors hover:border-[var(--color-primary)]/45 hover:text-[var(--color-text)] dark:border-white/[0.12]"
				>
					<Paperclip size={15} strokeWidth={2.1} />
				</button>

				<div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
					<EmployeeActionButton
						onClick={handleSaveDraft}
						aria-label={t('email.saveDraft')}
						tone={isDraft ? 'success' : 'neutral'}
						leading={<Save size={14} strokeWidth={2.2} />}
						fullWidthOnMobile
						className="w-full"
					>
						{isDraft ? t('email.draftSaved') : t('email.saveDraft')}
					</EmployeeActionButton>
					<EmployeeActionButton
						onClick={() => {
							void handleSend()
						}}
						disabled={!canSend || isSending}
						aria-label={t('composer.send')}
						tone="primary"
						leading={<Send size={14} strokeWidth={2.2} />}
						fullWidthOnMobile
						className="w-full"
					>
						{isSending ? 'Sending email' : 'Send email'}
					</EmployeeActionButton>
				</div>
			</div>
		</div>
	)
}

function FieldInput({
	value,
	onChange,
	type = 'text',
	placeholder,
}: {
	value: string
	onChange: (value: string) => void
	type?: string
	placeholder?: string
}) {
	return (
		<input
			type={type}
			value={value}
			onChange={(event) => onChange(event.target.value)}
			placeholder={placeholder}
			className="min-h-10 min-w-0 flex-1 rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 font-[family-name:var(--font-archivo)] text-[13px] text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]/55 focus:ring-2 focus:ring-[var(--color-primary)]/15 dark:border-white/[0.12]"
		/>
	)
}

function FieldTextArea({
	value,
	onChange,
}: {
	value: string
	onChange: (value: string) => void
}) {
	return (
		<textarea
			value={value}
			onChange={(event) => onChange(event.target.value)}
			rows={2}
			className="min-h-16 min-w-0 flex-1 resize-none rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 py-2 font-[family-name:var(--font-archivo)] text-[13px] leading-relaxed text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]/55 focus:ring-2 focus:ring-[var(--color-primary)]/15 dark:border-white/[0.12]"
		/>
	)
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex min-w-0 flex-col gap-1.5 lg:flex-row lg:items-center lg:gap-3">
			<span className="w-auto shrink-0 font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] lg:w-16">
				{label}
			</span>
			<div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
				{children}
			</div>
		</div>
	)
}
