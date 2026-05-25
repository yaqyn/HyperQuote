import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Paperclip, Send } from 'lucide-react'
import {
	type ChangeEvent,
	type KeyboardEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { sendReply } from '../../lib/server/customer-service'
import type { Conversation } from '../../types/customer-service'
import {
	EmployeeActionButton,
	EmployeeStatusPill,
} from '../shared/EmployeeControls'

interface ResponseComposerProps {
	conversation: Conversation
	mode?: 'chat' | 'email'
}

/**
 * Live reply composer. Enter commits; Shift+Enter inserts a line break.
 */
export function ResponseComposer({
	conversation,
	mode = 'chat',
}: ResponseComposerProps) {
	const { t } = useTranslation('customer-service')
	const [content, setContent] = useState('')
	const [isConfirming, setIsConfirming] = useState(false)
	const [isSending, setIsSending] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const queryClient = useQueryClient()
	const isEmail = mode === 'email' || conversation.channel === 'email'
	const showAttach = !isEmail

	useEffect(() => {
		textareaRef.current?.focus()
	}, [])

	const handleSend = useCallback(async () => {
		if (!content.trim() || isSending) return
		const text = content.trim()
		setIsSending(true)
		setError(null)
		try {
			await sendReply({
				data: {
					conversationId: conversation.id,
					channel: isEmail ? 'email' : conversation.channel,
					content: text,
				},
			})
			setContent('')
			setIsConfirming(false)
			if (textareaRef.current) {
				textareaRef.current.style.height = 'auto'
			}
			await queryClient.invalidateQueries({ queryKey: ['support-inbox'] })
		} catch {
			setError('Reply was not sent. Keep the text and try again.')
		} finally {
			setIsSending(false)
		}
	}, [
		content,
		conversation.id,
		conversation.channel,
		isEmail,
		isSending,
		queryClient,
	])

	const handleReplyClick = useCallback(() => {
		if (!content.trim() || isSending) return
		if (isEmail && !isConfirming) {
			setError(null)
			setIsConfirming(true)
			return
		}
		void handleSend()
	}, [content, handleSend, isConfirming, isEmail, isSending])

	const handleCancelConfirm = useCallback(() => {
		setIsConfirming(false)
		textareaRef.current?.focus()
	}, [])

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				handleReplyClick()
			}
		},
		[handleReplyClick],
	)

	function handleInput(e: ChangeEvent<HTMLTextAreaElement>) {
		setContent(e.target.value)
		setError(null)
		setIsConfirming(false)
		const el = e.target
		el.style.height = 'auto'
		el.style.height = `${Math.min(el.scrollHeight, 220)}px`
	}

	const hasContent = content.trim().length > 0

	return (
		<div className="shrink-0 border-t border-black/[0.06] bg-[var(--color-surface)] px-2 py-2 dark:border-white/[0.08] sm:px-3 lg:px-8 lg:py-4">
			<div className="flex items-end gap-2 lg:hidden">
				{showAttach && (
					<button
						type="button"
						aria-label={t('composer.attach')}
						className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-black/[0.08] text-[var(--color-text-subtle)] transition-colors hover:border-[var(--color-primary)]/35 hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 dark:border-white/[0.1]"
					>
						<Paperclip size={15} strokeWidth={2.1} />
					</button>
				)}
				<textarea
					ref={textareaRef}
					value={content}
					onChange={handleInput}
					onKeyDown={handleKeyDown}
					placeholder={t('composer.placeholder')}
					rows={1}
					className="max-h-28 min-h-10 min-w-0 flex-1 resize-none rounded-md border border-black/[0.08] bg-[var(--color-surface)] px-3 py-2.5 font-[family-name:var(--font-archivo)] text-[14px] leading-snug text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]/45 focus:ring-2 focus:ring-[var(--color-primary)]/12 dark:border-white/[0.1]"
				/>
				<button
					type="button"
					onClick={handleReplyClick}
					disabled={!hasContent || isSending}
					aria-label={isEmail ? t('email.reply') : t('composer.send')}
					className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)] text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 disabled:bg-[var(--color-primary)]/35 disabled:text-white/75"
				>
					<Send size={15} strokeWidth={2.2} />
				</button>
			</div>

			{isEmail && isConfirming && (
				<div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-black/[0.08] bg-black/[0.015] p-2 dark:border-white/[0.1] dark:bg-white/[0.03] lg:hidden">
					<span className="min-w-0 font-[family-name:var(--font-archivo)] text-[12px] font-semibold text-[var(--color-text-muted)]">
						{t('email.confirmReply')}
					</span>
					<div className="flex shrink-0 items-center gap-2">
						<button
							type="button"
							onClick={handleCancelConfirm}
							className="min-h-8 rounded-md border border-black/[0.08] px-3 font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] dark:border-white/[0.1]"
						>
							{t('email.cancel')}
						</button>
						<button
							type="button"
							onClick={() => {
								void handleSend()
							}}
							disabled={isSending}
							className="min-h-8 rounded-md bg-[var(--color-primary)] px-3 font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-blue-700 disabled:bg-[var(--color-primary)]/35"
						>
							{t('email.reply')}
						</button>
					</div>
				</div>
			)}

			{error && (
				<div className="mt-2 lg:hidden">
					<EmployeeStatusPill
						tone="danger"
						leading={<AlertTriangle size={13} strokeWidth={2.2} />}
					>
						{error}
					</EmployeeStatusPill>
				</div>
			)}

			<div className="hidden lg:block">
				<div className="mb-3 flex items-center justify-between gap-3">
					<p className="font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
						{isEmail ? t('email.reply') : 'Reply to customer'}
					</p>
					{showAttach && (
						<button
							type="button"
							aria-label={t('composer.attach')}
							className="flex h-9 w-9 items-center justify-center rounded-md border border-black/[0.1] text-[var(--color-text-subtle)] transition-colors hover:border-[var(--color-primary)]/45 hover:text-[var(--color-text)] dark:border-white/[0.12]"
						>
							<Paperclip size={15} strokeWidth={2.1} />
						</button>
					)}
				</div>

				<textarea
					ref={textareaRef}
					value={content}
					onChange={handleInput}
					onKeyDown={handleKeyDown}
					placeholder={t('composer.placeholder')}
					rows={2}
					className="max-h-[220px] min-h-20 w-full resize-none rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 py-3 font-[family-name:var(--font-archivo)] text-[14px] leading-relaxed text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]/55 focus:ring-2 focus:ring-[var(--color-primary)]/15 dark:border-white/[0.12]"
				/>

				{error && (
					<div className="mt-3">
						<EmployeeStatusPill
							tone="danger"
							leading={<AlertTriangle size={13} strokeWidth={2.2} />}
						>
							{error}
						</EmployeeStatusPill>
					</div>
				)}

				<div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					{isEmail && isConfirming ? (
						<span className="font-[family-name:var(--font-archivo)] text-[12px] font-semibold leading-snug text-[var(--color-text-muted)]">
							{t('email.confirmReply')}
						</span>
					) : isEmail ? (
						<span aria-hidden className="hidden sm:block" />
					) : (
						<span className="font-[family-name:var(--font-archivo)] text-[12px] leading-snug text-[var(--color-text-muted)]">
							{t('composer.sendShortcut')} · Shift+Enter for a new line
						</span>
					)}
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						{isEmail && isConfirming && (
							<EmployeeActionButton
								onClick={handleCancelConfirm}
								aria-label={t('email.cancel')}
								tone="neutral"
								fullWidthOnMobile
							>
								{t('email.cancel')}
							</EmployeeActionButton>
						)}
						<EmployeeActionButton
							onClick={handleReplyClick}
							disabled={!hasContent || isSending}
							aria-label={isEmail ? t('email.reply') : t('composer.send')}
							tone="primary"
							leading={<Send size={14} strokeWidth={2.2} />}
							fullWidthOnMobile
						>
							{isSending
								? 'Sending reply'
								: isEmail
									? t('email.reply')
									: 'Send reply'}
						</EmployeeActionButton>
					</div>
				</div>
			</div>
		</div>
	)
}
