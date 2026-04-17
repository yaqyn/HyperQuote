import { ArrowUp } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface ChatInputProps {
	onSend: (content: string) => Promise<void>
	isLoading: boolean
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
	const { t } = useTranslation('website')
	const [value, setValue] = useState('')
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const handleSubmit = useCallback(async () => {
		const trimmed = value.trim()
		if (!trimmed || isLoading) return
		setValue('')
		if (textareaRef.current) textareaRef.current.style.height = 'auto'
		await onSend(trimmed)
	}, [value, isLoading, onSend])

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				handleSubmit()
			}
		},
		[handleSubmit],
	)

	const handleInput = useCallback(() => {
		const el = textareaRef.current
		if (!el) return
		el.style.height = 'auto'
		el.style.height = `${Math.min(el.scrollHeight, 100)}px`
	}, [])

	const hasText = value.trim().length > 0

	return (
		<div className="shrink-0 px-5 pb-5">
			<div className="flex items-end border-b border-[var(--color-text)]/[0.1] pb-2 transition-colors duration-200 focus-within:border-[var(--color-primary)]/40">
				<textarea
					ref={textareaRef}
					dir="auto"
					value={value}
					onChange={(e) => {
						setValue(e.target.value)
						handleInput()
					}}
					onKeyDown={handleKeyDown}
					placeholder={t('chat.inputPlaceholder')}
					rows={1}
					aria-label={t('chat.inputPlaceholder')}
					className="min-h-[24px] max-h-[100px] flex-1 resize-none border-0 bg-transparent text-[14px] leading-[1.5] outline-none placeholder:opacity-25"
				/>
				<button
					type="button"
					disabled={!hasText || isLoading}
					onClick={handleSubmit}
					aria-label={t('a11y.send')}
					className={`ms-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-150 ${
						hasText && !isLoading
							? 'cursor-pointer bg-[var(--color-primary)] text-white'
							: 'cursor-default opacity-10'
					}`}
				>
					<ArrowUp size={13} />
				</button>
			</div>
		</div>
	)
}
