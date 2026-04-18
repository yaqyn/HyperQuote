import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { useMemo } from 'react'
import { Button } from 'react-aria-components'
import { getInventoryOverview } from '../../lib/server/inventory'
import { getCustomerOrdersList } from '../../lib/server/orders'
import { getStockOverview } from '../../lib/server/stock'
import { useProcurementStore } from '../../stores/procurement'

/**
 * The compendium's three chapters. The vocabulary is deliberately editorial
 * — Atlas, Desk, Commitments — each paired with a Roman numeral and a
 * short italic dek that names the work that happens there.
 *
 * The tab id values match the existing store contract so shortcuts and
 * persisted state remain intact.
 */
interface Chapter {
	id: 'stock' | 'procurement' | 'orders'
	mark: string
	title: string
	dek: string
}

const CHAPTERS: Chapter[] = [
	{
		id: 'stock',
		mark: 'I',
		title: 'Atlas',
		dek: 'every material at rest',
	},
	{
		id: 'procurement',
		mark: 'II',
		title: 'Desk',
		dek: 'prices · suppliers · the phone',
	},
	{
		id: 'orders',
		mark: 'III',
		title: 'Commitments',
		dek: 'orders awaiting the shelf',
	},
]

export function ProcurementTabStrip() {
	const activeTab = useProcurementStore((s) => s.activeTab)
	const setActiveTab = useProcurementStore((s) => s.setActiveTab)

	const stockQuery = useQuery({
		queryKey: ['stock-overview'],
		queryFn: () => getStockOverview({ data: {} }),
		staleTime: 30_000,
	})
	const inventoryQuery = useQuery({
		queryKey: ['inventory-overview'],
		queryFn: () => getInventoryOverview({ data: {} }),
		staleTime: 30_000,
	})
	const ordersQuery = useQuery({
		queryKey: ['customer-orders'],
		queryFn: () => getCustomerOrdersList({ data: {} }),
		staleTime: 30_000,
	})

	// Per-chapter attention count. A tab that needs attention shows a red
	// counter next to its Roman numeral — a quiet signal, not a shout.
	const attention = useMemo(() => {
		const out = stockQuery.data?.totals.out ?? 0
		const critical = stockQuery.data?.totals.critical ?? 0
		const urgentPrices = inventoryQuery.data?.totals.urgent ?? 0
		const pendingReq = inventoryQuery.data?.totals.pendingRequests ?? 0
		const blocked = ordersQuery.data?.totals.blocked ?? 0
		return {
			stock: out + critical,
			procurement: urgentPrices + pendingReq,
			orders: blocked,
		}
	}, [stockQuery.data, inventoryQuery.data, ordersQuery.data])

	return (
		<nav
			aria-label="Compendium chapters"
			className="relative border-b border-[var(--rule)] px-8 pt-3 pb-2"
		>
			<ul className="flex items-end gap-8">
				{CHAPTERS.map((chapter) => {
					const isActive = chapter.id === activeTab
					const alert = attention[chapter.id]
					return (
						<li key={chapter.id} className="relative pb-2">
							<Button
								onPress={() => setActiveTab(chapter.id)}
								aria-current={isActive ? 'page' : undefined}
								className="group relative flex items-baseline gap-2.5 text-start outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--compendium-brand)]/40 rounded-sm"
							>
								<span
									className="font-[family-name:var(--font-fraunces)] italic leading-none transition-colors"
									style={{
										fontSize: '11px',
										color: isActive
											? 'var(--compendium-brand)'
											: 'var(--ink-mid)',
										letterSpacing: '0.02em',
									}}
								>
									{chapter.mark}
								</span>
								<div className="flex flex-col">
									<span
										className="font-[family-name:var(--font-fraunces)] leading-none transition-colors"
										style={{
											fontSize: '19px',
											fontWeight: isActive ? 600 : 400,
											fontStyle: isActive ? 'normal' : 'italic',
											letterSpacing: '-0.012em',
											color: isActive ? 'var(--ink)' : 'var(--ink-soft)',
										}}
									>
										{chapter.title}
									</span>
									<span
										className="mt-1 font-[family-name:var(--font-fraunces)] italic transition-colors"
										style={{
											fontSize: '10.5px',
											color: isActive ? 'var(--ink-soft)' : 'var(--ink-mid)',
											letterSpacing: '0.005em',
										}}
									>
										{chapter.dek}
									</span>
								</div>
								{alert > 0 && (
									<span
										className="font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold tabular-nums leading-none text-[var(--compendium-stale)]"
										title={`${alert} items need attention`}
										style={{
											transform: 'translateY(-10px)',
										}}
									>
										{alert}
									</span>
								)}
							</Button>

							{isActive && (
								<motion.span
									layoutId="compendium-tab-rule"
									aria-hidden="true"
									className="absolute -bottom-[1px] left-0 right-0 h-[2px] rounded-[1px] bg-[var(--compendium-brand)]"
									transition={{
										type: 'spring',
										stiffness: 400,
										damping: 32,
									}}
								/>
							)}
						</li>
					)
				})}
			</ul>
		</nav>
	)
}
