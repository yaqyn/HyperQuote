import {
	CheckboxGroup,
	Checkbox,
	RadioGroup,
	Radio,
	Label,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { PRODUCT_CATEGORIES } from '@hyperquote/types'

interface FilterSidebarProps {
	category?: string[]
	availability?: string
	priceTier?: string[]
	onFilterChange: (filters: Record<string, unknown>) => void
	onClearAll: () => void
	hasActiveFilters: boolean
}

const PRICE_TIERS = ['budget', 'mid_range', 'premium'] as const

export function FilterSidebar({
	category,
	availability,
	priceTier,
	onFilterChange,
	onClearAll,
	hasActiveFilters,
}: FilterSidebarProps) {
	const { t } = useTranslation('website')

	return (
		<div className="sticky top-20 space-y-6">
			{hasActiveFilters && (
				<button
					type="button"
					onClick={onClearAll}
					className="text-sm font-medium text-[var(--color-primary)] hover:underline"
				>
					{t('market.filterClear')}
				</button>
			)}

			{/* Category filter */}
			<CheckboxGroup
				value={category || []}
				onChange={(value) =>
					onFilterChange({
						category: value.length ? value.join(',') : undefined,
					})
				}
			>
				<Label className="text-sm font-semibold text-[var(--color-text)] mb-2 block">
					{t('market.sortCategory')}
				</Label>
				<div className="space-y-1 max-h-64 overflow-y-auto">
					{PRODUCT_CATEGORIES.map((cat) => (
						<Checkbox
							key={cat}
							value={cat}
							className="flex items-center gap-2 py-1 text-sm text-[var(--color-text)] cursor-pointer group"
						>
							<div className="w-4 h-4 rounded border border-[var(--color-border)] flex items-center justify-center group-data-[selected]:bg-[var(--color-primary)] group-data-[selected]:border-[var(--color-primary)] transition-colors">
								<svg
									viewBox="0 0 12 10"
									className="w-3 h-2.5 text-white opacity-0 group-data-[selected]:opacity-100"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<polyline points="1 5 4.5 8.5 11 1.5" />
								</svg>
							</div>
							<span>{t(`categories.${cat}`)}</span>
						</Checkbox>
					))}
				</div>
			</CheckboxGroup>

			{/* Availability filter */}
			<RadioGroup
				value={availability || 'all'}
				onChange={(value) =>
					onFilterChange({
						availability: value === 'all' ? undefined : value,
					})
				}
			>
				<Label className="text-sm font-semibold text-[var(--color-text)] mb-2 block">
					{t('market.sortAvailability')}
				</Label>
				<div className="space-y-1">
					{(['all', 'available', 'low_stock'] as const).map((opt) => (
						<Radio
							key={opt}
							value={opt}
							className="flex items-center gap-2 py-1 text-sm text-[var(--color-text)] cursor-pointer group"
						>
							<div className="w-4 h-4 rounded-full border border-[var(--color-border)] flex items-center justify-center group-data-[selected]:border-[var(--color-primary)] transition-colors">
								<div className="w-2 h-2 rounded-full bg-[var(--color-primary)] opacity-0 group-data-[selected]:opacity-100 transition-opacity" />
							</div>
							<span>
								{opt === 'all'
									? t('market.availabilityAll')
									: opt === 'available'
										? t('market.availabilityAvailable')
										: t('market.availabilityLowStock')}
							</span>
						</Radio>
					))}
				</div>
			</RadioGroup>

			{/* Price tier filter */}
			<CheckboxGroup
				value={priceTier || []}
				onChange={(value) =>
					onFilterChange({
						price_tier: value.length ? value.join(',') : undefined,
					})
				}
			>
				<Label className="text-sm font-semibold text-[var(--color-text)] mb-2 block">
					{t('market.sortLabel')}
				</Label>
				<div className="space-y-1">
					{PRICE_TIERS.map((tier) => (
						<Checkbox
							key={tier}
							value={tier}
							className="flex items-center gap-2 py-1 text-sm text-[var(--color-text)] cursor-pointer group"
						>
							<div className="w-4 h-4 rounded border border-[var(--color-border)] flex items-center justify-center group-data-[selected]:bg-[var(--color-primary)] group-data-[selected]:border-[var(--color-primary)] transition-colors">
								<svg
									viewBox="0 0 12 10"
									className="w-3 h-2.5 text-white opacity-0 group-data-[selected]:opacity-100"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<polyline points="1 5 4.5 8.5 11 1.5" />
								</svg>
							</div>
							<span>
								{tier === 'budget'
									? t('market.filterBudget')
									: tier === 'mid_range'
										? t('market.filterMidRange')
										: t('market.filterPremium')}
							</span>
						</Checkbox>
					))}
				</div>
			</CheckboxGroup>
		</div>
	)
}
