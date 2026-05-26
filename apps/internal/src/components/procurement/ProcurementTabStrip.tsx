import { Button } from 'react-aria-components/Button'
import { useProcurementStore } from '../../stores/procurement'
import type { ProcurementTab } from '../../types/procurement'
import { useProcurementOverview } from './useProcurementOverview'

/**
 * The compendium's three chapters. The id values match the existing store
 * contract so shortcuts and persisted state remain intact.
 *
 */
interface Chapter {
	id: ProcurementTab
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
	{
		id: 'damaged',
		title: 'Damaged',
	},
]

export function ProcurementTabStrip() {
	const activeTab = useProcurementStore((s) => s.activeTab)
	const setActiveTab = useProcurementStore((s) => s.setActiveTab)
	const { totals } = useProcurementOverview()

	return (
		<nav
			aria-label="Inventory sections"
			className="relative border-b border-[var(--rule-soft)] px-3 py-2 sm:px-6 lg:px-8"
		>
			<ul className="flex min-w-0 gap-1">
				{CHAPTERS.map((chapter) => {
					const isActive = chapter.id === activeTab
					const alert = totals.attention[chapter.id]
					const hasPendingPriceRequest =
						chapter.id === 'procurement' && totals.pendingRequests > 0
					return (
						<li key={chapter.id} className="relative min-w-0 flex-1">
							<Button
								onPress={() => setActiveTab(chapter.id)}
								aria-current={isActive ? 'page' : undefined}
								className={`group relative flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-md px-3 text-start outline-none transition-colors data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--compendium-brand)]/35 ${
									hasPendingPriceRequest
										? 'bg-red-500/[0.1] text-red-700 hover:bg-red-500/[0.14] dark:text-red-300'
										: isActive
											? 'bg-black/[0.035] text-[var(--ink)]'
											: 'text-[var(--ink-soft)] hover:bg-black/[0.025]'
								}`}
							>
								<span className="min-w-0 truncate font-[family-name:var(--font-archivo)] text-[12px] font-semibold leading-none">
									{chapter.title}
								</span>
								{alert > 0 && (
									<span
										className={`shrink-0 rounded-sm px-1.5 py-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold tabular-nums ${
											hasPendingPriceRequest
												? 'bg-red-500/[0.14] text-red-700 dark:text-red-300'
												: 'bg-[var(--compendium-attention)]/[0.1] text-[var(--compendium-attention)]'
										}`}
									>
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
