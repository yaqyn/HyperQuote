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
}

/**
 * Live reply composer. Enter commits; Shift+Enter inserts a line break.
 */
export function ResponseComposer({ conversation }: ResponseComposerProps) {
	const { t } = useTranslation('customer-service')
	const [content, setContent] = useState('')
	const [isSending, setIsSending] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const queryClient = useQueryClient()

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
					channel: conversation.channel,
					content: text,
				},
			})
			setContent('')
			if (textareaRef.current) {
				textareaRef.current.style.height = 'auto'
			}
			await queryClient.invalidateQueries({ queryKey: ['support-inbox'] })
		} catch {
			setError('Reply was not sent. Keep the text and try again.')
		} finally {
			setIsSending(false)
		}
	}, [content, conversation.id, conversation.channel, isSending, queryClient])

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				void handleSend()
			}
		},
		[handleSend],
	)

	function handleInput(e: ChangeEvent<HTMLTextAreaElement>) {
		setContent(e.target.value)
		setError(null)
		const el = e.target
		el.style.height = 'auto'
		el.style.height = `${Math.min(el.scrollHeight, 220)}px`
	}

	const hasContent = content.trim().length > 0

	return (
		<div className="shrink-0 border-t border-black/[0.06] bg-[var(--color-surface)] px-2 py-2 dark:border-white/[0.08] sm:px-3 lg:px-8 lg:py-4">
			<div className="flex items-end gap-2 lg:hidden">
				<button
					type="button"
					aria-label={t('composer.attach')}
					className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-black/[0.08] text-[var(--color-text-subtle)] transition-colors hover:border-[var(--color-primary)]/35 hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 dark:border-white/[0.1]"
				>
					<Paperclip size={15} strokeWidth={2.1} />
				</button>
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
					onClick={() => {
						void handleSend()
					}}
					disabled={!hasContent || isSending}
					aria-label={t('composer.send')}
					className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)] text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 disabled:bg-[var(--color-primary)]/35 disabled:text-white/75"
				>
					<Send size={15} strokeWidth={2.2} />
				</button>
			</div>

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
						Reply to customer
					</p>
					<button
						type="button"
						aria-label={t('composer.attach')}
						className="flex h-9 w-9 items-center justify-center rounded-md border border-black/[0.1] text-[var(--color-text-subtle)] transition-colors hover:border-[var(--color-primary)]/45 hover:text-[var(--color-text)] dark:border-white/[0.12]"
					>
						<Paperclip size={15} strokeWidth={2.1} />
					</button>
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
					<span className="font-[family-name:var(--font-archivo)] text-[12px] leading-snug text-[var(--color-text-muted)]">
						{t('composer.sendShortcut')} · Shift+Enter for a new line
					</span>
					<EmployeeActionButton
						onClick={() => {
							void handleSend()
						}}
						disabled={!hasContent || isSending}
						aria-label={t('composer.send')}
						tone="primary"
						leading={<Send size={14} strokeWidth={2.2} />}
						fullWidthOnMobile
					>
						{isSending ? 'Sending reply' : 'Send reply'}
					</EmployeeActionButton>
				</div>
			</div>
		</div>
	)
}
