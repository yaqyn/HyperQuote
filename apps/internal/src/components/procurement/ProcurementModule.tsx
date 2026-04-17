import { AnimatePresence, motion } from 'motion/react'
import { useProcurementStore } from '../../stores/procurement'
import { InventoryView } from './inventory/InventoryView'
import { OrdersView } from './orders/OrdersView'
import { ProcurementShortcuts } from './ProcurementShortcuts'
import { ProcurementTabStrip } from './ProcurementTabStrip'
import { StockView } from './stock/StockView'

export function ProcurementModule() {
	const activeTab = useProcurementStore((s) => s.activeTab)

	const tabContent: Record<string, React.ReactNode> = {
		stock: <StockView />,
		procurement: <InventoryView />,
		orders: <OrdersView />,
	}

	return (
		<div className="flex flex-col h-full">
			<ProcurementShortcuts />

			<div className="shrink-0 pt-1 pb-2">
				<ProcurementTabStrip />
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
						{tabContent[activeTab] ?? (
							<div className="flex items-center justify-center h-full">
								<p className="text-sm text-[var(--color-text-subtle)]">
									Coming soon
								</p>
							</div>
						)}
					</motion.div>
				</AnimatePresence>
			</div>
		</div>
	)
}
