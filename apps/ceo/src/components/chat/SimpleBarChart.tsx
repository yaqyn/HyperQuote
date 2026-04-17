import type { ChartData } from '../../types/chat'

interface SimpleBarChartProps {
	chart: ChartData
}

const BAR_HEIGHT = 28
const LABEL_WIDTH = 120
const VALUE_WIDTH = 60
const GAP = 6

export function SimpleBarChart({ chart }: SimpleBarChartProps) {
	const maxValue = Math.max(...chart.data.map((d) => d.value), 1)
	const barCount = Math.min(chart.data.length, 10)
	const items = chart.data.slice(0, barCount)
	const chartHeight = barCount * (BAR_HEIGHT + GAP) + 24

	return (
		<div className="my-3">
			{chart.label && (
				<p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
					{chart.label}
				</p>
			)}
			<svg
				viewBox={`0 0 400 ${chartHeight}`}
				width="100%"
				className="overflow-visible"
				role="img"
				aria-label={chart.label}
			>
				{items.map((item, i) => {
					const y = i * (BAR_HEIGHT + GAP)
					const barWidth =
						((400 - LABEL_WIDTH - VALUE_WIDTH - 16) * item.value) / maxValue

					return (
						<g key={item.label}>
							{/* Label */}
							<text
								x={LABEL_WIDTH - 8}
								y={y + BAR_HEIGHT / 2 + 1}
								textAnchor="end"
								dominantBaseline="middle"
								fill="var(--color-text-muted)"
								fontSize="11"
								fontFamily="Inter, sans-serif"
							>
								{item.label}
							</text>

							{/* Bar */}
							<rect
								x={LABEL_WIDTH}
								y={y + 2}
								width={Math.max(barWidth, 2)}
								height={BAR_HEIGHT - 4}
								rx={3}
								fill="var(--color-text)"
								opacity={0.75}
							/>

							{/* Value */}
							<text
								x={LABEL_WIDTH + Math.max(barWidth, 2) + 8}
								y={y + BAR_HEIGHT / 2 + 1}
								textAnchor="start"
								dominantBaseline="middle"
								fill="var(--color-text-muted)"
								fontSize="11"
								fontFamily="'Geist Mono', monospace"
							>
								{item.value}
							</text>
						</g>
					)
				})}
			</svg>
		</div>
	)
}
