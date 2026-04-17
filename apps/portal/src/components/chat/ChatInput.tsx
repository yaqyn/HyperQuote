/**
 * ChatInput — Rounded dark input bar with mic + send.
 * Mic activates a full-screen listening sphere.
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

export function ChatInput({ chat, hasMessages }: ChatInputProps) {
	const { t, i18n } = useTranslation('portal')
	const isAr = i18n.language === 'ar'
	const [value, setValue] = useState('')
	const [listening, setListening] = useState(false)
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

	const autoResize = useCallback(() => {
		const ta = textareaRef.current
		if (!ta) return
		ta.style.height = 'auto'
		const maxHeight = LINE_HEIGHT * MAX_LINES + 16
		ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`
		ta.style.overflowY = ta.scrollHeight > maxHeight ? 'auto' : 'hidden'
	}, [])

	useEffect(() => {
		autoResize()
	}, [autoResize])

	const handleSubmit = useCallback(() => {
		if (!value.trim() || chat.isLoading) return
		chat.sendMessage(value.trim())
		setValue('')
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
		// Start speech recognition first
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
				// Only process new final results we haven't seen
				for (let i = lastFinalIndex; i < event.results.length; i++) {
					const result = event.results[i]
					if (result.isFinal) {
						accumulatedRef.current = (
							accumulatedRef.current +
							' ' +
							result[0].transcript
						).trim()
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
				// Restart if still listening (browser auto-stops after silence)
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

			// Audio analyser for visual feedback — use the mic stream SpeechRecognition opened
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
			// Permission denied or no mic/speech support
		}
	}

	function stopListening(skipCommit = false) {
		cancelAnimationFrame(rafRef.current)

		// Stop recognition
		if (recognitionRef.current) {
			recognitionRef.current.stop()
			recognitionRef.current = null
		}
		// Commit transcript to input only if not already sent
		if (!skipCommit) {
			const finalText = transcriptRef.current.trim()
			if (finalText) {
				setValue((prev) => (prev ? `${prev} ${finalText}` : finalText))
			}
		}

		// Cleanup audio
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

	// Cleanup on unmount
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
			{/* Listening overlay — full screen living sphere */}
			<AnimatePresence>
				{listening && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.4 }}
						className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
						style={{ background: 'rgba(6,6,6,0.97)' }}
						onClick={() => stopListening()}
					>
						{/* Slow rotating ambient nebula — dual layer */}
						<motion.div
							animate={{ rotate: 360 }}
							transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
							className="absolute w-[600px] h-[600px]"
							style={{
								background: `conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,${0.015 + amplitude * 0.025}) 20%, transparent 40%, rgba(255,255,255,${0.01 + amplitude * 0.02}) 60%, transparent 80%, rgba(255,255,255,${0.008 + amplitude * 0.015}) 95%, transparent 100%)`,
								filter: 'blur(60px)',
							}}
						/>
						<motion.div
							animate={{ rotate: -360 }}
							transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
							className="absolute w-[450px] h-[450px]"
							style={{
								background: `conic-gradient(from 120deg, transparent 0%, rgba(255,255,255,${0.01 + amplitude * 0.02}) 15%, transparent 35%, rgba(255,255,255,${0.008 + amplitude * 0.015}) 55%, transparent 75%, rgba(255,255,255,${0.01 + amplitude * 0.02}) 90%, transparent 100%)`,
								filter: 'blur(50px)',
							}}
						/>

						{/* Soft ambient glow — no hard edges */}
						<motion.div
							animate={{
								scale: 1 + amplitude * 0.6,
								opacity: 0.06 + amplitude * 0.1,
							}}
							transition={{ duration: 0.1, ease: 'easeOut' }}
							className="absolute w-96 h-96 rounded-full"
							style={{
								background:
									'radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 40%, transparent 70%)',
								filter: 'blur(20px)',
							}}
						/>

						{/* Mid atmosphere */}
						<motion.div
							animate={{
								scale: 1 + amplitude * 0.4,
								opacity: 0.08 + amplitude * 0.15,
							}}
							transition={{ duration: 0.08, ease: 'easeOut' }}
							className="absolute w-60 h-60 rounded-full"
							style={{
								background:
									'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 50%, transparent 75%)',
								filter: 'blur(12px)',
							}}
						/>

						{/* Inner halo */}
						<motion.div
							animate={{
								scale: 1 + amplitude * 0.3,
								opacity: 0.12 + amplitude * 0.2,
							}}
							transition={{ duration: 0.06, ease: 'easeOut' }}
							className="absolute w-40 h-40 rounded-full"
							style={{
								background:
									'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 50%, transparent 80%)',
								filter: 'blur(8px)',
							}}
						/>

						{/* Core sphere — the creature */}
						<motion.div
							animate={{
								scale: 1 + amplitude * 0.2,
								filter: `blur(${amplitude > 0.4 ? 0.5 : 0}px) brightness(${1 + amplitude * 0.3})`,
							}}
							transition={{ duration: 0.04 }}
							className="relative w-24 h-24 rounded-full"
							style={{
								background: `radial-gradient(circle at 38% 32%, rgba(255,255,255,${0.3 + amplitude * 0.2}) 0%, rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.05) 55%, rgba(255,255,255,0.02) 80%, transparent 100%)`,
								boxShadow: `0 0 ${60 + amplitude * 100}px ${15 + amplitude * 40}px rgba(255,255,255,${0.05 + amplitude * 0.08}), inset 0 0 ${25 + amplitude * 35}px rgba(255,255,255,${0.06 + amplitude * 0.12}), 0 0 ${10 + amplitude * 15}px ${2 + amplitude * 5}px rgba(255,255,255,${0.1 + amplitude * 0.15})`,
								border: `1px solid rgba(255,255,255,${0.1 + amplitude * 0.12})`,
							}}
						>
							{/* Primary specular — top left crescent */}
							<div
								className="absolute rounded-full"
								style={{
									width: '40%',
									height: '25%',
									top: '12%',
									left: '15%',
									background:
										'radial-gradient(ellipse, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.1) 40%, transparent 70%)',
									filter: 'blur(4px)',
								}}
							/>
							{/* Secondary specular — bottom edge catch */}
							<motion.div
								animate={{
									opacity: [0.05, 0.1 + amplitude * 0.15, 0.05],
								}}
								transition={{
									duration: 3,
									repeat: Infinity,
									ease: 'easeInOut',
								}}
								className="absolute rounded-full"
								style={{
									width: '50%',
									height: '20%',
									bottom: '10%',
									right: '15%',
									background:
										'radial-gradient(ellipse, rgba(255,255,255,0.2) 0%, transparent 70%)',
									filter: 'blur(3px)',
								}}
							/>
							{/* Breathing inner glow */}
							<motion.div
								animate={{
									opacity: [0.03, 0.08 + amplitude * 0.1, 0.03],
									scale: [0.95, 1.05, 0.95],
								}}
								transition={{
									duration: 4,
									repeat: Infinity,
									ease: 'easeInOut',
								}}
								className="absolute inset-0 rounded-full"
								style={{
									background:
										'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 60%)',
								}}
							/>
						</motion.div>

						{/* Occasional flash/shine — random bright pulse */}
						<motion.div
							animate={{
								opacity: [0, 0, 0, amplitude > 0.5 ? 0.15 : 0, 0],
								scale: [1, 1, 1, 1.3, 1],
							}}
							transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
							className="absolute w-28 h-28 rounded-full pointer-events-none"
							style={{
								background:
									'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 60%)',
								filter: 'blur(10px)',
							}}
						/>

						{/* Floating particles — more, varied sizes, smoother orbits */}
						{[...Array(12)].map((_, i) => {
							const angle = (i / 12) * Math.PI * 2
							const radius = 55 + (i % 3) * 20
							const size = 1.5 + (i % 4) * 0.5
							return (
								<motion.div
									key={`dot-${angle}-${radius}-${size}`}
									animate={{
										y: [0, -6 - (i % 4) * 3, 2, 0],
										x: [0, (i % 2 === 0 ? 3 : -3) * (1 + amplitude * 0.8), 0],
										opacity: [0.06, 0.15 + amplitude * 0.25, 0.08, 0.06],
										scale: [1, 1 + amplitude * 0.4, 0.9, 1],
									}}
									transition={{
										duration: 3 + (i % 5) * 0.6,
										repeat: Infinity,
										ease: 'easeInOut',
										delay: i * 0.25,
									}}
									className="absolute rounded-full"
									style={{
										width: size,
										height: size,
										background: `rgba(255,255,255,${0.3 + (i % 3) * 0.1})`,
										filter: 'blur(0.5px)',
										top: `calc(50% + ${Math.sin(angle) * radius}px)`,
										left: `calc(50% + ${Math.cos(angle) * radius}px)`,
									}}
								/>
							)
						})}

						{/* Live transcript */}
						<div className="absolute bottom-28 inset-x-0 flex justify-center px-8">
							<AnimatePresence mode="wait">
								{transcript ? (
									<motion.div
										key="transcript"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0, y: -4, filter: 'blur(4px)' }}
										transition={{ duration: 0.3 }}
										dir={isAr ? 'rtl' : 'ltr'}
										className="text-[15px] text-center max-w-[480px] leading-[1.8]"
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
															opacity: isRecent ? 0.7 + amplitude * 0.3 : 0.5,
															y: 0,
															filter: 'blur(0px)',
															textShadow: isRecent
																? `0 0 ${12 + amplitude * 16}px rgba(255,255,255,${0.3 + amplitude * 0.3})`
																: '0 0 0px transparent',
														}}
														transition={{
															opacity: { duration: 0.5 },
															y: {
																duration: 0.4,
																ease: SMOOTH_EASE,
															},
															filter: { duration: 0.5 },
															textShadow: { duration: 0.6 },
														}}
														className="inline-block text-[var(--p-text)]"
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
										animate={{ opacity: 0.3, y: 0 }}
										exit={{ opacity: 0 }}
										transition={{ delay: 1, duration: 0.5 }}
										className="text-[13px] text-[var(--p-text-muted)] text-center"
									>
										{t('a11y.voiceInput')}
									</motion.p>
								)}
							</AnimatePresence>
						</div>

						{/* Send button — appears when there's a transcript */}
						<AnimatePresence>
							{transcript && (
								<motion.button
									type="button"
									initial={{ opacity: 0, scale: 0.9 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.9 }}
									transition={{ duration: 0.25 }}
									onClick={(e) => {
										e.stopPropagation()
										const voice = transcriptRef.current.trim()
										const existing = value.trim()
										const combined = [existing, voice].filter(Boolean).join(' ')
										if (combined) {
											chat.sendMessage(combined)
											setValue('')
										}
										stopListening(true)
									}}
									className="absolute bottom-12 w-11 h-11 rounded-full flex items-center justify-center hover:brightness-125 transition-all"
									style={{
										background:
											'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%)',
										backdropFilter: 'blur(16px)',
										WebkitBackdropFilter: 'blur(16px)',
										border: '1px solid rgba(255,255,255,0.1)',
										boxShadow:
											'inset 0 1px 0 rgba(255,255,255,0.12), 0 2px 12px rgba(0,0,0,0.3)',
									}}
								>
									<ArrowUp
										size={16}
										strokeWidth={2}
										className="text-[var(--p-text)]"
									/>
								</motion.button>
							)}
						</AnimatePresence>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Normal input bar */}
			<div
				className={`relative bg-[var(--p-input)] border border-[var(--p-border)] focus-within:border-[var(--p-border-strong)] transition-all ${(hasText && value.includes('\n')) || value.length > 80 ? 'rounded-2xl' : 'rounded-full'}`}
			>
				<div className="flex items-end gap-2 pe-2 ps-5 py-1.5">
					<textarea
						ref={textareaRef}
						data-chat-input
						value={value}
						onChange={(e) => setValue(e.target.value)}
						onKeyDown={handleKeyDown}
						rows={1}
						placeholder={t(
							hasMessages ? 'chat.placeholder1' : 'chat.emptyPlaceholder',
						)}
						aria-label={t('a11y.sendMessage')}
						aria-multiline="true"
						spellCheck={false}
						dir={isAr ? 'rtl' : 'ltr'}
						className="flex-1 bg-transparent text-[14px] text-[var(--p-text)] outline-none resize-none leading-[22px] placeholder:text-[var(--p-text-muted)] py-2"
						style={{
							height: `${LINE_HEIGHT + 16}px`,
							overflowY: 'hidden',
						}}
					/>

					{/* Mic */}
					<button
						type="button"
						onClick={startListening}
						className="flex items-center justify-center w-9 h-9 shrink-0 rounded-full hover:bg-[var(--p-hover)] transition-colors"
						aria-label={t('a11y.voiceInput')}
					>
						<Mic
							size={17}
							strokeWidth={1.5}
							className="text-[var(--p-text-muted)]"
						/>
					</button>

					{/* Send / Stop */}
					<AnimatePresence mode="wait">
						{chat.isLoading ? (
							<motion.button
								key="stop"
								type="button"
								onClick={() => chat.stop()}
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.8 }}
								transition={{ duration: 0.12 }}
								className="flex items-center justify-center w-9 h-9 shrink-0 rounded-full bg-[var(--p-elevated)] hover:bg-[var(--p-card)] transition-colors"
								aria-label={t('a11y.stopGenerating')}
							>
								<Square size={12} className="text-[var(--p-text)]" />
							</motion.button>
						) : (
							<motion.button
								key="send"
								type="button"
								onClick={handleSubmit}
								disabled={!hasText}
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.8 }}
								transition={{ duration: 0.12 }}
								className={`flex items-center justify-center w-9 h-9 shrink-0 rounded-full transition-colors ${
									hasText
										? 'bg-[var(--p-text)] hover:bg-white'
										: 'bg-[var(--p-elevated)]'
								}`}
								aria-label={t('a11y.sendMessage')}
							>
								<ArrowUp
									size={16}
									strokeWidth={2}
									className={
										hasText
											? 'text-[var(--p-bg)]'
											: 'text-[var(--p-text-muted)]'
									}
								/>
							</motion.button>
						)}
					</AnimatePresence>
				</div>
			</div>
		</>
	)
}
