import { useQueryClient } from '@tanstack/react-query'
import { Paperclip } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { sendReply } from '../../lib/server/customer-service'
import type { Conversation } from '../../types/customer-service'

interface ResponseComposerProps {
	conversation: Conversation
}

/**
 * Letterhead — narrow outbound column on the switchboard. The textarea
 * has no visible border until you type; the send action reads as prose
 * ("Transmit →") rather than a button. Enter commits; Shift+Enter
 * inserts a line break.
 */
export function ResponseComposer({ conversation }: ResponseComposerProps) {
	const { t } = useTranslation('customer-service')
	const [content, setContent] = useState('')
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const queryClient = useQueryClient()

	useEffect(() => {
		textareaRef.current?.focus()
	}, [])

	const handleSend = useCallback(async () => {
		if (!content.trim()) return
		const text = content.trim()
		setContent('')
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto'
		}
		await sendReply({
			data: {
				conversationId: conversation.id,
				channel: conversation.channel,
				content: text,
			},
		})
		await queryClient.invalidateQueries({ queryKey: ['support-inbox'] })
	}, [content, conversation.id, conversation.channel, queryClient])

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				handleSend()
			}
		},
		[handleSend],
	)

	function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
		setContent(e.target.value)
		const el = e.target
		el.style.height = 'auto'
		el.style.height = `${Math.min(el.scrollHeight, 180)}px`
	}

	const hasContent = content.trim().length > 0

	return (
		<div className="shrink-0 border-t border-black/[0.06] dark:border-white/[0.08] px-10 py-4">
			{/* Letterhead eyebrow */}
			<div className="flex items-center justify-between mb-2">
				<p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-subtle)]">
					broadcasting · support
				</p>
				<Button
					aria-label={t('composer.attach')}
					className="flex items-center justify-center w-6 h-6 text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] transition-colors"
				>
					<Paperclip size={13} strokeWidth={1.5} />
				</Button>
			</div>

			{/* Textarea — no border except an on-focus hairline */}
			<textarea
				ref={textareaRef}
				value={content}
				onChange={handleInput}
				onKeyDown={handleKeyDown}
				placeholder={t('composer.placeholder')}
				rows={1}
				className="w-full resize-none bg-transparent outline-none py-1
          font-[family-name:var(--font-literata)] text-[14.5px] leading-[1.7]
          text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)]
          placeholder:italic border-b border-transparent
          focus:border-[var(--color-text)]/30 transition-colors"
				style={{ fontVariationSettings: '"opsz" 16, "wght" 400' }}
			/>

			{/* Transmit line */}
			<div className="flex items-center justify-between mt-2.5">
				<span className="font-[family-name:var(--font-jetbrains-mono)] text-[9.5px] uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
					{t('composer.sendShortcut')}
				</span>
				<Button
					onPress={handleSend}
					isDisabled={!hasContent}
					aria-label={t('composer.send')}
					className={`font-[family-name:var(--font-inter)] text-[13px] font-medium transition-colors outline-none border-b border-transparent focus-visible:border-[var(--color-primary)]
            ${
							hasContent
								? 'text-[var(--color-primary)] hover:border-[var(--color-primary)]'
								: 'text-[var(--color-text-subtle)]/60'
						}`}
				>
					Transmit →
				</Button>
			</div>
		</div>
	)
}
