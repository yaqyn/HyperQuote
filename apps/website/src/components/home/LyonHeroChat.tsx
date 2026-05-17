import { ArrowUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useChatSession } from '../../hooks/chatSession'
import { ChatMarkdown } from '../chat/ChatMarkdown'

export function LyonHeroChat({
	initialMessage = '',
}: {
	initialMessage?: string
}) {
	const { t } = useTranslation('website')
	const messages = useChatSession((state) => state.messages)
	const sendMessage = useChatSession((state) => state.sendMessage)
	const isLoading = useChatSession((state) => state.isLoading)
	const [input, setInput] = useState('')
	const inputRef = useRef<HTMLTextAreaElement>(null)
	const messagesRef = useRef<HTMLDivElement>(null)
	const sentInitial = useRef(false)

	useEffect(() => {
		inputRef.current?.focus()
	}, [])

	useEffect(() => {
		if (!initialMessage || sentInitial.current) return
		sentInitial.current = true
		void sendMessage(initialMessage)
	}, [initialMessage, sendMessage])

	useEffect(() => {
		if (!messagesRef.current) return
		messagesRef.current.scrollTop = messagesRef.current.scrollHeight
		// Runs after each render so streamed chat updates stay pinned to bottom.
	})

	async function send() {
		const trimmed = input.trim()
		if (!trimmed || isLoading) return
		setInput('')
		if (inputRef.current) inputRef.current.style.height = 'auto'
		await sendMessage(trimmed)
	}

	function handleInput() {
		const el = inputRef.current
		if (!el) return
		el.style.height = 'auto'
		el.style.height = `${Math.min(el.scrollHeight, 160)}px`
	}

	const isEmpty = messages.length === 0

	return (
		<div dir="ltr" className="flex-1 min-h-0 flex flex-col w-full">
			<div className="pt-20 shrink-0" />

			<div ref={messagesRef} className="flex-1 min-h-0 overflow-y-auto">
				{isEmpty && !isLoading ? (
					<div className="h-full flex flex-col items-center justify-center gap-3">
						<h2 className="text-[28px] lg:text-[40px] font-extrabold text-[var(--color-text)] tracking-normal">
							{t('chat.header')}
						</h2>
						<p className="text-[15px] text-[var(--color-text-subtle)] max-w-[360px] text-center">
							{t('chat.heroDescription')}
						</p>
					</div>
				) : (
					<div className="max-w-[800px] w-full mx-auto px-6 py-6 flex flex-col gap-8">
						{messages.map((msg) => (
							<div key={msg.id}>
								{msg.role === 'user' ? (
									<div className="flex justify-end">
										<div className="bg-[var(--color-surface)] rounded-2xl rounded-br-sm px-5 py-3 max-w-[75%]">
											<ChatMarkdown
												content={msg.content}
												messageRole="user"
												className="text-[15px] leading-[1.6] text-[var(--color-text)]"
											/>
										</div>
									</div>
								) : (
									<div className="pe-12">
										<ChatMarkdown
											content={msg.content}
											messageRole="assistant"
											className="text-[15px] leading-[1.8] text-[var(--color-text)]"
										/>
									</div>
								)}
							</div>
						))}
						{isLoading && (
							<div className="pe-12">
								<div className="flex gap-1.5">
									<span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-subtle)] animate-pulse" />
									<span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-subtle)] animate-pulse [animation-delay:0.15s]" />
									<span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-subtle)] animate-pulse [animation-delay:0.3s]" />
								</div>
							</div>
						)}
					</div>
				)}
			</div>

			<div className="shrink-0 px-6 pb-6 pt-3">
				<div className="max-w-[800px] w-full mx-auto">
					<div className="flex items-end gap-3 bg-[var(--color-surface)] rounded-2xl px-4 py-3">
						<textarea
							ref={inputRef}
							dir="auto"
							value={input}
							onChange={(e) => {
								setInput(e.target.value)
								handleInput()
							}}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault()
									void send()
								}
							}}
							placeholder={t('chat.inputPlaceholder')}
							rows={1}
							className="flex-1 min-h-[24px] max-h-[160px] bg-transparent text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none resize-none"
						/>
						<button
							type="button"
							onClick={() => {
								void send()
							}}
							disabled={!input.trim() || isLoading}
							className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all bg-[var(--color-text)] text-[var(--color-base)] disabled:opacity-10"
						>
							<ArrowUp size={16} />
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
