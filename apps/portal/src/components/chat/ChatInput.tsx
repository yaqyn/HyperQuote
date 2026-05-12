/**
 * ChatInput — the Writing Line.
 *
 * A single ruled line at the bottom of the ledger. Labeled at the margin
 * ("WRITE TO LYON" / "اكتب إلى ليون"). Typing appears as mono ink on
 * the page. Enter sends, Shift+Enter = newline. Tiny margin glyphs for
 * mic + send — no backgrounds, no pills.
 *
 * Voice overlay (full-screen listening orb with live transcript) is
 * preserved, palette-tuned to atelier warm tones.
 */

import { ArrowUp, Mic, Square } from 'lucide-react'
import { AnimatePresence, cubicBezier, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { usePortalChat } from '../../hooks/usePortalChat'

const SMOOTH_EASE = cubicBezier(0.22, 1, 0.36, 1)

const MAX_LINES = 6
const LINE_HEIGHT = 22

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
	hasMessages: boolean
}

export function ChatInput({ chat, hasMessages: _hasMessages }: ChatInputProps) {
	const { t, i18n } = useTranslation('portal')
	const isAr = i18n.language === 'ar'
	const [value, setValue] = useState('')
	const [listening, setListening] = useState(false)
	const [pulse, setPulse] = useState(0)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const ruleRef = useRef<HTMLDivElement>(null)
	const analyserRef = useRef<AnalyserNode | null>(null)
	const streamRef = useRef<MediaStream | null>(null)
	const audioCtxRef = useRef<AudioContext | null>(null)
	const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
	const rafRef = useRef<number>(0)
	const [amplitude, setAmplitude] = useState(0)
	const [transcript, setTranscript] = useState('')
	const transcriptRef = useRef('')
	const accumulatedRef = useRef('')

	function autoResize(ta: HTMLTextAreaElement) {
		ta.style.height = 'auto'
		const maxHeight = LINE_HEIGHT * MAX_LINES + 8
		ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`
		ta.style.overflowY = ta.scrollHeight > maxHeight ? 'auto' : 'hidden'
	}

	const handleSubmit = useCallback(() => {
		if (!value.trim() || chat.isLoading) return
		chat.sendMessage(value.trim())
		setValue('')
		setPulse((p) => p + 1)
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto'
		}
		requestAnimationFrame(() => {
			const inputs =
				document.querySelectorAll<HTMLTextAreaElement>('[data-chat-input]')
			inputs[inputs.length - 1]?.focus()
		})
	}, [value, chat])

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				handleSubmit()
			}
		},
		[handleSubmit],
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
								chat.sendMessage(combined)
								setValue('')
							}
							stopListening(true)
						}}
					/>
				)}
			</AnimatePresence>

			{/* The Writing Line */}
			<div className="grid gap-2 sm:flex sm:items-end sm:gap-4">
				{/* Margin label */}
				<span className="office-meta w-full select-none leading-none sm:w-[60px] sm:shrink-0 sm:pb-2">
					{isAr ? 'اكتب' : 'Write'}
				</span>

				{/* Ruled input */}
				<div className="relative flex-1">
					<div className="flex items-end gap-3">
						<textarea
							ref={textareaRef}
							data-chat-input
							value={value}
							onChange={(e) => {
								setValue(e.target.value)
								autoResize(e.target)
							}}
							onKeyDown={handleKeyDown}
							rows={1}
							placeholder={t('chat.writingPlaceholder', isAr ? '…' : '…')}
							aria-label={t('a11y.sendMessage')}
							aria-multiline="true"
							spellCheck={false}
							dir="auto"
							className="voice-mono min-h-10 flex-1 resize-none bg-transparent pb-2 pt-2 text-[16px] text-[var(--p-text)] outline-none placeholder:text-[var(--p-text-faint)] sm:min-h-0 sm:pt-0 sm:text-[14px]"
							style={{
								height: `${LINE_HEIGHT + 4}px`,
								lineHeight: `${LINE_HEIGHT}px`,
								overflowY: 'hidden',
							}}
						/>

						{/* Margin glyphs — right side */}
						<div className="flex shrink-0 items-center gap-1 pb-1 sm:pb-2">
							<button
								type="button"
								onClick={startListening}
								className="flex h-10 w-10 items-center justify-center text-[var(--p-text-muted)] transition-colors hover:text-[var(--p-text)] sm:h-6 sm:w-6"
								aria-label={t('a11y.voiceInput')}
							>
								<Mic size={14} strokeWidth={1.5} />
							</button>
							{chat.isLoading ? (
								<button
									type="button"
									onClick={() => chat.stop()}
									className="flex h-10 w-10 items-center justify-center text-[var(--p-text-muted)] transition-colors hover:text-[var(--p-text)] sm:h-6 sm:w-6"
									aria-label={t('a11y.stopGenerating')}
								>
									<Square size={11} strokeWidth={1.8} />
								</button>
							) : (
								<button
									type="button"
									onClick={handleSubmit}
									disabled={!hasText}
									className="flex h-10 w-10 items-center justify-center text-[var(--p-text-muted)] transition-colors enabled:hover:text-[var(--p-text)] disabled:opacity-40 sm:h-6 sm:w-6"
									aria-label={t('a11y.sendMessage')}
								>
									<ArrowUp size={14} strokeWidth={1.8} />
								</button>
							)}
						</div>
					</div>

					{/* Ruled underline — pulses on submit */}
					<div
						key={pulse}
						ref={ruleRef}
						className={`h-px w-full bg-[var(--p-rule-strong)] ${pulse ? 'office-ink-pulse' : ''}`}
					/>
				</div>
			</div>
		</>
	)
}

// ============================================================================
// VoiceOrb — the listening overlay (palette-tuned atelier version)
// ============================================================================

const MOTE_SLOTS = ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'] as const
const ECHO_SLOTS = ['e0', 'e1', 'e2'] as const

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
			{/* Ambient field — single deep glow that drifts */}
			<motion.div
				animate={{ rotate: 360 }}
				transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
				className="absolute h-[760px] w-[760px]"
				style={{
					background: `conic-gradient(from 0deg, transparent, rgba(255,255,255,${0.018 + a * 0.025}), transparent 40%, transparent 60%, rgba(255,255,255,${0.012 + a * 0.018}), transparent)`,
					filter: 'blur(80px)',
				}}
			/>

			{/* Continuous echo rings — radio waves emanating outward */}
			{ECHO_SLOTS.map((slot, i) => (
				<motion.div
					key={slot}
					aria-hidden
					className="absolute rounded-full border"
					style={{
						width: 110,
						height: 110,
						borderColor: `rgba(255,255,255,${0.12 + a * 0.18})`,
					}}
					initial={{ scale: 1, opacity: 0 }}
					animate={{
						scale: [1, 1.4, 5.5],
						opacity: [0, 0.45, 0],
					}}
					transition={{
						duration: 4.4,
						repeat: Infinity,
						ease: 'easeOut',
						times: [0, 0.08, 1],
						delay: i * (4.4 / 3),
					}}
				/>
			))}

			{/* Outer breath — slow exhale */}
			<motion.div
				aria-hidden
				className="absolute rounded-full"
				animate={{
					scale: [1, 1.06, 1],
					opacity: [0.18, 0.28, 0.18],
				}}
				transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
				style={{
					width: 360,
					height: 360,
					background:
						'radial-gradient(circle, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 45%, transparent 75%)',
					filter: 'blur(28px)',
				}}
			/>

			{/* Mid breath — slightly faster, offset, amplitude-reactive */}
			<motion.div
				aria-hidden
				className="absolute rounded-full"
				animate={{
					scale: [1 + a * 0.2, 1.08 + a * 0.25, 1 + a * 0.2],
					opacity: [0.25 + a * 0.2, 0.4 + a * 0.25, 0.25 + a * 0.2],
				}}
				transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
				style={{
					width: 220,
					height: 220,
					background:
						'radial-gradient(circle, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 50%, transparent 80%)',
					filter: 'blur(16px)',
				}}
			/>

			{/* Inner breath — fastest, brightest */}
			<motion.div
				aria-hidden
				className="absolute rounded-full"
				animate={{
					scale: [1 + a * 0.35, 1.12 + a * 0.4, 1 + a * 0.35],
					opacity: [0.45 + a * 0.25, 0.6 + a * 0.3, 0.45 + a * 0.25],
				}}
				transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
				style={{
					width: 130,
					height: 130,
					background:
						'radial-gradient(circle, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.07) 55%, transparent 85%)',
					filter: 'blur(10px)',
				}}
			/>

			{/* Core sphere — the soul. Internal counter-rotating swirls give the
			    sense of light moving inside the entity. */}
			<motion.div
				className="relative rounded-full"
				animate={{
					scale: 1 + a * 0.18,
				}}
				transition={{ type: 'spring', stiffness: 280, damping: 18 }}
				style={{
					width: 96,
					height: 96,
					background: `radial-gradient(circle at 36% 30%, rgba(255,255,255,${0.55 + a * 0.25}) 0%, rgba(255,255,255,${0.22 + a * 0.18}) 28%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.02) 85%, transparent 100%)`,
					boxShadow: `0 0 ${80 + a * 120}px ${20 + a * 40}px rgba(255,255,255,${0.08 + a * 0.12}), inset 0 0 ${30 + a * 30}px rgba(255,255,255,${0.1 + a * 0.15}), 0 0 ${12 + a * 18}px ${3 + a * 6}px rgba(255,255,255,${0.18 + a * 0.18})`,
					border: `1px solid rgba(255,255,255,${0.18 + a * 0.18})`,
					overflow: 'hidden',
				}}
			>
				{/* Internal swirl A — soft caustic that rotates clockwise */}
				<motion.div
					aria-hidden
					className="absolute inset-0"
					animate={{ rotate: 360 }}
					transition={{ duration: 11, repeat: Infinity, ease: 'linear' }}
					style={{
						background: `conic-gradient(from 0deg, transparent, rgba(255,255,255,${0.18 + a * 0.18}) 25%, transparent 50%, rgba(255,255,255,${0.1 + a * 0.1}) 75%, transparent)`,
						mixBlendMode: 'screen',
						filter: 'blur(8px)',
					}}
				/>
				{/* Internal swirl B — counter-rotating, different phase */}
				<motion.div
					aria-hidden
					className="absolute inset-0"
					animate={{ rotate: -360 }}
					transition={{ duration: 17, repeat: Infinity, ease: 'linear' }}
					style={{
						background: `conic-gradient(from 200deg, transparent, rgba(255,255,255,${0.14 + a * 0.14}) 40%, transparent 70%)`,
						mixBlendMode: 'screen',
						filter: 'blur(10px)',
					}}
				/>
				{/* Specular highlight — the "wet" glint that suggests a real surface */}
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

			{/* Orbiting motes — slow elegant orbit, drift toward core on spike */}
			{MOTE_SLOTS.map((slot, i) => {
				const baseAngle = (i / MOTE_SLOTS.length) * 360
				const baseRadius = 78 + (i % 3) * 22
				const dur = 22 + (i % 4) * 6
				return (
					<motion.div
						key={slot}
						aria-hidden
						className="absolute"
						style={{
							top: '50%',
							left: '50%',
							width: 0,
							height: 0,
						}}
						animate={{ rotate: 360 }}
						transition={{
							duration: dur,
							repeat: Infinity,
							ease: 'linear',
							delay: i * 0.35,
						}}
					>
						<motion.span
							className="absolute block rounded-full"
							animate={{
								opacity: [0.18, 0.35 + a * 0.3, 0.18],
								scale: [1, 1 + a * 0.5, 1],
							}}
							transition={{
								duration: 2.6 + (i % 3) * 0.4,
								repeat: Infinity,
								ease: 'easeInOut',
							}}
							style={{
								width: 2 + (i % 3),
								height: 2 + (i % 3),
								top: -1,
								left: baseRadius - a * 18,
								transform: `rotate(${baseAngle}deg)`,
								background: 'rgba(255,255,255,0.85)',
								boxShadow: '0 0 6px rgba(255,255,255,0.6)',
								filter: 'blur(0.4px)',
							}}
						/>
					</motion.div>
				)
			})}

			{/* Transcript */}
			<div className="absolute inset-x-0 bottom-28 flex justify-center px-8">
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
