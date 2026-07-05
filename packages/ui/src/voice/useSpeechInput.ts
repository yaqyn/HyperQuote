import { useCallback, useEffect, useRef, useState } from 'react'

const SPEECH_LANGUAGES = ['en-US', 'ar-EG'] as const
const SPEECH_LANGUAGE_PROBE_MS = 2400
const ARABIC_TRANSLITERATED_ENGLISH = new Set(['هاي', 'هلو', 'هيلو', 'باي'])
const LATIN_TRANSLITERATED_ARABIC = new Set([
	'ahlan',
	'ahlann',
	'marhaba',
	'salam',
	'salaam',
])

type SpeechLanguage = (typeof SPEECH_LANGUAGES)[number]

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

function preferredSpeechLanguage(locale?: string): SpeechLanguage {
	return locale?.startsWith('ar') ? 'ar-EG' : 'en-US'
}

function alternateSpeechLanguage(language: SpeechLanguage): SpeechLanguage {
	return language === 'ar-EG' ? 'en-US' : 'ar-EG'
}

function speechLanguageForTranscript(text: string): SpeechLanguage | null {
	if (/\p{Script=Arabic}/u.test(text)) return 'ar-EG'
	if (/[A-Za-z]/.test(text)) return 'en-US'
	return null
}

function normalizedSpeechText(text: string) {
	return text
		.toLowerCase()
		.replace(/[^\p{Script=Arabic}a-z\s]/gu, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

export function shouldRetryAlternateSpeechLanguage(
	text: string,
	language: SpeechLanguage,
) {
	const normalized = normalizedSpeechText(text)
	if (!normalized || normalized.includes(' ')) return false
	if (language === 'ar-EG') {
		return ARABIC_TRANSLITERATED_ENGLISH.has(normalized)
	}
	return LATIN_TRANSLITERATED_ARABIC.has(normalized)
}

function speechRecognitionCtor() {
	if (typeof window === 'undefined') return null
	const windowWithSpeech = window as unknown as {
		SpeechRecognition?: new () => SpeechRecognitionLike
		webkitSpeechRecognition?: new () => SpeechRecognitionLike
	}
	return (
		windowWithSpeech.SpeechRecognition ??
		windowWithSpeech.webkitSpeechRecognition
	)
}

export function useSpeechInput({
	locale,
	onTranscript,
}: {
	locale?: string
	onTranscript: (text: string) => void
}) {
	const [isSupported, setIsSupported] = useState(false)
	const [isListening, setIsListening] = useState(false)
	const [transcript, setTranscript] = useState('')
	const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
	const listeningRef = useRef(false)
	const accumulatedRef = useRef('')
	const transcriptRef = useRef('')
	const languageRef = useRef<SpeechLanguage>(preferredSpeechLanguage(locale))
	const probeTimerRef = useRef<number | null>(null)

	useEffect(() => {
		setIsSupported(Boolean(speechRecognitionCtor()))
	}, [])

	useEffect(() => {
		languageRef.current = preferredSpeechLanguage(locale)
	}, [locale])

	const stop = useCallback(() => {
		listeningRef.current = false
		setIsListening(false)
		if (probeTimerRef.current !== null) {
			window.clearTimeout(probeTimerRef.current)
			probeTimerRef.current = null
		}
		recognitionRef.current?.stop()
		recognitionRef.current = null
	}, [])

	const start = useCallback(() => {
		const SpeechRecognitionCtor = speechRecognitionCtor()
		if (!SpeechRecognitionCtor) return
		const RecognitionCtor = SpeechRecognitionCtor

		accumulatedRef.current = ''
		transcriptRef.current = ''
		setTranscript('')
		setIsListening(true)
		listeningRef.current = true

		let lastFinalIndex = 0
		const retriedLanguages = new Set<SpeechLanguage>()

		function clearProbe() {
			if (probeTimerRef.current === null) return
			window.clearTimeout(probeTimerRef.current)
			probeTimerRef.current = null
		}

		function startRecognition(language: SpeechLanguage) {
			const recognition = new RecognitionCtor()
			recognition.continuous = true
			recognition.interimResults = true
			recognition.lang = language
			languageRef.current = language

			recognition.onresult = (event) => {
				let interim = ''
				for (
					let index = lastFinalIndex;
					index < event.results.length;
					index++
				) {
					const result = event.results[index]
					if (result.isFinal) {
						accumulatedRef.current =
							`${accumulatedRef.current} ${result[0].transcript}`.trim()
						lastFinalIndex = index + 1
					} else {
						interim += result[0].transcript
					}
				}
				const text = (
					accumulatedRef.current + (interim ? ` ${interim}` : '')
				).trim()
				if (
					shouldRetryAlternateSpeechLanguage(text, languageRef.current) &&
					!retriedLanguages.has(languageRef.current)
				) {
					retriedLanguages.add(languageRef.current)
					accumulatedRef.current = ''
					transcriptRef.current = ''
					setTranscript('')
					switchLanguage(alternateSpeechLanguage(languageRef.current))
					return
				}
				transcriptRef.current = text
				setTranscript(text)
				onTranscript(text)
				const detectedLanguage = speechLanguageForTranscript(text)
				if (detectedLanguage) languageRef.current = detectedLanguage
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
				/* keep listening; browsers recover through onend */
			}
			recognitionRef.current = recognition
			recognition.start()
		}

		function switchLanguage(language: SpeechLanguage) {
			const current = recognitionRef.current
			recognitionRef.current = null
			current?.stop()
			lastFinalIndex = 0
			startRecognition(language)
		}

		function scheduleProbe() {
			clearProbe()
			probeTimerRef.current = window.setTimeout(() => {
				if (!listeningRef.current || transcriptRef.current.trim()) return
				switchLanguage(alternateSpeechLanguage(languageRef.current))
				scheduleProbe()
			}, SPEECH_LANGUAGE_PROBE_MS)
		}

		startRecognition(languageRef.current)
		scheduleProbe()
	}, [onTranscript])

	useEffect(() => stop, [stop])

	return {
		isListening,
		isSupported,
		start,
		stop,
		transcript,
	}
}
