import { useQuery } from '@tanstack/react-query'
import { Flame } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { getProductCatalog } from '../../../lib/server/sales-quotes'
import { getPriceUrgency } from '../../../types/sales'
import { SearchMenu } from './SearchMenu'

export interface CatalogProduct {
	id: string
	name: string
	specification: string
	unit: string
	category: string
	supplierCost: number
	freshness: 'fresh' | 'aging' | 'stale' | 'missing'
	priceStatus: 'updated' | 'outdated'
	recentlyOrdered: boolean
	supplierName: string
}

interface ProductSearchMenuProps {
	isOpen: boolean
	onClose: () => void
	onAddProduct: (product: CatalogProduct, quantity: number) => void
	/** Product ids already present in the quote — shown as `already added`. */
	existingIds?: string[]
}

/**
 * ProductSearchMenu — typewriter-ledger catalog browser. Each row is a
 * single typographic line: product name in Literata, italic eyebrow
 * metadata, Plex Mono price, inline-typeable qty, and a sweep-underline
 * `add →` word-action. No card chrome, no stepper buttons — the rep
 * types the quantity and presses Enter or clicks the verb.
 */
export function ProductSearchMenu({
	isOpen,
	onClose,
	onAddProduct,
	existingIds = [],
}: ProductSearchMenuProps) {
	const { data, isLoading } = useQuery({
		queryKey: ['product-catalog'],
		queryFn: () => getProductCatalog({ data: {} }),
		staleTime: 300_000,
		enabled: isOpen,
	})

	const products: CatalogProduct[] = data?.products ?? []

	// Per-row qty state — keyed by product id so the rep's typed value
	// survives filter changes and only resets on close.
	const [qtyMap, setQtyMap] = useState<Record<string, number>>({})
	const [activeCategory, setActiveCategory] = useState<string | null>(null)

	const categoryCounts = useMemo(() => {
		const counts = new Map<string, number>()
		for (const p of products)
			counts.set(p.category, (counts.get(p.category) ?? 0) + 1)
		return counts
	}, [products])

	const categories = useMemo(
		() => Array.from(categoryCounts.keys()).sort(),
		[categoryCounts],
	)

	const existingSet = useMemo(() => new Set(existingIds), [existingIds])

	const getQty = (id: string) => qtyMap[id] ?? 1
	const setQty = (id: string, n: number) =>
		setQtyMap((prev) => ({ ...prev, [id]: Math.max(1, n) }))

	return (
		<SearchMenu
			isOpen={isOpen}
			onClose={onClose}
			placeholder="search the catalog…"
			sidebar={
				<CategoryRail
					categories={categories}
					counts={categoryCounts}
					activeCategory={activeCategory}
					onSelect={setActiveCategory}
					totalCount={products.length}
				/>
			}
			resultStatus={
				isLoading
					? 'loading…'
					: (() => {
							const shown = products.filter(
								(p) => !activeCategory || p.category === activeCategory,
							).length
							return products.length === 0
								? 'no products'
								: `${shown} of ${products.length}`
						})()
			}
		>
			{(search) => {
				const q = search.toLowerCase().trim()
				const filtered = products.filter((p) => {
					if (activeCategory && p.category !== activeCategory) return false
					if (!q) return true
					return (
						p.name.toLowerCase().includes(q) ||
						p.specification.toLowerCase().includes(q) ||
						p.category.toLowerCase().includes(q) ||
						p.supplierName.toLowerCase().includes(q)
					)
				})

				if (isLoading) {
					return (
						<div className="flex flex-col gap-2 p-5">
							{[1, 2, 3, 4].map((i) => (
								<div
									key={i}
									className="h-12 rounded-sm"
									style={{
										backgroundColor: 'var(--color-border)',
										opacity: 0.4,
									}}
								/>
							))}
						</div>
					)
				}

				if (filtered.length === 0) {
					return (
						<div className="flex items-center justify-center px-6 py-16">
							<p
								className="font-[family-name:var(--font-literata)] italic text-[var(--color-text-subtle)]"
								style={{ fontSize: '14px', textAlign: 'center' }}
							>
								{q
									? `nothing called "${search}"`
									: activeCategory
										? `nothing in ${formatCategory(activeCategory)} yet`
										: 'the catalog is empty'}
							</p>
						</div>
					)
				}

				// Group by category — Literata italic section headings between groups.
				const grouped = groupByCategory(filtered)

				return (
					<div className="flex flex-col">
						{grouped.map(({ category, items }) => (
							<Fragment key={category}>
								<CategoryHeading
									label={category}
									count={items.length}
									totalInCategory={categoryCounts.get(category) ?? items.length}
								/>
								<div className="flex flex-col">
									{items.map((product) => (
										<CatalogRow
											key={product.id}
											product={product}
											qty={getQty(product.id)}
											onQtyChange={(n) => setQty(product.id, n)}
											alreadyAdded={existingSet.has(product.id)}
											onAdd={() => {
												onAddProduct(product, getQty(product.id))
												onClose()
											}}
										/>
									))}
								</div>
							</Fragment>
						))}
					</div>
				)
			}}
		</SearchMenu>
	)
}

// ─── Category rail ───────────────────────────────────────

function CategoryRail({
	categories,
	counts,
	activeCategory,
	onSelect,
	totalCount,
}: {
	categories: string[]
	counts: Map<string, number>
	activeCategory: string | null
	onSelect: (c: string | null) => void
	totalCount: number
}) {
	return (
		<nav
			aria-label="Product categories"
			className="flex flex-col gap-0 px-4 py-3"
		>
			<CategoryTab
				label="all"
				count={totalCount}
				active={activeCategory === null}
				onClick={() => onSelect(null)}
			/>
			<div
				aria-hidden="true"
				className="my-2 h-px"
				style={{ backgroundColor: 'var(--color-border)', opacity: 0.5 }}
			/>
			{categories.map((c) => (
				<CategoryTab
					key={c}
					label={formatCategory(c)}
					count={counts.get(c) ?? 0}
					active={activeCategory === c}
					onClick={() => onSelect(c)}
				/>
			))}
		</nav>
	)
}

function CategoryTab({
	label,
	count,
	active,
	onClick,
}: {
	label: string
	count: number
	active: boolean
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={active}
			className="group relative flex items-baseline justify-between gap-2 py-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 rounded-sm"
		>
			<span className="relative inline-flex items-baseline">
				{active && (
					<span
						aria-hidden="true"
						className="absolute -left-3 top-1/2 h-3.5 w-[2px] -translate-y-1/2 bg-[var(--color-primary)]"
					/>
				)}
				<span
					className="font-[family-name:var(--font-archivo)]"
					style={{
						fontSize: '12px',
						fontStyle: active ? 'normal' : 'italic',
						fontWeight: active ? 500 : 400,
						letterSpacing: '-0.005em',
						color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
					}}
				>
					{label}
				</span>
			</span>
			<span
				className="font-[family-name:var(--font-plex-mono)] tabular-nums"
				style={{
					fontSize: '10px',
					color: active
						? 'var(--color-text-muted)'
						: 'var(--color-text-subtle)',
					letterSpacing: '0.04em',
				}}
			>
				{count}
			</span>
		</button>
	)
}

// ─── Category heading ────────────────────────────────────

function CategoryHeading({
	label,
	count,
	totalInCategory,
}: {
	label: string
	count: number
	totalInCategory: number
}) {
	const showFraction = count < totalInCategory
	return (
		<div className="flex items-baseline gap-3 px-5 pt-5 pb-2">
			<span
				className="shrink-0 font-[family-name:var(--font-literata)] italic text-[var(--color-text-muted)]"
				style={{
					fontSize: '15px',
					letterSpacing: '-0.01em',
					lineHeight: 1.2,
				}}
			>
				{formatCategory(label)}
			</span>
			<div
				aria-hidden="true"
				className="h-px flex-1"
				style={{ backgroundColor: 'var(--color-border)', opacity: 0.5 }}
			/>
			<span
				className="shrink-0 font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text-subtle)]"
				style={{ fontSize: '10px', letterSpacing: '0.06em' }}
			>
				{showFraction ? `${count} / ${totalInCategory}` : count}
			</span>
		</div>
	)
}

// ─── Catalog row ─────────────────────────────────────────

function CatalogRow({
	product,
	qty,
	onQtyChange,
	alreadyAdded,
	onAdd,
}: {
	product: CatalogProduct
	qty: number
	onQtyChange: (n: number) => void
	alreadyAdded: boolean
	onAdd: () => void
}) {
	const urgency = getPriceUrgency(product.priceStatus, product.recentlyOrdered)
	const urgencyTone =
		urgency === 'urgent'
			? 'var(--color-signal-red)'
			: urgency === 'stale'
				? 'var(--color-signal-amber)'
				: null
	const urgencyLabel =
		urgency === 'urgent' ? 'urgent' : urgency === 'stale' ? 'outdated' : null
	const hasCost = product.supplierCost > 0
	const inputId = `catalog-qty-${product.id}`

	return (
		<div
			className="group/row flex items-baseline gap-5 px-5 py-3 transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.02]"
			style={{
				borderBottom: '1px solid var(--color-border)',
			}}
		>
			{/* Identity column — name + eyebrow metadata */}
			<div className="flex-1 min-w-0">
				<div className="flex items-baseline gap-2">
					<span
						className="font-[family-name:var(--font-literata)] truncate text-[var(--color-text)]"
						style={{
							fontSize: '15px',
							fontWeight: 500,
							letterSpacing: '-0.01em',
							lineHeight: 1.25,
						}}
					>
						{product.name}
					</span>
					{product.recentlyOrdered && (
						<Flame
							size={11}
							strokeWidth={1.75}
							className="shrink-0 self-center"
							style={{
								color: urgencyTone ?? 'var(--color-text-subtle)',
							}}
							aria-label="recently ordered"
						/>
					)}
				</div>
				<div
					className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-[family-name:var(--font-archivo)] italic text-[var(--color-text-subtle)]"
					style={{ fontSize: '11px', letterSpacing: '-0.005em' }}
				>
					<span className="truncate">{product.specification}</span>
					<EyebrowDivider />
					<span className="truncate">{product.supplierName}</span>
					{urgencyLabel && urgencyTone && (
						<>
							<EyebrowDivider />
							<span style={{ color: urgencyTone }}>{urgencyLabel}</span>
						</>
					)}
					{alreadyAdded && (
						<>
							<EyebrowDivider />
							<span style={{ color: 'var(--color-primary)' }}>
								already in quote
							</span>
						</>
					)}
				</div>
			</div>

			{/* Cost lockup */}
			<div className="shrink-0 w-[88px] text-end self-center">
				<div
					className="font-[family-name:var(--font-plex-mono)] tabular-nums"
					style={{
						fontSize: '13px',
						color: hasCost ? 'var(--color-text)' : 'var(--color-text-subtle)',
						fontWeight: 500,
						letterSpacing: '0.005em',
					}}
				>
					{hasCost
						? product.supplierCost.toLocaleString('en-EG', {
								minimumFractionDigits: 2,
							})
						: '—'}
				</div>
				<div
					className="mt-0.5 font-[family-name:var(--font-archivo)] italic text-[var(--color-text-subtle)]"
					style={{ fontSize: '10px' }}
				>
					/{product.unit}
				</div>
			</div>

			{/* Qty — typeable, hairline-bottom */}
			<label
				htmlFor={inputId}
				className="shrink-0 inline-flex items-baseline gap-1 self-center"
				onClick={(e) => e.stopPropagation()}
			>
				<span className="sr-only">quantity for {product.name}</span>
				<span
					aria-hidden="true"
					className="font-[family-name:var(--font-archivo)] italic text-[var(--color-text-subtle)]"
					style={{ fontSize: '11px' }}
				>
					×
				</span>
				<input
					id={inputId}
					type="number"
					min={1}
					step={1}
					value={qty}
					onChange={(e) => {
						const raw = Number(e.target.value)
						onQtyChange(Number.isFinite(raw) && raw > 0 ? raw : 1)
					}}
					onFocus={(e) => e.currentTarget.select()}
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => {
						e.stopPropagation()
						if (e.key === 'Enter') {
							e.preventDefault()
							;(e.currentTarget as HTMLInputElement).blur()
							if (!alreadyAdded && hasCost) onAdd()
						}
					}}
					className="w-12 bg-transparent text-end font-[family-name:var(--font-plex-mono)] tabular-nums outline-none transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-primary)]"
					style={{
						fontSize: '13px',
						color: 'var(--color-text)',
						fontWeight: 500,
						letterSpacing: '0.005em',
					}}
				/>
			</label>

			{/* Add — italic word-action with sweep underline. data-searchmenu-row
			    so the SearchMenu arrow-key + Enter flow targets it. */}
			<button
				type="button"
				data-searchmenu-row="true"
				onClick={onAdd}
				disabled={alreadyAdded || !hasCost}
				aria-label={
					alreadyAdded
						? `${product.name} already in quote`
						: !hasCost
							? `${product.name} cost missing — request a price first`
							: `Add ${qty} ${product.unit} of ${product.name} to quote`
				}
				className="group/add shrink-0 self-center inline-flex items-baseline gap-1.5 font-[family-name:var(--font-archivo)] italic outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 rounded-sm disabled:cursor-not-allowed data-[active=true]:text-[var(--color-primary)]"
				style={{
					fontSize: '13px',
					color: alreadyAdded
						? 'var(--color-primary)'
						: !hasCost
							? 'var(--color-text-subtle)'
							: 'var(--color-text-muted)',
				}}
			>
				{alreadyAdded ? (
					<span className="inline-flex items-baseline gap-1">
						<svg
							aria-hidden="true"
							width="10"
							height="10"
							viewBox="0 0 10 10"
							className="self-center"
						>
							<path
								d="M2 5 L4 7 L8 3"
								stroke="currentColor"
								strokeWidth="1.4"
								strokeLinecap="round"
								strokeLinejoin="round"
								fill="none"
							/>
						</svg>
						added
					</span>
				) : (
					<>
						<span className="relative">
							add
							<span
								aria-hidden="true"
								className={
									!hasCost
										? 'hidden'
										: 'absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-[var(--color-primary)] transition-transform duration-200 group-hover/add:scale-x-100 group-focus-visible/add:scale-x-100 group-data-[active=true]/add:scale-x-100 group-hover/row:scale-x-100'
								}
							/>
						</span>
						<span
							aria-hidden="true"
							className="self-center transition-transform group-hover/add:translate-x-0.5 group-data-[active=true]/add:translate-x-0.5"
							style={{ fontSize: '12px' }}
						>
							→
						</span>
					</>
				)}
			</button>
		</div>
	)
}

function EyebrowDivider() {
	return (
		<span
			aria-hidden="true"
			className="text-[var(--color-text-subtle)]/60"
			style={{ fontSize: '10px' }}
		>
			·
		</span>
	)
}

// ─── Helpers ─────────────────────────────────────────────

function formatCategory(c: string): string {
	return c.replace(/_/g, ' ').toLowerCase()
}

function groupByCategory(
	products: CatalogProduct[],
): Array<{ category: string; items: CatalogProduct[] }> {
	const map = new Map<string, CatalogProduct[]>()
	for (const p of products) {
		const bucket = map.get(p.category) ?? []
		bucket.push(p)
		map.set(p.category, bucket)
	}
	return Array.from(map.entries())
		.map(([category, items]) => ({ category, items }))
		.sort((a, b) => a.category.localeCompare(b.category))
}
