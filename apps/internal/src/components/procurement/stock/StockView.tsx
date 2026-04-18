import type { BroadCategory } from '@hyperquote/types'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import {
	getStockOverview,
	type StockProductView,
	type StockStatus,
} from '../../../lib/server/stock'
import { useProcurementStore } from '../../../stores/procurement'
import { RefillPanel } from './RefillPanel'

const CATEGORY_LABELS: Record<BroadCategory, string> = {
	cement: 'Cement',
	steel: 'Steel',
	aggregates: 'Aggregates',
	bricks: 'Masonry',
	timber: 'Timber',
	finishing: 'Finishing',
}

const STATUS_COPY: Record<StockStatus, string> = {
	healthy: 'tended',
	low: 'running low',
	critical: 'critical',
	out: 'out of stock',
}

const STATUS_ACCENT: Record<StockStatus, string> = {
	healthy: 'var(--compendium-fresh)',
	low: 'var(--compendium-aging)',
	critical: 'var(--compendium-aging)',
	out: 'var(--compendium-stale)',
}

const STATUS_WEIGHT: Record<StockStatus, number> = {
	out: 0,
	critical: 1,
	low: 2,
	healthy: 3,
}

// ─── View ────────────────────────────────────────────────

/**
 * The Atlas — chapter I of the Compendium. Every material at rest, listed
 * in the order the employee most likely cares about (out first, then
 * critical, low, healthy). Plate-per-row with a strata gauge beneath that
 * makes out-of-bounds stock levels read as physical mass.
 */
export function StockView() {
	const activeCategory = useProcurementStore((s) => s.activeCategory)

	const { data, isLoading } = useQuery({
		queryKey: ['stock-overview'],
		queryFn: () => getStockOverview({ data: {} }),
		staleTime: 30_000,
	})

	const [search, setSearch] = useState('')
	const [onlyAttention, setOnlyAttention] = useState(false)
	const [refillSlug, setRefillSlug] = useState<string | null>(null)

	const filtered = useMemo(() => {
		if (!data) return []
		let list: StockProductView[] = data.products
		if (activeCategory !== 'all') {
			list = list.filter((p) => p.broadCategory === activeCategory)
		}
		if (onlyAttention) list = list.filter((p) => p.status !== 'healthy')
		if (search.trim()) {
			const q = search.trim().toLowerCase()
			list = list.filter(
				(p) =>
					p.name.toLowerCase().includes(q) ||
					p.sku.toLowerCase().includes(q) ||
					p.primarySupplierName.toLowerCase().includes(q),
			)
		}
		return [...list].sort((a, b) => {
			if (STATUS_WEIGHT[a.status] !== STATUS_WEIGHT[b.status]) {
				return STATUS_WEIGHT[a.status] - STATUS_WEIGHT[b.status]
			}
			return a.stockRatio - b.stockRatio
		})
	}, [data, activeCategory, onlyAttention, search])

	if (isLoading || !data) {
		return (
			<div className="flex h-full items-center justify-center">
				<p
					className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
					style={{ fontSize: '13px' }}
				>
					opening the atlas…
				</p>
			</div>
		)
	}

	const visibleAttention = filtered.filter((p) => p.status !== 'healthy').length

	return (
		<div className="animate-folio-turn relative h-full overflow-y-auto">
			<div className="mx-auto flex max-w-[920px] flex-col px-10 pt-8 pb-16">
				<AtlasMasthead
					totals={data.totals}
					activeCategory={activeCategory}
					visibleCount={filtered.length}
				/>

				<DeskToolbar
					search={search}
					setSearch={setSearch}
					onlyAttention={onlyAttention}
					setOnlyAttention={setOnlyAttention}
					visibleAttention={visibleAttention}
				/>

				{filtered.length > 0 ? (
					<ol className="mt-7 flex flex-col">
						{filtered.map((product, idx) => (
							<StockPlate
								key={product.slug}
								index={idx}
								product={product}
								onRefill={setRefillSlug}
							/>
						))}
					</ol>
				) : (
					<EmptyState onlyAttention={onlyAttention} />
				)}
			</div>

			<RefillPanel
				productSlug={refillSlug}
				onClose={() => setRefillSlug(null)}
			/>
		</div>
	)
}

// ─── Masthead ────────────────────────────────────────────

function AtlasMasthead({
	totals,
	activeCategory,
	visibleCount,
}: {
	totals: {
		total: number
		healthy: number
		low: number
		critical: number
		out: number
	}
	activeCategory: ReturnType<
		typeof useProcurementStore.getState
	>['activeCategory']
	visibleCount: number
}) {
	const signaled = totals.out + totals.critical
	const primaryNumber = signaled > 0 ? signaled : totals.total
	const primaryNoun =
		signaled > 0
			? signaled === 1
				? 'material needing stock'
				: 'materials needing stock'
			: totals.total === 1
				? 'material tended'
				: 'materials tended'

	return (
		<header className="flex flex-col border-b border-[var(--rule)] pb-8">
			<div className="flex items-baseline gap-2">
				<span className="font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--ink-mid)]">
					The Compendium · The Atlas
				</span>
				{activeCategory !== 'all' && (
					<span
						className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
						style={{ fontSize: '11.5px' }}
					>
						· filtered to {CATEGORY_LABELS[activeCategory]}
						{visibleCount > 0 ? ` · ${visibleCount} shown` : ''}
					</span>
				)}
			</div>

			<div className="mt-5 flex flex-wrap items-end justify-between gap-6">
				<div className="flex items-baseline gap-4">
					<span
						className="animate-compendium-settle compendium-numeral font-[family-name:var(--font-fraunces)] leading-none text-[var(--ink)]"
						style={{
							fontSize: 'clamp(72px, 10vw, 120px)',
							fontWeight: 500,
							letterSpacing: '-0.045em',
						}}
						suppressHydrationWarning
					>
						{primaryNumber}
					</span>
					<span
						className="pb-3 font-[family-name:var(--font-fraunces)] italic text-[var(--ink-soft)]"
						style={{
							fontSize: '16px',
							maxWidth: '220px',
							lineHeight: 1.15,
							letterSpacing: '-0.003em',
						}}
					>
						{primaryNoun}
					</span>
				</div>

				<dl className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
					<AtlasStat label="healthy" value={totals.healthy} tone="fresh" />
					<AtlasStat label="low" value={totals.low} tone="aging" />
					<AtlasStat label="critical" value={totals.critical} tone="aging" />
					<AtlasStat label="out" value={totals.out} tone="stale" />
				</dl>
			</div>
		</header>
	)
}

function AtlasStat({
	label,
	value,
	tone,
}: {
	label: string
	value: number
	tone: 'fresh' | 'aging' | 'stale'
}) {
	const color = {
		fresh: 'var(--compendium-fresh)',
		aging: 'var(--compendium-aging)',
		stale: 'var(--compendium-stale)',
	}[tone]
	return (
		<div className="flex flex-col items-end">
			<dt
				className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
				style={{ fontSize: '10.5px', letterSpacing: '0.02em' }}
			>
				{label}
			</dt>
			<dd
				className="font-[family-name:var(--font-geist-mono)] text-[20px] font-semibold tabular-nums leading-none"
				style={{ color: value > 0 ? color : 'var(--ink-ghost)' }}
			>
				{value.toString().padStart(2, '0')}
			</dd>
		</div>
	)
}

// ─── Toolbar ─────────────────────────────────────────────

function DeskToolbar({
	search,
	setSearch,
	onlyAttention,
	setOnlyAttention,
	visibleAttention,
}: {
	search: string
	setSearch: (s: string) => void
	onlyAttention: boolean
	setOnlyAttention: (v: boolean | ((prev: boolean) => boolean)) => void
	visibleAttention: number
}) {
	return (
		<div className="mt-6 flex items-center gap-5 border-b border-[var(--rule-soft)] pb-3">
			<div className="flex flex-1 items-baseline gap-2">
				<span
					className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
					style={{ fontSize: '11.5px' }}
				>
					find
				</span>
				<input
					type="search"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="a material, sku, or supplier"
					className="w-full bg-transparent font-[family-name:var(--font-fraunces)] text-[14px] text-[var(--ink)] outline-none placeholder:font-[family-name:var(--font-fraunces)] placeholder:italic placeholder:text-[var(--ink-ghost)]"
				/>
				{search && (
					<button
						type="button"
						onClick={() => setSearch('')}
						className="font-[family-name:var(--font-fraunces)] italic text-[11px] text-[var(--ink-mid)] hover:text-[var(--ink)]"
					>
						clear
					</button>
				)}
			</div>

			<button
				type="button"
				onClick={() => setOnlyAttention((v) => !v)}
				aria-pressed={onlyAttention}
				className="group flex items-center gap-2 outline-none"
			>
				<span
					aria-hidden="true"
					className="h-[9px] w-[9px] rounded-full transition-all"
					style={{
						background: onlyAttention
							? 'var(--compendium-stale)'
							: 'transparent',
						border: onlyAttention ? '0' : '1px solid var(--rule)',
					}}
				/>
				<span
					className="font-[family-name:var(--font-fraunces)] italic transition-colors"
					style={{
						fontSize: '12px',
						color: onlyAttention ? 'var(--ink)' : 'var(--ink-soft)',
					}}
				>
					only what needs minding
				</span>
				{visibleAttention > 0 && (
					<span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--ink-mid)]">
						{visibleAttention}
					</span>
				)}
			</button>
		</div>
	)
}

// ─── Plate ───────────────────────────────────────────────

function StockPlate({
	index,
	product,
	onRefill,
}: {
	index: number
	product: StockProductView
	onRefill: (slug: string) => void
}) {
	const accent = STATUS_ACCENT[product.status]
	const hasAttention = product.status !== 'healthy'
	// Gauge uses ratio capped at 200% (threshold tick at 50% of track).
	const gaugePct = Math.min(product.stockRatio / 2, 1) * 100
	const thresholdPct = 50

	return (
		<li
			className="relative grid border-t border-[var(--rule-soft)] py-5"
			style={{
				gridTemplateColumns: '22px 1fr auto',
				columnGap: '24px',
			}}
		>
			{/* Status margin — a vertical ink strip on the leading edge. Only
			    ever visible for items that need attention. Typographers would
			    call this a "marginal mark"; it lets the employee scan the
			    spread for trouble in one sweep. */}
			<div className="relative">
				{hasAttention && (
					<span
						aria-hidden="true"
						className="absolute left-1 top-2 bottom-2 w-[2px]"
						style={{ background: accent }}
					/>
				)}
				<span
					className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-ghost)]"
					style={{ fontSize: '11px' }}
				>
					{(index + 1).toString().padStart(2, '0')}
				</span>
			</div>

			{/* Body */}
			<div className="min-w-0">
				<p
					className="font-[family-name:var(--font-fraunces)] leading-[1.12] text-[var(--ink)]"
					style={{
						fontSize: '19px',
						fontWeight: 500,
						letterSpacing: '-0.015em',
					}}
				>
					{product.name}
				</p>
				<p
					className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[var(--ink-mid)]"
					style={{ fontSize: '11px' }}
				>
					<span className="font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.1em]">
						{product.sku}
					</span>
					<span className="opacity-60">·</span>
					<span className="font-[family-name:var(--font-fraunces)] italic">
						{product.subcategory.replace(/_/g, ' ')}
					</span>
					<span className="opacity-60">·</span>
					<span className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-soft)]">
						{product.primarySupplierName}
					</span>
					{product.supplierCount > 1 && (
						<span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-[var(--ink-mid)]">
							+{product.supplierCount - 1}
						</span>
					)}
					{product.pendingDealCount > 0 && (
						<>
							<span className="opacity-60">·</span>
							<span
								className="font-[family-name:var(--font-fraunces)] italic"
								style={{ color: 'var(--compendium-brand)' }}
							>
								{product.pendingDealCount} deal
								{product.pendingDealCount === 1 ? '' : 's'} pending
							</span>
						</>
					)}
				</p>

				{/* Strata gauge — stock fullness rendered as a band of vertical
				    rules, with the threshold carved as a taller tick. Sits on
				    its own row so the eye measures it against the type above. */}
				<div className="mt-3 flex items-center gap-3">
					<div
						className="compendium-strata flex-1"
						aria-hidden="true"
						title={`Stock at ${Math.round(product.stockRatio * 100)}% of threshold · ${STATUS_COPY[product.status]}`}
					>
						<span
							className="absolute inset-y-0 left-0 transition-[width]"
							style={{ width: `${gaugePct}%`, background: accent }}
						/>
						<span
							className="absolute top-[-2px] bottom-[-2px] w-px"
							style={{
								left: `${thresholdPct}%`,
								background: 'var(--ink)',
								opacity: 0.5,
							}}
						/>
					</div>
					<span
						className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
						style={{ fontSize: '10.5px', minWidth: '90px' }}
					>
						min {product.lowStockThreshold.toLocaleString('en-EG')}{' '}
						{product.unit}
					</span>
				</div>
			</div>

			{/* Trailing column — the hero number + action. */}
			<div className="flex flex-col items-end justify-between gap-3">
				<div className="flex flex-col items-end">
					<span
						className="compendium-numeral font-[family-name:var(--font-fraunces)] leading-none text-[var(--ink)]"
						style={{
							fontSize: product.availableLevel > 9999 ? '30px' : '36px',
							fontWeight: 500,
							letterSpacing: '-0.03em',
						}}
					>
						{product.availableLevel.toLocaleString('en-EG')}
					</span>
					<div className="mt-1 flex items-baseline gap-1.5">
						<span
							className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-soft)]"
							style={{ fontSize: '11.5px' }}
						>
							{product.unit}
						</span>
						<span
							className="font-[family-name:var(--font-fraunces)] italic"
							style={{ fontSize: '10.5px', color: accent }}
						>
							{STATUS_COPY[product.status]}
						</span>
					</div>
					{product.reservedLevel > 0 && (
						<span className="mt-1 font-[family-name:var(--font-geist-mono)] text-[9.5px] tabular-nums text-[var(--ink-mid)]">
							{product.stockLevel.toLocaleString('en-EG')} on-hand ·{' '}
							{product.reservedLevel.toLocaleString('en-EG')} reserved
						</span>
					)}
				</div>

				<button
					type="button"
					onClick={() => onRefill(product.slug)}
					className="group inline-flex items-baseline gap-1.5 border-b border-transparent pb-0.5 text-end outline-none transition-colors"
					style={{
						color: hasAttention ? 'var(--ink)' : 'var(--ink-mid)',
					}}
				>
					<span
						className="font-[family-name:var(--font-fraunces)] italic transition-transform"
						style={{
							fontSize: '13.5px',
							letterSpacing: '-0.005em',
							fontWeight: hasAttention ? 500 : 400,
						}}
					>
						refill
					</span>
					<span
						aria-hidden="true"
						className="transition-transform group-hover:translate-x-[3px]"
						style={{
							fontFamily: 'var(--font-fraunces)',
							fontStyle: 'italic',
							fontSize: '14px',
							color: hasAttention ? accent : 'var(--ink-mid)',
						}}
					>
						→
					</span>
				</button>
			</div>
		</li>
	)
}

// ─── Empty state ────────────────────────────────────────

function EmptyState({ onlyAttention }: { onlyAttention: boolean }) {
	return (
		<div className="mt-16 flex flex-col items-center gap-2 border-y border-dashed border-[var(--rule-soft)] py-14">
			<span
				className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink)]"
				style={{ fontSize: '22px', letterSpacing: '-0.01em' }}
			>
				{onlyAttention
					? 'nothing needs minding.'
					: 'no entries in this volume.'}
			</span>
			<span
				className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-soft)]"
				style={{ fontSize: '12px' }}
			>
				{onlyAttention
					? 'the shelves are honest for now.'
					: 'adjust the index or clear the search to see more.'}
			</span>
		</div>
	)
}
