import { motion } from 'motion/react'
import type { PipelineDeal } from '../../../types/sales'

interface KanbanCardProps {
	deal: PipelineDeal
	onSelect: (deal: PipelineDeal) => void
}

function getStatusDotColor(color: PipelineDeal['color']): string {
	switch (color) {
		case 'green':
			return 'bg-green-500'
		case 'yellow':
			return 'bg-yellow-500'
		case 'red':
			return 'bg-red-500'
		default:
			return 'bg-black/15 dark:bg-white/15'
	}
}

function getDaysColor(days: number): string {
	if (days < 5) return 'text-green-600 dark:text-green-400'
	if (days <= 15) return 'text-yellow-600 dark:text-yellow-400'
	return 'text-red-600 dark:text-red-400'
}

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

export function KanbanCard({ deal, onSelect }: KanbanCardProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.15, ease: 'easeOut' }}
			role="button"
			tabIndex={0}
			onClick={() => onSelect(deal)}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					onSelect(deal)
				}
			}}
			className="group/card cursor-grab rounded px-2 py-1.5 transition-colors hover:bg-black/[0.03] active:cursor-grabbing dark:hover:bg-white/[0.03]"
		>
			{/* Line 1: status dot + customer name + value right-aligned */}
			<div className="flex items-center gap-1.5">
				<span
					className={`h-1.5 w-1.5 shrink-0 rounded-full ${getStatusDotColor(deal.color)}`}
				/>
				<span className="truncate text-[13px] font-medium text-black dark:text-white">
					{deal.customerName}
				</span>
				<span className="ms-auto shrink-0 font-[family-name:var(--font-geist-mono)] tabular-nums text-[12px] text-black/50 dark:text-white/50">
					{formatValue(deal.dealValue)}
				</span>
			</div>

			{/* Line 2: assigned rep + days-in-stage. Action buttons fade in on hover. */}
			<div className="mt-0.5 flex items-center ps-3">
				<span className="text-[11px] text-black/30 dark:text-white/30">
					{deal.assignedRep
						.split(' ')
						.map((n) => n[0])
						.join('')
						.slice(0, 2)}
				</span>
				<span className="mx-1.5 text-[11px] text-black/10 dark:text-white/10">
					/
				</span>
				<span
					className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] ${getDaysColor(deal.daysInStage)}`}
				>
					{deal.daysInStage}d
				</span>

				{/* Hover actions -- fade in */}
				<div className="ms-auto flex items-center gap-1 opacity-0 transition-opacity group-hover/card:opacity-100">
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation()
							onSelect(deal)
						}}
						className="text-[10px] font-medium text-[#2563EB]"
					>
						Open
					</button>
				</div>
			</div>
		</motion.div>
	)
}
