import type { BroadCategory } from '@hyperquote/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { sanitizeCost } from '../../../lib/inputs'
import {
	getInventoryOverview,
	getTopSuppliers,
	type InventoryProductView,
	type TopSupplier,
	updateInventoryPrice,
} from '../../../lib/server/inventory'
import { useProcurementStore } from '../../../stores/procurement'
import { PriceConfirmDialog } from './PriceConfirmDialog'
import { ProductDetailModal } from './ProductDetailModal'
import { SupplierProfileModal } from './SupplierProfileModal'

const CATEGORY_LABELS: Record<BroadCategory, string> = {
	cement: 'Cement',
	steel: 'Steel',
	aggregates: 'Aggregates',
	bricks: 'Masonry',
	timber: 'Timber',
	finishing: 'Finishing',
}

function formatHoursAgo(hours: number): string {
	if (hours < 1) return `${Math.round(hours * 60)}m`
	if (hours < 24) return `${Math.round(hours)}h`
	const d = Math.floor(hours / 24)
	if (d < 30) return `${d}d`
	return `${Math.round(d / 30)}mo`
}

// Freshness tone drives the right-gutter mark on each entry.
function toneFor(
	hours: number,
	isUrgent: boolean,
): 'fresh' | 'aging' | 'stale' {
	if (isUrgent) return 'stale'
	if (hours < 24) return 'fresh'
	if (hours < 72) return 'aging'
	return 'stale'
}

// ─── View ────────────────────────────────────────────────

/**
 * The Desk — chapter II of the Compendium. This is the price desk, the
 * telephone, the hand-work of keeping supplier quotes current. The layout
 * is editorial: a standing "at the telephone" spread for the top
 * suppliers who have the most to refresh, then the full roll of prices
 * ranked by pending requests → urgency → age.
 */
export function InventoryView() {
	const qc = useQueryClient()
	const activeCategory = useProcurementStore((s) => s.activeCategory)

	const { data, isLoading } = useQuery({
		queryKey: ['inventory-overview'],
		queryFn: () => getInventoryOverview({ data: {} }),
		staleTime: 30_000,
	})

	const { data: topSuppliersData } = useQuery({
		queryKey: ['inventory-top-suppliers'],
		queryFn: () => getTopSuppliers({ data: { limit: 5 } }),
		staleTime: 30_000,
	})

	const mutation = useMutation({
		mutationFn: updateInventoryPrice,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['inventory-overview'] })
			qc.invalidateQueries({ queryKey: ['inventory-top-suppliers'] })
			qc.invalidateQueries({ queryKey: ['sales-outdated-prices'] })
		},
	})

	const [search, setSearch] = useState('')
	const [onlyUrgent, setOnlyUrgent] = useState(false)
	const [justSavedSlug, setJustSavedSlug] = useState<string | null>(null)
	const [detailSlug, setDetailSlug] = useState<string | null>(null)
	const [supplierProfileName, setSupplierProfileName] = useState<string | null>(
		null,
	)
	const [pendingPriceEdit, setPendingPriceEdit] = useState<{
		slug: string
		productName: string
		supplierName: string
		unit: string
		oldCost: number
		newCost: number
	} | null>(null)

	const handleSave = (slug: string, rawCost: number) => {
		const product = data?.products.find((p) => p.slug === slug)
		if (!product) return
		setPendingPriceEdit({
			slug,
			productName: product.name,
			supplierName: product.supplierName,
			unit: product.unit,
			oldCost: product.rawCost,
			newCost: rawCost,
		})
	}

	const commitPendingEdit = (_proof?: string) => {
		if (!pendingPriceEdit) return
		const { slug, newCost } = pendingPriceEdit
		mutation.mutate(
			{ data: { slug, rawCost: newCost } },
			{
				onSuccess: () => {
					setJustSavedSlug(slug)
					setTimeout(
						() => setJustSavedSlug((prev) => (prev === slug ? null : prev)),
						1800,
					)
				},
			},
		)
		setPendingPriceEdit(null)
	}

	const filtered = useMemo(() => {
		if (!data) return []
		let list: InventoryProductView[] = data.products
		if (activeCategory !== 'all') {
			list = list.filter((p) => p.broadCategory === activeCategory)
		}
		if (onlyUrgent) list = list.filter((p) => p.isUrgent)
		if (search.trim()) {
			const q = search.trim().toLowerCase()
			list = list.filter(
				(p) =>
					p.name.toLowerCase().includes(q) ||
					p.sku.toLowerCase().includes(q) ||
					p.supplierName.toLowerCase().includes(q) ||
					(p.allSupplierNames ?? []).some((s) => s.toLowerCase().includes(q)),
			)
		}
		return [...list].sort((a, b) => {
			const aRequested = a.pendingRequestCount > 0 ? 1 : 0
			const bRequested = b.pendingRequestCount > 0 ? 1 : 0
			if (aRequested !== bRequested) return bRequested - aRequested
			if (aRequested && a.pendingRequestCount !== b.pendingRequestCount) {
				return b.pendingRequestCount - a.pendingRequestCount
			}
			if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1
			return b.hoursSinceUpdate - a.hoursSinceUpdate
		})
	}, [data, activeCategory, onlyUrgent, search])

	if (isLoading || !data) {
		return (
			<div className="flex h-full items-center justify-center">
				<p
					className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
					style={{ fontSize: '13px' }}
				>
					laying out the desk…
				</p>
			</div>
		)
	}

	return (
		<div className="animate-folio-turn relative h-full overflow-y-auto">
			<div className="mx-auto flex max-w-[920px] flex-col px-10 pt-8 pb-16">
				<DeskMasthead
					totals={data.totals}
					activeCategory={activeCategory}
					visibleCount={filtered.length}
				/>

				<TelephoneSpread
					suppliers={topSuppliersData?.suppliers ?? []}
					onOpen={setSupplierProfileName}
				/>

				<DeskToolbar
					search={search}
					setSearch={setSearch}
					onlyUrgent={onlyUrgent}
					setOnlyUrgent={setOnlyUrgent}
				/>

				{filtered.length > 0 ? (
					<ol className="mt-5 flex flex-col">
						{filtered.map((product, idx) => (
							<PriceEntry
								key={product.slug}
								index={idx}
								product={product}
								isSaving={
									mutation.isPending &&
									mutation.variables?.data.slug === product.slug
								}
								justSaved={justSavedSlug === product.slug}
								onOpenDetail={setDetailSlug}
								onSave={handleSave}
							/>
						))}
					</ol>
				) : (
					<DeskEmpty onlyUrgent={onlyUrgent} />
				)}
			</div>

			<ProductDetailModal
				slug={detailSlug}
				onClose={() => setDetailSlug(null)}
			/>
			<SupplierProfileModal
				name={supplierProfileName}
				onClose={() => setSupplierProfileName(null)}
			/>
			<PriceConfirmDialog
				isOpen={pendingPriceEdit !== null}
				productName={pendingPriceEdit?.productName ?? ''}
				supplierName={pendingPriceEdit?.supplierName}
				unit={pendingPriceEdit?.unit ?? ''}
				oldCost={pendingPriceEdit?.oldCost ?? 0}
				newCost={pendingPriceEdit?.newCost ?? 0}
				onConfirm={commitPendingEdit}
				onCancel={() => setPendingPriceEdit(null)}
			/>
		</div>
	)
}

// ─── Masthead ────────────────────────────────────────────

function DeskMasthead({
	totals,
	activeCategory,
	visibleCount,
}: {
	totals: {
		total: number
		fresh: number
		outdated: number
		urgent: number
		pendingRequests: number
	}
	activeCategory: ReturnType<
		typeof useProcurementStore.getState
	>['activeCategory']
	visibleCount: number
}) {
	const needsWork = totals.urgent + totals.pendingRequests
	const primaryNumber = needsWork > 0 ? needsWork : totals.fresh
	const primaryNoun =
		needsWork > 0
			? needsWork === 1
				? 'matter for the phone'
				: 'matters for the phone'
			: 'fresh quotes on file'

	return (
		<header className="flex flex-col border-b border-[var(--rule)] pb-8">
			<div className="flex items-baseline gap-2">
				<span className="font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--ink-mid)]">
					The Compendium · The Desk
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
					<DeskStat label="fresh" value={totals.fresh} tone="fresh" />
					<DeskStat label="outdated" value={totals.outdated} tone="aging" />
					<DeskStat label="urgent" value={totals.urgent} tone="stale" />
					<DeskStat
						label="requests"
						value={totals.pendingRequests}
						tone="brand"
					/>
				</dl>
			</div>
		</header>
	)
}

function DeskStat({
	label,
	value,
	tone,
}: {
	label: string
	value: number
	tone: 'fresh' | 'aging' | 'stale' | 'brand'
}) {
	const color = {
		fresh: 'var(--compendium-fresh)',
		aging: 'var(--compendium-aging)',
		stale: 'var(--compendium-stale)',
		brand: 'var(--compendium-brand)',
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

// ─── Telephone spread ────────────────────────────────────

function TelephoneSpread({
	suppliers,
	onOpen,
}: {
	suppliers: TopSupplier[]
	onOpen: (name: string) => void
}) {
	if (suppliers.length === 0) return null
	const totalOutdated = suppliers.reduce((s, x) => s + x.outdatedQuotes, 0)
	const totalUrgent = suppliers.reduce((s, x) => s + x.urgentQuotes, 0)

	return (
		<section
			aria-labelledby="telephone-heading"
			className="mt-7 border-y border-[var(--rule-soft)] py-5"
		>
			<div className="flex items-baseline justify-between gap-4 pb-3">
				<h2
					id="telephone-heading"
					className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink)]"
					style={{
						fontSize: '15px',
						fontWeight: 500,
						letterSpacing: '-0.008em',
					}}
				>
					at the telephone
				</h2>
				<p
					className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
					style={{ fontSize: '11.5px' }}
				>
					{suppliers.length} call{suppliers.length === 1 ? '' : 's'} would
					refresh {totalOutdated} price
					{totalOutdated === 1 ? '' : 's'}
					{totalUrgent > 0 && (
						<span style={{ color: 'var(--compendium-stale)' }}>
							{' '}
							· {totalUrgent} urgent
						</span>
					)}
				</p>
			</div>

			<ul
				className="grid gap-x-8 gap-y-1"
				style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
			>
				{suppliers.map((supplier) => (
					<li key={supplier.name}>
						<button
							type="button"
							onClick={() => onOpen(supplier.name)}
							className="group flex w-full items-baseline gap-2 py-1.5 text-start outline-none"
						>
							<span
								className="font-[family-name:var(--font-fraunces)] transition-colors text-[var(--ink)] group-hover:text-[var(--compendium-brand)]"
								style={{
									fontSize: '13.5px',
									fontWeight: 500,
									letterSpacing: '-0.005em',
								}}
							>
								{supplier.name}
							</span>
							<span
								aria-hidden="true"
								className="h-px flex-1 translate-y-[-3px] bg-[var(--rule-soft)]"
							/>
							<span className="font-[family-name:var(--font-geist-mono)] text-[10.5px] tabular-nums text-[var(--ink-mid)]">
								{supplier.outdatedQuotes}
							</span>
							{supplier.urgentQuotes > 0 && (
								<span
									className="font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold tabular-nums"
									style={{ color: 'var(--compendium-stale)' }}
								>
									{supplier.urgentQuotes}
								</span>
							)}
							<span
								aria-hidden="true"
								className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)] opacity-0 transition-opacity group-hover:opacity-100"
								style={{ fontSize: '13px' }}
							>
								→
							</span>
						</button>
					</li>
				))}
			</ul>
		</section>
	)
}

// ─── Toolbar ─────────────────────────────────────────────

function DeskToolbar({
	search,
	setSearch,
	onlyUrgent,
	setOnlyUrgent,
}: {
	search: string
	setSearch: (s: string) => void
	onlyUrgent: boolean
	setOnlyUrgent: (v: boolean | ((prev: boolean) => boolean)) => void
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
					placeholder="a product, sku, or supplier"
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
				onClick={() => setOnlyUrgent((v) => !v)}
				aria-pressed={onlyUrgent}
				className="group flex items-center gap-2 outline-none"
			>
				<span
					aria-hidden="true"
					className="h-[9px] w-[9px] rounded-full transition-all"
					style={{
						background: onlyUrgent ? 'var(--compendium-stale)' : 'transparent',
						border: onlyUrgent ? '0' : '1px solid var(--rule)',
					}}
				/>
				<span
					className="font-[family-name:var(--font-fraunces)] italic transition-colors"
					style={{
						fontSize: '12px',
						color: onlyUrgent ? 'var(--ink)' : 'var(--ink-soft)',
					}}
				>
					only the urgent
				</span>
			</button>
		</div>
	)
}

// ─── Price entry ────────────────────────────────────────

function PriceEntry({
	index,
	product,
	isSaving,
	justSaved,
	onOpenDetail,
	onSave,
}: {
	index: number
	product: InventoryProductView
	isSaving: boolean
	justSaved: boolean
	onOpenDetail: (slug: string) => void
	onSave: (slug: string, rawCost: number) => void
}) {
	const [editing, setEditing] = useState(false)
	const [draft, setDraft] = useState('')
	const tone = toneFor(product.hoursSinceUpdate, product.isUrgent)
	const toneColor = {
		fresh: 'var(--compendium-fresh)',
		aging: 'var(--compendium-aging)',
		stale: 'var(--compendium-stale)',
	}[tone]

	const beginEdit = () => {
		setDraft(String(product.rawCost))
		setEditing(true)
	}
	const commit = () => {
		const v = sanitizeCost(draft)
		if (v !== null && v !== product.rawCost) {
			onSave(product.slug, v)
		}
		setEditing(false)
	}
	const cancel = () => {
		setEditing(false)
		setDraft('')
	}

	return (
		<li
			className="relative grid items-start border-t border-[var(--rule-soft)] py-5"
			style={{
				gridTemplateColumns: '22px 1fr auto 96px',
				columnGap: '24px',
			}}
		>
			{/* Left margin: index number + alert mark. */}
			<div className="relative pt-1">
				{tone === 'stale' && (
					<span
						aria-hidden="true"
						className="absolute left-1 top-2 bottom-2 w-[2px]"
						style={{ background: toneColor }}
					/>
				)}
				<span
					className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-ghost)]"
					style={{ fontSize: '11px' }}
				>
					{(index + 1).toString().padStart(2, '0')}
				</span>
			</div>

			{/* Body: name + meta */}
			<button
				type="button"
				onClick={() => onOpenDetail(product.slug)}
				className="min-w-0 text-start outline-none"
			>
				<p
					className="font-[family-name:var(--font-fraunces)] leading-[1.12] text-[var(--ink)] transition-colors group-hover:text-[var(--compendium-brand)]"
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
						{product.supplierName}
					</span>
					{product.recentlyOrdered && (
						<span
							className="font-[family-name:var(--font-fraunces)] italic"
							style={{
								color: product.isUrgent
									? 'var(--compendium-stale)'
									: 'var(--compendium-aging)',
							}}
						>
							· asked for this week
						</span>
					)}
					{product.pendingRequestCount > 0 && (
						<>
							<span className="opacity-60">·</span>
							<span
								className="font-[family-name:var(--font-fraunces)] italic"
								style={{ color: 'var(--compendium-brand)' }}
							>
								sales waiting × {product.pendingRequestCount}
							</span>
						</>
					)}
				</p>
			</button>

			{/* Cost — inline editable */}
			<div className="flex flex-col items-end pt-1">
				{editing ? (
					<input
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						onBlur={commit}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault()
								e.stopPropagation()
								commit()
							}
							if (e.key === 'Escape') cancel()
						}}
						// biome-ignore lint/a11y/noAutofocus: intentional focus when user clicks the editable price
						autoFocus
						className="w-28 bg-transparent text-end font-[family-name:var(--font-fraunces)] text-[24px] font-medium tabular-nums text-[var(--ink)] outline-none border-b border-[var(--compendium-brand)]/50 pb-0.5"
					/>
				) : (
					<button
						type="button"
						onClick={beginEdit}
						className="group/price inline-flex items-baseline gap-1 outline-none"
					>
						<span
							className="compendium-numeral font-[family-name:var(--font-fraunces)] text-[var(--ink)]"
							style={{
								fontSize: '26px',
								fontWeight: 500,
								letterSpacing: '-0.028em',
								lineHeight: 1,
							}}
						>
							{product.rawCost > 0
								? product.rawCost.toLocaleString('en-EG', {
										minimumFractionDigits: 2,
									})
								: '—'}
						</span>
						<span
							aria-hidden="true"
							className="text-[10px] opacity-0 transition-opacity group-hover/price:opacity-100"
							style={{ color: 'var(--ink-mid)' }}
						>
							✎
						</span>
					</button>
				)}
				<span
					className="mt-1 font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
					style={{ fontSize: '10.5px' }}
				>
					per {product.unit}
				</span>
			</div>

			{/* Right gutter: age + status */}
			<div className="flex flex-col items-end pt-1">
				<span
					className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-soft)]"
					style={{ fontSize: '11.5px' }}
				>
					last quoted
				</span>
				<span
					className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[13px] font-medium tabular-nums"
					style={{ color: toneColor }}
				>
					{formatHoursAgo(product.hoursSinceUpdate)} ago
				</span>
				<span
					className="mt-1 font-[family-name:var(--font-fraunces)] italic"
					style={{
						fontSize: '10.5px',
						color: isSaving
							? 'var(--compendium-brand)'
							: justSaved
								? 'var(--compendium-fresh)'
								: toneColor,
					}}
				>
					{isSaving
						? 'saving…'
						: justSaved
							? 'saved'
							: product.isUrgent
								? 'urgent'
								: product.priceStatus === 'outdated'
									? tone === 'aging'
										? 'aging'
										: 'stale'
									: 'fresh'}
				</span>
			</div>
		</li>
	)
}

// ─── Empty ──────────────────────────────────────────────

function DeskEmpty({ onlyUrgent }: { onlyUrgent: boolean }) {
	return (
		<div className="mt-16 flex flex-col items-center gap-2 border-y border-dashed border-[var(--rule-soft)] py-14">
			<span
				className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink)]"
				style={{ fontSize: '22px', letterSpacing: '-0.01em' }}
			>
				{onlyUrgent
					? 'no urgent prices — the desk is quiet.'
					: 'the desk is clear.'}
			</span>
			<span
				className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-soft)]"
				style={{ fontSize: '12px' }}
			>
				{onlyUrgent
					? 'nothing demands the phone right now.'
					: 'adjust the index or clear the search to see more.'}
			</span>
		</div>
	)
}
