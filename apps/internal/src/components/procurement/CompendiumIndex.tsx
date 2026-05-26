import { BROAD_CATEGORIES, type BroadCategory } from '@hyperquote/types'
import { useEffect, useState } from 'react'
import { useAIChatStore } from '../../stores/ai-chat'
import {
	type CompendiumCategory,
	useProcurementStore,
} from '../../stores/procurement'
import { EmployeeActionButton } from '../shared/EmployeeControls'
import { useProcurementOverview } from './useProcurementOverview'

const CATEGORY_LABELS: Record<BroadCategory, string> = {
	cement: 'Cement',
	steel: 'Steel',
	aggregates: 'Aggregates',
	bricks: 'Masonry',
	timber: 'Timber',
	finishing: 'Finishing',
}

export function CompendiumIndex() {
	const activeCategory = useProcurementStore((s) => s.activeCategory)
	const setActiveCategory = useProcurementStore((s) => s.setActiveCategory)
	const toggleAIChat = useAIChatStore((s) => s.toggle)
	const { stockQuery, inventoryQuery, totals } = useProcurementOverview()

	return (
		<aside
			aria-label="Inventory index"
			className="compendium-theme compendium-index compendium-foreedge relative hidden h-full min-h-0 w-[240px] shrink-0 flex-col overflow-hidden lg:flex"
		>
			<Masthead />

			<div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 sm:px-5">
				<SectionRule label="Materials" />
				<CategoryIndex
					activeCategory={activeCategory}
					setActiveCategory={setActiveCategory}
					totals={{
						total: totals.totalMaterials,
						outCritical: totals.outItems + totals.criticalItems,
						urgent: totals.urgentPrices,
					}}
					stockCategories={stockQuery.data?.categories ?? []}
					inventoryCategories={inventoryQuery.data?.categories ?? []}
				/>

				<SectionRule label="Attention" />
				<TodaysDesk
					urgentPrices={totals.urgentPrices}
					outdatedPrices={totals.outdatedPrices}
					pendingRequests={totals.pendingRequests}
					outItems={totals.outItems}
					criticalItems={totals.criticalItems}
					blockedOrders={totals.blockedOrders}
					readyOrders={totals.readyOrders}
					damagedOpenLots={totals.damagedOpenLots}
					combinedAlerts={totals.combinedAlerts}
				/>
			</div>

			<div className="border-t border-[var(--rule-soft)] px-4 py-3 sm:px-5">
				<EmployeeActionButton
					size="sm"
					tone="neutral"
					onClick={toggleAIChat}
					fullWidthOnMobile
					className="w-full"
					trailing={
						<kbd
							className="font-[family-name:var(--font-geist-mono)] text-[9px] tracking-wider opacity-75"
							aria-label="Command K"
						>
							⌘K
						</kbd>
					}
				>
					Ask Lyon AI
				</EmployeeActionButton>
			</div>
		</aside>
	)
}

// ─── Masthead ─────────────────────────────────────────────

function useCurrentDate() {
	const [now, setNow] = useState(() => new Date())
	useEffect(() => {
		const id = setInterval(() => setNow(new Date()), 30_000)
		return () => clearInterval(id)
	}, [])
	return now
}

function formatDate(date: Date): string {
	return date
		.toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
		})
		.toLowerCase()
}

function Masthead() {
	const now = useCurrentDate()
	return (
		<header className="border-b border-[var(--rule-soft)] px-4 py-5 sm:px-5">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<h2 className="truncate font-[family-name:var(--font-archivo)] text-[18px] font-semibold leading-none text-[var(--ink)]">
						Inventory
					</h2>
					<p className="mt-1 font-[family-name:var(--font-archivo)] text-[11px] text-[var(--ink-mid)]">
						Materials, prices, orders
					</p>
				</div>
				<span
					className="shrink-0 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.08em] text-[var(--ink-mid)]"
					suppressHydrationWarning
				>
					{formatDate(now)}
				</span>
			</div>
		</header>
	)
}

// ─── Section rule ────────────────────────────────────────

function SectionRule({ label }: { label: string }) {
	return (
		<div className="mt-5 mb-2 flex items-baseline gap-2">
			<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mid)]">
				{label}
			</span>
			<span aria-hidden="true" className="h-px flex-1 bg-[var(--rule-soft)]" />
		</div>
	)
}

// ─── Category index ──────────────────────────────────────

interface CategoryIndexProps {
	activeCategory: CompendiumCategory
	setActiveCategory: (c: CompendiumCategory) => void
	totals: { total: number; outCritical: number; urgent: number }
	stockCategories: Array<{
		id: BroadCategory
		totalCount: number
		criticalCount: number
		outCount: number
	}>
	inventoryCategories: Array<{
		id: BroadCategory
		urgentCount: number
		outdatedCount: number
	}>
}

function CategoryIndex({
	activeCategory,
	setActiveCategory,
	totals,
	stockCategories,
	inventoryCategories,
}: CategoryIndexProps) {
	return (
		<ul className="flex min-w-0 flex-col overflow-hidden">
			<IndexRow
				label="All materials"
				active={activeCategory === 'all'}
				count={totals.total}
				attention={totals.outCritical + totals.urgent}
				onPress={() => setActiveCategory('all')}
				isAll
			/>
			{BROAD_CATEGORIES.map((id) => {
				const stockCat = stockCategories.find((c) => c.id === id)
				const invCat = inventoryCategories.find((c) => c.id === id)
				const count = stockCat?.totalCount ?? 0
				const attention =
					(stockCat?.criticalCount ?? 0) +
					(stockCat?.outCount ?? 0) +
					(invCat?.urgentCount ?? 0)
				return (
					<IndexRow
						key={id}
						label={CATEGORY_LABELS[id]}
						active={activeCategory === id}
						count={count}
						attention={attention}
						onPress={() => setActiveCategory(id)}
					/>
				)
			})}
		</ul>
	)
}

function IndexRow({
	label,
	active,
	count,
	attention,
	onPress,
	isAll,
}: {
	label: string
	active: boolean
	count: number
	attention: number
	onPress: () => void
	isAll?: boolean
}) {
	const hasAlert = attention > 0
	return (
		<li>
			<button
				type="button"
				onClick={onPress}
				data-active={active ? 'true' : 'false'}
				className={`group flex min-h-9 w-full min-w-0 items-center gap-2 rounded-md px-2 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--compendium-brand)]/35 ${
					active ? 'bg-black/[0.035]' : 'hover:bg-black/[0.025]'
				}`}
			>
				<span
					className="min-w-0 truncate font-[family-name:var(--font-archivo)] text-[13px] leading-none text-[var(--ink)] transition-colors"
					style={{
						fontWeight: active || isAll ? 600 : 500,
						letterSpacing: '0',
					}}
				>
					{label}
				</span>
				<span aria-hidden="true" className="h-px min-w-0 flex-1" />
				<span
					className="shrink-0 font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums"
					style={{ color: active ? 'var(--ink)' : 'var(--ink-mid)' }}
				>
					{count.toString().padStart(2, '0')}
				</span>
				{hasAlert && (
					<span
						className="shrink-0 font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold tabular-nums leading-none text-[var(--compendium-attention)]"
						title={`${attention} items need attention`}
					>
						{attention}
					</span>
				)}
			</button>
		</li>
	)
}

// ─── Today's desk ────────────────────────────────────────

interface TodaysDeskProps {
	urgentPrices: number
	outdatedPrices: number
	pendingRequests: number
	outItems: number
	criticalItems: number
	blockedOrders: number
	readyOrders: number
	damagedOpenLots: number
	combinedAlerts: number
}

function TodaysDesk({
	urgentPrices,
	outdatedPrices,
	pendingRequests,
	outItems,
	criticalItems,
	blockedOrders,
	readyOrders,
	damagedOpenLots,
	combinedAlerts,
}: TodaysDeskProps) {
	const setActiveTab = useProcurementStore((s) => s.setActiveTab)

	if (combinedAlerts === 0) {
		return (
			<div className="mt-1 rounded-md border border-[var(--rule-soft)] px-3 py-3">
				<p className="font-[family-name:var(--font-archivo)] text-[12px] text-[var(--ink-soft)]">
					No active attention.
				</p>
				{readyOrders > 0 && (
					<button
						type="button"
						onClick={() => setActiveTab('orders')}
						className="mt-2 font-[family-name:var(--font-archivo)] text-[12px] text-[var(--compendium-brand)] outline-none hover:text-[var(--ink)] focus-visible:ring-2 focus-visible:ring-[var(--compendium-brand)]/35"
					>
						{readyOrders} order{readyOrders === 1 ? '' : 's'} ready
					</button>
				)}
			</div>
		)
	}

	return (
		<ul className="flex flex-col gap-1">
			{(outItems > 0 || criticalItems > 0) && (
				<DeskRow
					number={outItems + criticalItems}
					label={
						outItems === 0
							? `critical stock level${criticalItems === 1 ? '' : 's'}`
							: criticalItems === 0
								? `item${outItems === 1 ? '' : 's'} out of stock`
								: 'stock needs work'
					}
					onPress={() => setActiveTab('stock')}
				/>
			)}
			{urgentPrices > 0 && (
				<DeskRow
					number={urgentPrices}
					label={`urgent price${urgentPrices === 1 ? '' : 's'}`}
					onPress={() => setActiveTab('procurement')}
				/>
			)}
			{outdatedPrices - urgentPrices > 0 && (
				<DeskRow
					number={outdatedPrices - urgentPrices}
					label={`other outdated price${outdatedPrices - urgentPrices === 1 ? '' : 's'}`}
					onPress={() => setActiveTab('procurement')}
				/>
			)}
			{pendingRequests > 0 && (
				<DeskRow
					number={pendingRequests}
					label={`sales request${pendingRequests === 1 ? '' : 's'} waiting`}
					onPress={() => setActiveTab('procurement')}
				/>
			)}
			{blockedOrders > 0 && (
				<DeskRow
					number={blockedOrders}
					label={`order${blockedOrders === 1 ? '' : 's'} blocked on stock`}
					onPress={() => setActiveTab('orders')}
				/>
			)}
			{damagedOpenLots > 0 && (
				<DeskRow
					number={damagedOpenLots}
					label={`damaged lot${damagedOpenLots === 1 ? '' : 's'} open`}
					onPress={() => setActiveTab('damaged')}
				/>
			)}
			{readyOrders > 0 && (
				<DeskRow
					number={readyOrders}
					label={`order${readyOrders === 1 ? '' : 's'} ready`}
					onPress={() => setActiveTab('orders')}
				/>
			)}
		</ul>
	)
}

function DeskRow({
	number,
	label,
	onPress,
}: {
	number: number
	label: string
	onPress: () => void
}) {
	return (
		<li>
			<button
				type="button"
				onClick={onPress}
				className="group flex min-h-7 w-full items-center gap-3 rounded-md px-2 text-start outline-none transition-colors hover:bg-black/[0.025] focus-visible:ring-2 focus-visible:ring-[var(--compendium-brand)]/35"
			>
				<span
					className="font-[family-name:var(--font-geist-mono)] text-[12px] font-semibold tabular-nums leading-none text-[var(--compendium-attention)]"
					style={{ minWidth: '20px' }}
				>
					{number}
				</span>
				<span className="font-[family-name:var(--font-archivo)] text-[12px] leading-5 text-[var(--ink-soft)] transition-colors group-hover:text-[var(--ink)]">
					{label}
				</span>
			</button>
		</li>
	)
}
