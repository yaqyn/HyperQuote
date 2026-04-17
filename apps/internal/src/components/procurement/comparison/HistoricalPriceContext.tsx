import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { getHistoricalPrices } from '../../../lib/server/procurement-comparison'
import type { HistoricalPurchase } from '../../../types/procurement'

interface HistoricalPriceContextProps {
	productId: string
}

/**
 * Inline mini sparkline + price history table.
 * Rendered inside the expanded comparison row.
 */
export function HistoricalPriceContext({
	productId,
}: HistoricalPriceContextProps) {
	const { i18n } = useTranslation()
	const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'

	const { data, isLoading } = useQuery({
		queryKey: ['historical-prices', productId],
		queryFn: () => getHistoricalPrices({ data: { productId, limit: 5 } }),
		staleTime: 60_000,
	})

	const history = data?.history ?? []

	const fmtPrice = (n: number) =>
		new Intl.NumberFormat(locale, {
			style: 'currency',
			currency: 'EGP',
			maximumFractionDigits: 0,
		}).format(n)

	const fmtDate = (iso: string) =>
		new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(
			new Date(iso),
		)

	if (isLoading) {
		return (
			<div className="py-2 text-[11px] text-black/25 dark:text-white/25">
				Loading history...
			</div>
		)
	}

	if (history.length === 0) {
		return (
			<div className="py-2 text-[11px] text-black/25 dark:text-white/25">
				No purchase history
			</div>
		)
	}

	// Build sparkline points
	const prices = history.map((h) => h.unitPrice)
	const minP = Math.min(...prices)
	const maxP = Math.max(...prices)
	const range = maxP - minP || 1
	const sparkW = 80
	const sparkH = 20
	const points = prices.map((p, i) => {
		const x = (i / Math.max(prices.length - 1, 1)) * sparkW
		const y = sparkH - ((p - minP) / range) * sparkH
		return `${x},${y}`
	})

	return (
		<motion.div
			initial={{ opacity: 0, height: 0 }}
			animate={{ opacity: 1, height: 'auto' }}
			exit={{ opacity: 0, height: 0 }}
			transition={{ duration: 0.2, ease: 'easeOut' }}
			className="pt-1"
		>
			<div className="flex items-start gap-6">
				{/* Sparkline */}
				<div className="pt-1">
					<svg
						aria-hidden="true"
						width={sparkW}
						height={sparkH}
						className="overflow-visible"
					>
						<polyline
							points={points.join(' ')}
							fill="none"
							stroke="var(--color-black, #000)"
							strokeOpacity={0.15}
							strokeWidth={1.5}
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						{points.map((pt, i) => {
							const [cx, cy] = pt.split(',').map(Number)
							return (
								<circle
									key={pt}
									cx={cx}
									cy={cy}
									r={2}
									fill={
										i === prices.length - 1
											? '#2563EB'
											: 'var(--color-black, #000)'
									}
									fillOpacity={i === prices.length - 1 ? 1 : 0.2}
								/>
							)
						})}
					</svg>
				</div>

				{/* History rows */}
				<div className="flex-1 space-y-0.5">
					{history.map((h) => (
						<div
							key={`${h.date}-${h.supplierId}`}
							className="flex items-center gap-4 text-[11px]"
						>
							<span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-black/35 dark:text-white/35 w-14">
								{fmtDate(h.date)}
							</span>
							<span className="text-black/50 dark:text-white/50 flex-1 truncate">
								{h.supplierName}
							</span>
							<span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-black/70 dark:text-white/70">
								{fmtPrice(h.unitPrice)}
							</span>
							<DeliveryDot performance={h.deliveryPerformance} />
						</div>
					))}
				</div>
			</div>
		</motion.div>
	)
}

function DeliveryDot({
	performance,
}: {
	performance: HistoricalPurchase['deliveryPerformance']
}) {
	const colors: Record<string, string> = {
		on_time: 'bg-green-500',
		early: 'bg-yellow-500',
		late: 'bg-red-500',
	}

	const labels: Record<string, string> = {
		on_time: 'On time',
		early: 'Early',
		late: 'Late',
	}

	return (
		<span
			role="img"
			className={`size-1.5 rounded-full ${colors[performance]}`}
			title={labels[performance]}
			aria-label={labels[performance]}
		/>
	)
}
