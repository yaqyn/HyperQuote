export function formatDecimalEgp(
	value: number,
	minimumFractionDigits = 2,
): string {
	return value.toLocaleString('en-EG', {
		maximumFractionDigits: minimumFractionDigits,
		minimumFractionDigits,
	})
}

export function formatRelativeHoursAgo(
	hours: number,
	options: { underOne?: 'justNow' | 'minutes' | 'zeroHours' } = {},
): string {
	const underOne = options.underOne ?? 'justNow'
	if (hours < 1) {
		if (underOne === 'minutes') return `${Math.round(hours * 60)}m ago`
		if (underOne === 'zeroHours') return '0h ago'
		return 'just now'
	}
	if (hours < 24) return `${Math.round(hours)}h ago`
	const days = Math.round(hours / 24)
	if (days < 30) return `${days}d ago`
	return `${Math.round(days / 30)}mo ago`
}

export function formatCompactHours(hours: number): string {
	if (hours < 1) return `${Math.round(hours * 60)}m`
	if (hours < 24) return `${Math.round(hours)}h`
	const days = Math.floor(hours / 24)
	if (days < 30) return `${days}d`
	return `${Math.round(days / 30)}mo`
}
