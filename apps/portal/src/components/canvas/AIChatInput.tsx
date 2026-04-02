/**
 * AIChatInput -- Underline-style textarea with subtle send button.
 * Wired to usePortalChat() for streaming. Rate limit tracking at 25/30 msg/min.
 * Enter sends, Shift+Enter inserts newline. Auto-expand to max 6 lines.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUp, Square, AlertTriangle } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { usePortalChat } from '../../hooks/usePortalChat'
import { useSlashCommands } from '../../hooks/useSlashCommands'
import { SlashCommandPalette } from '../chat/SlashCommandPalette'

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
const LINE_HEIGHT = 22
const BASE_HEIGHT = 56

// ============================================================================
// Component
// ============================================================================

export function AIChatInput() {
  const { t } = useTranslation('portal')
  const chat = usePortalChat()

  const [value, setValue] = useState('')
  const [activePlaceholder, setActivePlaceholder] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Slash command integration
  const slash = useSlashCommands(value)

  // Rate limiting state
  const timestampsRef = useRef<number[]>([])
  const [rateWarning, setRateWarning] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    const maxHeight = LINE_HEIGHT * MAX_LINES + 12
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`
    ta.style.overflowY = ta.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [])

  useEffect(() => {
    autoResize()
  }, [value, autoResize])

  // Rate limit check
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
      setValue(slash.selectCommand(cmd as import('../../lib/chat-types').SlashCommand))
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
      // Slash palette keyboard navigation
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

  const hasText = value.trim().length > 0

  return (
    <div className="w-full max-w-[640px] px-4 mt-8">
      {/* Rate limit warning */}
      {rateWarning && (
        <div className="flex items-center gap-1.5 mb-3 px-1">
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

      {/* Underline input */}
      <div className="relative">
        {/* Slash command palette */}
        <AnimatePresence>
          {slash.isActive && slash.filteredCommands.length > 0 && (
            <SlashCommandPalette
              commands={slash.filteredCommands}
              selectedIndex={slash.selectedIndex}
              onSelect={handleSlashSelect}
              onClose={handleSlashClose}
              onHover={slash.setSelectedIndex}
            />
          )}
        </AnimatePresence>

        <div className="flex items-end gap-3">
          {/* Textarea with placeholder crossfade */}
          <div className="relative flex-1">
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
              className="relative z-10 w-full bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-transparent resize-none leading-[22px] pb-2 border-b border-[var(--color-text)]/15 focus:border-[var(--color-primary)] transition-colors duration-200"
              style={{ height: `${LINE_HEIGHT}px`, overflowY: 'hidden' }}
            />

            {/* Crossfade placeholders */}
            {!value && (
              <div className="pointer-events-none absolute inset-0 flex items-start">
                {PLACEHOLDER_KEYS.map((key, index) => (
                  <span
                    key={key}
                    className="absolute text-sm text-[var(--color-text-muted)]/50 transition-opacity duration-500 leading-[22px]"
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

          {/* Send / Stop button */}
          {chat.isLoading ? (
            <button
              type="button"
              onClick={handleStop}
              className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 mb-0.5 transition-colors duration-150 bg-[var(--color-text)]/10"
              aria-label={t('a11y.stopGenerating')}
            >
              <Square size={12} className="text-[var(--color-text)]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!hasText || rateLimited}
              className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 mb-0.5 bg-[#0F172A] dark:bg-[#FAFAFA] transition-opacity duration-200"
              style={{ opacity: hasText && !rateLimited ? 1 : 0.2 }}
              aria-label={t('a11y.sendMessage')}
            >
              <ArrowUp size={14} className="text-white dark:text-[#09090B]" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
