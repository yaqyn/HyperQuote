/**
 * Filter chips for Quotes tab.
 * React Aria ToggleButton group.
 * Active: blue bg + white text. Inactive: surface bg + muted text.
 */
import { ToggleButton } from 'react-aria-components'
import { useTranslation } from 'react-i18next'

export type QuoteFilterValue = 'all' | 'pending' | 'ready' | 'negotiating' | 'expired'

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
    <div className="flex flex-wrap gap-2 mb-4">
      {FILTERS.map((filter) => (
        <ToggleButton
          key={filter.value}
          isSelected={selected === filter.value}
          onChange={() => onChange(filter.value)}
          className={({ isSelected }) =>
            [
              'h-8 rounded-full px-3 text-sm cursor-pointer outline-none transition-colors',
              isSelected
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
            ].join(' ')
          }
        >
          {t(filter.labelKey)}
        </ToggleButton>
      ))}
    </div>
  )
}
