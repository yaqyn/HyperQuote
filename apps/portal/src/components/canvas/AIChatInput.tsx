/**
 * AIChatInput — Glass-bordered input when chatting, underline when idle.
 * Voice button, send arrow, stop. No fixed prompts.
 */

import { AlertTriangle, Mic, Square } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePortalChat } from '../../hooks/usePortalChat'
import { useSlashCommands } from '../../hooks/useSlashCommands'
import { SlashCommandPalette } from '../chat/SlashCommandPalette'

const RATE_WARN_THRESHOLD = 25
const RATE_LIMIT_THRESHOLD = 30
const RATE_WINDOW_MS = 60_000
const MAX_LINES = 6
const LINE_HEIGHT = 22

interface AIChatInputProps {
	chat?: ReturnType<typeof usePortalChat>
	hasMessages?: boolean
}

export function AIChatInput({
	chat: chatProp,
	hasMessages = false,
}: AIChatInputProps) {
	const { t } = useTranslation('portal')
	const ownChat = usePortalChat()
	const chat = chatProp ?? ownChat

	const [value, setValue] = useState('')
	const [isFocused, setIsFocused] = useState(false)
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const slash = useSlashCommands(value)

	const timestampsRef = useRef<number[]>([])
	const [rateWarning, setRateWarning] = useState(false)
	const [rateLimited, setRateLimited] = useState(false)
	const [cooldownSeconds, setCooldownSeconds] = useState(0)
	const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

	useEffect(() => {
		return () => {
			if (cooldownRef.current) clearInterval(cooldownRef.current)
		}
	}, [])

	const autoResize = useCallback(() => {
		const ta = textareaRef.current
		if (!ta) return
		ta.style.height = 'auto'
		const maxHeight = LINE_HEIGHT * MAX_LINES + 12
		ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`
		ta.style.overflowY = ta.scrollHeight > maxHeight ? 'auto' : 'hidden'
	}, [])

	useEffect(() => {
		autoResize()
	}, [autoResize])

	const checkRateLimit = useCallback((): boolean => {
		const now = Date.now()
		timestampsRef.current = timestampsRef.current.filter(
			(ts) => now - ts < RATE_WINDOW_MS,
		)
		const count = timestampsRef.current.length

		if (count >= RATE_LIMIT_THRESHOLD) {
			setRateLimited(true)
			setRateWarning(true)
			let remaining = 10
			setCooldownSeconds(remaining)
			cooldownRef.current = setInterval(() => {
				remaining -= 1
				setCooldownSeconds(remaining)
				if (remaining <= 0) {
					if (cooldownRef.current) clearInterval(cooldownRef.current)
					setRateLimited(false)
					setRateWarning(false)
				}
			}, 1000)
			return false
		}

		if (count >= RATE_WARN_THRESHOLD) {
			setRateWarning(true)
		} else {
			setRateWarning(false)
		}

		timestampsRef.current.push(now)
		return true
	}, [])

	const handleSubmit = useCallback(() => {
		if (!value.trim() || chat.isLoading || rateLimited) return
		if (!checkRateLimit()) return
		chat.sendMessage(value.trim())
		setValue('')
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto'
		}
	}, [value, chat, rateLimited, checkRateLimit])

	const handleSlashSelect = useCallback(
		(cmd: { command: string }) => {
			setValue(
				slash.selectCommand(cmd as import('../../lib/chat-types').SlashCommand),
			)
			textareaRef.current?.focus()
		},
		[slash],
	)

	const handleSlashClose = useCallback(() => {
		setValue('')
		textareaRef.current?.focus()
	}, [])

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (slash.isActive && slash.filteredCommands.length > 0) {
				if (e.key === 'ArrowUp') {
					e.preventDefault()
					slash.moveUp()
					return
				}
				if (e.key === 'ArrowDown') {
					e.preventDefault()
					slash.moveDown()
					return
				}
				if (e.key === 'Enter') {
					e.preventDefault()
					const cmd = slash.filteredCommands[slash.selectedIndex]
					if (cmd) handleSlashSelect(cmd)
					return
				}
				if (e.key === 'Escape') {
					e.preventDefault()
					handleSlashClose()
					return
				}
			}
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				handleSubmit()
			}
		},
		[handleSubmit, slash, handleSlashSelect, handleSlashClose],
	)

	const handleStop = useCallback(() => {
		chat.stop()
	}, [chat])

	const handleMic = useCallback(() => {
		// Placeholder — real voice input in Phase 27
		console.info('[AIChatInput] Voice input coming soon')
	}, [])

	const hasText = value.trim().length > 0

	// Glass style when chatting, underline when idle
	const isGlass = hasMessages

	return (
		<div
			className={`w-full px-4 ${isGlass ? 'max-w-[680px]' : 'max-w-[520px]'}`}
		>
			{/* Rate limit warning */}
			{rateWarning && (
				<div className="flex items-center justify-center gap-1.5 mb-3">
					<AlertTriangle
						size={12}
						className="text-[var(--color-warning)] shrink-0"
					/>
					<span className="text-[13px] text-[var(--color-warning)]">
						{t('chat.rateWarning')}
						{rateLimited && cooldownSeconds > 0 && (
							<span className="font-mono ms-1">{cooldownSeconds}s</span>
						)}
					</span>
				</div>
			)}

			<div className="relative">
				{/* Slash command palette */}
				<AnimatePresence>
					{slash.isActive && slash.filteredCommands.length > 0 && (
						<SlashCommandPalette
							commands={slash.filteredCommands}
							selectedIndex={slash.selectedIndex}
							onSelect={handleSlashSelect}
							onHover={slash.setSelectedIndex}
						/>
					)}
				</AnimatePresence>

				{/* Input container */}
				<div
					className={[
						'flex items-end gap-2 transition-all duration-300',
						isGlass ? 'border-b border-[var(--color-border)] px-0 py-2' : '',
					].join(' ')}
				>
					{/* Voice button — always visible on the start side */}
					<button
						type="button"
						onClick={handleMic}
						className="flex items-center justify-center w-7 h-7 shrink-0 mb-0.5 text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] transition-colors"
						aria-label={t('a11y.voiceInput')}
					>
						<Mic size={15} strokeWidth={1.5} />
					</button>

					{/* Textarea */}
					<div className="relative flex-1">
						<textarea
							ref={textareaRef}
							data-chat-input
							value={value}
							onChange={(e) => setValue(e.target.value)}
							onFocus={() => setIsFocused(true)}
							onBlur={() => setIsFocused(false)}
							onKeyDown={handleKeyDown}
							rows={1}
							aria-label={t('a11y.sendMessage')}
							aria-multiline="true"
							spellCheck={false}
							disabled={rateLimited}
							className={[
								'relative z-10 w-full bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-transparent resize-none leading-[22px] transition-colors duration-200',
								isGlass
									? 'pb-0'
									: 'pb-2 border-b border-[var(--color-border)] focus:border-[var(--color-primary)]',
							].join(' ')}
							style={{
								height: `${LINE_HEIGHT}px`,
								overflowY: 'hidden',
								textAlign:
									hasText || isFocused || hasMessages ? 'start' : 'center',
							}}
						/>

						{/* Ghost text — intentionally short across chat inputs. */}
						{!value && !hasMessages && (
							<div className="pointer-events-none absolute inset-0 flex items-start justify-center">
								<span className="text-sm leading-[22px] text-[var(--color-text-subtle)]">
									{t('chat.writingPlaceholder')}
								</span>
							</div>
						)}

						{/* Simple placeholder when chatting */}
						{!value && hasMessages && (
							<div className="pointer-events-none absolute inset-0 flex items-start">
								<span className="text-sm text-[var(--color-text-subtle)]/50 leading-[22px]">
									{t('chat.writingPlaceholder')}
								</span>
							</div>
						)}
					</div>

					{/* Send / Stop */}
					<AnimatePresence>
						{chat.isLoading ? (
							<motion.button
								key="stop"
								type="button"
								onClick={handleStop}
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.8 }}
								transition={{ duration: 0.15 }}
								className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 mb-0.5 bg-[var(--color-text)]/8"
								aria-label={t('a11y.stopGenerating')}
							>
								<Square size={10} className="text-[var(--color-text)]" />
							</motion.button>
						) : hasText ? (
							<motion.button
								key="send"
								type="button"
								onClick={handleSubmit}
								disabled={rateLimited}
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.8 }}
								transition={{ duration: 0.15 }}
								className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 mb-0.5 disabled:opacity-30"
								aria-label={t('a11y.sendMessage')}
							>
								<svg
									aria-hidden="true"
									width="14"
									height="14"
									viewBox="0 0 14 14"
									fill="none"
									className="text-[var(--color-text)]"
								>
									<path
										d="M7 12V2M7 2L3 6M7 2L11 6"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</motion.button>
						) : null}
					</AnimatePresence>
				</div>
			</div>
		</div>
	)
}
