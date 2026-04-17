interface RankingBadgeProps {
	rank: number
}

/**
 * Tiny numbered circle: 1, 2, 3.
 * Rank 1 = blue filled, 2-3 = black/muted outline, 4+ = no badge.
 */
export function RankingBadge({ rank }: RankingBadgeProps) {
	if (rank > 3) return null

	const isFirst = rank === 1

	return (
		<span
			role="img"
			className={`
        inline-flex size-4 items-center justify-center rounded-full
        font-[family-name:var(--font-geist-mono)] text-[9px] font-semibold tabular-nums leading-none
        ${
					isFirst
						? 'bg-[#2563EB] text-white'
						: 'border border-black/15 text-black/40 dark:border-white/15 dark:text-white/40'
				}
      `}
			aria-label={`Rank ${rank}`}
		>
			{rank}
		</span>
	)
}
