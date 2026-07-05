/**
 * Market — compact material catalog.
 *
 * Structure follows the public website market: title + search, rounded
 * category chips, dense image cards, with portal draft-quote actions retained.
 */

import { useQuantityPopoverDismiss } from '@hyperquote/ui/market/QuantityPopover'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
	Package,
	Plus,
	Search,
	SlidersHorizontal,
	Undo2,
	X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import {
	type RefObject,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { DraftQuoteTrigger } from '../../../components/shared/DraftQuoteTrigger'
import { PortalTitleRow } from '../../../components/shell/PortalTitleRow'
import { portalHead } from '../../../lib/page-meta'
import {
	getMarketCategories,
	getMarketProducts,
	type MarketCategory,
	type MarketProduct,
	type MarketProductFamily,
} from '../../../lib/server/market'
import { useDraftQuoteStore } from '../../../stores/draft-quote'
import { usePortalStore } from '../../../stores/portal'

export const Route = createFileRoute('/_portal/market/')({
	head: () =>
		portalHead({
			title: 'Market — HyperQuote Portal',
			description:
				'Private HyperQuote market for searching building materials, comparing availability, and adding products to quote drafts.',
			path: '/market',
		}),
	component: MarketGridPage,
})

function MarketGridPage() {
	const { t, i18n } = useTranslation('portal')
	const navigate = useNavigate()
	const isAr = i18n.language === 'ar'
	const draftItemCount = useDraftQuoteStore((s) => s.items.length)
	const setDraftQuoteOpen = usePortalStore((s) => s.setDraftQuoteOpen)
	const [catalogOpen, setCatalogOpen] = useState(false)

	const [searchQuery, setSearchQuery] = useState('')
	const [debouncedSearch, setDebouncedSearch] = useState('')
	const [selectedCategories, setSelectedCategories] = useState<string[]>([])
	const [selectedProductFamilies, setSelectedProductFamilies] = useState<
		string[]
	>([])
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
	const productFamilyFilter =
		selectedProductFamilies.length > 0
			? selectedProductFamilies.join(',')
			: undefined
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useInfiniteQuery({
			queryKey: [
				'market-products',
				debouncedSearch,
				categoryFilter,
				productFamilyFilter,
			],
			queryFn: async ({ pageParam = 1 }) =>
				getMarketProducts({
					data: {
						search: debouncedSearch || undefined,
						category: categoryFilter || undefined,
						productFamily: productFamilyFilter || undefined,
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
	const productByType = useMemo(
		() =>
			new Map(
				allProducts.flatMap((product) =>
					product.productType ? [[product.productType, product]] : [],
				),
			),
		[allProducts],
	)
	const totalProducts = data?.pages[0]?.total ?? allProducts.length
	const formattedTotalProducts = isAr
		? totalProducts.toLocaleString('ar-EG')
		: totalProducts.toLocaleString('en-EG')
	const resultCountText = t('market.resultCount', {
		count: formattedTotalProducts,
	})
	const hasActiveFilters =
		!!(debouncedSearch || selectedCategories.length) ||
		selectedProductFamilies.length > 0

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
		setSelectedProductFamilies([])
	}

	function toggleProductFamily(productFamily: string) {
		setSelectedProductFamilies((prev) =>
			prev.includes(productFamily)
				? prev.filter((item) => item !== productFamily)
				: [...prev, productFamily],
		)
	}

	function clearFilters() {
		setSearchQuery('')
		setDebouncedSearch('')
		setSelectedCategories([])
		setSelectedProductFamilies([])
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

			<section className="px-4 py-6 sm:px-6 sm:py-8 lg:px-12">
				<div className="mx-auto grid w-full max-w-[1400px] gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
					<CategoryStrip
						categories={marketCategories}
						productsByType={productByType}
						selectedCategories={selectedCategories}
						selectedProductFamilies={selectedProductFamilies}
						onToggleCategory={toggleCategory}
						onToggleProductFamily={toggleProductFamily}
						onClearAll={clearFilters}
					/>
					<div className="min-w-0">
						<button
							type="button"
							onClick={() => setCatalogOpen(true)}
							className="mb-5 flex h-11 w-full items-center justify-between rounded-sm border border-[#2563eb]/20 bg-[#2563eb]/[0.06] px-4 text-start text-[13px] font-semibold text-[#2563eb] transition-colors hover:bg-[#2563eb]/[0.1] lg:hidden"
						>
							<span className="inline-flex items-center gap-2">
								<SlidersHorizontal size={16} strokeWidth={1.8} />
								Catalog
							</span>
							<span className="font-mono text-[10px] uppercase tracking-[0.14em]">
								Browse
							</span>
						</button>
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
				</div>
			</section>
			<MobileCategorySheet
				open={catalogOpen}
				onClose={() => setCatalogOpen(false)}
				categories={marketCategories}
				productsByType={productByType}
				selectedCategories={selectedCategories}
				selectedProductFamilies={selectedProductFamilies}
				onToggleCategory={toggleCategory}
				onToggleProductFamily={toggleProductFamily}
				onClearAll={clearFilters}
			/>
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
	productsByType,
	selectedCategories,
	selectedProductFamilies,
	onToggleCategory,
	onToggleProductFamily,
	onClearAll,
}: {
	categories: MarketCategory[]
	productsByType: Map<string, MarketProduct>
	selectedCategories: string[]
	selectedProductFamilies: string[]
	onToggleCategory: (c: string) => void
	onToggleProductFamily: (c: string) => void
	onClearAll: () => void
}) {
	return (
		<aside className="hidden lg:sticky lg:top-24 lg:block">
			<CategoryPanelContent
				categories={categories}
				productsByType={productsByType}
				selectedCategories={selectedCategories}
				selectedProductFamilies={selectedProductFamilies}
				onToggleCategory={onToggleCategory}
				onToggleProductFamily={onToggleProductFamily}
				onClearAll={onClearAll}
			/>
		</aside>
	)
}

function MobileCategorySheet({
	open,
	onClose,
	categories,
	productsByType,
	selectedCategories,
	selectedProductFamilies,
	onToggleCategory,
	onToggleProductFamily,
	onClearAll,
}: {
	open: boolean
	onClose: () => void
	categories: MarketCategory[]
	productsByType: Map<string, MarketProduct>
	selectedCategories: string[]
	selectedProductFamilies: string[]
	onToggleCategory: (c: string) => void
	onToggleProductFamily: (c: string) => void
	onClearAll: () => void
}) {
	return (
		<AnimatePresence>
			{open && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm lg:hidden"
				>
					<button
						type="button"
						aria-label="Close catalog"
						onClick={onClose}
						className="absolute inset-0 h-full w-full cursor-default"
					/>
					<motion.div
						initial={{ y: 32, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						exit={{ y: 32, opacity: 0 }}
						transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
						className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-2xl border border-[var(--p-border)] bg-[var(--p-bg)] p-5 shadow-[0_-24px_80px_rgba(0,0,0,0.22)]"
					>
						<div className="mb-4 flex items-center justify-between">
							<p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--p-text-muted)]">
								Catalog
							</p>
							<button
								type="button"
								onClick={onClose}
								className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--p-text-muted)] transition-colors hover:bg-[#2563eb]/[0.08] hover:text-[#2563eb]"
								aria-label="Close catalog"
							>
								<X size={17} strokeWidth={1.8} />
							</button>
						</div>
						<CategoryPanelContent
							categories={categories}
							productsByType={productsByType}
							selectedCategories={selectedCategories}
							selectedProductFamilies={selectedProductFamilies}
							onToggleCategory={onToggleCategory}
							onToggleProductFamily={onToggleProductFamily}
							onClearAll={onClearAll}
							compact
						/>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}

function CategoryPanelContent({
	categories,
	productsByType,
	selectedCategories,
	selectedProductFamilies,
	onToggleCategory,
	onToggleProductFamily,
	onClearAll,
	compact = false,
}: {
	categories: MarketCategory[]
	productsByType: Map<string, MarketProduct>
	selectedCategories: string[]
	selectedProductFamilies: string[]
	onToggleCategory: (c: string) => void
	onToggleProductFamily: (c: string) => void
	onClearAll: () => void
	compact?: boolean
}) {
	const { t, i18n } = useTranslation('portal')
	const isAr = i18n.language === 'ar'
	const { items } = useDraftQuoteStore()
	const isAllActive =
		selectedCategories.length === 0 && selectedProductFamilies.length === 0
	const selectedProductIds = useMemo(
		() => new Set(items.map((item) => item.productId)),
		[items],
	)
	const selectedProductSlugs = useMemo(
		() => new Set(items.map((item) => item.slug)),
		[items],
	)
	const productTypeHasQuantity = useCallback(
		(typeSlug: string) => {
			const product = productsByType.get(typeSlug)
			return (
				selectedProductSlugs.has(typeSlug) ||
				(product ? selectedProductIds.has(product.id) : false)
			)
		},
		[productsByType, selectedProductIds, selectedProductSlugs],
	)
	const categoryLabels = useMemo(
		() =>
			categories.map((category) => ({
				id: category.slug,
				label: isAr
					? category.nameAr || category.name || category.slug
					: category.name || category.slug,
				count: category.productFamilies.length,
			})),
		[categories, isAr],
	)

	return (
		<nav
			aria-label={t('market.allEntries')}
			className={compact ? '' : 'border-e border-[var(--p-border)] pe-6'}
		>
			{!compact && (
				<div className="mb-5 flex items-center justify-between gap-3">
					<p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--p-text-muted)]">
						Catalog
					</p>
					<button
						type="button"
						onClick={onClearAll}
						className={`text-[12px] font-semibold transition-colors ${
							isAllActive
								? 'text-[#2563eb]'
								: 'text-[var(--p-text-muted)] hover:text-[#2563eb]'
						}`}
					>
						{t('market.allEntries')}
					</button>
				</div>
			)}

			<div className="space-y-1">
				{categoryLabels.map((category) => {
					const sourceCategory = categories.find(
						(item) => item.slug === category.id,
					)
					const isActive = selectedCategories.includes(category.id)
					const containsQuantity =
						sourceCategory?.productFamilies.some((family) =>
							family.productTypes.some((type) =>
								productTypeHasQuantity(type.slug),
							),
						) ?? false
					return (
						<div key={category.id}>
							<button
								type="button"
								onClick={() => onToggleCategory(category.id)}
								aria-expanded={isActive}
								className={`flex min-h-10 w-full min-w-0 items-center justify-between gap-3 border-s-2 ps-3 text-start transition-colors ${
									isActive
										? 'border-[#2563eb]'
										: 'border-transparent hover:border-[#2563eb]/35'
								} ${
									containsQuantity
										? 'text-[#2563eb]'
										: 'text-[var(--p-text-muted)] hover:text-[var(--p-text)]'
								}`}
							>
								<span className="min-w-0 truncate text-[14px] font-semibold">
									{category.label}
								</span>
								<span className="font-mono text-[10px] opacity-55">
									{category.count}
								</span>
							</button>
							<AnimatePresence initial={false}>
								{isActive && sourceCategory && (
									<motion.div
										initial={{ height: 0, opacity: 0, y: -4 }}
										animate={{ height: 'auto', opacity: 1, y: 0 }}
										exit={{ height: 0, opacity: 0, y: -4 }}
										transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
										className="overflow-hidden"
									>
										<ProductGroupBrowser
											groups={familyLabels(
												sourceCategory.productFamilies,
												isAr,
											)}
											productsByType={productsByType}
											selected={selectedProductFamilies}
											onToggleGroup={onToggleProductFamily}
										/>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					)
				})}
			</div>
		</nav>
	)
}

function ProductGroupBrowser({
	groups,
	productsByType,
	selected,
	onToggleGroup,
}: {
	groups: ReturnType<typeof familyLabels>
	productsByType: Map<string, MarketProduct>
	selected: string[]
	onToggleGroup: (id: string) => void
}) {
	const { items } = useDraftQuoteStore()
	const selectedProductIds = useMemo(
		() => new Set(items.map((item) => item.productId)),
		[items],
	)
	const selectedProductSlugs = useMemo(
		() => new Set(items.map((item) => item.slug)),
		[items],
	)
	if (groups.length === 0) return null
	return (
		<div className="ms-5 mt-1 space-y-1 pb-2">
			{groups.map((group) => {
				const isExpanded = selected.includes(group.id)
				const containsQuantity = group.productTypes.some((type) => {
					const product = productsByType.get(type.id)
					return (
						selectedProductSlugs.has(type.id) ||
						(product ? selectedProductIds.has(product.id) : false)
					)
				})
				return (
					<div key={group.id}>
						<button
							type="button"
							onClick={() => onToggleGroup(group.id)}
							aria-pressed={isExpanded}
							aria-expanded={isExpanded}
							className={`flex min-h-9 w-full min-w-0 items-center justify-between gap-2 text-start text-[13px] transition-colors ${
								isExpanded ? 'font-semibold' : ''
							} ${
								containsQuantity
									? 'text-[#2563eb]'
									: 'text-[var(--p-text-muted)] hover:text-[var(--p-text)]'
							}`}
						>
							<span className="min-w-0 truncate">{group.label}</span>
							<span className="font-mono text-[10px] opacity-55">
								{group.productTypes.length}
							</span>
						</button>
						<AnimatePresence initial={false}>
							{isExpanded && group.productTypes.length > 0 && (
								<motion.div
									initial={{ height: 0, opacity: 0, y: -4 }}
									animate={{ height: 'auto', opacity: 1, y: 0 }}
									exit={{ height: 0, opacity: 0, y: -4 }}
									transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
									className="ms-4 mt-1 space-y-0.5 overflow-hidden border-s border-[#2563eb]/20 ps-3"
								>
									{group.productTypes.map((type) => (
										<PortalHierarchyProductRow
											key={type.id}
											label={type.label}
											product={productsByType.get(type.id)}
										/>
									))}
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				)
			})}
		</div>
	)
}

function PortalHierarchyProductRow({
	label,
	product,
}: {
	label: string
	product?: MarketProduct
}) {
	const { add, updateQuantity, items } = useDraftQuoteStore()
	const [editing, setEditing] = useState(false)
	const existing = product
		? items.find((item) => item.productId === product.id)
		: undefined
	const [qty, setQty] = useState(String(existing?.quantity ?? 1))
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (editing) inputRef.current?.select()
	}, [editing])

	if (!product) {
		return (
			<div className="px-3 py-2 text-[13px] text-[var(--p-text-muted)]">
				{label}
			</div>
		)
	}
	const purchasableProduct = product

	function submit() {
		const quantity = Math.max(1, Number.parseInt(qty, 10) || 1)
		if (existing) {
			updateQuantity(purchasableProduct.id, quantity)
		} else {
			add(
				{
					productId: purchasableProduct.id,
					slug: purchasableProduct.slug,
					name: purchasableProduct.name,
					nameAr: purchasableProduct.nameAr,
					category: purchasableProduct.category,
					categoryName: purchasableProduct.categoryName,
					categoryNameAr: purchasableProduct.categoryNameAr,
					unitOfMeasure: purchasableProduct.unitOfMeasure,
					unitOfMeasureAr: purchasableProduct.unitOfMeasureAr,
					imageUrl: purchasableProduct.imageUrl,
				},
				quantity,
			)
		}
		setEditing(false)
	}

	if (editing) {
		return (
			<motion.div
				initial={{ opacity: 0, x: -4 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.16, ease: 'easeOut' }}
				className="flex min-w-0 items-center gap-2 rounded-sm bg-[#2563eb]/[0.08] px-2 py-1.5"
			>
				<span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#2563eb]">
					{label}
				</span>
				<input
					ref={inputRef}
					value={qty}
					onChange={(event) =>
						setQty(event.target.value.replace(/[^0-9]/g, ''))
					}
					onKeyDown={(event) => {
						if (event.key === 'Enter') submit()
						if (event.key === 'Escape') setEditing(false)
					}}
					className="h-7 w-16 rounded-sm border border-[#2563eb]/30 bg-transparent text-center font-mono text-[13px] text-[var(--p-text)] outline-none focus:border-[#2563eb]"
				/>
				<button
					type="button"
					onClick={submit}
					className="h-7 rounded-sm bg-[#2563eb] px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#1d4ed8]"
				>
					Add
				</button>
			</motion.div>
		)
	}

	return (
		<button
			type="button"
			onClick={() => setEditing(true)}
			className={`flex min-h-9 w-full min-w-0 items-center justify-between gap-3 rounded-sm px-3 py-1.5 text-start text-[13px] transition-colors hover:bg-[#2563eb]/[0.08] hover:text-[#2563eb] ${
				existing ? 'font-semibold text-[#2563eb]' : 'text-[var(--p-text)]'
			}`}
		>
			<span className="min-w-0 truncate">{label}</span>
			<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#2563eb]">
				{existing ? existing.quantity : '+'}
			</span>
		</button>
	)
}

function familyLabels(
	families: MarketProductFamily[],
	isAr: boolean,
): {
	id: string
	label: string
	productTypes: { id: string; label: string }[]
}[] {
	return uniqueHierarchyLabels(
		families.map((family) => ({
			id: family.slug,
			label: isAr ? family.nameAr || family.name : family.name,
			productTypes: family.productTypes.map((type) => ({
				id: type.slug,
				label: isAr ? type.nameAr || type.name : type.name,
			})),
		})),
	)
}

function uniqueHierarchyLabels<TItem extends { id: string }>(items: TItem[]) {
	const seen = new Set<string>()
	return items.filter((item) => {
		if (seen.has(item.id)) return false
		seen.add(item.id)
		return true
	})
}

function hierarchyPathLabel(
	parts: Array<string | null | undefined>,
	fallback: string,
) {
	const seen = new Set<string>()
	const compact = parts.flatMap((part) => {
		const normalized = part?.trim()
		if (!normalized) return []
		const key = normalized.toLowerCase()
		if (seen.has(key)) return []
		seen.add(key)
		return [normalized]
	})
	return compact.length > 0 ? compact.join(' / ') : fallback
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
	const categoryLabel = hierarchyPathLabel(
		[
			isAr && product.categoryNameAr
				? product.categoryNameAr
				: product.categoryName,
			isAr && product.productFamilyNameAr
				? product.productFamilyNameAr
				: product.productFamilyName,
		],
		product.category,
	)
	const unitLabel =
		isAr && product.unitOfMeasureAr
			? product.unitOfMeasureAr
			: product.unitOfMeasure
	const draftItem = useDraftQuoteStore((s) =>
		s.items.find((i) => i.productId === product.id),
	)
	const inDraft = draftItem != null
	const draftQuantity = draftItem?.quantity ?? 0
	const isOrderable = product.availabilityStatus !== 'out_of_stock'
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
						if (!isOrderable && !inDraft) return
						setPopoverOpen((v) => !v)
					}}
					disabled={!isOrderable && !inDraft}
					className={[
						'absolute end-2 bottom-2 flex h-9 items-center justify-center rounded-full shadow-lg ring-1 transition-all duration-200 disabled:pointer-events-none sm:end-3 sm:bottom-3 sm:h-10',
						inDraft
							? 'min-w-9 max-w-[calc(100%-1rem)] px-2 sm:min-w-10 sm:px-2.5'
							: 'w-9 sm:w-10',
						inDraft || popoverOpen
							? 'bg-white text-black ring-white/40 backdrop-blur-md'
							: isOrderable
								? 'bg-black/20 text-white ring-white/10 opacity-100 backdrop-blur-xl hover:bg-black/35 lg:opacity-0 lg:group-hover:opacity-100'
								: 'bg-black/20 text-white/45 ring-white/10 opacity-60',
					].join(' ')}
					aria-label={
						inDraft
							? t('market.amend')
							: isOrderable
								? t('market.record')
								: t('market.outOfStock')
					}
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
	const isOrderable = product.availabilityStatus !== 'out_of_stock'
	const inputRef = useRef<HTMLInputElement>(null)
	const popoverRef = useRef<HTMLDivElement>(null)
	const unitLabel =
		isAr && product.unitOfMeasureAr
			? product.unitOfMeasureAr
			: product.unitOfMeasure

	useEffect(() => {
		inputRef.current?.select()
	}, [])

	useQuantityPopoverDismiss({ anchorRef, onClose, popoverRef })

	const submit = () => {
		if (!isOrderable && !existing) return
		if (!isOrderable && existing) {
			if (qty <= 0) remove(product.id)
			onClose()
			return
		}
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
					disabled={!isOrderable && !existing}
					className="h-11 flex-1 rounded-sm bg-[var(--p-accent)] font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50 sm:h-9 sm:tracking-[0.22em]"
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
