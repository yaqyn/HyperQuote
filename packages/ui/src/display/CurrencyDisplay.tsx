import { useTranslation } from 'react-i18next'
import { formatCurrency } from '@hyperquote/i18n'

interface CurrencyDisplayProps {
  value: number
  currency?: string
}

export function CurrencyDisplay({ value, currency = 'EGP' }: CurrencyDisplayProps) {
  const { i18n } = useTranslation()
  const locale = i18n.language === 'ar' ? 'ar' : 'en'
  const formatted = formatCurrency(value, locale)

  return <span className="font-mono">{formatted}</span>
}
