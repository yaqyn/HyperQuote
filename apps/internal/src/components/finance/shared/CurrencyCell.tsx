import { useTranslation } from 'react-i18next'

interface CurrencyCellProps {
  amount: number
  className?: string
  /** Render prefix in subdued text */
  subtle?: boolean
}

/**
 * Renders EGP amounts with Geist Mono, right-aligned.
 * Uses Intl.NumberFormat for Arabic-Indic numerals in Arabic locale.
 * Prefix "EGP" in English, suffix "ج.م" in Arabic.
 */
export function CurrencyCell({ amount, className = '', subtle = false }: CurrencyCellProps) {
  const { i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'

  const formatted = new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-EG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)

  return (
    <span
      className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-end inline-flex items-baseline gap-1 ${className}`}
    >
      {isArabic ? (
        <>
          {formatted}
          <span className={subtle ? 'text-[0.7em] text-black/30 dark:text-white/30' : ''}>ج.م</span>
        </>
      ) : (
        <>
          <span className={subtle ? 'text-[0.7em] text-black/30 dark:text-white/30' : ''}>EGP</span>
          {formatted}
        </>
      )}
    </span>
  )
}
