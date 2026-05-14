import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import {
	Slider,
	SliderOutput,
	SliderThumb,
	SliderTrack,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { normalizeDecimalInput } from '../../../lib/inputs'
import type { QuoteItem } from '../../../types/sales'
import {
	clampSalesMargin,
	getSalesMarginColor,
	SALES_MARGIN_CAP_PERCENT,
} from '../marginPalette'
import { getMockLineItems } from './mockQuoteData'

// ─── Calculation ────────────────────────────────────────────

function recalculateItem(
	item: QuoteItem,
	newMargin: number,
): { sellPrice: number; lineTotal: number } {
	const sellPrice =
		Math.round(item.supplierCost * (1 + newMargin / 100) * 100) / 100
	const lineTotal = Math.round(sellPrice * item.quantity * 100) / 100
	return { sellPrice, lineTotal }
}

// ─── Component ──────────────────────────────────────────────

interface WhatIfCalculatorProps {
	/** Reserved — future server wiring will fetch per-quote overrides. */
	quoteId?: string
	onApplyMargins?: () => void
}

export function WhatIfCalculator({ onApplyMargins }: WhatIfCalculatorProps) {
	const { t } = useTranslation('internal')
	const [baseItems] = useState(getMockLineItems)
	const [blanketMargin, setBlanketMargin] = useState(18)
	const [perItemMargins, setPerItemMargins] = useState<Record<string, number>>(
		{},
	)
	const [showPerItem, setShowPerItem] = useState(false)

	const currentSubtotal = useMemo(
		() => baseItems.reduce((sum, item) => sum + item.lineTotal, 0),
		[baseItems],
	)
	const currentVat = Math.round(currentSubtotal * 14) / 100
	const currentTotal = currentSubtotal + currentVat

	const whatIfResults = useMemo(() => {
		return baseItems.map((item) => {
			const margin = perItemMargins[item.id] ?? blanketMargin
			return { item, margin, ...recalculateItem(item, margin) }
		})
	}, [baseItems, blanketMargin, perItemMargins])

	const newSubtotal = whatIfResults.reduce((sum, r) => sum + r.lineTotal, 0)
	const vatAmount = Math.round(newSubtotal * 14) / 100
	const newTotal = newSubtotal + vatAmount
	const totalCost = baseItems.reduce(
		(sum, item) => sum + item.supplierCost * item.quantity,
		0,
	)
	const newProfit = newSubtotal - totalCost
	const newBlendedMargin =
		totalCost > 0 ? ((newSubtotal - totalCost) / totalCost) * 100 : 0
	const diffFromCurrent = newTotal - currentTotal

	function handlePerItemMarginChange(itemId: string, margin: number) {
		setPerItemMargins((prev) => ({ ...prev, [itemId]: margin }))
	}

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="border-b border-black/[0.06] px-5 py-3 dark:border-white/[0.06]">
				<h3 className="text-[13px] font-semibold text-[var(--color-text)]">
					{t('sales.negotiation.whatIfCalculator', 'What-If Calculator')}
				</h3>
			</div>

			<div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
				{/* Blanket Margin */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<span className="text-[11px] font-medium text-[var(--color-text-muted)]">
							{t('sales.negotiation.blanketMargin', 'Blanket Margin')}
						</span>
						<span
							className="font-[family-name:var(--font-geist-mono)] text-[15px] font-bold tabular-nums"
							style={{ color: getSalesMarginColor(blanketMargin) }}
						>
							{blanketMargin}%
						</span>
					</div>

					<Slider
						value={blanketMargin}
						onChange={(val: number) => {
							setBlanketMargin(clampSalesMargin(val))
							setPerItemMargins({})
						}}
						minValue={0}
						maxValue={SALES_MARGIN_CAP_PERCENT}
						step={0.5}
						className="w-full"
					>
						<SliderOutput className="sr-only" />
						<SliderTrack className="relative h-1 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.06]">
							<div
								className="absolute h-full rounded-full"
								style={{
									width: `${(blanketMargin / SALES_MARGIN_CAP_PERCENT) * 100}%`,
									backgroundColor: getSalesMarginColor(blanketMargin),
								}}
							/>
							<SliderThumb
								className="top-1/2 size-4 cursor-grab rounded-full border-2 bg-white shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 dark:bg-[var(--color-surface)]"
								style={{ borderColor: getSalesMarginColor(blanketMargin) }}
							/>
						</SliderTrack>
					</Slider>

					<input
						type="text"
						inputMode="decimal"
						value={blanketMargin}
						onChange={(e) => {
							const val = Number.parseFloat(
								normalizeDecimalInput(e.target.value),
							)
							if (!Number.isNaN(val) && val >= 0) {
								setBlanketMargin(clampSalesMargin(val))
								setPerItemMargins({})
							}
						}}
						min={0}
						max={SALES_MARGIN_CAP_PERCENT}
						step={0.5}
						style={{ color: getSalesMarginColor(blanketMargin) }}
						className="w-full rounded-lg border border-black/[0.06] bg-transparent px-3 py-1.5 text-center font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] dark:border-white/[0.06]"
					/>
				</div>

				{/* Results */}
				<div className="space-y-3">
					<div className="flex justify-between">
						<span className="text-[13px] text-[var(--color-text-muted)]">
							{t('sales.negotiation.newTotal', 'New Total')}
						</span>
						<span className="font-[family-name:var(--font-geist-mono)] text-[15px] font-bold tabular-nums text-[var(--color-text)]">
							EGP {newTotal.toLocaleString('en-EG')}
						</span>
					</div>

					<div className="flex justify-between">
						<span className="text-[13px] text-[var(--color-text-muted)]">
							{t('sales.negotiation.newProfit', 'Profit')}
						</span>
						<span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
							EGP {newProfit.toLocaleString('en-EG')}
						</span>
					</div>

					<div className="flex justify-between">
						<span className="text-[13px] text-[var(--color-text-muted)]">
							{t('sales.negotiation.blendedMargin', 'Blended Margin')}
						</span>
						<span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
							{newBlendedMargin.toFixed(1)}%
						</span>
					</div>

					<div className="border-t border-black/[0.04] pt-3 dark:border-white/[0.04]">
						<div className="flex justify-between">
							<span className="text-[13px] text-[var(--color-text-muted)]">
								{t('sales.negotiation.vsCurrent', 'vs Current')}
							</span>
							<span
								className={[
									'font-[family-name:var(--font-geist-mono)] text-[13px] font-bold tabular-nums',
									diffFromCurrent > 0
										? 'text-green-600 dark:text-green-400'
										: diffFromCurrent < 0
											? 'text-red-600 dark:text-red-400'
											: 'text-[var(--color-text)]',
								].join(' ')}
							>
								{diffFromCurrent >= 0 ? '+' : ''}EGP{' '}
								{diffFromCurrent.toLocaleString('en-EG')}
							</span>
						</div>
					</div>
				</div>

				{/* Per-Item Adjustments (collapsed) */}
				<div>
					<button
						type="button"
						onClick={() => setShowPerItem(!showPerItem)}
						className="text-[11px] text-[var(--color-primary)] transition-colors hover:underline"
					>
						{showPerItem
							? t('sales.negotiation.hidePerItem', 'Hide per-item adjustments')
							: t('sales.negotiation.showPerItem', 'Per-item adjustments')}
					</button>

					<AnimatePresence>
						{showPerItem && (
							<motion.div
								initial={{ height: 0, opacity: 0 }}
								animate={{ height: 'auto', opacity: 1 }}
								exit={{ height: 0, opacity: 0 }}
								transition={{ duration: 0.2 }}
								className="overflow-hidden"
							>
								<div className="mt-3 space-y-2">
									{whatIfResults.map(({ item, sellPrice, lineTotal }) => (
										<div
											key={item.id}
											className="space-y-1.5 rounded-lg border border-black/[0.04] p-3 dark:border-white/[0.04]"
										>
											<div className="truncate text-[11px] font-medium text-[var(--color-text)]">
												{item.productName}
											</div>
											<div className="flex items-center gap-2">
												<input
													type="text"
													inputMode="decimal"
													value={perItemMargins[item.id] ?? blanketMargin}
													onChange={(e) => {
														const val = Number.parseFloat(
															normalizeDecimalInput(e.target.value),
														)
														if (!Number.isNaN(val) && val >= 0) {
															handlePerItemMarginChange(
																item.id,
																clampSalesMargin(val),
															)
														}
													}}
													min={0}
													max={SALES_MARGIN_CAP_PERCENT}
													step={0.5}
													className="w-16 rounded-md border border-black/[0.06] bg-transparent px-2 py-1 text-center font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] dark:border-white/[0.06]"
													style={{
														color: getSalesMarginColor(
															perItemMargins[item.id] ?? blanketMargin,
														),
													}}
												/>
												<span className="text-[11px] text-[var(--color-text-subtle)]">
													%
												</span>
												<div className="flex-1 text-end">
													<span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text)]">
														{sellPrice.toLocaleString('en-EG')}
													</span>
													<span className="ms-2 font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
														({lineTotal.toLocaleString('en-EG')})
													</span>
												</div>
											</div>
										</div>
									))}
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</div>

			{/* Apply */}
			<div className="border-t border-black/[0.06] px-5 py-3 dark:border-white/[0.06]">
				<button
					type="button"
					onClick={onApplyMargins}
					className="w-full rounded-full bg-[var(--color-primary)] py-2 text-[13px] font-medium text-white transition-colors hover:bg-[var(--color-primary)]/90"
				>
					{t('sales.negotiation.applyMargins', 'Apply These Margins')}
				</button>
			</div>
		</div>
	)
}
