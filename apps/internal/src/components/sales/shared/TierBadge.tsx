import type { CustomerTier } from '../../../types/sales'

interface TierBadgeProps {
	tier: CustomerTier
}

const TIER_CONFIG: Record<
	CustomerTier,
	{ dotClass: string; borderClass: string }
> = {
	A: {
		dotClass: 'bg-[var(--color-primary)]',
		borderClass: '',
	},
	B: {
		dotClass: 'bg-[var(--color-text)]',
		borderClass: '',
	},
	C: {
		dotClass: 'bg-[var(--color-text-subtle)]',
		borderClass: '',
	},
	new: {
		dotClass: 'border border-dashed border-[var(--color-text-subtle)]',
		borderClass:
			'border border-dashed border-black/[0.12] dark:border-white/[0.12]',
	},
}

export function TierBadge({ tier }: TierBadgeProps) {
	const config = TIER_CONFIG[tier]
	const label = tier === 'new' ? 'N' : tier

	return (
		<span
			className={[
				'inline-flex items-center gap-1.5',
				config.borderClass
					? `rounded-md px-1.5 py-0.5 ${config.borderClass}`
					: '',
			].join(' ')}
		>
			<span className={`size-1.5 shrink-0 rounded-full ${config.dotClass}`} />
			<span className="font-[family-name:var(--font-geist-mono)] text-[11px] font-medium leading-none tabular-nums text-[var(--color-text)]">
				{label}
			</span>
		</span>
	)
}
