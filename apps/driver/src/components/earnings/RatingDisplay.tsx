import { useTranslation } from 'react-i18next'

interface RatingDisplayProps {
  rating: number
  totalJobs: number
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      className={filled ? 'text-[var(--color-blue)]' : 'text-[var(--border-color)]'}
    >
      <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.49L10 14.26 5.06 16.7 6 11.21l-4-3.9 5.53-.8L10 1.5z" />
    </svg>
  )
}

export function RatingDisplay({ rating, totalJobs }: RatingDisplayProps) {
  const { t, i18n } = useTranslation('driver')
  const locale = i18n.language

  const formatNum = (num: number): string => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG').format(num)
  }

  const formatRating = (num: number): string => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(num)
  }

  return (
    <div className="flex flex-col items-center gap-2 py-3">
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon key={star} filled={star <= Math.round(rating)} />
          ))}
        </div>
        <span className="font-[var(--font-mono)] text-xl font-medium">
          {formatRating(rating)}
        </span>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">
        {t('earnings.totalJobs', 'Total jobs:')}{' '}
        <span className="font-[var(--font-mono)]">{formatNum(totalJobs)}</span>
      </p>
      <p className="text-xs text-[var(--text-tertiary)]">
        {t('earnings.ratingInfo', 'Higher ratings = more job offers')}
      </p>
    </div>
  )
}
