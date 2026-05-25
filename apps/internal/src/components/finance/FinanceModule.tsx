import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useFinanceStore } from '../../stores/finance'
import { FinanceAccountingView } from './FinanceAccountingView'
import { FinancePaymentsView } from './FinancePaymentsView'
import { FinanceTabStrip } from './FinanceTabStrip'

/**
 * Finance pairs operational payment collection with the accounting
 * subledger. The shared theme keeps money-in, money-out, and journal
 * views visually aligned without implying every payment row is a ledger.
 */
export function FinanceModule() {
	const activeTab = useFinanceStore((s) => s.activeTab)

	const tabContent: Record<string, ReactNode> = {
		payments: <FinancePaymentsView />,
		accounting: <FinanceAccountingView />,
	}

	return (
		<div className="ledger-theme flex h-full flex-col bg-[var(--color-surface)]">
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
						<FinanceTabStrip />
						{tabContent[activeTab] ?? null}
					</motion.div>
				</AnimatePresence>
			</div>
		</div>
	)
}
