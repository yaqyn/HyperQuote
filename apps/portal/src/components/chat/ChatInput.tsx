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
const SPEECH_LANGUAGES = ['en-US', 'ar-EG'] as const
const SPEECH_LANGUAGE_PROBE_MS = 2600

type SpeechLanguage = (typeof SPEECH_LANGUAGES)[number]

function autoResizeChatTextarea(ta: HTMLTextAreaElement) {
	ta.style.height = 'auto'
	const maxHeight = LINE_HEIGHT * MAX_LINES + 8
	ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`
	ta.style.overflowY = ta.scrollHeight > maxHeight ? 'auto' : 'hidden'
}

function preferredSpeechLanguage(isAr: boolean): SpeechLanguage {
	return isAr ? 'ar-EG' : 'en-US'
}

function alternateSpeechLanguage(language: SpeechLanguage): SpeechLanguage {
	return language === 'ar-EG' ? 'en-US' : 'ar-EG'
}

function speechLanguageForTranscript(text: string): SpeechLanguage | null {
	if (/\p{Script=Arabic}/u.test(text)) return 'ar-EG'
	if (/[A-Za-z]/.test(text)) return 'en-US'
	return null
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
	const listeningRef = useRef(false)
	const speechLanguageRef = useRef<SpeechLanguage>(
		preferredSpeechLanguage(isAr),
	)
	const speechSwitchTimerRef = useRef<number | null>(null)
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
			const detail = (event as CustomEvent<{ command?: string; run?: boolean }>)
				.detail
			const commandText = detail?.command?.trim()
			if (!commandText) return
			const parsed = parsePortalChatCommand(commandText)
			if (!parsed) return

			if (
				portalChatCommandInputMode(parsed.name) === 'prefill' &&
				detail.run !== true
			) {
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
		const SpeechRecognitionCtor = SR

		try {
			let lastFinalIndex = 0
			function clearSpeechProbe() {
				if (speechSwitchTimerRef.current === null) return
				window.clearTimeout(speechSwitchTimerRef.current)
				speechSwitchTimerRef.current = null
			}
			function startRecognition(language: SpeechLanguage) {
				const recognition = new SpeechRecognitionCtor()
				recognition.continuous = true
				recognition.interimResults = true
				recognition.lang = language
				speechLanguageRef.current = language

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
					const detectedLanguage = speechLanguageForTranscript(text)
					if (detectedLanguage) speechLanguageRef.current = detectedLanguage
				}

				recognition.onend = () => {
					if (!listeningRef.current || recognitionRef.current !== recognition) {
						return
					}
					try {
						recognition.start()
					} catch {
						/* already running */
					}
				}
				recognition.onerror = () => {
					/* keep the overlay alive; browser engines retry through onend */
				}
				recognitionRef.current = recognition
				recognition.start()
			}
			function switchSpeechLanguage(language: SpeechLanguage) {
				const current = recognitionRef.current
				recognitionRef.current = null
				current?.stop()
				startRecognition(language)
			}
			function scheduleLanguageProbe() {
				clearSpeechProbe()
				speechSwitchTimerRef.current = window.setTimeout(() => {
					if (!listeningRef.current || transcriptRef.current.trim()) return
					switchSpeechLanguage(
						alternateSpeechLanguage(speechLanguageRef.current),
					)
					scheduleLanguageProbe()
				}, SPEECH_LANGUAGE_PROBE_MS)
			}

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

			listeningRef.current = true
			setListening(true)
			setTranscript('')
			accumulatedRef.current = ''
			transcriptRef.current = ''
			startRecognition(preferredSpeechLanguage(isAr))
			scheduleLanguageProbe()
		} catch {
			/* permission denied / unsupported */
		}
	}

	function stopListening(skipCommit = false) {
		cancelAnimationFrame(rafRef.current)
		listeningRef.current = false
		if (speechSwitchTimerRef.current !== null) {
			window.clearTimeout(speechSwitchTimerRef.current)
			speechSwitchTimerRef.current = null
		}
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
			listeningRef.current = false
			if (speechSwitchTimerRef.current !== null) {
				window.clearTimeout(speechSwitchTimerRef.current)
			}
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
	const a = Math.max(0, Math.min(1, amplitude))
	const status = isAr ? 'ليون يسمعك' : 'Lyon is listening'
	const subtitle = isAr
		? 'تكلّم بطبيعتك. سأحوّلها إلى رسالة واضحة.'
		: 'Speak naturally. I will turn it into a clean message.'
	const cancelLabel = isAr ? 'إلغاء' : 'Cancel'
	const sendLabel = isAr ? 'إرسال إلى ليون' : 'Send to Lyon'
	const waitingText = isAr ? 'ابدأ بالكلام...' : 'Start speaking...'
	const bars = Array.from({ length: 28 }, (_, index) => {
		const phase = Math.sin(index * 0.72)
		return {
			height: 18 + Math.abs(phase) * 28 + a * (34 + (index % 5) * 5),
			id: `voice-bar-${index}`,
			index,
		}
	})

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.28 }}
			className="fixed inset-0 z-50 flex items-stretch justify-stretch overflow-hidden sm:items-center sm:justify-center sm:px-8 sm:py-6"
			style={{
				background:
					'linear-gradient(135deg, color-mix(in srgb, var(--p-bg) 92%, transparent), color-mix(in srgb, var(--p-surface) 88%, transparent))',
				backdropFilter: 'blur(24px) saturate(1.25)',
			}}
			onClick={onDismiss}
		>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0"
				style={{
					background: `radial-gradient(circle at 50% 36%, color-mix(in srgb, var(--p-accent) ${18 + a * 18}%, transparent) 0%, transparent 34%), radial-gradient(circle at 16% 82%, color-mix(in srgb, var(--p-text) 9%, transparent) 0%, transparent 28%), radial-gradient(circle at 84% 18%, color-mix(in srgb, var(--p-accent) 12%, transparent) 0%, transparent 24%)`,
				}}
			/>
			<motion.div
				initial={{ opacity: 0, y: 18, scale: 0.98 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				exit={{ opacity: 0, y: 10, scale: 0.98 }}
				transition={{ duration: 0.35, ease: SMOOTH_EASE }}
				onClick={(event) => event.stopPropagation()}
				dir={isAr ? 'rtl' : 'ltr'}
				className="relative flex min-h-full w-full flex-col overflow-hidden border-[var(--p-border-strong)] bg-[color-mix(in_srgb,var(--p-card)_86%,transparent)] p-5 shadow-[var(--p-panel-shadow)] backdrop-blur-2xl sm:min-h-0 sm:max-w-[760px] sm:rounded-[2rem] sm:border sm:p-6"
			>
				<div
					aria-hidden
					className="pointer-events-none absolute inset-x-6 top-0 h-px"
					style={{
						background:
							'linear-gradient(90deg, transparent, var(--p-border-hint), transparent)',
						opacity: 0.45 + a * 0.35,
					}}
				/>

				<header className="flex shrink-0 items-start justify-between gap-4 pt-[calc(env(safe-area-inset-top)+0.25rem)] sm:pt-0">
					<div className="min-w-0">
						<p className="voice-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--p-text-muted)]">
							{hint}
						</p>
						<h2 className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-[var(--p-text)] sm:text-[38px]">
							{status}
						</h2>
						<p className="mt-2 max-w-[300px] text-[13px] leading-5 text-[var(--p-text-muted)] sm:max-w-[460px] sm:text-[14px]">
							{subtitle}
						</p>
					</div>
					<button
						type="button"
						onClick={onDismiss}
						className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--p-border)] bg-[var(--p-bg)] text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
					>
						<span className="sr-only">{cancelLabel}</span>
						<span aria-hidden className="text-[18px] leading-none">
							×
						</span>
					</button>
				</header>

				<div className="flex min-h-0 flex-1 flex-col justify-center gap-6 py-8 sm:mt-8 sm:grid sm:flex-none sm:grid-cols-1 sm:py-0 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-center">
					<div className="relative mx-auto flex h-[210px] w-[210px] items-center justify-center sm:h-[280px] sm:w-[280px]">
						<motion.div
							aria-hidden
							className="absolute inset-0 rounded-full"
							animate={{
								opacity: 0.22 + a * 0.26,
								scale: 0.96 + a * 0.18,
							}}
							transition={{ type: 'spring', stiffness: 180, damping: 22 }}
							style={{
								background:
									'radial-gradient(circle, color-mix(in srgb, var(--p-accent) 36%, transparent) 0%, transparent 66%)',
								filter: 'blur(18px)',
							}}
						/>
						<motion.div
							aria-hidden
							className="absolute h-[78%] w-[78%] rounded-full border border-[var(--p-border)]"
							animate={{
								rotate: 360,
								scale: 1 + a * 0.08,
							}}
							transition={{
								rotate: { duration: 18, ease: 'linear', repeat: Infinity },
								scale: { type: 'spring', stiffness: 180, damping: 20 },
							}}
							style={{
								background:
									'conic-gradient(from 120deg, transparent, color-mix(in srgb, var(--p-accent) 48%, transparent), transparent 42%)',
								maskImage:
									'radial-gradient(circle, transparent 57%, black 58%, black 64%, transparent 65%)',
								WebkitMaskImage:
									'radial-gradient(circle, transparent 57%, black 58%, black 64%, transparent 65%)',
								opacity: 0.48 + a * 0.3,
							}}
						/>
						<motion.div
							className="relative flex h-[122px] w-[122px] items-center justify-center rounded-full border border-[var(--p-border-strong)] bg-[var(--p-bg)] shadow-[0_24px_80px_color-mix(in_srgb,var(--p-accent)_18%,transparent)] sm:h-[150px] sm:w-[150px]"
							animate={{ scale: 1 + a * 0.08 }}
							transition={{ type: 'spring', stiffness: 260, damping: 20 }}
						>
							<div
								aria-hidden
								className="absolute inset-3 rounded-full"
								style={{
									background:
										'radial-gradient(circle at 34% 28%, color-mix(in srgb, var(--p-accent) 42%, white 18%) 0%, color-mix(in srgb, var(--p-accent) 18%, transparent) 38%, transparent 72%)',
									opacity: 0.72 + a * 0.22,
								}}
							/>
							<Mic
								size={32}
								strokeWidth={1.5}
								className="relative text-[var(--p-text)]"
							/>
						</motion.div>
					</div>

					<div className="min-w-0">
						<div className="hidden h-20 items-end gap-1.5 rounded-2xl border border-[var(--p-border)] bg-[var(--p-bg)] px-3 py-4 sm:flex">
							{bars.map((bar) => (
								<motion.span
									key={bar.id}
									aria-hidden
									className="flex-1 rounded-full bg-[var(--p-text)]"
									animate={{
										height: bar.height,
										opacity: 0.18 + a * 0.58 + (bar.index % 3) * 0.04,
									}}
									transition={{ type: 'spring', stiffness: 220, damping: 22 }}
								/>
							))}
						</div>

						<div className="min-h-[154px] rounded-2xl border border-[var(--p-border)] bg-[var(--p-input)] p-4 sm:mt-4 sm:min-h-[148px] sm:p-5">
							<AnimatePresence mode="wait">
								{transcript ? (
									<motion.p
										key="transcript"
										initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
										animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
										exit={{ opacity: 0, y: -6, filter: 'blur(6px)' }}
										transition={{ duration: 0.24 }}
										className={`max-h-[160px] overflow-hidden text-[18px] leading-8 text-[var(--p-text)] sm:text-[22px] sm:leading-9 ${
											isAr ? 'voice-serif-ar' : 'voice-serif'
										}`}
									>
										{transcript}
									</motion.p>
								) : (
									<motion.div
										key="waiting"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										className="flex h-[112px] items-center justify-center text-center"
									>
										<p className="voice-mono text-[11px] uppercase tracking-[0.22em] text-[var(--p-text-faint)]">
											{waitingText}
										</p>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					</div>
				</div>

				<footer className="flex shrink-0 flex-col-reverse gap-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] sm:mt-6 sm:flex-row sm:justify-end sm:pb-0">
					<button
						type="button"
						onClick={onDismiss}
						className="min-h-11 rounded-xl border border-[var(--p-border)] px-4 text-[13px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)]"
					>
						{cancelLabel}
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation()
							onSend()
						}}
						disabled={!transcript}
						className="min-h-11 rounded-xl bg-[var(--p-accent)] px-5 text-[13px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
					>
						{sendLabel}
					</button>
				</footer>
			</motion.div>
		</motion.div>
	)
}
