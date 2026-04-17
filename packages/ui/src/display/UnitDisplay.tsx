import { formatNumber, type UnitKey } from '@hyperquote/i18n'
import { useTranslation } from 'react-i18next'

interface UnitDisplayProps {
	value: number
	unit: UnitKey
}

export function UnitDisplay({ value, unit }: UnitDisplayProps) {
	const { t, i18n } = useTranslation('units')
	const locale = i18n.language === 'ar' ? 'ar' : 'en'
	const formattedValue = formatNumber(value, locale)
	const unitLabel = t(unit)

	return (
		<span>
			<span className="font-mono">{formattedValue}</span>{' '}
			<span>{unitLabel}</span>
		</span>
	)
}
