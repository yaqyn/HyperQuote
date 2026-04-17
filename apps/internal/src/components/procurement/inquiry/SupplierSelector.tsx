import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
	Button,
	ComboBox,
	Input,
	Label,
	ListBox,
	ListBoxItem,
	Popover,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { getSupplierDirectory } from '../../../lib/server/procurement-suppliers'
import type {
	StockFreshness,
	SupplierScorecard,
} from '../../../types/procurement'
import { FreshnessIndicator } from '../shared/FreshnessIndicator'

interface SupplierSelectorProps {
	productId: string
	selectedIds: string[]
	onSelectionChange: (ids: string[]) => void
}

function getStockFreshness(avgResponseDays: number): StockFreshness {
	if (avgResponseDays <= 1) return 'fresh'
	if (avgResponseDays <= 3) return 'aging'
	if (avgResponseDays <= 7) return 'stale'
	return 'suppressed'
}

// ─── Supplier Pill ───────────────────────────────────────

function SupplierPill({
	name,
	tier,
	onRemove,
}: {
	name: string
	tier: string
	onRemove: () => void
}) {
	const { t } = useTranslation('internal')

	return (
		<span className="inline-flex items-center gap-1 rounded-md bg-black/[0.04] py-0.5 pe-1 ps-2 text-[12px] dark:bg-white/[0.04]">
			<span className="max-w-[100px] truncate font-medium text-[var(--color-text)]">
				{name}
			</span>
			<span className="text-[10px] text-[var(--color-text-subtle)]">
				{t(`procurement.tier.${tier}`, { defaultValue: tier })}
			</span>
			<Button
				onPress={onRemove}
				aria-label={`Remove ${name}`}
				className="ms-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-sm outline-none transition-colors
          data-[hovered]:bg-black/[0.06] dark:data-[hovered]:bg-white/[0.06]
          data-[focus-visible]:ring-1 data-[focus-visible]:ring-[var(--color-primary)]/40"
			>
				<svg
					aria-hidden="true"
					xmlns="http://www.w3.org/2000/svg"
					width="8"
					height="8"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="3"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M18 6 6 18" />
					<path d="m6 6 12 12" />
				</svg>
			</Button>
		</span>
	)
}

// ─── Main Selector ───────────────────────────────────────

export function SupplierSelector({
	productId,
	selectedIds,
	onSelectionChange,
}: SupplierSelectorProps) {
	const { t } = useTranslation('internal')
	const [search, setSearch] = useState('')

	const { data } = useQuery({
		queryKey: ['procurement', 'suppliers', 'directory', productId],
		queryFn: () => getSupplierDirectory({ data: { page: 1, limit: 20 } }),
		staleTime: 60_000,
	})

	const suppliers: SupplierScorecard[] = data?.suppliers ?? []

	// Sort by overall score descending (score-ranked suggestions)
	const sorted = [...suppliers].sort((a, b) => b.overallScore - a.overallScore)

	const filtered = search
		? sorted.filter((s) =>
				s.supplierName.toLowerCase().includes(search.toLowerCase()),
			)
		: sorted

	const toggleSupplier = (supplierId: string) => {
		if (selectedIds.includes(supplierId)) {
			onSelectionChange(selectedIds.filter((id) => id !== supplierId))
		} else {
			onSelectionChange([...selectedIds, supplierId])
		}
	}

	const selectedSuppliers = suppliers.filter((s) =>
		selectedIds.includes(s.supplierId),
	)

	return (
		<div className="flex flex-col gap-1.5">
			{/* Selected supplier pills */}
			{selectedSuppliers.length > 0 && (
				<div className="flex flex-wrap gap-1">
					{selectedSuppliers.map((s) => (
						<SupplierPill
							key={s.supplierId}
							name={s.supplierName}
							tier={s.tier}
							onRemove={() => toggleSupplier(s.supplierId)}
						/>
					))}
				</div>
			)}

			{/* Search + dropdown */}
			<ComboBox
				inputValue={search}
				onInputChange={setSearch}
				menuTrigger="focus"
			>
				<Label className="sr-only">
					{t('procurement.inquiry.searchSuppliers')}
				</Label>
				<Input
					placeholder={t('procurement.inquiry.searchSuppliers')}
					className="w-full border-b border-black/[0.06] bg-transparent py-1 text-[13px] outline-none transition-colors placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] dark:border-white/[0.06]"
				/>
				<Popover
					aria-label="Select supplier"
					className="w-[var(--trigger-width)] rounded-xl border border-black/[0.06] bg-white/95 shadow-xl dark:border-white/[0.06] dark:bg-black/95"
				>
					<ListBox
						className="max-h-60 overflow-auto p-1"
						renderEmptyState={() => (
							<div className="px-3 py-2 text-[12px] text-[var(--color-text-subtle)]">
								{t('procurement.inquiry.noSuppliersFound')}
							</div>
						)}
					>
						{filtered.map((supplier) => {
							const isSelected = selectedIds.includes(supplier.supplierId)
							return (
								<ListBoxItem
									key={supplier.supplierId}
									id={supplier.supplierId}
									textValue={supplier.supplierName}
									onAction={() => toggleSupplier(supplier.supplierId)}
									className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 outline-none transition-colors
                    data-[hovered]:bg-black/[0.03] dark:data-[hovered]:bg-white/[0.03]
                    data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40"
								>
									{/* Check indicator */}
									<div
										className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm transition-colors ${
											isSelected
												? 'bg-[var(--color-primary)] text-white'
												: 'border border-black/[0.12] dark:border-white/[0.12]'
										}`}
									>
										{isSelected && (
											<svg
												aria-hidden="true"
												xmlns="http://www.w3.org/2000/svg"
												width="10"
												height="10"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="3"
												strokeLinecap="round"
												strokeLinejoin="round"
											>
												<path d="M20 6 9 17l-5-5" />
											</svg>
										)}
									</div>

									{/* Supplier info — single compact line */}
									<div className="flex flex-1 items-center gap-2 min-w-0">
										<span className="truncate text-[13px] font-medium text-[var(--color-text)]">
											{supplier.supplierName}
										</span>
										<span className="shrink-0 text-[11px] text-[var(--color-text-subtle)]">
											{t(`procurement.tier.${supplier.tier}`)}
										</span>
									</div>

									{/* Metrics */}
									<div className="flex shrink-0 items-center gap-2.5">
										<span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
											{supplier.onTimeDeliveryRate}%
										</span>
										<span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-muted)]">
											{supplier.overallScore}
										</span>
										<FreshnessIndicator
											freshness={getStockFreshness(
												supplier.avgResponseTimeDays,
											)}
											compact
										/>
									</div>
								</ListBoxItem>
							)
						})}
					</ListBox>
				</Popover>
			</ComboBox>
		</div>
	)
}
