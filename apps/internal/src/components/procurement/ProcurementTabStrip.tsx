import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Button } from 'react-aria-components'
import { getInventoryOverview } from '../../lib/server/inventory'
import { getCustomerOrdersList } from '../../lib/server/orders'
import { getStockOverview } from '../../lib/server/stock'
import { useProcurementStore } from '../../stores/procurement'

/**
 * The compendium's three chapters. The id values match the existing store
 * contract so shortcuts and persisted state remain intact.
 *
 */
interface Chapter {
	id: 'stock' | 'procurement' | 'orders'
	title: string
}

const CHAPTERS: Chapter[] = [
	{
		id: 'stock',
		title: 'Stock',
	},
	{
		id: 'procurement',
		title: 'Prices',
	},
	{
		id: 'orders',
		title: 'Orders',
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
			aria-label="Inventory sections"
			className="relative border-b border-[var(--rule-soft)] px-3 py-2 sm:px-6 lg:px-8"
		>
			<ul className="flex min-w-0 gap-1">
				{CHAPTERS.map((chapter) => {
					const isActive = chapter.id === activeTab
					const alert = attention[chapter.id]
					return (
						<li key={chapter.id} className="relative min-w-0 flex-1">
							<Button
								onPress={() => setActiveTab(chapter.id)}
								aria-current={isActive ? 'page' : undefined}
								className={`group relative flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-md px-3 text-start outline-none transition-colors data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--compendium-brand)]/35 ${
									isActive
										? 'bg-black/[0.035] text-[var(--ink)]'
										: 'text-[var(--ink-soft)] hover:bg-black/[0.025]'
								}`}
							>
								<span className="min-w-0 truncate font-[family-name:var(--font-archivo)] text-[12px] font-semibold leading-none">
									{chapter.title}
								</span>
								{alert > 0 && (
									<span className="shrink-0 rounded-sm bg-[var(--compendium-attention)]/[0.1] px-1.5 py-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold tabular-nums text-[var(--compendium-attention)]">
										{alert}
									</span>
								)}
							</Button>
						</li>
					)
				})}
			</ul>
		</nav>
	)
}
