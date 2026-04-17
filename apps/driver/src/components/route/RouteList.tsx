import { motion, useMotionValue, useTransform } from 'motion/react'
import { useRef, useState } from 'react'
import type { RouteStop } from '@/stores/route'
import { StopCard } from './StopCard'

interface RouteListProps {
	stops: RouteStop[]
	currentStopId: string | null
	fullScreen?: boolean
}

export function RouteList({
	stops,
	currentStopId,
	fullScreen = false,
}: RouteListProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const [expanded, setExpanded] = useState(false)
	const dragY = useMotionValue(0)

	// Transform drag position to sheet height percentage
	const sheetHeight = useTransform(dragY, [-200, 0], ['100%', '40%'])

	if (fullScreen) {
		return (
			<div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4">
				{stops.map((stop) => (
					<StopCard
						key={stop.id}
						stop={stop}
						isCurrent={stop.id === currentStopId}
					/>
				))}
			</div>
		)
	}

	return (
		<motion.div
			ref={containerRef}
			className="absolute inset-x-0 bottom-0 flex flex-col rounded-t-2xl bg-[var(--bg-primary)] shadow-lg"
			style={{ height: expanded ? '100%' : sheetHeight }}
			initial={{ y: 0 }}
			animate={{ y: 0 }}
			transition={{ type: 'spring', stiffness: 200, damping: 20 }}
		>
			{/* Drag handle */}
			<button
				type="button"
				className="flex w-full justify-center py-3 cursor-grab active:cursor-grabbing bg-transparent border-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue)] focus-visible:ring-offset-2"
				aria-expanded={expanded}
				aria-label="Toggle route list"
				onClick={() => setExpanded((prev) => !prev)}
			>
				<div className="h-1 w-10 rounded-full bg-[var(--text-tertiary)]" />
			</button>

			{/* Stop list */}
			<div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 pb-[var(--safe-bottom)]">
				{stops.map((stop) => (
					<StopCard
						key={stop.id}
						stop={stop}
						isCurrent={stop.id === currentStopId}
					/>
				))}
			</div>
		</motion.div>
	)
}
