import { useState } from 'react'
import { Button } from 'react-aria-components'
import type { MarginThresholds } from '../../../types/sales'
import { getMarginLevel } from '../../../types/sales'
import type { LineItemFormValues } from './types'

interface MarginControlPanelProps {
	lineItems: LineItemFormValues[]
	marginThresholds: MarginThresholds[]
	onSetBlanketMargin: (margin: number) => void
}

const QUICK_MARGINS = [15, 18, 20]

function getApprovalStatus(
	blendedMargin: number,
	totalValue: number,
	thresholds: MarginThresholds[],
): { label: string; style: string } {
	const ref = thresholds[0] ?? { target: 18, floor: 12, absoluteMin: 8 }

	let marginApproval = 'auto'
	if (blendedMargin < ref.absoluteMin) marginApproval = 'ceo'
	else if (blendedMargin < ref.floor) marginApproval = 'vp'
	else if (blendedMargin < ref.target) marginApproval = 'manager'

	let valueApproval = 'auto'
	if (totalValue > 50_000_000) valueApproval = 'ceo'
	else if (totalValue > 10_000_000) valueApproval = 'director'
	else if (totalValue > 2_500_000) valueApproval = 'manager'

	const levels = ['auto', 'manager', 'director', 'vp', 'ceo']
	const highest =
		levels.indexOf(marginApproval) > levels.indexOf(valueApproval)
			? marginApproval
			: valueApproval

	switch (highest) {
		case 'ceo':
			return { label: 'CEO Approval', style: 'text-red-700 dark:text-red-400' }
		case 'vp':
		case 'director':
			return {
				label: 'Director/VP Approval',
				style: 'text-red-700 dark:text-red-400',
			}
		case 'manager':
			return {
				label: 'Manager Approval',
				style: 'text-yellow-700 dark:text-yellow-400',
			}
		default:
			return {
				label: 'Auto-approved',
				style: 'text-green-700 dark:text-green-400',
			}
	}
}

/**
 * MarginControlPanel -- Sticky right sidebar.
 * Hero blended margin, margin bar, approval status, quick-adjust pills, what-if calculator.
 */
export function MarginControlPanel({
	lineItems,
	marginThresholds,
	onSetBlanketMargin,
}: MarginControlPanelProps) {
	const [whatIfOpen, setWhatIfOpen] = useState(false)
	const [whatIfMode, setWhatIfMode] = useState<'margin' | 'counter'>('margin')
	const [whatIfMargin, setWhatIfMargin] = useState<number>(18)
	const [counterDiscount, setCounterDiscount] = useState<number>(5)

	// Weighted blended margin
	const totalCost = lineItems.reduce(
		(sum, item) => sum + item.supplierCost * item.quantity,
		0,
	)
	const totalRevenue = lineItems.reduce(
		(sum, item) => sum + (item.lineTotal || 0),
		0,
	)
	const blendedMargin =
		totalRevenue > 0
			? Math.round((1 - totalCost / totalRevenue) * 10000) / 100
			: 0
	const profit = totalRevenue - totalCost

	const targetMargin =
		marginThresholds.length > 0
			? Math.round(
					(marginThresholds.reduce((sum, t) => sum + t.target, 0) /
						marginThresholds.length) *
						100,
				) / 100
			: 18
	const floorMargin =
		marginThresholds.length > 0
			? Math.round(
					(marginThresholds.reduce((sum, t) => sum + t.floor, 0) /
						marginThresholds.length) *
						100,
				) / 100
			: 12

	const marginLevel =
		marginThresholds.length > 0
			? getMarginLevel(blendedMargin, marginThresholds[0])
			: getMarginLevel(blendedMargin, {
					productCategory: 'default',
					target: 18,
					floor: 12,
					absoluteMin: 8,
				})

	const approvalStatus = getApprovalStatus(
		blendedMargin,
		totalRevenue,
		marginThresholds,
	)

	// What-if calculations
	const effectiveWhatIfMargin =
		whatIfMode === 'counter'
			? Math.round(
					(1 - totalCost / (totalRevenue * (1 - counterDiscount / 100))) *
						10000,
				) / 100
			: whatIfMargin
	const whatIfRevenue =
		whatIfMode === 'counter'
			? Math.round(totalRevenue * (1 - counterDiscount / 100))
			: totalCost > 0
				? Math.round(totalCost / (1 - whatIfMargin / 100))
				: 0
	const whatIfProfit = whatIfRevenue - totalCost
	const revenueImpact = whatIfRevenue - totalRevenue
	const whatIfApproval = getApprovalStatus(
		whatIfMode === 'counter' ? effectiveWhatIfMargin : whatIfMargin,
		whatIfRevenue,
		marginThresholds,
	)

	const heroColor = {
		green: 'text-green-600 dark:text-green-400',
		yellow: 'text-yellow-600 dark:text-yellow-400',
		red: 'text-red-600 dark:text-red-400',
		blocked: 'text-red-600 dark:text-red-400',
	}[marginLevel]

	// Bar position: map margin % to 0-100% of bar width
	// Bar spans from 0% to max(targetMargin + 10, blendedMargin + 5)
	const barMax = Math.max(targetMargin + 10, blendedMargin + 5, 30)
	const marginPos = Math.min(Math.max((blendedMargin / barMax) * 100, 0), 100)
	const targetPos = (targetMargin / barMax) * 100
	const floorPos = (floorMargin / barMax) * 100

	return (
		<div className="sticky top-0 flex flex-col gap-6">
			{/* Hero margin number */}
			<div className="flex flex-col items-center gap-1 pt-2">
				<p
					className={`font-[family-name:var(--font-geist-mono)] text-[36px] font-semibold leading-none tabular-nums ${heroColor}`}
				>
					{blendedMargin}%
				</p>
				<p className="text-[11px] text-[var(--color-text-subtle)]">
					blended margin
				</p>
			</div>

			{/* Margin bar */}
			<div className="relative h-2 w-full rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
				{/* Floor marker */}
				<div
					className="absolute top-0 h-full w-px bg-red-400/60"
					style={{ left: `${floorPos}%` }}
				/>
				{/* Target marker */}
				<div
					className="absolute top-0 h-full w-px bg-green-500/60"
					style={{ left: `${targetPos}%` }}
				/>
				{/* Current position */}
				<div
					className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm dark:border-black ${
						marginLevel === 'green'
							? 'bg-green-500'
							: marginLevel === 'yellow'
								? 'bg-yellow-500'
								: 'bg-red-500'
					}`}
					style={{ left: `${marginPos}%` }}
				/>
				{/* Labels below bar */}
				<div className="absolute -bottom-4 flex w-full justify-between">
					<span
						className="absolute text-[9px] text-[var(--color-text-subtle)]"
						style={{ left: `${floorPos}%`, transform: 'translateX(-50%)' }}
					>
						{floorMargin}%
					</span>
					<span
						className="absolute text-[9px] text-[var(--color-text-subtle)]"
						style={{ left: `${targetPos}%`, transform: 'translateX(-50%)' }}
					>
						{targetMargin}%
					</span>
				</div>
			</div>

			{/* Profit */}
			<div className="mt-3 flex items-center justify-between">
				<span className="text-[11px] text-[var(--color-text-subtle)]">
					Profit
				</span>
				<span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-medium tabular-nums">
					EGP {profit.toLocaleString('en-EG', { minimumFractionDigits: 0 })}
				</span>
			</div>

			{/* Approval status -- simple text */}
			<div className="flex items-center justify-between">
				<span className="text-[11px] text-[var(--color-text-subtle)]">
					Approval
				</span>
				<span className={`text-[12px] font-medium ${approvalStatus.style}`}>
					{approvalStatus.label}
				</span>
			</div>

			{/* Quick adjust pills */}
			<div className="flex flex-col gap-2">
				<p className="text-[11px] text-[var(--color-text-subtle)]">
					Quick adjust
				</p>
				<div className="flex gap-1.5">
					{QUICK_MARGINS.map((m) => (
						<Button
							key={m}
							className={`flex-1 rounded-full py-1.5 font-[family-name:var(--font-geist-mono)] text-[11px] font-medium tabular-nums outline-none transition-colors
                data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50
                ${
									Math.round(blendedMargin) === m
										? 'bg-[var(--color-primary)] text-white'
										: 'bg-black/[0.04] text-[var(--color-text-muted)] data-[hovered]:bg-black/[0.08] dark:bg-white/[0.06] dark:data-[hovered]:bg-white/[0.1]'
								}`}
							onPress={() => onSetBlanketMargin(m)}
						>
							{m}%
						</Button>
					))}
				</div>
			</div>

			{/* What-if calculator -- collapsible */}
			<div>
				<button
					type="button"
					onClick={() => setWhatIfOpen(!whatIfOpen)}
					className="flex w-full items-center justify-between text-[11px] font-medium text-[var(--color-text-subtle)] transition-colors hover:text-[var(--color-text-muted)]"
				>
					<span>What-if calculator</span>
					<svg
						width="12"
						height="12"
						viewBox="0 0 12 12"
						fill="none"
						className={`transition-transform ${whatIfOpen ? 'rotate-180' : ''}`}
						aria-hidden="true"
					>
						<path
							d="M3 4.5l3 3 3-3"
							stroke="currentColor"
							strokeWidth="1.25"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</button>

				{whatIfOpen && (
					<div className="mt-3 flex flex-col gap-3">
						{/* Mode toggle */}
						<div className="flex gap-1 rounded-lg bg-black/[0.04] p-0.5 dark:bg-white/[0.06]">
							<button
								type="button"
								onClick={() => setWhatIfMode('margin')}
								className={`flex-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all ${
									whatIfMode === 'margin'
										? 'bg-white shadow-sm dark:bg-black'
										: 'text-[var(--color-text-muted)]'
								}`}
							>
								Set margin to Y%
							</button>
							<button
								type="button"
								onClick={() => setWhatIfMode('counter')}
								className={`flex-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all ${
									whatIfMode === 'counter'
										? 'bg-white shadow-sm dark:bg-black'
										: 'text-[var(--color-text-muted)]'
								}`}
							>
								Customer counters -X%
							</button>
						</div>

						{/* Input */}
						{whatIfMode === 'margin' ? (
							<div className="flex items-center gap-2">
								<input
									type="range"
									min={0}
									max={50}
									step={0.5}
									value={whatIfMargin}
									onChange={(e) => setWhatIfMargin(Number(e.target.value))}
									className="flex-1 accent-[var(--color-primary)]"
								/>
								<span className="w-12 text-end font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums">
									{whatIfMargin}%
								</span>
							</div>
						) : (
							<div className="flex items-center gap-2">
								<input
									type="range"
									min={1}
									max={30}
									step={0.5}
									value={counterDiscount}
									onChange={(e) => setCounterDiscount(Number(e.target.value))}
									className="flex-1 accent-[var(--color-primary)]"
								/>
								<span className="w-12 text-end font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums">
									-{counterDiscount}%
								</span>
							</div>
						)}

						{/* Results */}
						<div className="space-y-1.5 border-t border-black/[0.06] pt-2 dark:border-white/[0.06]">
							<div className="flex items-center justify-between text-[11px]">
								<span className="text-[var(--color-text-subtle)]">
									New total
								</span>
								<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
									EGP{' '}
									{whatIfRevenue.toLocaleString('en-EG', {
										minimumFractionDigits: 0,
									})}
								</span>
							</div>
							<div className="flex items-center justify-between text-[11px]">
								<span className="text-[var(--color-text-subtle)]">
									New margin
								</span>
								<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
									{whatIfMode === 'counter'
										? effectiveWhatIfMargin
										: whatIfMargin}
									%
								</span>
							</div>
							<div className="flex items-center justify-between text-[11px]">
								<span className="text-[var(--color-text-subtle)]">Profit</span>
								<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
									EGP{' '}
									{whatIfProfit.toLocaleString('en-EG', {
										minimumFractionDigits: 0,
									})}
								</span>
							</div>
							<div className="flex items-center justify-between text-[11px]">
								<span className="text-[var(--color-text-subtle)]">
									Revenue impact
								</span>
								<span
									className={`font-[family-name:var(--font-geist-mono)] tabular-nums ${
										revenueImpact >= 0
											? 'text-green-600 dark:text-green-400'
											: 'text-red-600 dark:text-red-400'
									}`}
								>
									{revenueImpact >= 0 ? '+' : ''}EGP{' '}
									{revenueImpact.toLocaleString('en-EG', {
										minimumFractionDigits: 0,
									})}
								</span>
							</div>
							<div className="flex items-center justify-between text-[11px]">
								<span className="text-[var(--color-text-subtle)]">
									Approval
								</span>
								<span className={`font-medium ${whatIfApproval.style}`}>
									{whatIfApproval.label}
								</span>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
