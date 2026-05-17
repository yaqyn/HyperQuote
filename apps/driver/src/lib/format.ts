import type { DriverLanguage, LocalizedText } from './driver-repository'

export function localize(
	value: LocalizedText,
	language: DriverLanguage,
): string {
	return value[language]
}

export function formatClock(value: string, language: DriverLanguage): string {
	return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-EG', {
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(value))
}

export function formatNumber(value: number, language: DriverLanguage): string {
	return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-EG').format(
		value,
	)
}
