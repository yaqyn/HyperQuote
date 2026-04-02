/**
 * AIChatInput -- Centered underline input. Send appears only when typing.
 * Wired to usePortalChat() for streaming. Rate limit at 30 msg/min.
 * Enter sends, Shift+Enter newline. Auto-expand to max 6 lines.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Square, AlertTriangle } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { usePortalChat } from '../../hooks/usePortalChat'
import { useSlashCommands } from '../../hooks/useSlashCommands'
import { SlashCommandPalette } from '../chat/SlashCommandPalette'

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

interface AIChatInputProps {
  chat?: ReturnType<typeof usePortalChat>
}

export function AIChatInput({ chat: chatProp }: AIChatInputProps = {}) {
  const { t } = useTranslation('portal')
  const ownChat = usePortalChat()
  const chat = chatProp ?? ownChat

  const [value, setValue] = useState('')
  const [activePlaceholder, setActivePlaceholder] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const slash = useSlashCommands(value)

  const timestampsRef = useRef<number[]>([])
  const [rateWarning, setRateWarning] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Rotate placeholders
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
  }, [value, autoResize])

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
    console.log('[AIChatInput] submit:', { value: value.trim(), isLoading: chat.isLoading, rateLimited, hasSendMessage: typeof chat.sendMessage })
    if (!value.trim() || chat.isLoading || rateLimited) return
    if (!checkRateLimit()) return
    console.log('[AIChatInput] calling sendMessage with:', value.trim())
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
    <div className="w-full max-w-[520px] px-4 mt-8">
      {/* Rate limit warning */}
      {rateWarning && (
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <AlertTriangle size={12} className="text-[var(--color-warning)] shrink-0" />
          <span className="text-[10px] text-[var(--color-warning)]">
            {t('chat.rateWarning')}
            {rateLimited && cooldownSeconds > 0 && (
              <span className="font-mono ms-1">{cooldownSeconds}s</span>
            )}
          </span>
        </div>
      )}

      {/* Input area */}
      <div className="relative">
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

        <div className="flex items-end gap-2">
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
              className="relative z-10 w-full bg-transparent text-sm text-[var(--color-text)] text-center outline-none placeholder:text-transparent resize-none leading-[22px] pb-2 border-b border-[var(--color-border)] focus:border-[var(--color-primary)] transition-colors duration-200"
              style={{ height: `${LINE_HEIGHT}px`, overflowY: 'hidden', textAlign: hasText || isFocused ? 'start' : 'center' }}
            />

            {/* Centered crossfade placeholder */}
            {!value && (
              <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
                {PLACEHOLDER_KEYS.map((key, index) => (
                  <span
                    key={key}
                    className="absolute text-sm text-[var(--color-text-subtle)] transition-opacity duration-700 leading-[22px]"
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

          {/* Send / Stop — only visible when there's text or loading */}
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
                {/* Minimal arrow — pure SVG, thin stroke */}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[var(--color-text)]">
                  <path d="M7 12V2M7 2L3 6M7 2L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.button>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
