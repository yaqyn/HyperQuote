import { motion } from 'motion/react'
import type { PipelineStage, PipelineStageId } from '../../../types/sales'

interface PipelineFunnelProps {
	stages: PipelineStage[]
}

const FUNNEL_STAGE_ORDER: PipelineStageId[] = [
	'rfq_received',
	'reviewing',
	'sourcing',
	'quoting',
	'sent',
	'negotiating',
	'closing',
	'won',
]

const formatValue = (value: number) => {
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
	if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
	return new Intl.NumberFormat('en-EG', {
		style: 'currency',
		currency: 'EGP',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(value)
}

function getBarOpacity(index: number, total: number): number {
	// Blue gradient: 100% opacity at top -> 15% at bottom (before won)
	const ratio = 1 - index / (total - 1)
	return Math.max(0.15, ratio)
}

export function PipelineFunnel({ stages }: PipelineFunnelProps) {
	// Filter to funnel stages (exclude lost_expired) and compute data
	const funnelStages = FUNNEL_STAGE_ORDER.map((id) => {
		const stage = stages.find((s) => s.id === id)
		return {
			id,
			name: stage?.name ?? id.replace('_', ' '),
			dealCount: stage?.dealCount ?? 0,
			totalValue: stage?.totalValue ?? 0,
		}
	})

	// Find max count for proportional widths
	const maxCount = Math.max(...funnelStages.map((s) => s.dealCount), 1)

	// Compute conversion rates between consecutive stages
	const conversionRates: number[] = []
	for (let i = 0; i < funnelStages.length - 1; i++) {
		const fromCount = funnelStages[i].dealCount
		const toCount = funnelStages[i + 1].dealCount
		conversionRates.push(
			fromCount > 0 ? Math.round((toCount / fromCount) * 100) : 0,
		)
	}

	// Lost stage
	const lostStage = stages.find((s) => s.id === 'lost_expired')

	return (
		<div className="flex h-full flex-col overflow-y-auto px-6 py-6">
			<div className="mx-auto w-full max-w-3xl">
				{funnelStages.map((stage, index) => {
					// Real funnel shape: bar width proportional to deal count, dramatic narrowing
					const widthPercent =
						maxCount > 0
							? Math.max(12, Math.round((stage.dealCount / maxCount) * 100))
							: 12

					const isWon = stage.id === 'won'
					const opacity = getBarOpacity(index, funnelStages.length)

					return (
						<div key={stage.id}>
							{/* Stage bar -- centered, actual narrowing funnel */}
							<motion.div
								initial={{ opacity: 0, scaleX: 0.8 }}
								animate={{ opacity: 1, scaleX: 1 }}
								transition={{
									duration: 0.2,
									delay: index * 0.03,
									ease: 'easeOut',
								}}
								className="mx-auto flex items-center justify-between rounded-lg px-4 py-2.5"
								style={{
									width: `${widthPercent}%`,
									backgroundColor: isWon
										? 'rgba(34, 197, 94, 0.12)'
										: `rgba(37, 99, 235, ${opacity})`,
								}}
							>
								<span className="text-[12px] font-medium text-white mix-blend-difference">
									{stage.name}
								</span>
								<div className="flex items-center gap-3">
									<span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[13px] font-semibold text-white mix-blend-difference">
										{stage.dealCount}
									</span>
									<span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-white/60 mix-blend-difference">
										{formatValue(stage.totalValue)}
									</span>
								</div>
							</motion.div>

							{/* Conversion connector between stages */}
							{index < funnelStages.length - 1 && (
								<div className="flex justify-center py-0.5">
									<span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-black/25 dark:text-white/25">
										{conversionRates[index]}%
									</span>
								</div>
							)}
						</div>
					)
				})}

				{/* Lost/Expired -- barely visible bar at 10% opacity */}
				{lostStage && lostStage.dealCount > 0 && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.2, delay: funnelStages.length * 0.03 }}
						className="mx-auto mt-4 flex items-center justify-between rounded-lg bg-red-500/[0.06] px-4 py-2.5 dark:bg-red-500/[0.08]"
						style={{
							width: `${Math.max(12, Math.round((lostStage.dealCount / maxCount) * 100))}%`,
						}}
					>
						<span className="text-[12px] font-medium text-red-500/60">
							{lostStage.name}
						</span>
						<div className="flex items-center gap-3">
							<span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[13px] font-semibold text-red-500/60">
								{lostStage.dealCount}
							</span>
							<span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-red-500/35">
								{formatValue(lostStage.totalValue)}
							</span>
						</div>
					</motion.div>
				)}
			</div>
		</div>
	)
}
