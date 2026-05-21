/**
 * Market — compact material catalog.
 *
 * Structure follows the public website market: title + search, rounded
 * category chips, dense image cards, with portal draft-quote actions retained.
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
	Check,
	ChevronDown,
	Package,
	Plus,
	Search,
	Undo2,
	X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { DraftQuoteTrigger } from '../../../components/shared/DraftQuoteTrigger'
import { PortalTitleRow } from '../../../components/shell/PortalTitleRow'
import {
	getMarketCategories,
	getMarketProducts,
	type MarketCategory,
	type MarketProduct,
} from '../../../lib/server/market'
import { useDraftQuoteStore } from '../../../stores/draft-quote'
import { usePortalStore } from '../../../stores/portal'

export const Route = createFileRoute('/_portal/market/')({
	component: MarketGridPage,
})

function MarketGridPage() {
	const { t, i18n } = useTranslation('portal')
	const navigate = useNavigate()
	const isAr = i18n.language === 'ar'
	const draftItemCount = useDraftQuoteStore((s) => s.items.length)
	const setDraftQuoteOpen = usePortalStore((s) => s.setDraftQuoteOpen)

	const [searchQuery, setSearchQuery] = useState('')
	const [debouncedSearch, setDebouncedSearch] = useState('')
	const [selectedCategories, setSelectedCategories] = useState<string[]>([])
	const { data: categoryData } = useQuery({
		queryKey: ['market-categories'],
		queryFn: () => getMarketCategories(),
		staleTime: 300_000,
	})
	const marketCategories = categoryData?.categories ?? []

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(searchQuery), 250)
		return () => clearTimeout(timer)
	}, [searchQuery])

	const categoryFilter =
		selectedCategories.length > 0 ? selectedCategories.join(',') : undefined

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
	const totalProducts = data?.pages[0]?.total ?? allProducts.length
	const formattedTotalProducts = isAr
		? totalProducts.toLocaleString('ar-EG')
		: totalProducts.toLocaleString('en-EG')
	const resultCountText = t('market.resultCount', {
		count: formattedTotalProducts,
	})
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
		<div className="flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto bg-[var(--p-bg)]">
			<MarketHeader
				value={searchQuery}
				onChange={setSearchQuery}
				placeholder={t('market.searchPlaceholder')}
				draftItemCount={draftItemCount}
				isAr={isAr}
				onOpenCart={() => setDraftQuoteOpen(true)}
			/>

			<CategoryStrip
				categories={marketCategories}
				selected={selectedCategories}
				onToggle={toggleCategory}
				onClearAll={clearFilters}
			/>

			<section className="px-4 py-6 sm:px-6 sm:py-8 lg:px-12">
				<div className="mx-auto w-full max-w-[1400px]">
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
							<div className="mb-6 flex items-center justify-between">
								<p
									className="text-[13px] text-[var(--p-text-muted)]"
									style={{ fontVariantNumeric: 'tabular-nums' }}
								>
									{resultCountText === 'market.resultCount'
										? formattedTotalProducts
										: resultCountText}
								</p>
							</div>

							<motion.div
								initial={false}
								animate={{ opacity: 1 }}
								transition={{ duration: 0.25, ease: 'easeOut' }}
								className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-8 lg:grid-cols-3 lg:gap-x-6 xl:grid-cols-4"
							>
								{allProducts.map((product) => (
									<ProductCard
										key={product.id}
										product={product}
										onOpen={() =>
											navigate({
												to: '/market/$productSlug',
												params: { productSlug: product.slug },
											})
										}
									/>
								))}
							</motion.div>

							<div ref={sentinelRef} aria-hidden="true" className="h-1" />
							{isFetchingNextPage && (
								<p className="mt-12 text-center text-[13px] text-[var(--p-text-muted)]">
									{t('market.loadingMore')}
								</p>
							)}
						</>
					)}
				</div>
			</section>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Header + search
// ---------------------------------------------------------------------------

function MarketHeader({
	value,
	onChange,
	placeholder,
	draftItemCount,
	isAr,
	onOpenCart,
}: {
	value: string
	onChange: (v: string) => void
	placeholder: string
	draftItemCount: number
	isAr: boolean
	onOpenCart: () => void
}) {
	const { t } = useTranslation('portal')
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
		<header className="sticky top-0 z-20 shrink-0 bg-[var(--p-bg)] px-4 pb-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6 sm:pt-5 lg:px-12 lg:pb-6">
			<div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4">
				<PortalTitleRow title={t('sidebar.nav.market')} />
				<div className="mx-auto flex w-full max-w-[620px] items-center justify-center gap-3">
					<div className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-4 transition-colors focus-within:border-[var(--p-border-strong)]">
						<Search
							size={17}
							strokeWidth={1.7}
							className="shrink-0 text-[var(--p-text-muted)]"
						/>
						<input
							ref={inputRef}
							value={value}
							onChange={(e) => onChange(e.target.value)}
							placeholder={placeholder}
							type="search"
							autoComplete="off"
							spellCheck={false}
							className="min-w-0 flex-1 bg-transparent text-[16px] text-[var(--p-text)] outline-none placeholder:text-[var(--p-text-faint)]"
						/>

						{value ? (
							<button
								type="button"
								onClick={() => onChange('')}
								className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--p-text-faint)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
								aria-label={t('market.clearSearch')}
							>
								<X size={15} strokeWidth={1.7} />
							</button>
						) : (
							<kbd className="hidden rounded border border-[var(--p-border)] px-1.5 py-0.5 font-mono text-[10px] tracking-[0.12em] text-[var(--p-text-faint)] sm:inline-block">
								/
							</kbd>
						)}
					</div>

					{draftItemCount > 0 && (
						<DraftQuoteTrigger
							count={draftItemCount}
							isAr={isAr}
							className="w-auto min-w-[132px] max-w-[150px]"
							onClick={onOpenCart}
						/>
					)}
				</div>
			</div>
		</header>
	)
}

// ---------------------------------------------------------------------------
// Category strip
// ---------------------------------------------------------------------------

function CategoryStrip({
	categories,
	selected,
	onToggle,
	onClearAll,
}: {
	categories: MarketCategory[]
	selected: string[]
	onToggle: (c: string) => void
	onClearAll: () => void
}) {
	const { t, i18n } = useTranslation('portal')
	const isAr = i18n.language === 'ar'
	const isAllActive = selected.length === 0
	const [menuOpen, setMenuOpen] = useState(false)
	const menuRef = useRef<HTMLDivElement>(null)
	const categoryLabels = useMemo(
		() =>
			categories.map((category) => ({
				id: category.slug,
				label: isAr
					? category.nameAr || category.name || category.slug
					: category.name || category.slug,
			})),
		[categories, isAr],
	)
	const selectedLabel = isAllActive
		? t('market.allEntries')
		: categoryLabels
				.filter((cat) => selected.includes(cat.id))
				.map((cat) => cat.label)
				.join(', ')

	useEffect(() => {
		if (!menuOpen) return

		function handlePointerDown(event: PointerEvent) {
			if (!menuRef.current?.contains(event.target as Node)) {
				setMenuOpen(false)
			}
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') setMenuOpen(false)
		}

		document.addEventListener('pointerdown', handlePointerDown)
		document.addEventListener('keydown', handleKeyDown)
		return () => {
			document.removeEventListener('pointerdown', handlePointerDown)
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [menuOpen])

	return (
		<section className="shrink-0 border-y border-[var(--p-border)] py-3">
			<div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-12">
				<div ref={menuRef} className="relative lg:hidden">
					<button
						type="button"
						onClick={() => setMenuOpen((open) => !open)}
						aria-expanded={menuOpen}
						aria-haspopup="menu"
						className="flex h-12 w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-4 text-start transition-colors hover:border-[var(--p-border-strong)]"
					>
						<span className="min-w-0 truncate text-[14px] font-medium text-[var(--p-text)]">
							{selectedLabel}
						</span>
						<ChevronDown
							size={17}
							className={`shrink-0 text-[var(--p-text-muted)] transition-transform ${
								menuOpen ? 'rotate-180' : ''
							}`}
						/>
					</button>

					<AnimatePresence>
						{menuOpen && (
							<motion.div
								initial={{ opacity: 0, y: -4 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -4 }}
								transition={{ duration: 0.16, ease: 'easeOut' }}
								role="menu"
								className="absolute inset-x-0 top-full z-30 mt-2 max-h-[min(60vh,360px)] overflow-y-auto rounded-xl border border-[var(--p-border-strong)] bg-[var(--p-elevated)] p-2 shadow-2xl"
							>
								<CategoryMenuItem
									active={isAllActive}
									onClick={() => {
										onClearAll()
										setMenuOpen(false)
									}}
									label={t('market.allEntries')}
								/>
								{categoryLabels.map((cat) => (
									<CategoryMenuItem
										key={cat.id}
										active={selected.includes(cat.id)}
										onClick={() => onToggle(cat.id)}
										label={cat.label}
									/>
								))}
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				<div className="hidden flex-wrap items-center gap-2 lg:flex">
					<CategoryChip
						active={isAllActive}
						onClick={onClearAll}
						label={t('market.allEntries')}
					/>
					{categoryLabels.map((cat) => (
						<CategoryChip
							key={cat.id}
							active={selected.includes(cat.id)}
							onClick={() => onToggle(cat.id)}
							label={cat.label}
						/>
					))}
				</div>
			</div>
		</section>
	)
}

function CategoryMenuItem({
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
			role="menuitemcheckbox"
			aria-checked={active}
			onClick={onClick}
			className="flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-lg px-3 text-start text-[14px] font-medium text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)]"
		>
			<span className="min-w-0 truncate">{label}</span>
			{active && (
				<Check
					size={16}
					className="shrink-0 text-[var(--p-accent)]"
					aria-hidden="true"
				/>
			)}
		</button>
	)
}

function CategoryChip({
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
				'shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors whitespace-nowrap',
				active
					? 'bg-[var(--p-accent)] text-[var(--p-accent-contrast)]'
					: 'text-[var(--p-text-muted)] hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]',
			].join(' ')}
		>
			{label}
		</button>
	)
}

// ---------------------------------------------------------------------------
// Product card — compact catalog tile
// ---------------------------------------------------------------------------

function ProductCard({
	product,
	onOpen,
}: {
	product: MarketProduct
	onOpen: () => void
}) {
	const { t, i18n } = useTranslation('portal')
	const isAr = i18n.language === 'ar'
	const name = isAr ? product.nameAr : product.name
	const categoryLabel =
		isAr && product.categoryNameAr
			? product.categoryNameAr
			: product.categoryName
	const unitLabel =
		isAr && product.unitOfMeasureAr
			? product.unitOfMeasureAr
			: product.unitOfMeasure
	const draftItem = useDraftQuoteStore((s) =>
		s.items.find((i) => i.productId === product.id),
	)
	const inDraft = draftItem != null
	const draftQuantity = draftItem?.quantity ?? 0
	const draftQuantityLabel = useMemo(
		() =>
			new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-EG', {
				maximumFractionDigits: 0,
			}).format(draftQuantity),
		[draftQuantity, isAr],
	)
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
		<article className="group relative min-w-0">
			<div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--p-surface)] ring-1 ring-inset ring-[var(--p-border)]">
				<button
					type="button"
					onClick={onOpen}
					className="block h-full w-full text-start"
					aria-label={name}
				>
					{product.imageUrl ? (
						<img
							src={product.imageUrl}
							alt={name}
							loading="lazy"
							decoding="async"
							className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
						/>
					) : (
						<div className="flex h-full w-full items-center justify-center text-[var(--p-text-faint)]">
							<Package size={32} />
						</div>
					)}
				</button>

				<button
					ref={tabRef}
					type="button"
					onClick={(e) => {
						e.preventDefault()
						e.stopPropagation()
						setPopoverOpen((v) => !v)
					}}
					className={[
						'absolute end-2 bottom-2 flex h-9 items-center justify-center rounded-full shadow-lg ring-1 transition-all duration-200 sm:end-3 sm:bottom-3 sm:h-10',
						inDraft
							? 'min-w-9 max-w-[calc(100%-1rem)] px-2 sm:min-w-10 sm:px-2.5'
							: 'w-9 sm:w-10',
						inDraft || popoverOpen
							? 'bg-white text-black ring-white/40 backdrop-blur-md'
							: 'bg-black/20 text-white ring-white/10 opacity-100 backdrop-blur-xl hover:bg-black/35 lg:opacity-0 lg:group-hover:opacity-100',
					].join(' ')}
					aria-label={inDraft ? t('market.amend') : t('market.record')}
					aria-expanded={popoverOpen}
				>
					{inDraft ? (
						<span
							className="min-w-0 truncate px-0.5 text-center font-mono text-[12px] font-semibold leading-none tabular-nums sm:text-[13px]"
							title={`${draftQuantityLabel} ${unitLabel}`}
						>
							{draftQuantityLabel}
						</span>
					) : (
						<Plus size={16} />
					)}
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

			<div className="mt-2.5 min-w-0 px-0.5 sm:mt-3">
				<button
					type="button"
					onClick={onOpen}
					className="block w-full text-start"
				>
					<h2 className="line-clamp-2 break-words text-[14px] font-medium leading-snug tracking-normal text-[var(--p-text)] sm:text-[15px]">
						{name}
					</h2>
				</button>
				<p className="mt-1 line-clamp-1 text-[12px] text-[var(--p-text-muted)] sm:text-[13px]">
					{categoryLabel} · {unitLabel}
				</p>
				{formattedPrice && (
					<p
						className="mt-1 font-mono text-[12px] text-[var(--p-text-secondary)]"
						style={{ fontVariantNumeric: 'tabular-nums' }}
					>
						EGP {formattedPrice}
					</p>
				)}
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
	anchorRef: RefObject<HTMLButtonElement | null>
	onClose: () => void
}) {
	const { t, i18n } = useTranslation('portal')
	const isAr = i18n.language === 'ar'
	const { add, remove, updateQuantity, items } = useDraftQuoteStore()
	const existing = items.find((i) => i.productId === product.id)
	const [qtyStr, setQtyStr] = useState(String(existing?.quantity ?? 1))
	const qty = parseInt(qtyStr, 10) || 0
	const inputRef = useRef<HTMLInputElement>(null)
	const popoverRef = useRef<HTMLDivElement>(null)
	const unitLabel =
		isAr && product.unitOfMeasureAr
			? product.unitOfMeasureAr
			: product.unitOfMeasure

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
					categoryName: product.categoryName,
					categoryNameAr: product.categoryNameAr,
					unitOfMeasure: product.unitOfMeasure,
					unitOfMeasureAr: product.unitOfMeasureAr,
					imageUrl: product.imageUrl,
				},
				qty,
			)
		}
		onClose()
	}

	// Anchor near the + tab, clamped so it cannot overflow narrow screens.
	const [pos, setPos] = useState({ top: 0, left: 0 })
	useEffect(() => {
		if (!anchorRef.current) return

		function updatePosition() {
			if (!anchorRef.current) return

			const rect = anchorRef.current.getBoundingClientRect()
			const popoverWidth = Math.min(260, window.innerWidth - 24)
			const maxLeft = Math.max(12, window.innerWidth - popoverWidth - 12)
			const preferredLeft = rect.right - popoverWidth
			const preferredTop = rect.top - 140
			const maxTop = Math.max(12, window.innerHeight - 190)

			setPos({
				top: Math.min(Math.max(preferredTop, 12), maxTop),
				left: Math.min(Math.max(preferredLeft, 12), maxLeft),
			})
		}

		updatePosition()
		window.addEventListener('resize', updatePosition)
		return () => window.removeEventListener('resize', updatePosition)
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
				top: pos.top,
				left: pos.left,
			}}
			className="z-[100] w-[min(260px,calc(100vw-1.5rem))] rounded-md border border-[var(--p-border-strong)] bg-[var(--p-elevated)]/95 p-3 shadow-2xl backdrop-blur-xl"
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
					className="h-11 w-full rounded-sm border border-[var(--p-border)] bg-[var(--p-input)] ps-3 pe-14 text-center font-mono text-[16px] font-medium text-[var(--p-text)] outline-none transition-colors focus:border-[var(--p-accent)]/50 sm:h-9 sm:text-[15px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
					style={{ fontVariantNumeric: 'tabular-nums' }}
				/>
				<span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-text-faint)]">
					{unitLabel}
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
						className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-[var(--p-border)] text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)] sm:h-9 sm:w-9"
						aria-label={t('market.removeItem')}
					>
						<Undo2 size={13} />
					</button>
				)}
				<button
					type="button"
					onClick={submit}
					className="h-11 flex-1 rounded-sm bg-[var(--p-accent)] font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90 sm:h-9 sm:tracking-[0.22em]"
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
		<div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-8 lg:grid-cols-3 lg:gap-x-6 xl:grid-cols-4">
			{SKELETON_TILES.map((slot) => (
				<div key={slot}>
					<div className="aspect-[4/3] animate-pulse rounded-xl bg-[var(--p-surface)]" />
					<div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-[var(--p-border)]" />
					<div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-[var(--p-border)]" />
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
		<div className="flex flex-col items-center gap-3 px-4 py-20 text-center sm:py-24">
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
