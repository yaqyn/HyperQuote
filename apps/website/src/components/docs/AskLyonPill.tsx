import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useChatWidget } from '../../hooks/useChatWidget'

interface AskLyonPillProps {
  context: string
  className?: string
}

export function AskLyonPill({ context, className = '' }: AskLyonPillProps) {
  const { t } = useTranslation('website')
  const openWithMessage = useChatWidget((s) => s.openWithMessage)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    function check() {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    }
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => obs.disconnect()
  }, [])

  const handleClick = useCallback(() => {
    openWithMessage(context)
  }, [context, openWithMessage])

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium border border-[var(--color-text)]/[0.1] rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)]/[0.2] transition-colors ${className}`}
    >
      <img
        src={isDark ? '/LyonWhite.svg' : '/LyonBlack.svg'}
        alt=""
        className="h-3 w-auto"
      />
      {t('docs.askLyon', { defaultValue: 'Ask Lyon' })}
    </button>
  )
}
