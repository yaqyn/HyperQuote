import type {
	MatchStatus,
	ThreeWayMatchResult,
} from '../../../types/procurement'

interface ThreeWayMatchProps {
	match: ThreeWayMatchResult
}

function formatVariance(value: number): string {
	return `${(value * 100).toFixed(1)}%`
}

/**
 * Three-way match display (READ-ONLY per Pitfall 5).
 * Side-by-side comparison: PO | Receipt | Invoice
 * Matched = subtle green bg, mismatched = subtle yellow bg.
 */
export function ThreeWayMatch({ match }: ThreeWayMatchProps) {
	const comparisons = [
		{
			label: 'PO vs Receipt',
			status: match.poVsReceipt,
			variance: match.variances.quantityVariance,
		},
		{
			label: 'PO vs Invoice',
			status: match.poVsInvoice,
			variance: match.variances.priceVariance,
		},
		{
			label: 'Receipt vs Invoice',
			status: match.receiptVsInvoice,
			variance: match.variances.taxVariance,
		},
	]

	return (
		<section>
			<div className="flex items-center justify-between mb-3">
				<h4 className="text-[11px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30">
					Three-Way Match
				</h4>
				<OverallBadge status={match.overall} />
			</div>

			{/* Comparison cards */}
			<div className="grid grid-cols-3 gap-2">
				{comparisons.map((comp) => (
					<div
						key={comp.label}
						className={`
              rounded-xl p-3 transition-colors
              ${
								comp.status === 'matched'
									? 'bg-green-500/[0.04]'
									: comp.status === 'mismatch'
										? 'bg-yellow-500/[0.06]'
										: 'bg-black/[0.015] dark:bg-white/[0.015]'
							}
            `}
					>
						<div className="text-[10px] text-black/35 dark:text-white/35">
							{comp.label}
						</div>
						<div className="mt-1.5 flex items-center justify-between">
							<span className="font-[family-name:var(--font-geist-mono)] text-sm font-medium tabular-nums text-black/70 dark:text-white/70">
								{formatVariance(comp.variance)}
							</span>
							<StatusDot status={comp.status} />
						</div>
					</div>
				))}
			</div>

			{/* Tolerance thresholds */}
			<div className="mt-2 flex gap-4 text-[9px] text-black/20 dark:text-white/20">
				<span>Price tolerance: 0-5%</span>
				<span>Qty tolerance: 0-2%</span>
				<span>Tax tolerance: 0%</span>
			</div>
		</section>
	)
}

function OverallBadge({ status }: { status: MatchStatus }) {
	const config: Record<MatchStatus, { label: string; color: string }> = {
		matched: { label: 'Matched', color: 'text-green-600/70' },
		partial_match: { label: 'Partial', color: 'text-yellow-600/70' },
		mismatch: { label: 'Mismatch', color: 'text-red-600/70' },
		pending: { label: 'Pending', color: 'text-black/30 dark:text-white/30' },
	}

	const c = config[status]
	return <span className={`text-[10px] font-medium ${c.color}`}>{c.label}</span>
}

function StatusDot({ status }: { status: MatchStatus }) {
	const colors: Record<MatchStatus, string> = {
		matched: 'bg-green-500',
		partial_match: 'bg-yellow-500',
		mismatch: 'bg-red-500',
		pending: 'bg-black/15 dark:bg-white/15',
	}

	const labels: Record<MatchStatus, string> = {
		matched: 'Matched',
		partial_match: 'Partial match',
		mismatch: 'Mismatch',
		pending: 'Pending',
	}

	return (
		<span
			className={`size-1.5 rounded-full ${colors[status]}`}
			title={labels[status]}
			role="img"
			aria-label={labels[status]}
		/>
	)
}
