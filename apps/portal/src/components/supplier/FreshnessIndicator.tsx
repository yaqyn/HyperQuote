/**
 * FreshnessIndicator -- color-coded relative time display.
 * < 24h -> green, 1-3 days -> yellow, > 3 days -> red.
 * Uses Intl.RelativeTimeFormat for locale-aware relative time text.
 */

interface FreshnessIndicatorProps {
	lastUpdatedAt: string
	locale: 'ar' | 'en'
}

export function FreshnessIndicator({
	lastUpdatedAt,
	locale,
}: FreshnessIndicatorProps) {
	const now = Date.now()
	const updated = new Date(lastUpdatedAt).getTime()
	const diffMs = now - updated
	const diffHours = diffMs / (1000 * 60 * 60)
	const diffDays = diffMs / (1000 * 60 * 60 * 24)

	// Color logic
	let colorClass: string
	if (diffHours < 24) {
		colorClass = 'text-green-600'
	} else if (diffDays <= 3) {
		colorClass = 'text-yellow-600'
	} else {
		colorClass = 'text-red-600'
	}

	// Compute relative time
	const rtf = new Intl.RelativeTimeFormat(locale === 'ar' ? 'ar-EG' : 'en', {
		numeric: 'auto',
	})

	let relativeTime: string
	if (diffHours < 1) {
		const mins = Math.floor(diffMs / (1000 * 60))
		relativeTime = rtf.format(-mins, 'minute')
	} else if (diffHours < 24) {
		relativeTime = rtf.format(-Math.floor(diffHours), 'hour')
	} else {
		relativeTime = rtf.format(-Math.floor(diffDays), 'day')
	}

	return (
		<span className={`font-mono text-sm ${colorClass}`}>{relativeTime}</span>
	)
}
