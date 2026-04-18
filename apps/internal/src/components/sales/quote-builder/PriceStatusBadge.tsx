import { Flame } from 'lucide-react'
import type { PriceStatus } from '../../../types/sales'
import { getPriceUrgency } from '../../../types/sales'

interface PriceStatusBadgeProps {
	priceStatus: PriceStatus
	recentlyOrdered: boolean
	size?: 'sm' | 'xs'
}

/**
 * Price status mark — italic Archivo lowercase label with a color-coded
 * dot. No rounded pill, no uppercase-tracked micro-caps. Status itself
 * is the content; the dot is a visual index not a decoration.
 */
const URGENCY_STYLE = {
	normal: { label: 'updated', color: 'var(--color-primary)' },
	hot: { label: 'updated', color: 'var(--color-primary)' },
	stale: { label: 'outdated', color: 'var(--color-signal-amber)' },
	urgent: { label: 'urgent', color: 'var(--color-signal-red)' },
} as const

export function PriceStatusBadge({
	priceStatus,
	recentlyOrdered,
	size = 'sm',
}: PriceStatusBadgeProps) {
	const urgency = getPriceUrgency(priceStatus, recentlyOrdered)
	const style = URGENCY_STYLE[urgency]
	const fontSize = size === 'xs' ? '10px' : '11px'
	const dotSize = size === 'xs' ? 5 : 6
	const srLabel = recentlyOrdered
		? `Price status: ${style.label}, recently ordered`
		: `Price status: ${style.label}`

	return (
		<span
			role="img"
			aria-label={srLabel}
			className="inline-flex items-baseline gap-1.5 font-[family-name:var(--font-archivo)] italic"
			style={{ fontSize, color: style.color, letterSpacing: '0.005em' }}
		>
			<span
				aria-hidden="true"
				className="shrink-0 self-center rounded-full"
				style={{
					width: dotSize,
					height: dotSize,
					backgroundColor: style.color,
				}}
			/>
			<span aria-hidden="true">{style.label}</span>
			{recentlyOrdered && (
				<Flame
					size={size === 'xs' ? 9 : 10}
					strokeWidth={2}
					className="shrink-0 self-center"
					aria-hidden="true"
				/>
			)}
		</span>
	)
}
