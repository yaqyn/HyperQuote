import { ArrowUp, Command, Mic, Square } from 'lucide-react'
import { AnimatePresence, cubicBezier, motion } from 'motion/react'
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { usePortalChat } from '../../hooks/usePortalChat'
import { PORTAL_CHAT_RUN_COMMAND_EVENT } from '../../lib/chat-types'
import {
	PORTAL_CHAT_COMMANDS,
	parsePortalChatCommand,
	portalChatCommandInputMode,
} from '../../lib/portal-chat-commands'

const SMOOTH_EASE = cubicBezier(0.22, 1, 0.36, 1)

const MAX_LINES = 5
const LINE_HEIGHT = 20

function autoResizeChatTextarea(ta: HTMLTextAreaElement) {
	ta.style.height = 'auto'
	const maxHeight = LINE_HEIGHT * MAX_LINES + 8
	ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`
	ta.style.overflowY = ta.scrollHeight > maxHeight ? 'auto' : 'hidden'
}

// Minimal Web Speech API shape — the spec isn't in lib.dom across all TS
// targets, so we narrow just what we use.
interface SpeechRecognitionResultLike {
	isFinal: boolean
	[index: number]: { transcript: string }
}
interface SpeechRecognitionEventLike {
	results: {
		length: number
		[index: number]: SpeechRecognitionResultLike
	}
}
interface SpeechRecognitionLike {
	continuous: boolean
	interimResults: boolean
	lang: string
	onresult: ((event: SpeechRecognitionEventLike) => void) | null
	onend: (() => void) | null
	onerror: (() => void) | null
	start(): void
	stop(): void
}

interface ChatInputProps {
	chat: ReturnType<typeof usePortalChat>
}

type PortalChatCommand = (typeof PORTAL_CHAT_COMMANDS)[number]

export function ChatInput({ chat }: ChatInputProps) {
	const { t, i18n } = useTranslation('portal')
	const isAr = i18n.language === 'ar'
	const [value, setValue] = useState('')
	const [listening, setListening] = useState(false)
	const [commandMenuDismissed, setCommandMenuDismissed] = useState(false)
	const [activeCommandIndex, setActiveCommandIndex] = useState(0)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const analyserRef = useRef<AnalyserNode | null>(null)
	const streamRef = useRef<MediaStream | null>(null)
	const audioCtxRef = useRef<AudioContext | null>(null)
	const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
	const rafRef = useRef<number>(0)
	const [amplitude, setAmplitude] = useState(0)
	const [transcript, setTranscript] = useState('')
	const transcriptRef = useRef('')
	const accumulatedRef = useRef('')
	const trimmedLeadingValue = value.trimStart()
	const commandToken = trimmedLeadingValue.split(/\s+/)[0] ?? ''
	const commandNeedle = commandToken.startsWith('/')
		? commandToken.slice(1).toLowerCase()
		: ''
	const canShowCommandMenu =
		trimmedLeadingValue.startsWith('/') &&
		!/\s/.test(trimmedLeadingValue) &&
		!commandMenuDismissed
	const commandSuggestions = useMemo(() => {
		if (!canShowCommandMenu) return []
		if (!commandNeedle) return PORTAL_CHAT_COMMANDS
		return PORTAL_CHAT_COMMANDS.filter((command) => {
			const haystack = [
				command.name,
				command.title,
				command.description,
				command.scope,
			]
				.join(' ')
				.toLowerCase()
			return haystack.includes(commandNeedle)
		})
	}, [canShowCommandMenu, commandNeedle])
	const commandMenuOpen = commandSuggestions.length > 0

	useEffect(() => {
		setActiveCommandIndex((index) =>
			commandSuggestions.length === 0
				? 0
				: Math.min(index, commandSuggestions.length - 1),
		)
	}, [commandSuggestions.length])

	const moveActiveCommand = useCallback(
		(step: -1 | 1) => {
			const lastIndex = commandSuggestions.length - 1
			if (lastIndex < 0) return
			flushSync(() => {
				setActiveCommandIndex((index) =>
					Math.max(0, Math.min(lastIndex, index + step)),
				)
			})
		},
		[commandSuggestions.length],
	)

	const handleSubmit = useCallback(() => {
		const message = value.trim()
		if (!message || chat.isLoading) return
		setValue('')
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto'
		}
		chat.sendMessage(message)
		requestAnimationFrame(() => {
			const inputs =
				document.querySelectorAll<HTMLTextAreaElement>('[data-chat-input]')
			inputs[inputs.length - 1]?.focus()
		})
	}, [value, chat])

	const selectCommand = useCallback(
		(command: PortalChatCommand) => {
			if (portalChatCommandInputMode(command.name) === 'run') {
				if (chat.isLoading) return
				setValue('')
				setCommandMenuDismissed(true)
				chat.sendMessage(command.name)
				requestAnimationFrame(() => {
					if (!textareaRef.current) return
					textareaRef.current.focus()
					autoResizeChatTextarea(textareaRef.current)
				})
				return
			}

			setValue(`${command.name} `)
			setCommandMenuDismissed(true)
			requestAnimationFrame(() => {
				if (!textareaRef.current) return
				textareaRef.current.focus()
				autoResizeChatTextarea(textareaRef.current)
			})
		},
		[chat],
	)

	useEffect(() => {
		function handleCommandEvent(event: Event) {
			const detail = (event as CustomEvent<{ command?: string }>).detail
			const commandText = detail?.command?.trim()
			if (!commandText) return
			const parsed = parsePortalChatCommand(commandText)
			if (!parsed) return

			if (portalChatCommandInputMode(parsed.name) === 'prefill') {
				const nextValue = parsed.args ? commandText : `${parsed.name} `
				setValue(nextValue)
				setCommandMenuDismissed(false)
				requestAnimationFrame(() => {
					if (!textareaRef.current) return
					textareaRef.current.focus()
					autoResizeChatTextarea(textareaRef.current)
				})
				return
			}

			setValue('')
			chat.sendMessage(commandText)
			requestAnimationFrame(() => {
				textareaRef.current?.focus()
			})
		}

		window.addEventListener(PORTAL_CHAT_RUN_COMMAND_EVENT, handleCommandEvent)
		return () => {
			window.removeEventListener(
				PORTAL_CHAT_RUN_COMMAND_EVENT,
				handleCommandEvent,
			)
		}
	}, [chat])

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (commandMenuOpen) {
				if (e.key === 'ArrowDown') {
					e.preventDefault()
					moveActiveCommand(1)
					return
				}
				if (e.key === 'ArrowUp') {
					e.preventDefault()
					moveActiveCommand(-1)
					return
				}
				if (e.key === 'Enter' && !e.shiftKey) {
					e.preventDefault()
					const command = commandSuggestions[activeCommandIndex]
					if (command) selectCommand(command)
					return
				}
				if (e.key === 'Tab') {
					e.preventDefault()
					const command = commandSuggestions[activeCommandIndex]
					if (command) selectCommand(command)
					return
				}
				if (e.key === 'Escape') {
					e.preventDefault()
					setCommandMenuDismissed(true)
					return
				}
			}
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				handleSubmit()
			}
		},
		[
			activeCommandIndex,
			commandMenuOpen,
			commandSuggestions,
			handleSubmit,
			moveActiveCommand,
			selectCommand,
		],
	)

	// Mic — start/stop listening with audio analyser
	async function startListening() {
		const windowWithSR = window as unknown as {
			SpeechRecognition?: new () => SpeechRecognitionLike
			webkitSpeechRecognition?: new () => SpeechRecognitionLike
		}
		const SR =
			windowWithSR.SpeechRecognition || windowWithSR.webkitSpeechRecognition
		if (!SR) return

		try {
			const recognition = new SR()
			recognition.continuous = true
			recognition.interimResults = true
			recognition.lang = isAr ? 'ar-EG' : 'en-US'

			let lastFinalIndex = 0
			recognition.onresult = (event: SpeechRecognitionEventLike) => {
				let interim = ''
				for (let i = lastFinalIndex; i < event.results.length; i++) {
					const result = event.results[i]
					if (result.isFinal) {
						accumulatedRef.current =
							`${accumulatedRef.current} ${result[0].transcript}`.trim()
						lastFinalIndex = i + 1
					} else {
						interim += result[0].transcript
					}
				}
				const text = (
					accumulatedRef.current + (interim ? ` ${interim}` : '')
				).trim()
				setTranscript(text)
				transcriptRef.current = text
			}

			recognition.onend = () => {
				if (recognitionRef.current) {
					try {
						recognition.start()
					} catch {
						/* already running */
					}
				}
			}
			recognition.onerror = () => {
				/* continue */
			}
			recognition.start()
			recognitionRef.current = recognition

			const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
			streamRef.current = stream
			const ctx = new AudioContext()
			audioCtxRef.current = ctx
			const source = ctx.createMediaStreamSource(stream)
			const analyser = ctx.createAnalyser()
			analyser.fftSize = 256
			analyser.smoothingTimeConstant = 0.7
			source.connect(analyser)
			analyserRef.current = analyser

			const dataArray = new Uint8Array(analyser.frequencyBinCount)
			function tick() {
				analyser.getByteFrequencyData(dataArray)
				let sum = 0
				for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
				setAmplitude(sum / dataArray.length / 255)
				rafRef.current = requestAnimationFrame(tick)
			}
			rafRef.current = requestAnimationFrame(tick)

			setListening(true)
			setTranscript('')
			accumulatedRef.current = ''
		} catch {
			/* permission denied / unsupported */
		}
	}

	function stopListening(skipCommit = false) {
		cancelAnimationFrame(rafRef.current)
		if (recognitionRef.current) {
			recognitionRef.current.stop()
			recognitionRef.current = null
		}
		if (!skipCommit) {
			const finalText = transcriptRef.current.trim()
			if (finalText) {
				setValue((prev) => (prev ? `${prev} ${finalText}` : finalText))
			}
		}
		streamRef.current?.getTracks().forEach((t) => {
			t.stop()
		})
		streamRef.current = null
		audioCtxRef.current?.close()
		audioCtxRef.current = null
		analyserRef.current = null
		setListening(false)
		setAmplitude(0)
		setTranscript('')
		transcriptRef.current = ''
	}

	useEffect(() => {
		return () => {
			cancelAnimationFrame(rafRef.current)
			recognitionRef.current?.stop()
			streamRef.current?.getTracks().forEach((t) => {
				t.stop()
			})
			audioCtxRef.current?.close()
		}
	}, [])

	const hasText = value.trim().length > 0

	return (
		<>
			{/* Voice listening overlay — warm-room version of the orb */}
			<AnimatePresence>
				{listening && (
					<VoiceOrb
						amplitude={amplitude}
						transcript={transcript}
						isAr={isAr}
						hint={t('a11y.voiceInput')}
						onDismiss={() => stopListening()}
						onSend={() => {
							const voice = transcriptRef.current.trim()
							const existing = value.trim()
							const combined = [existing, voice].filter(Boolean).join(' ')
							if (combined) {
								setValue('')
								chat.sendMessage(combined)
							}
							stopListening(true)
						}}
					/>
				)}
			</AnimatePresence>

			<div className="office-composer">
				<div className="relative flex-1">
					<div className="flex items-end gap-2 sm:gap-3">
						<textarea
							ref={textareaRef}
							data-chat-input
							value={value}
							onChange={(e) => {
								setValue(e.target.value)
								setCommandMenuDismissed(false)
								setActiveCommandIndex(0)
								autoResizeChatTextarea(e.target)
							}}
							onKeyDown={handleKeyDown}
							rows={1}
							placeholder={t('chat.writingPlaceholder')}
							aria-label={t('a11y.sendMessage')}
							aria-multiline="true"
							spellCheck={false}
							dir="auto"
							className="min-h-8 flex-1 resize-none bg-transparent py-1.5 font-sans text-[14px] text-[var(--p-text)] outline-none placeholder:text-[var(--p-text-faint)] sm:min-h-9 sm:text-[15px]"
							style={{
								height: `${LINE_HEIGHT + 4}px`,
								lineHeight: `${LINE_HEIGHT}px`,
								overflowY: 'hidden',
							}}
						/>
						<AnimatePresence>
							{commandMenuOpen && (
								<CommandMenu
									activeIndex={activeCommandIndex}
									commands={commandSuggestions}
									onSelect={selectCommand}
								/>
							)}
						</AnimatePresence>

						<div className="flex shrink-0 items-center gap-1 pb-0.5">
							<button
								type="button"
								onClick={startListening}
								className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
								aria-label={t('a11y.voiceInput')}
							>
								<Mic size={14} strokeWidth={1.5} />
							</button>
							{chat.isLoading ? (
								<button
									type="button"
									onClick={() => chat.stop()}
									className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--p-text)] text-[var(--p-bg)] transition-colors"
									aria-label={t('a11y.stopGenerating')}
								>
									<Square size={11} strokeWidth={1.8} />
								</button>
							) : (
								<button
									type="button"
									onClick={handleSubmit}
									disabled={!hasText}
									className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--p-text-muted)] transition-colors enabled:bg-[var(--p-accent)] enabled:text-[var(--p-accent-contrast)] disabled:opacity-40"
									aria-label={t('a11y.sendMessage')}
								>
									<ArrowUp size={14} strokeWidth={1.8} />
								</button>
							)}
						</div>
					</div>
					<div className="h-px w-full bg-[var(--p-rule-strong)]" aria-hidden />
				</div>
			</div>
		</>
	)
}

function CommandMenu({
	activeIndex,
	commands,
	onSelect,
}: {
	activeIndex: number
	commands: readonly PortalChatCommand[]
	onSelect: (command: PortalChatCommand) => void
}) {
	const commandRefs = useRef<Array<HTMLButtonElement | null>>([])
	const scrollRef = useRef<HTMLDivElement | null>(null)

	useLayoutEffect(() => {
		const scroller = scrollRef.current
		const activeItem = commandRefs.current[activeIndex]
		if (!scroller || !activeItem) return

		const itemTop = activeItem.offsetTop
		const itemBottom = itemTop + activeItem.offsetHeight
		const visibleTop = scroller.scrollTop
		const visibleBottom = visibleTop + scroller.clientHeight

		if (itemTop < visibleTop) {
			scroller.scrollTop = itemTop
			return
		}
		if (itemBottom > visibleBottom) {
			scroller.scrollTop = itemBottom - scroller.clientHeight
		}
	}, [activeIndex])

	return (
		<motion.div
			initial={{ opacity: 0, y: 8, scale: 0.98 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, y: 6, scale: 0.98 }}
			transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
			className="absolute inset-x-0 bottom-full z-30 mb-3 overflow-hidden rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] shadow-2xl"
			role="listbox"
			aria-label="Chat commands"
		>
			<div className="flex items-center gap-2 border-b border-[var(--p-rule)] px-3 py-2">
				<Command
					size={14}
					strokeWidth={1.8}
					className="text-[var(--p-text-muted)]"
				/>
				<span className="voice-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-text-muted)]">
					Commands
				</span>
			</div>
			<div ref={scrollRef} className="max-h-[280px] overflow-y-auto p-1.5">
				{commands.map((command, index) => {
					const active = index === activeIndex
					return (
						<button
							key={command.name}
							ref={(element) => {
								commandRefs.current[index] = element
							}}
							type="button"
							role="option"
							aria-selected={active}
							onMouseDown={(event) => {
								event.preventDefault()
								onSelect(command)
							}}
							className={`grid w-full grid-cols-1 gap-1 rounded-lg px-3 py-2.5 text-start ${
								active ? 'bg-[var(--p-hover)]' : 'hover:bg-[var(--p-hover)]'
							}`}
						>
							<span className="min-w-0">
								<span className="flex min-w-0 items-baseline gap-2">
									<span className="truncate text-[13px] font-semibold text-[var(--p-text)] sm:text-[14px]">
										{command.title}
									</span>
									<span className="voice-mono shrink-0 text-[11px] font-light text-[var(--p-text-faint)]">
										{command.name}
									</span>
								</span>
								<span className="mt-1 block text-[12px] leading-4 text-[var(--p-text-muted)]">
									{command.description}
								</span>
							</span>
						</button>
					)
				})}
			</div>
		</motion.div>
	)
}

function VoiceOrb({
	amplitude,
	transcript,
	isAr,
	hint,
	onDismiss,
	onSend,
}: {
	amplitude: number
	transcript: string
	isAr: boolean
	hint: string
	onDismiss: () => void
	onSend: () => void
}) {
	// Soft amplitude — so the orb breathes naturally even when silent.
	const a = Math.max(0, Math.min(1, amplitude))
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.5 }}
			className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
			style={{ background: 'rgba(0,0,0,0.96)' }}
			onClick={onDismiss}
		>
			<div
				aria-hidden
				className="absolute h-[min(112vw,520px)] w-[min(112vw,520px)] rounded-full"
				style={{
					background: `radial-gradient(circle, rgba(255,255,255,${0.08 + a * 0.08}) 0%, rgba(255,255,255,${0.025 + a * 0.04}) 34%, transparent 70%)`,
					filter: 'blur(34px)',
				}}
			/>

			<motion.div
				aria-hidden
				className="absolute rounded-full"
				animate={{
					scale: 1 + a * 0.16,
					opacity: 0.28 + a * 0.22,
				}}
				transition={{ type: 'spring', stiffness: 180, damping: 22 }}
				style={{
					width: 'clamp(132px, 38vw, 220px)',
					height: 'clamp(132px, 38vw, 220px)',
					background:
						'radial-gradient(circle, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.04) 52%, transparent 82%)',
					filter: 'blur(18px)',
				}}
			/>

			<motion.div
				aria-hidden
				className="absolute rounded-full"
				animate={{
					scale: 1 + a * 0.22,
					opacity: 0.5 + a * 0.25,
				}}
				transition={{ type: 'spring', stiffness: 220, damping: 20 }}
				style={{
					width: 'clamp(88px, 24vw, 130px)',
					height: 'clamp(88px, 24vw, 130px)',
					background:
						'radial-gradient(circle, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.07) 55%, transparent 85%)',
					filter: 'blur(10px)',
				}}
			/>

			<motion.div
				className="relative rounded-full"
				animate={{
					scale: 1 + a * 0.12,
				}}
				transition={{ type: 'spring', stiffness: 280, damping: 18 }}
				style={{
					width: 'clamp(64px, 17vw, 92px)',
					height: 'clamp(64px, 17vw, 92px)',
					background: `radial-gradient(circle at 36% 30%, rgba(255,255,255,${0.55 + a * 0.25}) 0%, rgba(255,255,255,${0.22 + a * 0.18}) 28%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.02) 85%, transparent 100%)`,
					boxShadow: `0 0 ${54 + a * 72}px ${12 + a * 24}px rgba(255,255,255,${0.07 + a * 0.1}), inset 0 0 ${24 + a * 22}px rgba(255,255,255,${0.1 + a * 0.14}), 0 0 ${10 + a * 14}px ${2 + a * 5}px rgba(255,255,255,${0.16 + a * 0.16})`,
					border: `1px solid rgba(255,255,255,${0.18 + a * 0.18})`,
					overflow: 'hidden',
				}}
			>
				<div
					className="pointer-events-none absolute rounded-full"
					style={{
						width: '46%',
						height: '28%',
						top: '12%',
						left: '18%',
						background:
							'radial-gradient(ellipse, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.12) 40%, transparent 75%)',
						filter: 'blur(4px)',
					}}
				/>
			</motion.div>

			<div className="absolute inset-x-0 bottom-20 flex justify-center px-5 sm:bottom-28 sm:px-8">
				<AnimatePresence mode="wait">
					{transcript ? (
						<motion.div
							key="transcript"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0, y: -4, filter: 'blur(4px)' }}
							transition={{ duration: 0.3 }}
							dir={isAr ? 'rtl' : 'ltr'}
							className={`voice-mono max-w-[560px] text-center text-[15px] leading-[1.85] text-[var(--p-text)] ${
								isAr ? 'voice-serif-ar text-[17px]' : ''
							}`}
							style={{
								maskImage:
									'linear-gradient(180deg, transparent 0%, white 25%, white 100%)',
								WebkitMaskImage:
									'linear-gradient(180deg, transparent 0%, white 25%, white 100%)',
								maxHeight: '140px',
								overflow: 'hidden',
								display: 'flex',
								flexWrap: 'wrap',
								justifyContent: 'center',
								alignContent: 'flex-end',
								textShadow: `0 0 ${8 + amplitude * 20}px rgba(255,255,255,${0.1 + amplitude * 0.2})`,
							}}
						>
							{(() => {
								const words = transcript.split(' ')
								let offset = 0
								return words.map((word, i, arr) => {
									const fromEnd = arr.length - 1 - i
									const isRecent = fromEnd < 3
									const keyPos = offset
									offset += word.length + 1
									return (
										<motion.span
											key={`${keyPos}-${word}`}
											initial={{
												opacity: 0,
												y: 10,
												filter: 'blur(8px)',
											}}
											animate={{
												opacity: isRecent ? 0.75 + amplitude * 0.3 : 0.55,
												y: 0,
												filter: 'blur(0px)',
												textShadow: isRecent
													? `0 0 ${12 + amplitude * 16}px rgba(255,255,255,${0.25 + amplitude * 0.3})`
													: '0 0 0px transparent',
											}}
											transition={{
												opacity: { duration: 0.5 },
												y: { duration: 0.4, ease: SMOOTH_EASE },
												filter: { duration: 0.5 },
												textShadow: { duration: 0.6 },
											}}
											className="inline-block"
											style={{ marginInlineEnd: '0.3em' }}
										>
											{word}
										</motion.span>
									)
								})
							})()}
						</motion.div>
					) : (
						<motion.p
							key="hint"
							initial={{ opacity: 0, y: 4 }}
							animate={{ opacity: 0.4, y: 0 }}
							exit={{ opacity: 0 }}
							transition={{ delay: 1, duration: 0.5 }}
							className="office-meta text-center text-[11px] text-[var(--p-text-muted)]"
						>
							{hint}
						</motion.p>
					)}
				</AnimatePresence>
			</div>

			{/* Send — quiet command when transcript is present */}
			<AnimatePresence>
				{transcript && (
					<motion.button
						type="button"
						initial={{ opacity: 0, y: 4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.25 }}
						onClick={(e) => {
							e.stopPropagation()
							onSend()
						}}
						className="office-command absolute bottom-12"
					>
						{isAr ? 'إرسال' : 'Send'}
					</motion.button>
				)}
			</AnimatePresence>
		</motion.div>
	)
}
