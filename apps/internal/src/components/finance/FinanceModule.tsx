import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
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

	const tabContent: Record<string, ReactNode> = {
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
			<div className="max-w-[360px] text-center">
				<p
					className="font-[family-name:var(--font-bricolage)] font-semibold text-[var(--color-text)]"
					style={{ fontSize: '16px' }}
				>
					History is not connected yet
				</p>
				<p
					className="mt-1 font-[family-name:var(--font-bricolage)] text-[var(--color-text-subtle)]"
					style={{ fontSize: '12.5px', lineHeight: 1.5 }}
				>
					Settled receipts and supplier payments will appear here when the
					archive source is ready.
				</p>
			</div>
		</div>
	)
}
