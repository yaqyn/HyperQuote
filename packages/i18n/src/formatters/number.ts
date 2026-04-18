/** Cached Intl.NumberFormat instances */
const formatters = new Map<string, Intl.NumberFormat>()

function getFormatter(
	locale: 'ar' | 'en',
	options?: Intl.NumberFormatOptions,
): Intl.NumberFormat {
	const key = `${locale}:${JSON.stringify(options ?? {})}`
	let fmt = formatters.get(key)
	if (!fmt) {
		const intlLocale = locale === 'ar' ? 'ar-EG' : 'en-US'
		fmt = new Intl.NumberFormat(intlLocale, options)
		formatters.set(key, fmt)
	}
	return fmt
}

/**
 * Format a number for display.
 * Arabic locale produces Arabic-Indic numerals via Intl.NumberFormat('ar-EG').
 */
export function formatNumber(value: number, locale: 'ar' | 'en'): string {
	return getFormatter(locale).format(value)
}
