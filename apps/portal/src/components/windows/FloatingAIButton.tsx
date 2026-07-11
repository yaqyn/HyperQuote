/**
 * FloatingAIButton -- Mini AI chat panel visible when windows are open.
 *
 * Wired to usePortalChat() for real streaming. Shows messages in compact panel.
 * Ctrl+J toggles, auto-closes when no window open. Context-aware greeting.
 * Keeps spring/tween animations from Phase 7.
 */

import {
	useDocumentScrollLock,
	useVisualViewportKeyboard,
} from '@hyperquote/ui/viewport/keyboard'
import { useSpeechInput } from '@hyperquote/ui/voice/useSpeechInput'
import { useLocation, useMatches } from '@tanstack/react-router'
import type { ParseKeys } from 'i18next'
import { ArrowUp, Mic, Sparkles, Square, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import {
	type CSSProperties,
	type KeyboardEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { Button } from 'react-aria-components/Button'
import { useTranslation } from 'react-i18next'
import { usePortalChat } from '../../hooks/usePortalChat'
import { useShortcut } from '../../hooks/useShortcut'
import type { ChatMessage } from '../../lib/chat-types'
import { usePortalStore } from '../../stores/portal'

const WINDOW_ROUTES = [
	'/orders',
	'/market',
	'/notifications',
	'/documents',
	'/support',
	'/settings',
]

/** Context-aware greeting key based on the current customer route. */
function getContextGreeting(pathname: string): ParseKeys<'portal'> {
	if (pathname.startsWith('/orders')) return 'floatingAI.orders'
	if (pathname.startsWith('/market')) return 'floatingAI.market'
	return 'floatingAI.orders'
}

/** Compact message bubble for mini panel */
function MiniMessage({ message }: { message: ChatMessage }) {
	const isUser = message.role === 'user'
	return (
		<div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
			<div
				className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
					isUser
						? 'bg-[var(--color-primary)] text-[var(--color-primary-contrast)] rounded-br-sm rtl:rounded-br-xl rtl:rounded-bl-sm'
						: 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text)] rounded-bl-sm rtl:rounded-bl-xl rtl:rounded-br-sm'
				}`}
			>
				{message.content}
			</div>
		</div>
	)
}

export function FloatingAIButton() {
	const { t, i18n } = useTranslation('portal')
	const matches = useMatches()
	const location = useLocation()
	const isFloatingAIOpen = usePortalStore((s) => s.isFloatingAIOpen)
	const toggleFloatingAI = usePortalStore((s) => s.toggleFloatingAI)
	const setFloatingAIOpen = usePortalStore((s) => s.setFloatingAIOpen)
	const chat = usePortalChat()
	const isWindowOpen = matches.some((m) =>
		WINDOW_ROUTES.some((p) => m.pathname.startsWith(p)),
	)
	const keyboard = useVisualViewportKeyboard({
		enabled: isWindowOpen && isFloatingAIOpen,
	})
	useDocumentScrollLock(isWindowOpen && isFloatingAIOpen)

	const [inputValue, setInputValue] = useState('')
	const scrollRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const speech = useSpeechInput({
		locale: i18n.language,
		onTranscript: setInputValue,
	})

	const panelKeyboardStyle = useMemo<CSSProperties | undefined>(() => {
		if (!keyboard.isOpen) return undefined
		return {
			bottom: `${keyboard.bottomInset + 16}px`,
			maxHeight: `calc(${keyboard.height}px - 2rem)`,
		}
	}, [keyboard.bottomInset, keyboard.height, keyboard.isOpen])

	// Ctrl+J toggles floating AI panel globally
	useShortcut('Mod+J', toggleFloatingAI)

	// Auto-close when window closes (route changes to /)
	useEffect(() => {
		if (!isWindowOpen) {
			setFloatingAIOpen(false)
		}
	}, [isWindowOpen, setFloatingAIOpen])

	// Auto-scroll to bottom on new messages
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight
		}
	}, [])

	// Focus input when panel opens
	useEffect(() => {
		if (isFloatingAIOpen) {
			setTimeout(() => inputRef.current?.focus(), 100)
		}
	}, [isFloatingAIOpen])

	const handleSend = useCallback(() => {
		if (!inputValue.trim() || chat.isLoading) return
		chat.sendMessage(inputValue.trim())
		setInputValue('')
	}, [inputValue, chat])

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Enter') {
				e.preventDefault()
				handleSend()
			}
		},
		[handleSend],
	)

	if (!isWindowOpen) return null

	const greetingKey = getContextGreeting(location.pathname)
	const hasMessages = chat.messages.length > 0

	return (
		<>
			{/* Floating button */}
			<AnimatePresence>
				{!isFloatingAIOpen && (
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						exit={{ scale: 0 }}
						transition={{
							type: 'spring',
							stiffness: 200,
							damping: 20,
							delay: 0.2,
						}}
						className="fixed bottom-4 right-4 z-50"
					>
						<Button
							onPress={toggleFloatingAI}
							aria-label={t('floatingAI.orders')}
							className="flex items-center justify-center w-11 h-11 rounded-full bg-[var(--color-primary)] shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
						>
							<Sparkles size={20} className="text-white" />
						</Button>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Mini AI chat panel */}
			<AnimatePresence>
				{isFloatingAIOpen && (
					<motion.div
						initial={{ scale: 0.9, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0, opacity: 0 }}
						transition={{ duration: 0.15, ease: 'easeOut' }}
						className="fixed bottom-4 right-4 z-50 w-[380px] max-h-[60vh] flex flex-col backdrop-blur-2xl bg-[rgba(255,255,255,0.90)] dark:bg-[var(--p-card)] rounded-2xl shadow-2xl border border-[var(--color-border)]/50"
						style={panelKeyboardStyle}
					>
						<FloatingDialog
							aria-label={t('floatingAI.ariaLabel')}
							className="outline-none flex flex-col h-full"
						>
							{/* Header */}
							<div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
								<div className="flex items-center gap-2">
									<Sparkles size={16} className="text-[var(--color-primary)]" />
									<span className="text-sm font-semibold text-[var(--color-text)]">
										AI
									</span>
								</div>
								<Button
									onPress={() => setFloatingAIOpen(false)}
									aria-label={t('window.close')}
									className="flex items-center justify-center w-7 h-7 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
								>
									<X size={16} />
								</Button>
							</div>

							{/* Message area */}
							<div
								ref={scrollRef}
								className="flex-1 overflow-y-auto px-4 py-2 min-h-[120px] max-h-[calc(60vh-120px)]"
							>
								{!hasMessages ? (
									<div className="space-y-2">
										<p className="text-sm text-[var(--color-text-muted)]">
											{t(greetingKey)}
										</p>
									</div>
								) : (
									<div className="flex flex-col gap-2">
										{chat.messages.map((msg) => (
											<MiniMessage key={msg.id} message={msg} />
										))}
										{chat.isLoading &&
											chat.messages[chat.messages.length - 1]?.role ===
												'user' && (
												<div className="flex items-center gap-1.5 ps-1">
													<div className="flex gap-1">
														{[0, 1, 2].map((i) => (
															<span
																key={i}
																className="w-1 h-1 rounded-full bg-[var(--color-text-muted)] animate-bounce"
																style={{ animationDelay: `${i * 200}ms` }}
															/>
														))}
													</div>
												</div>
											)}
									</div>
								)}
							</div>

							{/* Compact chat input */}
							<div className="px-4 pb-3 shrink-0">
								<div className="flex items-center gap-2">
									<input
										ref={inputRef}
										type="text"
										value={inputValue}
										onChange={(e) => setInputValue(e.target.value)}
										onKeyDown={handleKeyDown}
										data-chat-input
										placeholder={t('chat.placeholder1')}
										disabled={chat.isLoading}
										className="flex-1 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-colors"
									/>
									{speech.isSupported && !chat.isLoading && (
										<button
											type="button"
											onClick={() =>
												speech.isListening ? speech.stop() : speech.start()
											}
											className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]"
											aria-label={
												speech.isListening
													? 'Stop voice input'
													: t('a11y.voiceInput')
											}
											aria-pressed={speech.isListening}
										>
											{speech.isListening ? (
												<Square size={12} strokeWidth={1.8} />
											) : (
												<Mic size={15} strokeWidth={1.8} />
											)}
										</button>
									)}
									{chat.isLoading ? (
										<button
											type="button"
											onClick={() => chat.stop()}
											className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 transition-colors"
											style={{
												backgroundColor:
													'color-mix(in srgb, var(--color-error) 10%, transparent)',
												border:
													'1px solid color-mix(in srgb, var(--color-error) 20%, transparent)',
											}}
											aria-label={t('a11y.stopGenerating')}
										>
											<Square size={14} className="text-[var(--color-error)]" />
										</button>
									) : (
										<button
											type="button"
											onClick={handleSend}
											disabled={!inputValue.trim()}
											className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--color-primary)] shrink-0 transition-opacity"
											style={{
												opacity: inputValue.trim() ? 1 : 0.3,
											}}
											aria-label={t('a11y.sendMessage')}
										>
											<ArrowUp size={16} className="text-white" />
										</button>
									)}
								</div>
							</div>
						</FloatingDialog>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	)
}

function FloatingDialog({
	children,
	className,
	...props
}: {
	children: ReactNode
	className?: string
	'aria-label'?: string
}) {
	return (
		<div role="dialog" aria-label={props['aria-label']} className={className}>
			{children}
		</div>
	)
}
