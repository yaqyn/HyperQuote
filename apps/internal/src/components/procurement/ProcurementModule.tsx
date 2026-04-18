import { AnimatePresence, motion } from 'motion/react'
import { useProcurementStore } from '../../stores/procurement'
import { CompendiumIndex } from './CompendiumIndex'
import { InventoryView } from './inventory/InventoryView'
import { OrdersView } from './orders/OrdersView'
import { ProcurementShortcuts } from './ProcurementShortcuts'
import { ProcurementTabStrip } from './ProcurementTabStrip'
import { StockView } from './stock/StockView'

/**
 * The Compendium — the inventory employee's working folio. A persistent
 * left index keeps the volume oriented; the right spread holds the
 * current chapter (Atlas · Desk · Commitments). The shell never moves —
 * only the spread folios turn.
 */
export function ProcurementModule() {
	const activeTab = useProcurementStore((s) => s.activeTab)

	const chapter: Record<string, React.ReactNode> = {
		stock: <StockView />,
		procurement: <InventoryView />,
		orders: <OrdersView />,
	}

	return (
		<div className="compendium-theme compendium-paper relative flex h-full text-[var(--ink)]">
			<ProcurementShortcuts />

			{/* Persistent index — left rail */}
			<CompendiumIndex />

			{/* Spread — tab strip + chapter content */}
			<div className="relative flex flex-1 min-w-0 flex-col">
				<div className="shrink-0">
					<ProcurementTabStrip />
				</div>

				<div
					className="relative flex-1 min-h-0 overflow-hidden"
					data-module-content
				>
					<AnimatePresence mode="wait">
						<motion.div
							key={activeTab}
							initial={{ opacity: 0, y: 4 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -2 }}
							transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
							className="absolute inset-0"
						>
							{chapter[activeTab] ?? (
								<div className="flex h-full items-center justify-center">
									<p
										className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-soft)]"
										style={{ fontSize: '13px' }}
									>
										this chapter is still being written.
									</p>
								</div>
							)}
						</motion.div>
					</AnimatePresence>
				</div>
			</div>
		</div>
	)
}
