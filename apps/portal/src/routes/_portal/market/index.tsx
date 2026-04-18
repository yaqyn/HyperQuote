/**
 * Market — referenced material grid.
 *
 * Each entry is presented like an inventory plate from a specimen catalog:
 *   • Sequential reference number stamped above the image (No. 001)
 *   • 4:3 image, one full-bleed rectangle
 *   • An "add" tab attached to the bottom-end of the image (not floating)
 *   • Title + price/uom strip beneath
 *
 * Top: a single thin command bar with search + draft tally — no decorative
 * masthead, no big "Index" title, no dark backdrop layer.
 */

import { useInfiniteQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Pencil, Plus, Search, Undo2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
	getMarketProducts,
	type MarketProduct,
} from '../../../lib/server/market'
import { useDraftQuoteStore } from '../../../stores/draft-quote'

export const Route = createFileRoute('/_portal/market/')({
	component: MarketGridPage,
})

const CATEGORIES = [
	'cement',
	'steel',
	'aggregates',
	'bricks',
	'timber',
	'finishing',
] as const

const CATEGORY_MAP: Record<string, string[]> = {
	cement: ['cement', 'concrete'],
	steel: ['reinforcing_steel', 'structural_steel', 'plumbing', 'electrical'],
	aggregates: ['aggregates', 'sand'],
	bricks: ['bricks'],
	timber: ['wood', 'waterproofing', 'insulation'],
	finishing: ['paints', 'tiles', 'drywall', 'adhesives'],
}

const PLACEHOLDER_IMAGE =
	'https://websiteassets.hyperquote.net/Images/cairo.webp'

function pad(n: number, isAr: boolean): string {
	return isAr ? n.toLocaleString('ar-EG') : String(n).padStart(3, '0')
}

function MarketGridPage() {
	const { t, i18n } = useTranslation('portal')
	const navigate = useNavigate()
	const isAr = i18n.language === 'ar'
	const draftItemCount = useDraftQuoteStore((s) => s.items.length)

	const [searchQuery, setSearchQuery] = useState('')
	const [debouncedSearch, setDebouncedSearch] = useState('')
	const [selectedCategories, setSelectedCategories] = useState<string[]>([])

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(searchQuery), 250)
		return () => clearTimeout(timer)
	}, [searchQuery])

	const categoryFilter =
		selectedCategories.length > 0
			? selectedCategories
					.flatMap((cat) => CATEGORY_MAP[cat] ?? [cat])
					.join(',')
			: undefined

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useInfiniteQuery({
			queryKey: ['market-products', debouncedSearch, categoryFilter],
			queryFn: async ({ pageParam = 1 }) =>
				getMarketProducts({
					data: {
						search: debouncedSearch || undefined,
						category: categoryFilter || undefined,
						page: pageParam,
						limit: 24,
					},
				}),
			initialPageParam: 1,
			getNextPageParam: (lastPage) => lastPage.nextPage,
			staleTime: 60_000,
		})

	const allProducts = useMemo(
		() => data?.pages.flatMap((page) => page.products) ?? [],
		[data],
	)
	const hasActiveFilters = !!(debouncedSearch || selectedCategories.length)

	const sentinelRef = useRef<HTMLDivElement>(null)
	useEffect(() => {
		const el = sentinelRef.current
		if (!el || !hasNextPage || isFetchingNextPage) return
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						fetchNextPage()
						break
					}
				}
			},
			{ rootMargin: '600px' },
		)
		observer.observe(el)
		return () => observer.disconnect()
	}, [fetchNextPage, hasNextPage, isFetchingNextPage])

	function toggleCategory(cat: string) {
		setSelectedCategories((prev) =>
			prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
		)
	}

	function clearFilters() {
		setSearchQuery('')
		setDebouncedSearch('')
		setSelectedCategories([])
	}

	return (
		<div className="flex h-full min-h-0 flex-col bg-[var(--p-bg)]">
			{/* Command bar — search + draft tally on a single thin line */}
			<CommandBar
				value={searchQuery}
				onChange={setSearchQuery}
				placeholder={t('market.locateHint')}
				draftItemCount={draftItemCount}
				isAr={isAr}
				openLedgerLabel={t('market.openLedger')}
			/>

			{/* Filter row — monospace tabs */}
			<FilterTabs
				selected={selectedCategories}
				onToggle={toggleCategory}
				onClearAll={hasActiveFilters ? clearFilters : undefined}
				labelOf={(c) => t(`market.cat.${c}`)}
			/>

			{/* Grid */}
			<div className="flex-1 overflow-y-auto">
				<div className="mx-auto w-full max-w-[1280px] px-6 py-10 lg:px-12">
					{isLoading ? (
						<GridSkeleton />
					) : allProducts.length === 0 ? (
						<EmptyState
							onClear={hasActiveFilters ? clearFilters : undefined}
							clearLabel={t('market.clearFilters')}
							title={t('empty.market.title')}
							body={t('empty.market.body')}
						/>
					) : (
						<>
							<div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
								{allProducts.map((product, i) => (
									<ProductPlate
										key={product.id}
										product={product}
										refNo={pad(i + 1, isAr)}
										onOpen={() =>
											navigate({
												to: '/market/$productSlug',
												params: { productSlug: product.slug },
											})
										}
									/>
								))}
							</div>
							<div ref={sentinelRef} aria-hidden="true" className="h-1" />
							{isFetchingNextPage && (
								<p className="mt-12 text-center font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--p-text-faint)]">
									{t('market.loadingMore')}
								</p>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Command bar
// ---------------------------------------------------------------------------

function CommandBar({
	value,
	onChange,
	placeholder,
	draftItemCount,
	isAr,
	openLedgerLabel,
}: {
	value: string
	onChange: (v: string) => void
	placeholder: string
	draftItemCount: number
	isAr: boolean
	openLedgerLabel: string
}) {
	const inputRef = useRef<HTMLInputElement>(null)
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
				e.preventDefault()
				inputRef.current?.focus()
			}
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [])

	return (
		<div className="border-b border-[var(--p-border)] bg-[var(--p-bg)]">
			<div className="mx-auto flex w-full max-w-[1280px] items-center gap-3 px-6 py-3.5 lg:px-12">
				<Search
					size={14}
					strokeWidth={1.5}
					className="text-[var(--p-text-muted)]"
				/>
				<input
					ref={inputRef}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					type="search"
					autoComplete="off"
					spellCheck={false}
					className="flex-1 bg-transparent text-[14px] text-[var(--p-text)] outline-none placeholder:text-[var(--p-text-faint)]"
				/>

				{value ? (
					<button
						type="button"
						onClick={() => onChange('')}
						className="text-[var(--p-text-faint)] hover:text-[var(--p-text)]"
						aria-label="Clear"
					>
						<X size={14} strokeWidth={1.5} />
					</button>
				) : (
					<kbd className="hidden rounded border border-[var(--p-border)] px-1.5 py-0.5 font-mono text-[10px] tracking-[0.18em] text-[var(--p-text-faint)] sm:inline-block">
						/
					</kbd>
				)}

				{draftItemCount > 0 && (
					<>
						<span
							className="mx-1 h-4 w-px bg-[var(--p-border)]"
							aria-hidden="true"
						/>
						<Link
							to="/orders"
							className="group inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-text-muted)] transition-colors hover:text-[var(--p-text)]"
						>
							<span>{openLedgerLabel}</span>
							<span
								className="rounded-sm bg-[var(--p-text)] px-1.5 py-0.5 font-mono text-[10px] tracking-[0.1em] text-[var(--p-bg)]"
								style={{ fontVariantNumeric: 'tabular-nums' }}
							>
								{isAr
									? draftItemCount.toLocaleString('ar-EG')
									: String(draftItemCount).padStart(2, '0')}
							</span>
						</Link>
					</>
				)}
			</div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Filter tabs — monospace, underline-indicator
// ---------------------------------------------------------------------------

function FilterTabs({
	selected,
	onToggle,
	onClearAll,
	labelOf,
}: {
	selected: string[]
	onToggle: (c: string) => void
	onClearAll?: () => void
	labelOf: (c: string) => string
}) {
	const { t } = useTranslation('portal')
	const isAllActive = selected.length === 0
	return (
		<div className="border-b border-[var(--p-border)] bg-[var(--p-bg)]">
			<div className="mx-auto flex w-full max-w-[1280px] items-stretch gap-0 overflow-x-auto px-6 lg:px-12">
				<TabButton
					active={isAllActive}
					onClick={onClearAll ?? (() => null)}
					label={t('market.allEntries')}
				/>
				{CATEGORIES.map((cat) => (
					<TabButton
						key={cat}
						active={selected.includes(cat)}
						onClick={() => onToggle(cat)}
						label={labelOf(cat)}
					/>
				))}
			</div>
		</div>
	)
}

function TabButton({
	active,
	onClick,
	label,
}: {
	active: boolean
	onClick: () => void
	label: string
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={active}
			className={[
				'relative shrink-0 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors',
				active
					? 'text-[var(--p-text)]'
					: 'text-[var(--p-text-muted)] hover:text-[var(--p-text-secondary)]',
			].join(' ')}
		>
			<span className="lowercase">{label}</span>
			{active && (
				<span
					aria-hidden="true"
					className="absolute inset-x-3 -bottom-px h-px bg-[var(--p-text)]"
				/>
			)}
		</button>
	)
}

// ---------------------------------------------------------------------------
// Product plate — referenced inventory tile
// ---------------------------------------------------------------------------

function ProductPlate({
	product,
	refNo,
	onOpen,
}: {
	product: MarketProduct
	refNo: string
	onOpen: () => void
}) {
	const { t, i18n } = useTranslation('portal')
	const isAr = i18n.language === 'ar'
	const name = isAr ? product.nameAr : product.name
	const image = product.imageUrl || PLACEHOLDER_IMAGE
	const draftItem = useDraftQuoteStore((s) =>
		s.items.find((i) => i.productId === product.id),
	)
	const inDraft = draftItem != null
	const [popoverOpen, setPopoverOpen] = useState(false)
	const tabRef = useRef<HTMLButtonElement>(null)

	const formattedPrice = useMemo(() => {
		const { priceRangeMin: min, priceRangeMax: max } = product
		if (min == null && max == null) return null
		const fmt = new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-EG', {
			maximumFractionDigits: 0,
		})
		if (min != null && max != null)
			return `${fmt.format(min)}–${fmt.format(max)}`
		if (min != null) return `${fmt.format(min)}+`
		if (max != null) return fmt.format(max)
		return null
	}, [product, isAr])

	return (
		<article className="group relative">
			{/* Reference stamp + category tag — top of plate */}
			<div className="mb-2 flex items-baseline justify-between gap-2 px-0.5">
				<span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--p-text-faint)]">
					№ {refNo}
				</span>
				<span className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-text-faint)]">
					{t(`market.cat.${product.category}`, {
						defaultValue: product.category.replace(/_/g, ' '),
					})}
				</span>
			</div>

			{/* Image + add tab */}
			<div className="relative">
				<button
					type="button"
					onClick={onOpen}
					className="block w-full overflow-hidden rounded-sm bg-[var(--p-surface)] text-start ring-1 ring-inset ring-[var(--p-border)]"
					aria-label={name}
				>
					<div className="aspect-[4/3]">
						<img
							src={image}
							alt={name}
							loading="lazy"
							decoding="async"
							className="h-full w-full object-cover"
						/>
					</div>
				</button>

				{/* In-draft chip — top corner of image */}
				{inDraft && (
					<span
						className="absolute top-2 start-2 inline-flex items-center rounded-sm bg-[var(--p-text)] px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-[0.06em] text-[var(--p-bg)]"
						style={{ fontVariantNumeric: 'tabular-nums' }}
					>
						{draftItem?.quantity} {product.unitOfMeasure}
					</span>
				)}

				{/* Add tab — attached to bottom-end edge of image */}
				<button
					ref={tabRef}
					type="button"
					onClick={(e) => {
						e.preventDefault()
						e.stopPropagation()
						setPopoverOpen((v) => !v)
					}}
					className={[
						'absolute -bottom-px end-3 inline-flex h-7 items-center gap-1 rounded-b-sm px-2.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-all',
						inDraft || popoverOpen
							? 'bg-[var(--p-text)] text-[var(--p-bg)]'
							: 'bg-[var(--p-text)] text-[var(--p-bg)] opacity-0 group-hover:opacity-100 max-md:opacity-100',
					].join(' ')}
					aria-label={inDraft ? t('market.amend') : t('market.record')}
					aria-expanded={popoverOpen}
				>
					{inDraft ? <Pencil size={11} /> : <Plus size={12} />}
					<span>{inDraft ? t('market.amend') : t('market.record')}</span>
				</button>

				<AnimatePresence>
					{popoverOpen && (
						<AddPopover
							product={product}
							productName={name}
							anchorRef={tabRef}
							onClose={() => setPopoverOpen(false)}
						/>
					)}
				</AnimatePresence>
			</div>

			{/* Title + price strip */}
			<div className="mt-3 px-0.5">
				<button
					type="button"
					onClick={onOpen}
					className="block w-full text-start"
				>
					<p className="line-clamp-2 text-[13px] font-medium leading-snug text-[var(--p-text)] group-hover:text-[var(--p-text)]">
						{name}
					</p>
				</button>
				<div className="mt-2 flex items-baseline justify-between gap-2 border-t border-[var(--p-border)] pt-2">
					<span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-text-muted)]">
						/ {product.unitOfMeasure}
					</span>
					{formattedPrice && (
						<span
							className="font-mono text-[12px] text-[var(--p-text-secondary)]"
							style={{ fontVariantNumeric: 'tabular-nums' }}
						>
							EGP {formattedPrice}
						</span>
					)}
				</div>
			</div>
		</article>
	)
}

// ---------------------------------------------------------------------------
// Add popover — small floating editor anchored above the + tab.
// Mirrors the website's ProductCard pattern: portal-rendered, click-outside,
// Enter/Escape, primary action + optional undo.
// ---------------------------------------------------------------------------

function AddPopover({
	product,
	productName,
	anchorRef,
	onClose,
}: {
	product: MarketProduct
	productName: string
	anchorRef: React.RefObject<HTMLButtonElement | null>
	onClose: () => void
}) {
	const { t } = useTranslation('portal')
	const { add, remove, updateQuantity, items } = useDraftQuoteStore()
	const existing = items.find((i) => i.productId === product.id)
	const [qtyStr, setQtyStr] = useState(String(existing?.quantity ?? 1))
	const qty = parseInt(qtyStr, 10) || 0
	const inputRef = useRef<HTMLInputElement>(null)
	const popoverRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		inputRef.current?.select()
	}, [])

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (
				popoverRef.current &&
				!popoverRef.current.contains(e.target as Node) &&
				anchorRef.current &&
				!anchorRef.current.contains(e.target as Node)
			) {
				onClose()
			}
		}
		document.addEventListener('mousedown', handleClick)
		return () => document.removeEventListener('mousedown', handleClick)
	}, [onClose, anchorRef])

	const submit = () => {
		if (qty <= 0) {
			if (existing) remove(product.id)
			onClose()
			return
		}
		if (existing) {
			updateQuantity(product.id, qty)
		} else {
			add(
				{
					productId: product.id,
					slug: product.slug,
					name: product.name,
					nameAr: product.nameAr,
					category: product.category,
					unitOfMeasure: product.unitOfMeasure,
					imageUrl: product.imageUrl,
				},
				qty,
			)
		}
		onClose()
	}

	// Anchor above the + tab. Position is computed once on open from the
	// anchor's bounding rect — `bottom` so the popover sits above the tab.
	const [pos, setPos] = useState({ top: 0, left: 0 })
	useEffect(() => {
		if (!anchorRef.current) return
		const rect = anchorRef.current.getBoundingClientRect()
		setPos({
			top: rect.top - 12,
			left: Math.max(8, rect.right - 220),
		})
	}, [anchorRef])

	return createPortal(
		<motion.div
			ref={popoverRef}
			initial={{ opacity: 0, scale: 0.94, y: 6 }}
			animate={{ opacity: 1, scale: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.94, y: 6 }}
			transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
			style={{
				position: 'fixed',
				bottom: `calc(100vh - ${pos.top}px + 8px)`,
				left: pos.left,
			}}
			className="z-[100] w-[220px] rounded-md border border-[var(--p-border-strong)] bg-[var(--p-elevated)]/95 p-3 shadow-2xl backdrop-blur-xl"
			onClick={(e) => {
				e.preventDefault()
				e.stopPropagation()
			}}
		>
			<p className="mb-2 line-clamp-1 text-[12px] font-medium text-[var(--p-text)]">
				{productName}
			</p>

			<div className="relative mb-2">
				<input
					ref={inputRef}
					type="text"
					inputMode="numeric"
					value={qtyStr}
					onChange={(e) => setQtyStr(e.target.value.replace(/[^0-9]/g, ''))}
					onKeyDown={(e) => {
						e.stopPropagation()
						if (e.key === 'Enter') {
							e.preventDefault()
							submit()
						}
						if (e.key === 'Escape') onClose()
					}}
					min={1}
					aria-label={t('market.quantity')}
					className="h-9 w-full rounded-sm border border-[var(--p-border)] bg-[var(--p-input)] ps-3 pe-14 text-center font-mono text-[15px] font-medium text-[var(--p-text)] outline-none transition-colors focus:border-[var(--p-text)]/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
					style={{ fontVariantNumeric: 'tabular-nums' }}
				/>
				<span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-text-faint)]">
					{product.unitOfMeasure}
				</span>
			</div>

			<div className="flex items-center gap-2">
				{existing && (
					<button
						type="button"
						onClick={() => {
							remove(product.id)
							onClose()
						}}
						className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-[var(--p-border)] text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
						aria-label={t('market.removeItem')}
					>
						<Undo2 size={13} />
					</button>
				)}
				<button
					type="button"
					onClick={submit}
					className="h-9 flex-1 rounded-sm bg-[var(--p-text)] font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-bg)] transition-opacity hover:opacity-90"
				>
					{existing ? t('market.confirm') : t('market.record')}
				</button>
			</div>
		</motion.div>,
		document.body,
	)
}

// ---------------------------------------------------------------------------
// Skeleton + empty
// ---------------------------------------------------------------------------

const SKELETON_TILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const

function GridSkeleton() {
	return (
		<div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
			{SKELETON_TILES.map((slot) => (
				<div key={slot}>
					<div className="mb-2 flex items-baseline justify-between gap-2 px-0.5">
						<div className="h-2.5 w-12 animate-pulse bg-[var(--p-border)]" />
						<div className="h-2.5 w-16 animate-pulse bg-[var(--p-border)]" />
					</div>
					<div className="aspect-[4/3] animate-pulse rounded-sm bg-[var(--p-surface)]" />
					<div className="mt-3 h-3 w-3/4 animate-pulse bg-[var(--p-border)]" />
					<div className="mt-2 h-2.5 w-1/2 animate-pulse bg-[var(--p-border)]" />
				</div>
			))}
		</div>
	)
}

function EmptyState({
	title,
	body,
	onClear,
	clearLabel,
}: {
	title: string
	body: string
	onClear?: () => void
	clearLabel: string
}) {
	return (
		<div className="flex flex-col items-center gap-3 py-24 text-center">
			<p className="text-[16px] font-medium text-[var(--p-text)]">{title}</p>
			<p className="text-[13px] text-[var(--p-text-muted)]">{body}</p>
			{onClear && (
				<button
					type="button"
					onClick={onClear}
					className="mt-3 rounded-sm border border-[var(--p-border-strong)] px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-text)] hover:bg-[var(--p-hover)]"
				>
					{clearLabel}
				</button>
			)}
		</div>
	)
}
