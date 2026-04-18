import { AnimatePresence, motion } from 'motion/react'
import { useFinanceStore } from '../../stores/finance'
import { FinanceDealsOrdersView } from './FinanceDealsOrdersView'
import { FinanceTabStrip } from './FinanceTabStrip'

/**
 * The Ledger — finance's volume of record. Dual-pipeline intake for
 * customer orders (money in) and supplier deals (money out), with a
 * history register coming later. Scoped under `.ledger-theme` so
 * every descendant inherits the register's accent tokens without
 * touching component code.
 */
export function FinanceModule() {
	const activeTab = useFinanceStore((s) => s.activeTab)

	const tabContent: Record<string, React.ReactNode> = {
		'deals-orders': <FinanceDealsOrdersView />,
		history: <HistoryPlaceholder />,
	}

	return (
		<div className="ledger-theme flex h-full flex-col bg-[var(--color-surface)]">
			<div className="shrink-0">
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
		<div className="flex h-full items-center justify-center px-10">
			<p
				className="font-[family-name:var(--font-bricolage)] italic text-[var(--color-text-subtle)]"
				style={{ fontSize: '14px', letterSpacing: '-0.008em' }}
			>
				the archives · a volume still in binding.
			</p>
		</div>
	)
}
