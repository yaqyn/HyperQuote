import { useWarehouseStore } from '../../stores/warehouse'
import { WarehousePrepFlow } from './WarehousePrepFlow'
import { WarehouseQueue } from './WarehouseQueue'
import { WarehouseReceivingFlow } from './WarehouseReceivingFlow'
import { WarehouseReceivingQueue } from './WarehouseReceivingQueue'

/**
 * Warehouse dock — tablet-first surface for the warehouse advisor.
 *
 * Two tabs sharing the same steel-grid backdrop:
 *   • LOADING · OUTGOING — customer orders being loaded onto trucks
 *   • RECEIVING · INCOMING — supplier deals arriving at the dock
 *
 * The tab switch is part of the queue masthead so the advisor swaps
 * context in one tap.
 */
export function WarehouseModule() {
	const activeTab = useWarehouseStore((s) => s.activeTab)
	const selectedQuoteId = useWarehouseStore((s) => s.selectedQuoteId)
	const selectedDealId = useWarehouseStore((s) => s.selectedDealId)

	return (
		<div className="relative flex h-full flex-col bg-[var(--color-surface)] text-[var(--color-text)]">
			{/* Steel-grid backdrop — pale grid on white, still reads as a
			    dock floor without fighting the content. */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 opacity-[0.055]"
				style={{
					backgroundImage:
						'linear-gradient(var(--color-text) 1px, transparent 1px), linear-gradient(90deg, var(--color-text) 1px, transparent 1px)',
					backgroundSize: '48px 48px',
				}}
			/>

			<div className="relative flex flex-1 min-h-0 overflow-hidden">
				{activeTab === 'loading' ? (
					<>
						<WarehouseQueue />
						<WarehousePrepFlow quoteId={selectedQuoteId} />
					</>
				) : (
					<>
						<WarehouseReceivingQueue />
						<WarehouseReceivingFlow dealId={selectedDealId} />
					</>
				)}
			</div>
		</div>
	)
}
