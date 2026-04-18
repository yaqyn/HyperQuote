import { BROAD_CATEGORIES, type BroadCategory } from '@hyperquote/types'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { getInventoryOverview } from '../../lib/server/inventory'
import { getCustomerOrdersList } from '../../lib/server/orders'
import { getStockOverview } from '../../lib/server/stock'
import { useAIChatStore } from '../../stores/ai-chat'
import {
	type CompendiumCategory,
	useProcurementStore,
} from '../../stores/procurement'

const CATEGORY_LABELS: Record<BroadCategory, string> = {
	cement: 'Cement',
	steel: 'Steel',
	aggregates: 'Aggregates',
	bricks: 'Masonry',
	timber: 'Timber',
	finishing: 'Finishing',
}

/**
 * The compendium's index — a persistent left-column reference rail that
 * frames the inventory employee's home. Its role is three-fold:
 *
 *  1. A masthead that names the volume (The Compendium) and dates it.
 *  2. A live category thumb-index that drives a shared filter across
 *     all three tabs (Atlas · Desk · Commitments).
 *  3. A "today's desk" tally that folds the three overviews into one
 *     scannable personal ledger, so the employee always knows what's
 *     already waiting on them without changing tabs.
 *
 *  The rail is purposefully dense and typographic — it does more work
 *  than a decorative aside. Read like a book's thumb-tabbed fore-edge.
 */
export function CompendiumIndex() {
	const activeCategory = useProcurementStore((s) => s.activeCategory)
	const setActiveCategory = useProcurementStore((s) => s.setActiveCategory)
	const toggleAIChat = useAIChatStore((s) => s.toggle)

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

	const totalMaterials = stockQuery.data?.totals.total ?? 0
	const urgentPrices = inventoryQuery.data?.totals.urgent ?? 0
	const outdatedPrices = inventoryQuery.data?.totals.outdated ?? 0
	const pendingRequests = inventoryQuery.data?.totals.pendingRequests ?? 0
	const outItems = stockQuery.data?.totals.out ?? 0
	const criticalItems = stockQuery.data?.totals.critical ?? 0
	const blockedOrders = ordersQuery.data?.totals.blocked ?? 0
	const readyOrders = ordersQuery.data?.totals.ready ?? 0

	const combinedAlerts = outItems + criticalItems + urgentPrices + blockedOrders

	return (
		<aside
			aria-label="Compendium index"
			className="compendium-theme compendium-index compendium-foreedge relative flex h-full w-[240px] shrink-0 flex-col overflow-hidden"
		>
			{/* Masthead — small type title. The "sigil" dot is the only
			    permanent brand-blue mark in the sidebar. */}
			<Masthead />

			{/* Scrollable middle: category index + today's desk */}
			<div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">
				<SectionRule label="Index" />
				<CategoryIndex
					activeCategory={activeCategory}
					setActiveCategory={setActiveCategory}
					totals={{
						total: totalMaterials,
						outCritical: outItems + criticalItems,
						urgent: urgentPrices,
					}}
					stockCategories={stockQuery.data?.categories ?? []}
					inventoryCategories={inventoryQuery.data?.categories ?? []}
				/>

				<SectionRule label="Today's desk" />
				<TodaysDesk
					urgentPrices={urgentPrices}
					outdatedPrices={outdatedPrices}
					pendingRequests={pendingRequests}
					outItems={outItems}
					criticalItems={criticalItems}
					blockedOrders={blockedOrders}
					readyOrders={readyOrders}
					combinedAlerts={combinedAlerts}
				/>
			</div>

			{/* Dock — keyboard + help */}
			<div className="border-t border-[var(--rule-soft)] px-5 py-3">
				<button
					type="button"
					onClick={toggleAIChat}
					className="group flex w-full items-center justify-between py-1 text-start outline-none"
				>
					<span
						className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-soft)] transition-colors group-hover:text-[var(--ink)]"
						style={{ fontSize: '12.5px', letterSpacing: '0.005em' }}
					>
						ask the compendium
					</span>
					<kbd
						className="font-[family-name:var(--font-geist-mono)] text-[9.5px] tracking-wider text-[var(--ink-mid)]"
						aria-label="Command K"
					>
						⌘K
					</kbd>
				</button>
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
			weekday: 'short',
			day: 'numeric',
			month: 'short',
		})
		.toLowerCase()
}

function formatVolume(date: Date): string {
	const d = new Date(
		Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
	)
	d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
	const week = Math.ceil(
		((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
	)
	// Volume = year index, issue = week. Editorial, not mechanical.
	const volume = date.getFullYear() - 2020
	return `vol. ${toRoman(volume)} · no. ${week.toString().padStart(2, '0')}`
}

function toRoman(n: number): string {
	const map: [number, string][] = [
		[10, 'x'],
		[9, 'ix'],
		[5, 'v'],
		[4, 'iv'],
		[1, 'i'],
	]
	let out = ''
	let rest = n
	for (const [val, letters] of map) {
		while (rest >= val) {
			out += letters
			rest -= val
		}
	}
	return out
}

function Masthead() {
	const now = useCurrentDate()
	return (
		<header className="border-b border-[var(--rule-soft)] px-5 pt-6 pb-4">
			<div className="flex items-baseline gap-1.5">
				<span
					aria-hidden="true"
					className="h-[5px] w-[5px] translate-y-[-2px] rounded-full bg-[var(--compendium-brand)]"
				/>
				<span
					className="font-[family-name:var(--font-fraunces)] italic leading-none text-[var(--ink)]"
					style={{
						fontSize: '22px',
						fontWeight: 500,
						letterSpacing: '-0.01em',
					}}
				>
					Compendium
				</span>
			</div>
			<p
				className="mt-2 font-[family-name:var(--font-fraunces)] italic text-[var(--ink-soft)]"
				style={{ fontSize: '11.5px', letterSpacing: '0.005em' }}
			>
				of building materials — a working folio
			</p>
			<div className="mt-3 flex items-baseline justify-between">
				<span
					className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums uppercase tracking-[0.14em] text-[var(--ink-mid)]"
					suppressHydrationWarning
				>
					{formatDate(now)}
				</span>
				<span
					className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
					style={{ fontSize: '10.5px' }}
					suppressHydrationWarning
				>
					{formatVolume(now)}
				</span>
			</div>
		</header>
	)
}

// ─── Section rule ────────────────────────────────────────

function SectionRule({ label }: { label: string }) {
	return (
		<div className="mt-5 mb-3 flex items-baseline gap-2">
			<span className="font-[family-name:var(--font-geist-mono)] text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--ink-mid)]">
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
		<ul className="flex flex-col">
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
				className="compendium-thumb group flex w-full items-baseline gap-2 py-1.5 text-start outline-none"
			>
				<span
					className="font-[family-name:var(--font-fraunces)] leading-none text-[var(--ink)] transition-all"
					style={{
						fontSize: isAll ? '15px' : '13.5px',
						fontWeight: active ? 600 : 400,
						fontStyle: active ? 'normal' : 'italic',
						letterSpacing: active ? '-0.012em' : '-0.004em',
					}}
				>
					{label}
				</span>
				<span
					aria-hidden="true"
					className="h-px flex-1 translate-y-[-3px]"
					style={{
						background: active
							? 'linear-gradient(90deg, var(--rule) 0%, transparent 85%)'
							: 'var(--rule-soft)',
					}}
				/>
				<span
					className="font-[family-name:var(--font-geist-mono)] text-[10.5px] tabular-nums"
					style={{ color: active ? 'var(--ink)' : 'var(--ink-mid)' }}
				>
					{count.toString().padStart(2, '0')}
				</span>
				{hasAlert && (
					<span
						className="font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold tabular-nums leading-none text-[var(--compendium-stale)]"
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
	combinedAlerts,
}: TodaysDeskProps) {
	const setActiveTab = useProcurementStore((s) => s.setActiveTab)

	if (combinedAlerts === 0) {
		return (
			<div className="mt-1 rounded-sm border border-dashed border-[var(--rule-soft)] px-3 py-4 text-center">
				<p
					className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-soft)]"
					style={{ fontSize: '12px', letterSpacing: '0.003em' }}
				>
					the desk is clear — {readyOrders} order
					{readyOrders === 1 ? '' : 's'} ready for warehouse.
				</p>
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
								: 'stock running out'
					}
					onPress={() => setActiveTab('stock')}
					tone="stale"
				/>
			)}
			{urgentPrices > 0 && (
				<DeskRow
					number={urgentPrices}
					label={`urgent price${urgentPrices === 1 ? '' : 's'} to refresh`}
					onPress={() => setActiveTab('procurement')}
					tone="stale"
				/>
			)}
			{outdatedPrices - urgentPrices > 0 && (
				<DeskRow
					number={outdatedPrices - urgentPrices}
					label={`other outdated price${outdatedPrices - urgentPrices === 1 ? '' : 's'}`}
					onPress={() => setActiveTab('procurement')}
					tone="aging"
				/>
			)}
			{pendingRequests > 0 && (
				<DeskRow
					number={pendingRequests}
					label={`sales request${pendingRequests === 1 ? '' : 's'} waiting`}
					onPress={() => setActiveTab('procurement')}
					tone="brand"
				/>
			)}
			{blockedOrders > 0 && (
				<DeskRow
					number={blockedOrders}
					label={`order${blockedOrders === 1 ? '' : 's'} blocked on stock`}
					onPress={() => setActiveTab('orders')}
					tone="aging"
				/>
			)}
			{readyOrders > 0 && (
				<DeskRow
					number={readyOrders}
					label={`order${readyOrders === 1 ? '' : 's'} ready to approve`}
					onPress={() => setActiveTab('orders')}
					tone="fresh"
				/>
			)}
		</ul>
	)
}

function DeskRow({
	number,
	label,
	onPress,
	tone,
}: {
	number: number
	label: string
	onPress: () => void
	tone: 'stale' | 'aging' | 'fresh' | 'brand'
}) {
	const toneClass = {
		stale: 'text-[var(--compendium-stale)]',
		aging: 'text-[var(--compendium-aging)]',
		fresh: 'text-[var(--compendium-fresh)]',
		brand: 'text-[var(--compendium-brand)]',
	}[tone]
	return (
		<li>
			<button
				type="button"
				onClick={onPress}
				className="group flex w-full items-baseline gap-2 py-1 text-start outline-none"
			>
				<span
					className={`font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums leading-none ${toneClass}`}
					style={{ minWidth: '20px' }}
				>
					{number}
				</span>
				<span
					className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-soft)] transition-colors group-hover:text-[var(--ink)]"
					style={{
						fontSize: '12px',
						letterSpacing: '0.002em',
						lineHeight: 1.25,
					}}
				>
					{label}
				</span>
			</button>
		</li>
	)
}
