import { useState } from 'react'
import { Button, Radio, RadioGroup } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { PriceComparison, SplitSource } from '../../../types/procurement'
import { HistoricalPriceContext } from './HistoricalPriceContext'
import { RankingBadge } from './RankingBadge'
import { SplitSourceDialog } from './SplitSourceDialog'

interface ComparisonRowProps {
	comparison: PriceComparison
	allSuppliers: { id: string; name: string }[]
	selectedSupplierId: string | null
	onSelectSupplier: (supplierId: string) => void
	onSplitSource: (split: SplitSource) => void
}

export function ComparisonRow({
	comparison,
	allSuppliers,
	selectedSupplierId,
	onSelectSupplier,
	onSplitSource,
}: ComparisonRowProps) {
	const { i18n } = useTranslation()
	const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'
	const [expanded, setExpanded] = useState(false)

	const fmtPrice = (n: number) =>
		new Intl.NumberFormat(locale, {
			style: 'currency',
			currency: 'EGP',
			maximumFractionDigits: 0,
		}).format(n)

	const fmtQty = (n: number) => new Intl.NumberFormat(locale).format(n)

	// Find best price among suppliers
	const bestPrice = Math.min(...comparison.suppliers.map((s) => s.unitPrice))

	// Build a map: supplierId -> supplier data
	const supplierMap = new Map(
		comparison.suppliers.map((s) => [s.supplierId, s]),
	)

	return (
		<div className="group">
			{/* Main row */}
			<RadioGroup
				value={selectedSupplierId ?? ''}
				onChange={onSelectSupplier}
				aria-label={`Supplier selection for ${comparison.productName}`}
			>
				<div className="flex items-stretch gap-px">
					{/* Product name cell */}
					<button
						type="button"
						onClick={() => setExpanded(!expanded)}
						className="w-48 shrink-0 pe-4 py-3 text-start outline-none"
					>
						<div className="text-sm font-medium text-black dark:text-white leading-tight">
							{comparison.productName}
						</div>
						<div className="mt-0.5 text-[11px] text-black/40 dark:text-white/40">
							<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
								{fmtQty(comparison.requestedQty)}
							</span>{' '}
							{comparison.uom}
						</div>
					</button>

					{/* Price cells — one per supplier column */}
					{allSuppliers.map((col) => {
						const supplier = supplierMap.get(col.id)
						if (!supplier) {
							// Supplier didn't quote this product
							return (
								<div
									key={col.id}
									className="flex-1 min-w-[120px] flex items-center justify-center py-3 px-2"
								>
									<span className="text-[11px] text-black/15 dark:text-white/15">
										--
									</span>
								</div>
							)
						}

						const isBest = supplier.unitPrice === bestPrice
						const isWorst =
							supplier.unitPrice ===
							Math.max(...comparison.suppliers.map((s) => s.unitPrice))
						const isSelected = selectedSupplierId === supplier.supplierId
						const delta = ((supplier.unitPrice - bestPrice) / bestPrice) * 100

						return (
							<Radio
								key={col.id}
								value={supplier.supplierId}
								aria-label={`${supplier.supplierName}: ${fmtPrice(supplier.unitPrice)}`}
								className={`
                  flex-1 min-w-[120px] flex flex-col items-center justify-center py-3 px-2 cursor-pointer
                  rounded-lg transition-colors outline-none
                  ${isSelected ? 'bg-[#2563EB]/[0.06]' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'}
                  ${isBest ? 'border-s-2 border-s-[#2563EB]' : ''}
                `}
							>
								{/* Price */}
								<div className="flex items-center gap-1.5">
									<RankingBadge rank={supplier.rank} />
									<span className="font-[family-name:var(--font-geist-mono)] text-sm font-semibold tabular-nums text-black dark:text-white">
										{fmtPrice(supplier.unitPrice)}
									</span>
								</div>
								{/* Delta */}
								{delta > 0 ? (
									<span
										className={`mt-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums ${isWorst ? 'text-red-500/70' : 'text-black/30 dark:text-white/30'}`}
									>
										+{delta.toFixed(1)}%
									</span>
								) : (
									<span className="mt-0.5 text-[10px] font-medium text-green-600/70 dark:text-green-400/70">
										Best
									</span>
								)}
								{/* Lead time + availability */}
								<div className="mt-1 flex items-center gap-2 text-[10px] text-black/30 dark:text-white/30">
									<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
										{supplier.leadTimeDays}d
									</span>
									{supplier.availableQty < comparison.requestedQty && (
										<span className="text-yellow-600/70 dark:text-yellow-400/70">
											{fmtQty(supplier.availableQty)} avail
										</span>
									)}
								</div>
							</Radio>
						)
					})}

					{/* Split button */}
					<div className="w-16 shrink-0 flex items-center justify-center">
						<SplitSourceDialog
							productId={comparison.productId}
							requestedQty={comparison.requestedQty}
							uom={comparison.uom}
							suppliers={comparison.suppliers}
							onConfirm={onSplitSource}
							trigger={
								<Button className="rounded-md px-2 py-1 text-[10px] font-medium text-black/40 outline-none transition-colors data-[hovered]:text-black/70 data-[hovered]:bg-black/[0.03] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 dark:text-white/40 dark:data-[hovered]:text-white/70 dark:data-[hovered]:bg-white/[0.03]">
									Split
								</Button>
							}
						/>
					</div>
				</div>
			</RadioGroup>

			{/* Expandable historical context */}
			{expanded && (
				<div className="ps-48 pb-3">
					<HistoricalPriceContext productId={comparison.productId} />
				</div>
			)}

			{/* Row separator */}
			<div className="h-px bg-black/[0.04] dark:bg-white/[0.04]" />
		</div>
	)
}
