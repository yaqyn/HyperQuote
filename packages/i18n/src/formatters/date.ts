/** Cached Intl.DateTimeFormat instances */
const dateFormatters = new Map<string, Intl.DateTimeFormat>()

/** Cached Intl.RelativeTimeFormat instances */
const relativeFormatters = new Map<string, Intl.RelativeTimeFormat>()

function getDateFormatter(locale: 'ar' | 'en', options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}:${JSON.stringify(options ?? {})}`
  let fmt = dateFormatters.get(key)
  if (!fmt) {
    const intlLocale = locale === 'ar' ? 'ar-EG' : 'en-US'
    fmt = new Intl.DateTimeFormat(intlLocale, options)
    dateFormatters.set(key, fmt)
  }
  return fmt
}

function getRelativeFormatter(locale: 'ar' | 'en'): Intl.RelativeTimeFormat {
  let fmt = relativeFormatters.get(locale)
  if (!fmt) {
    const intlLocale = locale === 'ar' ? 'ar-EG' : 'en-US'
    fmt = new Intl.RelativeTimeFormat(intlLocale, { numeric: 'auto' })
    relativeFormatters.set(locale, fmt)
  }
  return fmt
}

/**
 * Format a date for display.
 * Defaults to medium date format if no options provided.
 */
export function formatDate(
  date: Date | string,
  locale: 'ar' | 'en',
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const opts = options ?? { dateStyle: 'medium' }
  return getDateFormatter(locale, opts).format(d)
}

const MINUTE = 60
const HOUR = 3600
const DAY = 86400
const WEEK = 604800
const MONTH = 2592000 // 30 days
const YEAR = 31536000 // 365 days

/**
 * Format a date as relative time (e.g., "2 days ago" / "منذ يومين").
 */
export function formatRelativeTime(date: Date | string, locale: 'ar' | 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = Date.now()
  const diffSec = Math.round((d.getTime() - now) / 1000)
  const absDiff = Math.abs(diffSec)

  const fmt = getRelativeFormatter(locale)

  if (absDiff < MINUTE) return fmt.format(diffSec, 'second')
  if (absDiff < HOUR) return fmt.format(Math.round(diffSec / MINUTE), 'minute')
  if (absDiff < DAY) return fmt.format(Math.round(diffSec / HOUR), 'hour')
  if (absDiff < WEEK) return fmt.format(Math.round(diffSec / DAY), 'day')
  if (absDiff < MONTH) return fmt.format(Math.round(diffSec / WEEK), 'week')
  if (absDiff < YEAR) return fmt.format(Math.round(diffSec / MONTH), 'month')
  return fmt.format(Math.round(diffSec / YEAR), 'year')
}
