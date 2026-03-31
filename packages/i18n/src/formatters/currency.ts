/** Cached Intl.NumberFormat instances for currency */
const formatters = new Map<string, Intl.NumberFormat>()

function getCurrencyFormatter(locale: 'ar' | 'en'): Intl.NumberFormat {
  let fmt = formatters.get(locale)
  if (!fmt) {
    const intlLocale = locale === 'ar' ? 'ar-EG' : 'en-EG'
    fmt = new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency: 'EGP',
    })
    formatters.set(locale, fmt)
  }
  return fmt
}

/**
 * Format a number as EGP currency.
 * Arabic locale produces Arabic-Indic numerals with EGP symbol.
 */
export function formatCurrency(value: number, locale: 'ar' | 'en'): string {
  return getCurrencyFormatter(locale).format(value)
}
