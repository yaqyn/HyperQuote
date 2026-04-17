import { formatCurrency } from '@hyperquote/i18n'
import { useTranslation } from 'react-i18next'

interface CurrencyDisplayProps {
	value: number
}

export function CurrencyDisplay({ value }: CurrencyDisplayProps) {
	const { i18n } = useTranslation()
	const locale = i18n.language === 'ar' ? 'ar' : 'en'
	const formatted = formatCurrency(value, locale)

	return <span className="font-mono">{formatted}</span>
}
