import { useTranslation } from 'react-i18next'

interface ValidityCountdownProps {
  validUntil: string
  daysRemaining: number
}

export function ValidityCountdown({
  validUntil,
  daysRemaining,
}: ValidityCountdownProps) {
  const { t } = useTranslation('portal')

  if (daysRemaining < 0) {
    return (
      <span className="text-[var(--color-error)] font-mono text-sm font-semibold">
        {t('quoteDetail.expired')}
      </span>
    )
  }

  if (daysRemaining === 0) {
    return (
      <span className="text-[var(--color-warning)] font-mono text-sm font-semibold">
        {t('quoteDetail.expiresToday')}
      </span>
    )
  }

  if (daysRemaining <= 3) {
    return (
      <span className="text-[var(--color-warning)] font-mono text-sm font-semibold">
        {t('quoteDetail.daysRemaining', { count: daysRemaining })}
      </span>
    )
  }

  return (
    <span className="text-[var(--color-text-muted)] font-mono text-sm">
      {t('quoteDetail.daysRemaining', { count: daysRemaining })}
    </span>
  )
}
