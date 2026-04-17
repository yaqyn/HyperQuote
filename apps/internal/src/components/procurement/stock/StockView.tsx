import type { BroadCategory } from '@hyperquote/types'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Package, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
	getStockOverview,
	type StockProductView,
	type StockStatus,
} from '../../../lib/server/stock'
import { RefillPanel } from './RefillPanel'

// ─── Palette ──────────────────────────────────────────────

const STATUS_META: Record<
	StockStatus,
	{ label: string; dot: string; gauge: string }
> = {
	healthy: { label: 'Healthy', dot: 'bg-emerald-500', gauge: 'bg-emerald-500' },
	low: { label: 'Low', dot: 'bg-amber-500', gauge: 'bg-amber-500' },
	critical: { label: 'Critical', dot: 'bg-orange-500', gauge: 'bg-orange-500' },
	out: { label: 'Out', dot: 'bg-red-500', gauge: 'bg-red-500' },
}

const CATEGORY_LABELS: Record<BroadCategory, string> = {
	cement: 'Cement',
	steel: 'Steel',
	aggregates: 'Aggregates',
	bricks: 'Masonry',
	timber: 'Timber',
	finishing: 'Finishing',
}

// ─── Header stat ─────────────────────────────────────────

function InlineStat({
	label,
	value,
	tone = 'neutral',
}: {
	label: string
	value: number
	tone?: 'neutral' | 'emerald' | 'amber' | 'orange' | 'red'
}) {
	const color = {
		neutral: 'text-[var(--color-text)]',
		emerald: 'text-emerald-700 dark:text-emerald-400',
		amber: 'text-amber-700 dark:text-amber-400',
		orange: 'text-orange-700 dark:text-orange-300',
		red: 'text-red-700 dark:text-red-300',
	}[tone]
	return (
		<div className="flex items-baseline gap-1.5">
			<span
				className={`font-[family-name:var(--font-geist-mono)] text-[18px] font-semibold leading-none tabular-nums ${color}`}
			>
				{value}
			</span>
			<span className="text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
				{label}
			</span>
		</div>
	)
}

// ─── Category chip ───────────────────────────────────────

function CategoryChip({
	label,
	count,
	attention,
	active,
	onPress,
}: {
	label: string
	count: number
	attention: number
	active: boolean
	onPress: () => void
}) {
	const hasAttention = attention > 0
	return (
		<button
			type="button"
			onClick={onPress}
			className={`group relative inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-[11px] font-medium ring-1 transition-all ${
				active
					? 'text-[var(--color-text)] ring-black/[0.07] dark:ring-white/[0.1]'
					: 'text-[var(--color-text-muted)] ring-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
			}`}
		>
			{/* Attention wash — right-to-left gradient clipped to match the
          chip's rounded trailing edge. No edge tick, just the fade. */}
			{hasAttention && (
				<span
					aria-hidden="true"
					className="pointer-events-none absolute inset-y-0 end-0 w-[35%] rounded-e-md bg-gradient-to-l from-red-500/[0.09] via-red-500/[0.03] to-transparent"
				/>
			)}

			<span className="relative">{label}</span>
			<span className="relative font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
				{count}
			</span>
			{hasAttention && (
				<span className="relative font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold tabular-nums text-red-600 dark:text-red-400">
					{attention}
				</span>
			)}
		</button>
	)
}

// ─── Table row ───────────────────────────────────────────

function StockRow({
	product,
	onRefill,
}: {
	product: StockProductView
	onRefill: (slug: string) => void
}) {
	const meta = STATUS_META[product.status]
	// Gauge caps at 200% of threshold so overstock reads "full" visually
	const gaugePct = Math.min(product.stockRatio / 2, 1) * 100
	const thresholdPct = 50 // threshold line sits at 50% of gauge (100% of threshold)

	return (
		<div
			className="group grid items-center gap-4 border-b border-black/[0.04] px-3 py-2.5 transition-colors hover:bg-black/[0.02] dark:border-white/[0.04] dark:hover:bg-white/[0.03]"
			style={{
				gridTemplateColumns:
					'14px minmax(0,2.2fr) minmax(140px,1fr) 1.1fr minmax(100px,1fr) 96px',
			}}
		>
			{/* Status dot + tooltip via title */}
			<div className={`h-2 w-2 rounded-full ${meta.dot}`} title={meta.label} />

			{/* Name + SKU */}
			<div className="min-w-0">
				<p className="truncate text-[12.5px] font-medium text-[var(--color-text)]">
					{product.name}
				</p>
				<p className="truncate font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
					{product.sku} · {product.subcategory.replace(/_/g, ' ')}
				</p>
			</div>

			{/* Stock level + unit — hero is AVAILABLE (physical minus reserved)
          so procurement sees what sales can actually promise. Reserved
          qty shows as a muted subscript line when non-zero. */}
			<div className="flex flex-col">
				<div className="flex items-baseline gap-1.5">
					<span className="font-[family-name:var(--font-geist-mono)] text-[15px] font-semibold tabular-nums text-[var(--color-text)]">
						{product.availableLevel.toLocaleString('en-EG')}
					</span>
					<span className="text-[10px] text-[var(--color-text-subtle)]">
						{product.unit}
					</span>
				</div>
				{product.reservedLevel > 0 && (
					<span className="font-[family-name:var(--font-geist-mono)] text-[9px] tabular-nums text-[var(--color-text-subtle)]">
						{product.stockLevel.toLocaleString('en-EG')} on-hand ·{' '}
						{product.reservedLevel.toLocaleString('en-EG')} reserved
					</span>
				)}
			</div>

			{/* Inline gauge */}
			<div className="flex flex-col gap-1">
				<div className="relative h-1 w-full rounded-full bg-black/[0.05] dark:bg-white/[0.08]">
					<div
						className={`absolute inset-y-0 start-0 rounded-full ${meta.gauge}`}
						style={{ width: `${gaugePct}%` }}
					/>
					<div
						className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-[var(--color-text)]/35"
						style={{ left: `${thresholdPct}%` }}
					/>
				</div>
				<div className="flex items-center justify-between text-[9px] tabular-nums text-[var(--color-text-subtle)]">
					<span>min {product.lowStockThreshold.toLocaleString('en-EG')}</span>
					{product.pendingDealCount > 0 && (
						<span className="text-[var(--color-primary)]">
							{product.pendingDealCount} deal
							{product.pendingDealCount > 1 ? 's' : ''} pending
						</span>
					)}
				</div>
			</div>

			{/* Supplier */}
			<div className="min-w-0">
				<p className="truncate text-[11px] text-[var(--color-text-muted)]">
					{product.primarySupplierName}
				</p>
				<p className="font-[family-name:var(--font-geist-mono)] text-[9px] tabular-nums text-[var(--color-text-subtle)]">
					{product.supplierCount} source{product.supplierCount !== 1 ? 's' : ''}
				</p>
			</div>

			{/* Action */}
			<button
				type="button"
				onClick={() => onRefill(product.slug)}
				className={`rounded-md py-1.5 text-[10.5px] font-semibold uppercase tracking-wider transition-colors ${
					product.status === 'healthy'
						? 'border border-black/[0.08] text-[var(--color-text-muted)] opacity-0 hover:bg-black/[0.03] group-hover:opacity-100 dark:border-white/[0.1] dark:hover:bg-white/[0.04]'
						: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90'
				}`}
			>
				Refill
			</button>
		</div>
	)
}

// ─── Main view ────────────────────────────────────────────

export function StockView() {
	const { data, isLoading } = useQuery({
		queryKey: ['stock-overview'],
		queryFn: () => getStockOverview({ data: {} }),
		staleTime: 30_000,
	})

	const [activeCategory, setActiveCategory] = useState<BroadCategory | 'all'>(
		'all',
	)
	const [search, setSearch] = useState('')
	const [onlyLow, setOnlyLow] = useState(false)
	const [refillSlug, setRefillSlug] = useState<string | null>(null)

	const filtered = useMemo(() => {
		if (!data) return []
		let list: StockProductView[] = data.products
		if (activeCategory !== 'all')
			list = list.filter((p) => p.broadCategory === activeCategory)
		if (onlyLow) list = list.filter((p) => p.status !== 'healthy')
		if (search.trim()) {
			const q = search.trim().toLowerCase()
			list = list.filter(
				(p) =>
					p.name.toLowerCase().includes(q) ||
					p.sku.toLowerCase().includes(q) ||
					p.primarySupplierName.toLowerCase().includes(q),
			)
		}
		const rank: Record<StockStatus, number> = {
			out: 0,
			critical: 1,
			low: 2,
			healthy: 3,
		}
		return [...list].sort((a, b) => {
			if (rank[a.status] !== rank[b.status])
				return rank[a.status] - rank[b.status]
			return a.stockRatio - b.stockRatio
		})
	}, [data, activeCategory, onlyLow, search])

	if (isLoading || !data) {
		return (
			<div className="flex h-full items-center justify-center text-[13px] text-[var(--color-text-subtle)]">
				Loading inventory…
			</div>
		)
	}

	return (
		<div className="relative flex h-full flex-col bg-[var(--color-surface)] dark:bg-[#0A0A0A]">
			<div
				className="flex-1 min-h-0 overflow-y-auto px-6 py-5"
				data-module-content
			>
				<div className="mx-auto flex max-w-[1280px] flex-col gap-5">
					{/* Header — a single thin row */}
					<header className="flex items-center justify-between gap-6 border-b border-black/[0.04] pb-4 dark:border-white/[0.04]">
						<div className="flex items-center gap-2">
							<Package
								size={13}
								strokeWidth={2}
								className="text-[var(--color-text-subtle)]"
							/>
							<span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
								Inventory · On-hand
							</span>
						</div>
						<div className="flex items-baseline gap-5">
							<InlineStat label="total" value={data.totals.total} />
							<InlineStat
								label="healthy"
								value={data.totals.healthy}
								tone="emerald"
							/>
							<InlineStat label="low" value={data.totals.low} tone="amber" />
							<InlineStat
								label="critical"
								value={data.totals.critical}
								tone="orange"
							/>
							<InlineStat label="out" value={data.totals.out} tone="red" />
						</div>
					</header>

					{/* Category chip bar */}
					<div className="flex items-center gap-1.5 overflow-x-auto p-1">
						<CategoryChip
							label="All"
							count={data.totals.total}
							attention={data.totals.critical + data.totals.out}
							active={activeCategory === 'all'}
							onPress={() => setActiveCategory('all')}
						/>
						{data.categories.map((cat) => (
							<CategoryChip
								key={cat.id}
								label={CATEGORY_LABELS[cat.id]}
								count={cat.totalCount}
								attention={cat.criticalCount + cat.outCount}
								active={activeCategory === cat.id}
								onPress={() => setActiveCategory(cat.id)}
							/>
						))}
					</div>

					{/* Search + filter */}
					<div className="flex items-center gap-2">
						<div className="flex flex-1 items-center gap-2 rounded-md border border-black/[0.08] px-3 py-1.5 dark:border-white/[0.08]">
							<Search
								size={12}
								strokeWidth={2}
								className="text-[var(--color-text-subtle)]"
							/>
							<input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search product, SKU, or supplier"
								className="flex-1 bg-transparent text-[12px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]"
							/>
							{search && (
								<button
									type="button"
									onClick={() => setSearch('')}
									className="text-[10px] text-[var(--color-text-subtle)] hover:text-[var(--color-text)]"
								>
									clear
								</button>
							)}
						</div>
						<button
							type="button"
							onClick={() => setOnlyLow((v) => !v)}
							className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
								onlyLow
									? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/[0.06] text-[var(--color-primary)]'
									: 'border-black/[0.08] text-[var(--color-text-muted)] hover:bg-black/[0.03] dark:border-white/[0.1] dark:hover:bg-white/[0.04]'
							}`}
						>
							<AlertTriangle size={11} strokeWidth={2.5} />
							Attention only
						</button>
					</div>

					{/* Table header */}
					{filtered.length > 0 && (
						<div
							className="grid items-center gap-4 border-b border-black/[0.06] px-3 pb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-subtle)] dark:border-white/[0.06]"
							style={{
								gridTemplateColumns:
									'14px minmax(0,2.2fr) minmax(140px,1fr) 1.1fr minmax(100px,1fr) 96px',
							}}
						>
							<div />
							<div>Product</div>
							<div>On hand</div>
							<div>Gauge</div>
							<div>Primary supplier</div>
							<div className="text-end">Action</div>
						</div>
					)}

					{/* Rows */}
					{filtered.length > 0 ? (
						<div className="flex flex-col">
							{filtered.map((p) => (
								<StockRow key={p.slug} product={p} onRefill={setRefillSlug} />
							))}
						</div>
					) : (
						<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-black/[0.1] py-16 text-center dark:border-white/[0.1]">
							<CheckCircle2
								size={24}
								strokeWidth={1.5}
								className="text-emerald-500/70"
							/>
							<p className="mt-2 text-[12px] font-medium text-[var(--color-text)]">
								Nothing to see here
							</p>
							<p className="mt-0.5 text-[10px] text-[var(--color-text-subtle)]">
								{onlyLow
									? 'Every item in this view has healthy stock.'
									: 'No products match your filters.'}
							</p>
						</div>
					)}
				</div>
			</div>

			<RefillPanel
				productSlug={refillSlug}
				onClose={() => setRefillSlug(null)}
			/>
		</div>
	)
}
