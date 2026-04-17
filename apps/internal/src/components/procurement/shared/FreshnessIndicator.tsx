import { useTranslation } from 'react-i18next'
import type { InternalKey } from '../../../lib/modules'
import type { StockFreshness } from '../../../types/procurement'

interface FreshnessIndicatorProps {
	freshness: StockFreshness
	timestamp?: string
	compact?: boolean
}

const FRESHNESS_LETTER: Record<StockFreshness, string> = {
	fresh: 'F',
	aging: 'A',
	stale: 'S',
	suppressed: 'M',
}

const FRESHNESS_COLOR: Record<StockFreshness, string> = {
	fresh: 'text-[var(--color-text)]',
	aging: 'text-[var(--color-text-muted)]',
	stale: 'text-[var(--color-text-subtle)]',
	suppressed: 'text-[var(--color-text-subtle)] opacity-50',
}

const FRESHNESS_I18N: Record<StockFreshness, InternalKey> = {
	fresh: 'procurement.freshness.fresh',
	aging: 'procurement.freshness.aging',
	stale: 'procurement.freshness.stale',
	suppressed: 'procurement.freshness.suppressed',
}

export function FreshnessIndicator({
	freshness,
	timestamp,
	compact,
}: FreshnessIndicatorProps) {
	const { t } = useTranslation('internal')

	if (compact) {
		return (
			<span
				className={`inline-flex items-center justify-center font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold tabular-nums ${FRESHNESS_COLOR[freshness]}`}
				title={t(FRESHNESS_I18N[freshness])}
			>
				{FRESHNESS_LETTER[freshness]}
			</span>
		)
	}

	return (
		<div className="flex items-center gap-1.5">
			<span
				className={`font-[family-name:var(--font-geist-mono)] text-[11px] font-semibold tabular-nums ${FRESHNESS_COLOR[freshness]}`}
			>
				{FRESHNESS_LETTER[freshness]}
			</span>
			<span className="text-[12px] text-[var(--color-text-muted)]">
				{t(FRESHNESS_I18N[freshness])}
			</span>
			{timestamp && (
				<span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
					{new Date(timestamp).toLocaleString()}
				</span>
			)}
		</div>
	)
}
