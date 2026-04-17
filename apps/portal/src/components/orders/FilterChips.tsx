/**
 * Filter links for Quotes tab.
 * Text-only, no pills. Active = underline. Inactive = muted.
 */
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'

export type QuoteFilterValue =
	| 'all'
	| 'pending'
	| 'ready'
	| 'negotiating'
	| 'expired'

interface FilterChipsProps {
	selected: QuoteFilterValue
	onChange: (value: QuoteFilterValue) => void
}

const FILTERS: { value: QuoteFilterValue; labelKey: string }[] = [
	{ value: 'all', labelKey: 'orders.filterAll' },
	{ value: 'pending', labelKey: 'orders.filterPending' },
	{ value: 'ready', labelKey: 'orders.filterReady' },
	{ value: 'negotiating', labelKey: 'orders.filterNegotiating' },
	{ value: 'expired', labelKey: 'orders.filterExpired' },
]

export function FilterChips({ selected, onChange }: FilterChipsProps) {
	const { t } = useTranslation('portal')

	return (
		<div className="flex flex-wrap gap-4 mb-4">
			{FILTERS.map((filter) => {
				const isActive = selected === filter.value
				return (
					<Button
						key={filter.value}
						onPress={() => onChange(filter.value)}
						className={[
							'text-sm cursor-pointer outline-none transition-colors pb-0.5',
							isActive
								? 'text-[var(--color-text)] underline underline-offset-4 decoration-1'
								: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
						].join(' ')}
					>
						{t(filter.labelKey)}
					</Button>
				)
			})}
		</div>
	)
}
