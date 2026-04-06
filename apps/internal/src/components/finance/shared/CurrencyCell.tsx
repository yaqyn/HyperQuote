import { useTranslation } from 'react-i18next'

interface CurrencyCellProps {
  amount: number
  className?: string
}

/**
 * Renders EGP amounts with Geist Mono, right-aligned.
 * Uses Intl.NumberFormat for Arabic-Indic numerals in Arabic locale.
 * Prefix "EGP" in English, suffix "ج.م" in Arabic.
 */
export function CurrencyCell({ amount, className = '' }: CurrencyCellProps) {
  const { i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'

  const formatted = new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-EG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)

  return (
    <span
      className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-end inline-block ${className}`}
    >
      {isArabic ? (
        <>
          {formatted} ج.م
        </>
      ) : (
        <>
          EGP {formatted}
        </>
      )}
    </span>
  )
}
