type Trend = 'improving' | 'declining' | 'stable'

interface PerformanceTrendProps {
	trend: Trend
	/** Show text label next to icon */
	showLabel?: boolean
	/** Invert colors (for metrics where lower is better, e.g. rejection rate) */
	inverted?: boolean
}

/**
 * CSS-only sparkline-style trend indicator.
 * Small dots connected by thin line, with directional arrow.
 */
export function PerformanceTrend({
	trend,
	showLabel = false,
	inverted = false,
}: PerformanceTrendProps) {
	const isPositive = inverted ? trend === 'declining' : trend === 'improving'
	const isNegative = inverted ? trend === 'improving' : trend === 'declining'

	const color = isPositive
		? 'text-green-600/70 dark:text-green-400/70'
		: isNegative
			? 'text-red-500/70 dark:text-red-400/70'
			: 'text-black/25 dark:text-white/25'

	const labels: Record<Trend, string> = {
		improving: 'Improving',
		declining: 'Declining',
		stable: 'Stable',
	}

	// Mini sparkline as SVG dots + line
	const sparkPoints: Record<Trend, string> = {
		improving: '2,10 8,7 14,5 20,2',
		declining: '2,2 8,5 14,7 20,10',
		stable: '2,6 8,5 14,6 20,5',
	}

	return (
		<span className={`inline-flex items-center gap-1.5 ${color}`}>
			<svg
				aria-hidden="true"
				width="22"
				height="12"
				viewBox="0 0 22 12"
				className="overflow-visible"
			>
				<polyline
					points={sparkPoints[trend]}
					fill="none"
					stroke="currentColor"
					strokeWidth={1}
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				{/* Dots at each point */}
				{sparkPoints[trend].split(' ').map((pt) => {
					const [cx, cy] = pt.split(',').map(Number)
					return <circle key={pt} cx={cx} cy={cy} r={1.2} fill="currentColor" />
				})}
			</svg>
			{showLabel && <span className="text-[10px]">{labels[trend]}</span>}
		</span>
	)
}
