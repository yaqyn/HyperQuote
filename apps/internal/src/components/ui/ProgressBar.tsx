type ProgressColor = 'green' | 'yellow' | 'red' | 'blue' | 'auto'

interface ProgressBarProps {
	value: number
	max?: number
	color?: ProgressColor
	className?: string
}

function resolveColor(color: ProgressColor, ratio: number): string {
	if (color !== 'auto') {
		const map: Record<string, string> = {
			green: 'bg-green-400 dark:bg-green-500',
			yellow: 'bg-yellow-400 dark:bg-yellow-500',
			red: 'bg-red-400 dark:bg-red-500',
			blue: 'bg-[var(--color-primary)]',
		}
		return map[color]
	}
	if (ratio > 0.9) return 'bg-red-400 dark:bg-red-500'
	if (ratio > 0.7) return 'bg-yellow-400 dark:bg-yellow-500'
	return 'bg-green-400 dark:bg-green-500'
}

function ProgressBar({
	value,
	max = 100,
	color = 'auto',
	className = '',
}: ProgressBarProps) {
	const ratio = max > 0 ? Math.min(1, value / max) : 0
	const fillColor = resolveColor(color, ratio)

	return (
		<div
			className={`h-1.5 w-full overflow-hidden rounded-full bg-black/[0.04] dark:bg-white/[0.04] ${className}`}
		>
			<div
				className={`h-full rounded-full transition-all duration-500 ${fillColor}`}
				style={{ width: `${ratio * 100}%` }}
			/>
		</div>
	)
}
