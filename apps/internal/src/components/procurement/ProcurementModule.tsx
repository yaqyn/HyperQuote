import { AnimatePresence, cubicBezier, motion } from 'motion/react'
import { useEffect } from 'react'
import { setEmployeePresence } from '../../lib/server/employee-presence'
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

	useEffect(() => {
		let cancelled = false

		const currentStatus = (): 'online' | 'away' => {
			if (document.visibilityState !== 'visible') return 'away'
			if (document.querySelector('[data-away-lock="true"]')) return 'away'
			return 'online'
		}

		const syncPresence = async (status = currentStatus()) => {
			try {
				await setEmployeePresence({
					data: {
						activePanel: status === 'online' ? 'inventory' : undefined,
						status,
					},
				})
			} catch {
				return
			}
		}

		void syncPresence()
		const interval = window.setInterval(() => {
			if (!cancelled) void syncPresence()
		}, 25_000)
		const handlePresenceChange = () => {
			void syncPresence()
		}
		document.addEventListener('visibilitychange', handlePresenceChange)
		window.addEventListener('focus', handlePresenceChange)
		window.addEventListener('internal-away-state-change', handlePresenceChange)

		return () => {
			cancelled = true
			window.clearInterval(interval)
			document.removeEventListener('visibilitychange', handlePresenceChange)
			window.removeEventListener('focus', handlePresenceChange)
			window.removeEventListener(
				'internal-away-state-change',
				handlePresenceChange,
			)
			void setEmployeePresence({
				data: { status: 'offline' },
			}).catch(() => undefined)
		}
	}, [])

	const chapter: Record<string, React.ReactNode> = {
		stock: <StockView />,
		procurement: <InventoryView />,
		orders: <OrdersView />,
	}

	return (
		<div className="compendium-theme compendium-paper relative flex h-full flex-col overflow-hidden text-[var(--ink)] lg:flex-row">
			<ProcurementShortcuts />

			{/* Persistent index — left rail on desktop, bounded top shelf below it. */}
			<CompendiumIndex />

			{/* Spread — tab strip + chapter content */}
			<div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
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
							transition={{
								duration: 0.22,
								ease: cubicBezier(0.16, 1, 0.3, 1),
							}}
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
