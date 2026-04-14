/**
 * Compact ETA display for delivery tracking.
 * Shows ETA in Geist Mono 14px and last updated in 11px.
 */
import { useTranslation } from 'react-i18next'

interface ETADisplayProps {
  eta: string
  lastUpdated: string
}

export function ETADisplay({ eta, lastUpdated }: ETADisplayProps) {
  const { t } = useTranslation('portal')

  const formattedLastUpdated = new Date(lastUpdated).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="flex items-baseline gap-3 px-4 py-2">
      <span className="font-mono text-sm font-medium text-[var(--color-text)]">
        {t('tracking.eta', { time: eta })}
      </span>
      <span className="font-mono text-[13px] text-[var(--color-text-subtle)]">
        {t('tracking.lastUpdated', { time: formattedLastUpdated })}
      </span>
    </div>
  )
}
