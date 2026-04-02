import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useChatWidget } from '../../hooks/useChatWidget'

interface AskLyonPillProps {
  context: string
  className?: string
}

export function AskLyonPill({ context, className = '' }: AskLyonPillProps) {
  const { t } = useTranslation('website')
  const openWithMessage = useChatWidget((s) => s.openWithMessage)

  const handleClick = useCallback(() => {
    openWithMessage(context)
  }, [context, openWithMessage])

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium border border-[var(--color-text)]/[0.1] rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)]/[0.2] transition-colors ${className}`}
    >
      {t('docs.askLyon', { defaultValue: 'Ask Lyon' })}
    </button>
  )
}
