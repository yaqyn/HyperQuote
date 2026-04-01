/**
 * TypingIndicator -- 3-dot CSS bounce animation with i18n text.
 * CSS keyframes only (NOT Motion) per UI-SPEC.
 * 4px dots, 4px gap, 600ms cycle, 200ms stagger.
 */
import { useTranslation } from 'react-i18next'

const dotStyle = `
@keyframes hq-typing-bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-4px); }
}
`

export function TypingIndicator() {
  const { t } = useTranslation('portal')

  return (
    <div className="flex items-center gap-2 me-auto">
      <style dangerouslySetInnerHTML={{ __html: dotStyle }} />
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-1 h-1 rounded-full bg-[var(--color-text-muted)]"
            style={{
              animation: 'hq-typing-bounce 600ms infinite',
              animationDelay: `${i * 200}ms`,
            }}
          />
        ))}
      </div>
      <span className="text-xs font-normal text-[var(--color-text-muted)]">
        {t('chat.typing')}
      </span>
    </div>
  )
}
