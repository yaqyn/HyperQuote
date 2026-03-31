import { useState } from 'react'
import {
	DialogTrigger,
	Modal,
	ModalOverlay,
	Dialog,
	Heading,
	CheckboxGroup,
	Checkbox,
	RadioGroup,
	Radio,
	Label,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { SlidersHorizontal } from 'lucide-react'
import { PRODUCT_CATEGORIES } from '@hyperquote/types'

interface MobileFilterSheetProps {
	category?: string[]
	availability?: string
	priceTier?: string[]
	onFilterChange: (filters: Record<string, unknown>) => void
	onClearAll: () => void
}

const PRICE_TIERS = ['budget', 'mid_range', 'premium'] as const

export function MobileFilterSheet({
	category,
	availability,
	priceTier,
	onFilterChange,
	onClearAll,
}: MobileFilterSheetProps) {
	const { t } = useTranslation('website')
	const [localCategory, setLocalCategory] = useState<string[]>(category || [])
	const [localAvailability, setLocalAvailability] = useState(
		availability || 'all',
	)
	const [localPriceTier, setLocalPriceTier] = useState<string[]>(
		priceTier || [],
	)
	const [isOpen, setIsOpen] = useState(false)

	const handleApply = () => {
		onFilterChange({
			category: localCategory.length
				? localCategory.join(',')
				: undefined,
			availability:
				localAvailability === 'all' ? undefined : localAvailability,
			price_tier: localPriceTier.length
				? localPriceTier.join(',')
				: undefined,
		})
		setIsOpen(false)
	}

	const handleReset = () => {
		setLocalCategory([])
		setLocalAvailability('all')
		setLocalPriceTier([])
		onClearAll()
		setIsOpen(false)
	}

	return (
		<DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
			<button
				type="button"
				className="flex items-center gap-2 h-12 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-sm font-medium text-[var(--color-text)]"
			>
				<SlidersHorizontal size={16} aria-hidden="true" />
				{t('market.filtersTrigger')}
			</button>
			<ModalOverlay
				isDismissable
				className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center"
			>
				<Modal className="w-full max-w-lg max-h-[80vh] rounded-t-2xl bg-[var(--color-base)] overflow-y-auto">
					<Dialog
						className="p-6 outline-none"
						isKeyboardDismissDisabled
					>
						<Heading
							slot="title"
							className="text-lg font-semibold text-[var(--color-text)] mb-6"
						>
							{t('market.filtersTrigger')}
						</Heading>

						<div className="space-y-6">
							{/* Category filter */}
							<CheckboxGroup
								value={localCategory}
								onChange={setLocalCategory}
							>
								<Label className="text-sm font-semibold text-[var(--color-text)] mb-2 block">
									{t('market.sortCategory')}
								</Label>
								<div className="space-y-1 max-h-48 overflow-y-auto">
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
								value={localAvailability}
								onChange={setLocalAvailability}
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
								value={localPriceTier}
								onChange={setLocalPriceTier}
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

						{/* Actions */}
						<div className="flex items-center gap-4 mt-8">
							<button
								type="button"
								onClick={handleApply}
								className="flex-1 h-12 rounded-xl bg-[var(--color-primary)] text-white font-medium text-sm hover:bg-[var(--color-primary-hover)] transition-colors"
							>
								{t('market.filtersApply')}
							</button>
							<button
								type="button"
								onClick={handleReset}
								className="text-sm font-medium text-[var(--color-primary)] hover:underline"
							>
								{t('market.filtersReset')}
							</button>
						</div>
					</Dialog>
				</Modal>
			</ModalOverlay>
		</DialogTrigger>
	)
}
