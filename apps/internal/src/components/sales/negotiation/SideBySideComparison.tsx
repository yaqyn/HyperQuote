import { useTranslation } from 'react-i18next'
import { getMockVersionItems } from './mockQuoteData'

// ─── Helpers ────────────────────────────────────────────────

function diffColor(a: number, b: number): string {
	if (b < a) return 'text-green-600 dark:text-green-400'
	if (b > a) return 'text-red-600 dark:text-red-400'
	return 'text-[var(--color-text-subtle)]'
}

function formatDelta(a: number, b: number): string {
	const diff = b - a
	if (diff === 0) return '--'
	const sign = diff > 0 ? '+' : ''
	return `${sign}${diff.toLocaleString('en-EG')}`
}

function hasChanged(a: number, b: number): boolean {
	return a !== b
}

// ─── Component ──────────────────────────────────────────────

interface SideBySideComparisonProps {
	versionAId: string
	versionBId: string
}

export function SideBySideComparison({
	versionAId,
	versionBId,
}: SideBySideComparisonProps) {
	const { t } = useTranslation('internal')
	const versionA = getMockVersionItems(versionAId)
	const versionB = getMockVersionItems(versionBId)

	const lineItems = versionA.items.map((itemA, idx) => {
		const itemB = versionB.items[idx]
		return { itemA, itemB }
	})

	return (
		<div className="flex-1 overflow-auto">
			{/* Header */}
			<div className="border-b border-black/[0.06] px-5 py-3 dark:border-white/[0.06]">
				<h3 className="text-[13px] font-semibold text-[var(--color-text)]">
					{t('sales.negotiation.comparison', 'Comparison')}
				</h3>
			</div>

			{/* Two-column comparison */}
			<div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
				{lineItems.map(({ itemA, itemB }) => {
					const changed = itemB && hasChanged(itemA.sellPrice, itemB.sellPrice)

					return (
						<div
							key={itemA.id}
							className={[
								'grid grid-cols-2 gap-0',
								changed ? 'bg-yellow-50/50 dark:bg-yellow-500/[0.03]' : '',
							].join(' ')}
						>
							{/* Version A */}
							<div className="border-e border-black/[0.04] px-5 py-3 dark:border-white/[0.04]">
								<div className="text-[13px] font-medium text-[var(--color-text)]">
									{itemA.productName}
								</div>
								<div className="mt-0.5 text-[11px] text-[var(--color-text-subtle)]">
									{itemA.quantity} {itemA.unit}
								</div>
								<div className="mt-1 flex items-baseline justify-between">
									<span className="font-[family-name:var(--font-geist-mono)] text-[15px] font-semibold tabular-nums text-[var(--color-text)]">
										{itemA.sellPrice.toLocaleString('en-EG')}
									</span>
									<span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
										{itemA.lineTotal.toLocaleString('en-EG')}
									</span>
								</div>
							</div>

							{/* Version B */}
							<div className="px-5 py-3">
								<div className="text-[13px] font-medium text-[var(--color-text)]">
									{itemB?.productName ?? '--'}
								</div>
								<div className="mt-0.5 text-[11px] text-[var(--color-text-subtle)]">
									{itemB ? `${itemB.quantity} ${itemB.unit}` : ''}
								</div>
								<div className="mt-1 flex items-baseline justify-between">
									<span className="font-[family-name:var(--font-geist-mono)] text-[15px] font-semibold tabular-nums text-[var(--color-text)]">
										{itemB?.sellPrice.toLocaleString('en-EG') ?? '--'}
									</span>
									<div className="flex items-baseline gap-2">
										{itemB && (
											<span
												className={`font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums ${diffColor(itemA.sellPrice, itemB.sellPrice)}`}
											>
												{formatDelta(itemA.sellPrice, itemB.sellPrice)}
											</span>
										)}
										<span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
											{itemB?.lineTotal.toLocaleString('en-EG') ?? ''}
										</span>
									</div>
								</div>
								{/* Customer counter if present */}
								{itemB?.customerCounterPrice && (
									<div className="mt-1 flex items-center gap-1.5">
										<span className="text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)]">
											Counter
										</span>
										<span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-muted)]">
											{itemB.customerCounterPrice.toLocaleString('en-EG')}
										</span>
									</div>
								)}
							</div>
						</div>
					)
				})}
			</div>

			{/* Totals */}
			<div className="border-t border-black/[0.06] dark:border-white/[0.06]">
				{/* Subtotal */}
				<div className="grid grid-cols-2">
					<div className="border-e border-black/[0.04] px-5 py-2 dark:border-white/[0.04]">
						<div className="flex justify-between text-[13px]">
							<span className="text-[var(--color-text-muted)]">
								{t('sales.negotiation.subtotal', 'Subtotal')}
							</span>
							<span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">
								{versionA.subtotal.toLocaleString('en-EG')}
							</span>
						</div>
					</div>
					<div className="px-5 py-2">
						<div className="flex justify-between text-[13px]">
							<span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">
								{versionB.subtotal.toLocaleString('en-EG')}
							</span>
							<span
								className={`font-[family-name:var(--font-geist-mono)] tabular-nums ${diffColor(versionA.subtotal, versionB.subtotal)}`}
							>
								{formatDelta(versionA.subtotal, versionB.subtotal)}
							</span>
						</div>
					</div>
				</div>

				{/* VAT */}
				<div className="grid grid-cols-2">
					<div className="border-e border-black/[0.04] px-5 py-1.5 dark:border-white/[0.04]">
						<div className="flex justify-between text-[11px] text-[var(--color-text-subtle)]">
							<span>{t('sales.negotiation.vat14', 'VAT 14%')}</span>
							<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
								{versionA.vatAmount.toLocaleString('en-EG')}
							</span>
						</div>
					</div>
					<div className="px-5 py-1.5">
						<div className="flex justify-between text-[11px] text-[var(--color-text-subtle)]">
							<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
								{versionB.vatAmount.toLocaleString('en-EG')}
							</span>
							<span
								className={`font-[family-name:var(--font-geist-mono)] tabular-nums ${diffColor(versionA.vatAmount, versionB.vatAmount)}`}
							>
								{formatDelta(versionA.vatAmount, versionB.vatAmount)}
							</span>
						</div>
					</div>
				</div>

				{/* Total */}
				<div className="grid grid-cols-2 border-t border-black/[0.06] dark:border-white/[0.06]">
					<div className="border-e border-black/[0.04] px-5 py-3 dark:border-white/[0.04]">
						<div className="flex justify-between">
							<span className="text-[13px] font-semibold text-[var(--color-text)]">
								{t('sales.negotiation.total', 'Total')}
							</span>
							<span className="font-[family-name:var(--font-geist-mono)] text-[15px] font-bold tabular-nums text-[var(--color-text)]">
								EGP {versionA.total.toLocaleString('en-EG')}
							</span>
						</div>
					</div>
					<div className="px-5 py-3">
						<div className="flex justify-between">
							<span className="font-[family-name:var(--font-geist-mono)] text-[15px] font-bold tabular-nums text-[var(--color-text)]">
								EGP {versionB.total.toLocaleString('en-EG')}
							</span>
							<span
								className={`font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums ${diffColor(versionA.total, versionB.total)}`}
							>
								{formatDelta(versionA.total, versionB.total)}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
