import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { ArrowUp, Paperclip } from 'lucide-react'
import type { Conversation } from '../../types/customer-service'

interface ResponseComposerProps {
  conversation: Conversation
}

export function ResponseComposer({ conversation }: ResponseComposerProps) {
  const { t } = useTranslation('customer-service')
  const [content, setContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [content],
  )

  function handleSend() {
    if (!content.trim()) return
    setContent('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  const hasContent = content.trim().length > 0

  return (
    <div className="shrink-0 px-5 py-3">
      <div className="relative rounded-xl border border-black/[0.08] dark:border-white/[0.08] focus-within:border-[var(--color-primary)]/30 transition-colors">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={t('composer.placeholder')}
          rows={1}
          className="w-full resize-none text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] px-4 pt-3 pb-10 outline-none bg-transparent leading-relaxed"
        />

        {/* Bottom bar — inside the container */}
        <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-2.5 py-2">
          <Button
            aria-label={t('composer.attach')}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <Paperclip size={14} strokeWidth={1.5} />
          </Button>

          <Button
            onPress={handleSend}
            isDisabled={!hasContent}
            aria-label={t('composer.send')}
            className={`
              flex items-center justify-center w-7 h-7 rounded-full transition-all cursor-default
              ${hasContent
                ? 'text-[var(--color-primary)] !cursor-pointer'
                : 'text-[var(--color-text-subtle)]'
              }
            `}
          >
            <ArrowUp size={14} strokeWidth={2} />
          </Button>
        </div>
      </div>
    </div>
  )
}
