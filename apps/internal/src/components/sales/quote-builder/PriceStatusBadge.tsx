import { Flame } from 'lucide-react'
import type { PriceStatus } from '../../../types/sales'
import { getPriceUrgency } from '../../../types/sales'

interface PriceStatusBadgeProps {
	priceStatus: PriceStatus
	recentlyOrdered: boolean
	size?: 'sm' | 'xs'
}

const URGENCY_STYLES = {
	normal: {
		label: 'Updated',
		tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20',
	},
	hot: {
		label: 'Updated',
		tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20',
	},
	stale: {
		label: 'Outdated',
		tone: 'bg-black/[0.05] text-black/55 dark:bg-white/[0.06] dark:text-white/55 ring-black/10 dark:ring-white/10',
	},
	urgent: {
		label: 'Urgent',
		tone: 'bg-black/[0.08] text-black/70 dark:bg-white/[0.10] dark:text-white/70 ring-black/15 dark:ring-white/15',
	},
} as const

/**
 * Small pill showing the price status of a catalog item.
 * Shows a flame for recently-ordered items.
 */
export function PriceStatusBadge({
	priceStatus,
	recentlyOrdered,
	size = 'sm',
}: PriceStatusBadgeProps) {
	const urgency = getPriceUrgency(priceStatus, recentlyOrdered)
	const style = URGENCY_STYLES[urgency]
	const padding =
		size === 'xs' ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[10px]'
	const iconSize = size === 'xs' ? 9 : 10

	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wider ring-1 ring-inset ${padding} ${style.tone}`}
		>
			{style.label}
			{recentlyOrdered && <Flame size={iconSize} strokeWidth={2.5} />}
		</span>
	)
}
