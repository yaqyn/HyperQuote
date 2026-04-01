import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, ArrowUp } from 'lucide-react'

const PLACEHOLDER_KEYS = [
  'chat.placeholder1',
  'chat.placeholder2',
  'chat.placeholder3',
  'chat.placeholder4',
] as const

const ROTATION_INTERVAL = 8000

export function AIChatInput() {
  const { t } = useTranslation('portal')
  const [value, setValue] = useState('')
  const [activePlaceholder, setActivePlaceholder] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  const handleSubmit = useCallback(() => {
    if (!value.trim()) return
    // Phase 8 wires actual AI streaming
    setValue('')
  }, [value])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  const hasText = value.trim().length > 0

  return (
    <div className="w-full max-w-[640px] px-4 mt-6">
      <div
        className={`relative flex items-center h-14 rounded-2xl border bg-[var(--color-card)] shadow-sm transition-all duration-200 ${
          isFocused
            ? 'border-[var(--color-primary)] shadow-[0_0_0_3px_rgba(37,99,235,0.1)]'
            : 'border-[var(--color-border)]'
        }`}
        style={isFocused ? { borderWidth: '1.5px' } : undefined}
      >
        {/* Sparkles icon */}
        <div className="flex items-center justify-center ps-5 shrink-0">
          <Sparkles
            size={20}
            className="text-[var(--color-primary)] opacity-50"
          />
        </div>

        {/* Input with placeholder crossfade */}
        <div className="relative flex-1 mx-3">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            aria-label={t('chat.placeholder1')}
            className="relative z-10 w-full bg-transparent text-[var(--text-base)] text-[var(--color-text)] outline-none placeholder:text-transparent"
          />

          {/* Crossfade placeholders -- absolutely positioned behind input */}
          {!value && (
            <div className="pointer-events-none absolute inset-0 flex items-center">
              {PLACEHOLDER_KEYS.map((key, index) => (
                <span
                  key={key}
                  className="absolute text-[var(--text-base)] text-[var(--color-text-muted)] transition-opacity duration-500"
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

        {/* Send button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!hasText}
          className="flex items-center justify-center w-10 h-10 me-2 rounded-full bg-[var(--color-primary)] transition-opacity duration-200 shrink-0"
          style={{ opacity: hasText ? 1 : 0.3 }}
          aria-label="Send"
        >
          <ArrowUp size={20} className="text-white" />
        </button>
      </div>
    </div>
  )
}
