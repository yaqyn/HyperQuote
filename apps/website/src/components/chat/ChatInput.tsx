import { useState, useCallback } from 'react'
import { TextField, TextArea } from 'react-aria-components'
import { Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ChatInputProps {
  onSend: (content: string) => Promise<void>
  isLoading: boolean
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const { t } = useTranslation('website')
  const [value, setValue] = useState('')

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim()
    if (!trimmed || isLoading) return
    setValue('')
    await onSend(trimmed)
  }, [value, isLoading, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  const hasText = value.trim().length > 0

  return (
    <div className="flex items-end gap-2 border-t border-[var(--color-border)] px-4 py-3">
      <TextField
        aria-label={t('chat.inputPlaceholder')}
        className="flex-1"
        value={value}
        onChange={setValue}
      >
        <TextArea
          placeholder={t('chat.inputPlaceholder')}
          rows={1}
          className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[#2563EB] min-h-[36px] max-h-[120px] md:min-h-[36px] min-h-[56px]"
          onKeyDown={handleKeyDown}
        />
      </TextField>
      <button
        type="button"
        disabled={!hasText || isLoading}
        onClick={handleSubmit}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
          hasText && !isLoading
            ? 'bg-[#2563EB] text-white cursor-pointer hover:bg-[#1d4ed8]'
            : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] cursor-not-allowed'
        }`}
        aria-label="Send"
      >
        <Send className="h-4 w-4 rtl:rotate-180" />
      </button>
    </div>
  )
}
