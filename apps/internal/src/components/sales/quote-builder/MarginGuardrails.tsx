import { Tooltip, TooltipTrigger } from 'react-aria-components'
import type { MarginThresholds } from '../../../types/sales'
import { getMarginLevel } from '../../../types/sales'

interface MarginGuardrailsProps {
	marginPercent: number
	thresholds: MarginThresholds
}

/**
 * Per-line margin indicator -- colored dot + background tint + CEO tag.
 * Green (>= target), Yellow (>= floor), Red (>= absoluteMin), Blocked (< absoluteMin).
 */
export function MarginGuardrails({
	marginPercent,
	thresholds,
}: MarginGuardrailsProps) {
	const level = getMarginLevel(marginPercent, thresholds)

	const config = {
		green: {
			dot: 'bg-green-500',
			bg: 'bg-green-50 dark:bg-green-950/20',
			label: `At/above target (${thresholds.target}%)`,
		},
		yellow: {
			dot: 'bg-yellow-500',
			bg: 'bg-yellow-50 dark:bg-yellow-950/20',
			label: `Below target ${thresholds.target}% -- manager review`,
		},
		red: {
			dot: 'bg-red-500',
			bg: 'bg-red-50 dark:bg-red-950/20',
			label: `Below floor ${thresholds.floor}% -- approval required`,
		},
		blocked: {
			dot: 'bg-red-600',
			bg: 'bg-red-50 dark:bg-red-950/30',
			label:
				marginPercent < 0
					? 'Negative margin -- cannot save'
					: `Below minimum ${thresholds.absoluteMin}% -- CEO approval`,
		},
	}[level]

	return (
		<TooltipTrigger delay={3000}>
			<span
				className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-1.5 py-0.5 ${config.bg}`}
				role="img"
				aria-label={config.label}
			>
				<span
					className={`inline-block h-[6px] w-[6px] rounded-full ${config.dot}`}
				/>
				{level === 'blocked' && (
					<span className="text-[9px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
						CEO Approval Required
					</span>
				)}
			</span>
			<Tooltip
				className="max-w-48 rounded-md bg-black/90 px-2.5 py-1.5 text-[11px] leading-snug text-white shadow-lg dark:bg-white/90 dark:text-black"
				offset={4}
			>
				{config.label}
			</Tooltip>
		</TooltipTrigger>
	)
}
