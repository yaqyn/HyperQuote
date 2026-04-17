import { AnimatePresence, motion } from 'motion/react'
import { useFinanceStore } from '../../stores/finance'
import { FinanceDealsOrdersView } from './FinanceDealsOrdersView'
import { FinanceTabStrip } from './FinanceTabStrip'

export function FinanceModule() {
	const activeTab = useFinanceStore((s) => s.activeTab)

	const tabContent: Record<string, React.ReactNode> = {
		'deals-orders': <FinanceDealsOrdersView />,
		history: <HistoryPlaceholder />,
	}

	return (
		<div className="flex flex-col h-full">
			<div className="shrink-0 pt-1 pb-2">
				<FinanceTabStrip />
			</div>

			<div
				className="relative flex-1 min-h-0 overflow-hidden"
				data-module-content
			>
				<AnimatePresence mode="wait">
					<motion.div
						key={activeTab}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.14, ease: 'easeOut' }}
						className="absolute inset-0 overflow-y-auto overflow-x-hidden"
					>
						{tabContent[activeTab] ?? null}
					</motion.div>
				</AnimatePresence>
			</div>
		</div>
	)
}

function HistoryPlaceholder() {
	return (
		<div className="flex h-full items-center justify-center">
			<p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
				History · coming soon
			</p>
		</div>
	)
}
