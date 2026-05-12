import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
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
	mark: string
	title: string
	shortTitle: string
	dek: string
	shortDek: string
	attentionLabel: (count: number) => string
	attentionShortLabel: (count: number) => string
}

const CHAPTERS: Chapter[] = [
	{
		id: 'stock',
		mark: 'I',
		title: 'Stock',
		shortTitle: 'Stock',
		dek: 'levels and refills',
		shortDek: 'refill',
		attentionLabel: (count) =>
			count === 1 ? '1 item needs stock' : `${count} items need stock`,
		attentionShortLabel: (count) =>
			count === 1 ? '1 needs stock' : `${count} need stock`,
	},
	{
		id: 'procurement',
		mark: 'II',
		title: 'Price desk',
		shortTitle: 'Prices',
		dek: 'quotes and suppliers',
		shortDek: 'quotes',
		attentionLabel: (count) =>
			count === 1 ? '1 price waiting' : `${count} prices waiting`,
		attentionShortLabel: (count) =>
			count === 1 ? '1 price' : `${count} prices`,
	},
	{
		id: 'orders',
		mark: 'III',
		title: 'Orders',
		shortTitle: 'Orders',
		dek: 'approve for warehouse',
		shortDek: 'warehouse',
		attentionLabel: (count) =>
			count === 1 ? '1 order blocked' : `${count} orders blocked`,
		attentionShortLabel: (count) =>
			count === 1 ? '1 blocked' : `${count} blocked`,
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

	// Per-chapter attention count. A tab with work waiting gets a readable
	// callout line instead of a tiny badge competing with the label.
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
			className="relative border-b border-[var(--rule)] px-3 py-3 sm:px-6 lg:px-8"
		>
			<ul className="grid grid-cols-3 gap-2 sm:gap-3">
				{CHAPTERS.map((chapter) => {
					const isActive = chapter.id === activeTab
					const alert = attention[chapter.id]
					return (
						<li key={chapter.id} className="relative min-w-0">
							<Button
								onPress={() => setActiveTab(chapter.id)}
								aria-current={isActive ? 'page' : undefined}
								className={`group relative flex min-h-[76px] w-full min-w-0 flex-col justify-between gap-2 rounded-md border px-3 py-2.5 text-start outline-none transition-colors data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--compendium-brand)]/35 sm:min-h-[72px] sm:px-3.5 ${
									isActive
										? 'border-[var(--compendium-brand)]/55 bg-[var(--compendium-brand)]/[0.07]'
										: 'border-[var(--rule-soft)] bg-transparent hover:border-[var(--compendium-brand)]/25 hover:bg-[var(--compendium-brand)]/[0.035]'
								}`}
							>
								<div className="flex w-full min-w-0 items-center gap-2">
									<span
										className="shrink-0 font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold leading-none transition-colors"
										style={{
											color: isActive
												? 'var(--compendium-brand)'
												: 'var(--ink-mid)',
											letterSpacing: '0.08em',
										}}
									>
										{chapter.mark}
									</span>
									<span
										className="min-w-0 truncate font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase leading-tight transition-colors sm:hidden"
										style={{
											color: isActive ? 'var(--ink)' : 'var(--ink-soft)',
										}}
									>
										{chapter.shortTitle}
									</span>
									<span
										className="hidden min-w-0 truncate font-[family-name:var(--font-archivo)] text-[12px] font-semibold uppercase leading-tight transition-colors sm:block"
										style={{
											color: isActive ? 'var(--ink)' : 'var(--ink-soft)',
										}}
									>
										{chapter.title}
									</span>
								</div>
								{alert > 0 && (
									<span className="block w-full rounded-md bg-red-600/[0.09] px-2 py-1 font-[family-name:var(--font-archivo)] text-[10px] font-semibold leading-snug text-red-700 dark:text-red-300">
										<span className="sm:hidden">
											{chapter.attentionShortLabel(alert)}
										</span>
										<span className="hidden sm:inline">
											{chapter.attentionLabel(alert)}
										</span>
									</span>
								)}
								{alert === 0 && (
									<span
										className="block w-full truncate text-[10.5px] leading-snug transition-colors"
										style={{
											color: isActive ? 'var(--ink-soft)' : 'var(--ink-mid)',
										}}
									>
										<span className="sm:hidden">{chapter.shortDek}</span>
										<span className="hidden sm:inline">{chapter.dek}</span>
									</span>
								)}
							</Button>

							{isActive && (
								<motion.span
									layoutId="compendium-tab-rule"
									aria-hidden="true"
									className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] rounded-b-md bg-[var(--compendium-brand)]"
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
