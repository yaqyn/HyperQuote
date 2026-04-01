/**
 * AIChatInput -- Multi-line textarea with send/stop, file attach, mic, sparkles, history buttons.
 * Wired to usePortalChat() for streaming. Rate limit tracking at 25/30 msg/min.
 * Enter sends, Shift+Enter inserts newline. Auto-expand to max 6 lines.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  ArrowUp,
  Square,
  Paperclip,
  Mic,
  History,
  AlertTriangle,
} from 'lucide-react'
import { usePortalChat } from '../../hooks/usePortalChat'
import { useChatStore } from '../../stores/chat'

// ============================================================================
// Constants
// ============================================================================

const PLACEHOLDER_KEYS = [
  'chat.placeholder1',
  'chat.placeholder2',
  'chat.placeholder3',
  'chat.placeholder4',
] as const

const ROTATION_INTERVAL = 8000
const RATE_WARN_THRESHOLD = 25
const RATE_LIMIT_THRESHOLD = 30
const RATE_WINDOW_MS = 60_000
const MAX_LINES = 6
const LINE_HEIGHT = 22 // approximate px per line
const BASE_HEIGHT = 56

// ============================================================================
// Component
// ============================================================================

export function AIChatInput() {
  const { t } = useTranslation('portal')
  const chat = usePortalChat()
  const setHistoryOpen = useChatStore((s) => s.setHistoryOpen)

  const [value, setValue] = useState('')
  const [activePlaceholder, setActivePlaceholder] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Rate limiting state
  const timestampsRef = useRef<number[]>([])
  const [rateWarning, setRateWarning] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Feature detection for voice
  const [hasSpeechAPI] = useState(
    () =>
      typeof window !== 'undefined' &&
      !!(
        (window as unknown as Record<string, unknown>).SpeechRecognition ||
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition
      ),
  )

  // Rotate placeholders every 8s, stop when focused
  useEffect(() => {
    if (isFocused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      setActivePlaceholder((prev) => (prev + 1) % PLACEHOLDER_KEYS.length)
    }, ROTATION_INTERVAL)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isFocused])

  // Cleanup cooldown interval
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    const maxHeight = LINE_HEIGHT * MAX_LINES + 12 // padding
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`
    ta.style.overflowY = ta.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [])

  useEffect(() => {
    autoResize()
  }, [value, autoResize])

  // Rate limit check
  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now()
    // Prune old timestamps
    timestampsRef.current = timestampsRef.current.filter(
      (ts) => now - ts < RATE_WINDOW_MS,
    )
    const count = timestampsRef.current.length

    if (count >= RATE_LIMIT_THRESHOLD) {
      setRateLimited(true)
      setRateWarning(true)
      // Start cooldown
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
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, chat, rateLimited, checkRateLimit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  const handleStop = useCallback(() => {
    chat.stop()
  }, [chat])

  const handleFileAttach = useCallback(() => {
    // Placeholder -- real R2 upload deferred
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,.pdf,.csv,.xlsx'
    input.onchange = () => {
      // Toast "File upload coming soon" -- minimal implementation
      console.info('[AIChatInput] File upload coming soon')
    }
    input.click()
  }, [])

  const handleMic = useCallback(() => {
    // Placeholder -- real voice input deferred
    console.info('[AIChatInput] Voice input coming soon')
  }, [])

  const hasText = value.trim().length > 0

  return (
    <div className="w-full max-w-[640px] px-4 mt-6">
      {/* Rate limit warning */}
      {rateWarning && (
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <AlertTriangle size={14} className="text-[var(--color-warning)] shrink-0" />
          <span className="text-xs text-[var(--color-warning)]">
            {t('chat.rateWarning')}
            {rateLimited && cooldownSeconds > 0 && (
              <span className="font-[family-name:var(--font-geist-mono)] ms-1">
                {cooldownSeconds}s
              </span>
            )}
          </span>
        </div>
      )}

      {/* History button above input */}
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-[var(--color-primary)]/5 transition-colors"
          aria-label={t('a11y.chatHistory')}
        >
          <History size={20} className="text-[var(--color-text-muted)]" />
        </button>
      </div>

      {/* Main input container */}
      <div
        className={`relative flex items-end rounded-2xl border bg-[var(--color-card)] shadow-sm transition-all duration-200 ${
          isFocused
            ? 'border-[var(--color-primary)] shadow-[0_0_0_3px_rgba(37,99,235,0.1)]'
            : 'border-[var(--color-border)]'
        }`}
        style={isFocused ? { borderWidth: '1.5px' } : undefined}
      >
        {/* Sparkles icon */}
        <div className="flex items-center justify-center ps-5 pb-4 shrink-0">
          <Sparkles
            size={20}
            className="text-[var(--color-primary)] opacity-50"
          />
        </div>

        {/* Textarea with placeholder crossfade */}
        <div className="relative flex-1 mx-3 py-4">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            rows={1}
            aria-label={t('a11y.sendMessage')}
            aria-multiline="true"
            disabled={rateLimited}
            className="relative z-10 w-full bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-transparent resize-none leading-[22px]"
            style={{ height: `${LINE_HEIGHT}px`, overflowY: 'hidden' }}
          />

          {/* Crossfade placeholders */}
          {!value && (
            <div className="pointer-events-none absolute inset-0 flex items-start py-0">
              {PLACEHOLDER_KEYS.map((key, index) => (
                <span
                  key={key}
                  className="absolute text-sm text-[var(--color-text-muted)] transition-opacity duration-500 leading-[22px]"
                  style={{
                    opacity: activePlaceholder === index ? 1 : 0,
                  }}
                >
                  {t(key)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Paperclip (file attach) button */}
        <button
          type="button"
          onClick={handleFileAttach}
          className="flex items-center justify-center w-11 h-11 shrink-0 pb-0.5"
          aria-label={t('a11y.attachFile')}
        >
          <Paperclip size={20} className="text-[var(--color-text-muted)]" />
        </button>

        {/* Mic button (hidden if unsupported) */}
        {hasSpeechAPI && (
          <button
            type="button"
            onClick={handleMic}
            className="flex items-center justify-center w-11 h-11 shrink-0 pb-0.5"
            aria-label={t('a11y.voiceInput')}
          >
            <Mic size={20} className="text-[var(--color-text-muted)]" />
          </button>
        )}

        {/* Send / Stop button */}
        {chat.isLoading ? (
          <button
            type="button"
            onClick={handleStop}
            className="flex items-center justify-center w-10 h-10 me-2 mb-2 rounded-full shrink-0 transition-colors duration-150"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-error) 20%, transparent)',
            }}
            aria-label={t('a11y.stopGenerating')}
          >
            <Square size={16} className="text-[var(--color-error)]" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!hasText || rateLimited}
            className="flex items-center justify-center w-10 h-10 me-2 mb-2 rounded-full bg-[var(--color-primary)] transition-opacity duration-200 shrink-0"
            style={{ opacity: hasText && !rateLimited ? 1 : 0.3 }}
            aria-label={t('a11y.sendMessage')}
          >
            <ArrowUp size={20} className="text-white" />
          </button>
        )}
      </div>
    </div>
  )
}
