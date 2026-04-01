import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'

interface FilterSidebarProps {
	category?: string[]
	availability?: string
	priceTier?: string[]
	onFilterChange: (filters: Record<string, unknown>) => void
	onClearAll: () => void
	hasActiveFilters: boolean
}

// Grouped by construction phase — how contractors actually think
const CATEGORY_GROUPS = [
	{
		labelKey: 'market.groupStructural',
		items: ['cement', 'reinforcing_steel', 'structural_steel', 'aggregates', 'sand', 'ready_mix_concrete', 'bricks', 'blocks'],
	},
	{
		labelKey: 'market.groupFinishing',
		items: ['tiles_ceramic', 'tiles_porcelain', 'marble', 'granite', 'paint', 'glass', 'gypsum_board'],
	},
	{
		labelKey: 'market.groupMEP',
		items: ['pipes_pvc', 'pipes_metal', 'electrical_cable', 'electrical_conduit'],
	},
	{
		labelKey: 'market.groupOther',
		items: ['lumber', 'plywood', 'insulation', 'waterproofing', 'roofing', 'aluminum_profiles', 'adhesives', 'hardware_fasteners'],
	},
] as const

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
	const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['market.groupStructural']))

	const activeCount =
		(category?.length ?? 0) + (availability ? 1 : 0) + (priceTier?.length ?? 0)

	const toggleCategory = (cat: string) => {
		const current = category || []
		const next = current.includes(cat)
			? current.filter((c) => c !== cat)
			: [...current, cat]
		onFilterChange({ category: next.length ? next.join(',') : undefined })
	}

	const togglePriceTier = (tier: string) => {
		const current = priceTier || []
		const next = current.includes(tier)
			? current.filter((t) => t !== tier)
			: [...current, tier]
		onFilterChange({ price_tier: next.length ? next.join(',') : undefined })
	}

	const setAvailability = (value: string) => {
		onFilterChange({ availability: value === 'all' ? undefined : value })
	}

	const toggleGroup = (key: string) => {
		setExpandedGroups((prev) => {
			const next = new Set(prev)
			if (next.has(key)) next.delete(key)
			else next.add(key)
			return next
		})
	}

	return (
		<div className="sticky top-20 space-y-5">
			{/* Header */}
			<div className="flex items-center justify-between">
				<span className="text-[14px] font-semibold text-[var(--color-text)]">
					{t('market.filtersTitle')}
					{activeCount > 0 && (
						<span className="ms-1.5 text-[12px] font-medium text-[var(--color-primary)]">
							({activeCount})
						</span>
					)}
				</span>
				{hasActiveFilters && (
					<button
						type="button"
						onClick={onClearAll}
						className="text-[12px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
					>
						{t('market.filterClear')}
					</button>
				)}
			</div>

			{/* Category groups */}
			<div>
				<h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
					{t('market.sortCategory')}
				</h3>
				<div className="space-y-1">
					{CATEGORY_GROUPS.map((group) => {
						const isOpen = expandedGroups.has(group.labelKey)
						const activeInGroup = group.items.filter((c) => category?.includes(c)).length

						return (
							<div key={group.labelKey}>
								<button
									type="button"
									onClick={() => toggleGroup(group.labelKey)}
									className="w-full flex items-center justify-between py-1.5 px-2 rounded-md text-[13px] font-medium text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
								>
									<span className="flex items-center gap-1.5">
										{t(group.labelKey)}
										{activeInGroup > 0 && (
											<span className="text-[11px] text-[var(--color-primary)] font-semibold">
												{activeInGroup}
											</span>
										)}
									</span>
									<ChevronDown
										size={14}
										className={`text-[var(--color-text-muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
									/>
								</button>
								{isOpen && (
									<div className="ps-2 space-y-0.5 mt-0.5">
										{group.items.map((cat) => {
											const active = category?.includes(cat)
											return (
												<button
													key={cat}
													type="button"
													onClick={() => toggleCategory(cat)}
													className={`w-full text-start px-2 py-1 rounded text-[13px] transition-colors ${
														active
															? 'bg-[var(--color-subtle)] text-[var(--color-primary)] font-medium'
															: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
													}`}
												>
													{t(`categories.${cat}`)}
												</button>
											)
										})}
									</div>
								)}
							</div>
						)
					})}
				</div>
			</div>

			{/* Availability */}
			<div>
				<h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
					{t('market.sortAvailability')}
				</h3>
				<div className="space-y-0.5">
					{(['all', 'available', 'low_stock'] as const).map((opt) => {
						const active = opt === 'all' ? !availability : availability === opt
						return (
							<button
								key={opt}
								type="button"
								onClick={() => setAvailability(opt)}
								className={`w-full text-start px-2 py-1.5 rounded text-[13px] transition-colors ${
									active
										? 'bg-[var(--color-subtle)] text-[var(--color-primary)] font-medium'
										: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
								}`}
							>
								{opt === 'all'
									? t('market.availabilityAll')
									: opt === 'available'
										? t('market.availabilityAvailable')
										: t('market.availabilityLowStock')}
							</button>
						)
					})}
				</div>
			</div>

			{/* Price tier */}
			<div>
				<h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
					{t('market.filterPriceLabel')}
				</h3>
				<div className="space-y-0.5">
					{PRICE_TIERS.map((tier) => {
						const active = priceTier?.includes(tier)
						return (
							<button
								key={tier}
								type="button"
								onClick={() => togglePriceTier(tier)}
								className={`w-full text-start px-2 py-1.5 rounded text-[13px] transition-colors ${
									active
										? 'bg-[var(--color-subtle)] text-[var(--color-primary)] font-medium'
										: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
								}`}
							>
								{tier === 'budget'
									? t('market.filterBudget')
									: tier === 'mid_range'
										? t('market.filterMidRange')
										: t('market.filterPremium')}
							</button>
						)
					})}
				</div>
			</div>
		</div>
	)
}
