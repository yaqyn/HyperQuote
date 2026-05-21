/**
 * ConfidenceBadge -- Color-coded confidence score indicator.
 * High (> 90%): green, Medium (70-90%): yellow, Low (< 70%): red.
 * Uses readable tabular sans for percentage display.
 */

interface ConfidenceBadgeProps {
	confidence: number
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
	const level = confidence > 90 ? 'high' : confidence >= 70 ? 'medium' : 'low'

	const colorClasses = {
		high: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
		medium:
			'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
		low: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
	}

	return (
		<span
			className={`font-mono text-[13px] px-2 py-0.5 rounded-full ${colorClasses[level]}`}
		>
			{confidence}%
		</span>
	)
}
