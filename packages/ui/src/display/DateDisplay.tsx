import {
	formatDate,
	formatRelativeTime,
} from '@hyperquote/i18n/formatters/date'
import { useTranslation } from 'react-i18next'

interface DateDisplayProps {
	date: Date | string
	format?: 'short' | 'long' | 'relative'
}

const FORMAT_OPTIONS: Record<'short' | 'long', Intl.DateTimeFormatOptions> = {
	short: { dateStyle: 'short' },
	long: { dateStyle: 'long' },
}

export function DateDisplay({ date, format = 'short' }: DateDisplayProps) {
	const { i18n } = useTranslation()
	const locale = i18n.language === 'ar' ? 'ar' : 'en'

	const formatted =
		format === 'relative'
			? formatRelativeTime(date, locale)
			: formatDate(date, locale, FORMAT_OPTIONS[format])

	return <span className="font-mono">{formatted}</span>
}
