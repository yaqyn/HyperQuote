import { EmptyState } from '@hyperquote/ui/feedback/EmptyState'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
	AlertTriangle,
	ChevronsUpDown,
	SearchX,
	SlidersHorizontal,
	X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from 'react-aria-components/Button'
import { Label } from 'react-aria-components/Label'
import { ListBox, ListBoxItem } from 'react-aria-components/ListBox'
import { Popover } from 'react-aria-components/Popover'
import { Select, SelectValue } from 'react-aria-components/Select'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Pagination } from '../../../components/market/Pagination'
import { ProductCard } from '../../../components/market/ProductCard'
import {
	SearchDropdown,
	type SearchEntry,
} from '../../../components/shared/SearchDropdown'
import { useQuoteCart } from '../../../hooks/useQuoteCart'
import {
	getPublicCatalog,
	type PublicCatalogResult,
	type PublicProduct,
} from '../../../lib/catalog'
import { isAbortedRouteLoad } from '../../../lib/route-loader'
import { websiteHead } from '../../../lib/seo'

// ── Search schema ──
// category and price_tier come as comma-separated strings in the URL,
// transformed to arrays for the component. All navigate calls must serialize back.

const marketSearchSchema = z.object({
	q: z.string().optional(),
	category: z.string().optional(),
	product_family: z.string().optional(),
	product_type: z.string().optional(),
	availability: z.enum(['available', 'low_stock']).optional(),
	price_tier: z.string().optional(),
	sort: z
		.enum(['relevance', 'name', 'category', 'availability'])
		.catch('relevance')
		.optional(),
	page: z.coerce.number().int().min(1).catch(1).optional(),
})

/** Split comma-separated string into array, or empty array */
function splitParam(s?: string): string[] {
	return s ? s.split(',').filter(Boolean) : []
}

const PRICE_TIERS = ['budget', 'mid_range', 'premium'] as const
type PriceTierParam = (typeof PRICE_TIERS)[number]
function parsePriceTiers(s?: string): PriceTierParam[] {
	return splitParam(s).filter((v): v is PriceTierParam =>
		(PRICE_TIERS as readonly string[]).includes(v),
	)
}

export const Route = createFileRoute('/_website/market/')({
	validateSearch: marketSearchSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ deps, abortController }): Promise<PublicCatalogResult> => {
		try {
			return await getPublicCatalog({
				data: {
					category: splitParam(deps.category),
					productFamily: splitParam(deps.product_family),
					productType: splitParam(deps.product_type),
					availability: deps.availability || 'all',
					priceTier: parsePriceTiers(deps.price_tier),
					search: deps.q,
					sort: deps.sort || 'relevance',
					page: deps.page || 1,
					limit: 24,
				},
			})
		} catch (error) {
			if (isAbortedRouteLoad(error, abortController.signal)) {
				return { categories: [], items: [], total: 0, hasMore: false }
			}
			throw error
		}
	},
	head: () =>
		websiteHead({
			title: 'Building Materials Market — HyperQuote',
			description:
				'Browse cement, steel, wood, concrete, and other building materials from verified Egyptian suppliers with live availability and quote-ready product data.',
			path: '/market',
		}),
	component: MarketPage,
	pendingComponent: MarketLoading,
	errorComponent: MarketError,
})

const SORT_OPTIONS = [
	{ id: 'relevance', labelKey: 'market.sortRelevance' },
	{ id: 'name', labelKey: 'market.sortName' },
	{ id: 'category', labelKey: 'market.sortCategory' },
	{ id: 'availability', labelKey: 'market.sortAvailability' },
] as const

function unitLabelFor(product: PublicProduct, locale: 'ar' | 'en') {
	return locale === 'ar' && product.unit_of_measure_ar
		? product.unit_of_measure_ar
		: product.unit_of_measure
}

function categoryLabelFor(
	slug: string,
	categories: Array<{ slug: string; name: string; name_ar: string }>,
	locale: 'ar' | 'en',
) {
	const category = categories.find((item) => item.slug === slug)
	if (!category) return slug.replace(/_/g, ' ')
	return locale === 'ar' && category.name_ar ? category.name_ar : category.name
}

function hierarchyLabelFor(
	product: PublicProduct,
	categories: Array<{ slug: string; name: string; name_ar: string }>,
	locale: 'ar' | 'en',
) {
	return uniqueLabelParts([
		categoryLabelFor(product.category, categories, locale),
		locale === 'ar'
			? product.product_family_name_ar || product.product_family_name
			: product.product_family_name,
	]).join(' / ')
}

function uniqueLabelParts(parts: Array<string | null | undefined>) {
	const seen = new Set<string>()
	return parts.flatMap((part) => {
		const normalized = part?.trim()
		if (!normalized) return []
		const key = normalized.toLowerCase()
		if (seen.has(key)) return []
		seen.add(key)
		return [normalized]
	})
}

function familyGroups(
	catalogCategories: PublicCatalogResult['categories'],
	selectedCategories: string[],
	locale: 'ar' | 'en',
) {
	if (selectedCategories.length === 0) return []
	return uniqueCatalogGroups(
		catalogCategories
			.filter((category) => selectedCategories.includes(category.slug))
			.flatMap((category) =>
				category.productFamilies.map((family) => ({
					slug: family.slug,
					label:
						locale === 'ar' && family.name_ar ? family.name_ar : family.name,
					productTypes: family.productTypes.map((type) => ({
						slug: type.slug,
						label: locale === 'ar' && type.name_ar ? type.name_ar : type.name,
					})),
				})),
			),
	)
}

function uniqueCatalogGroups(
	items: {
		slug: string
		label: string
		productTypes: { slug: string; label: string }[]
	}[],
) {
	const seen = new Set<string>()
	return items.filter((item) => {
		if (seen.has(item.slug)) return false
		seen.add(item.slug)
		return true
	})
}

// ── Market Search ──

function MarketSearch({
	items: catalogItems,
	categories,
	onSearch,
	initialQuery,
}: {
	items: PublicProduct[]
	categories: Array<{ slug: string; name: string; name_ar: string }>
	onSearch: (q: string) => void
	initialQuery?: string
}) {
	const { t, i18n } = useTranslation('website')
	const navigate = useNavigate({ from: Route.fullPath })
	const locale = i18n.language === 'ar' ? 'ar' : 'en'
	const [liveQuery, setLiveQuery] = useState(initialQuery ?? '')
	const onSearchRef = useRef(onSearch)
	const initialQueryRef = useRef(initialQuery ?? '')

	useEffect(() => {
		const nextInitialQuery = initialQuery ?? ''
		if (initialQueryRef.current === nextInitialQuery) {
			return
		}
		initialQueryRef.current = nextInitialQuery
		setLiveQuery(nextInitialQuery)
	}, [initialQuery])

	useEffect(() => {
		onSearchRef.current = onSearch
	}, [onSearch])

	useEffect(() => {
		const timer = window.setTimeout(() => {
			onSearchRef.current(liveQuery.trim())
		}, 250)
		return () => window.clearTimeout(timer)
	}, [liveQuery])

	const searchItems: SearchEntry[] = useMemo(
		() =>
			catalogItems.map((p) => {
				const name = locale === 'ar' ? p.name_ar || p.name : p.name
				const category = hierarchyLabelFor(p, categories, locale)
				const unit = unitLabelFor(p, locale)
				const description =
					(locale === 'ar' ? p.description_ar : p.description) ?? ''
				const brand = p.brand ?? ''

				return {
					id: p.id,
					title: name,
					subtitle: [category, unit].filter(Boolean).join(' · '),
					body: [p.name, p.name_ar, description, brand, category]
						.filter(Boolean)
						.join(' '),
					href: `/market/${p.slug}`,
				}
			}),
		[catalogItems, categories, locale],
	)

	const handleSelect = useCallback(
		(item: SearchEntry) => {
			if (item.href) navigate({ to: item.href })
		},
		[navigate],
	)

	return (
		<SearchDropdown
			items={searchItems}
			placeholder={t('market.searchPlaceholder')}
			askLyonLabel={t('market.search', { defaultValue: 'Search' })}
			onSelect={handleSelect}
			onQueryChange={setLiveQuery}
			enableVoice
			voiceLocale={i18n.language}
			initialQuery={initialQuery}
			enterKeyBehavior="close"
			tokenizeOnComma
			maxResults={6}
			idPrefix="market-search"
		/>
	)
}

// ── Mobile Cart ──

// ── Main Page ──

function MarketPage() {
	const { t, i18n } = useTranslation('website')
	const locale = (i18n.language === 'ar' ? 'ar' : 'en') as 'ar' | 'en'
	const data: PublicCatalogResult = Route.useLoaderData()
	const search = Route.useSearch()
	const navigate = useNavigate({ from: Route.fullPath })
	const [catalogOpen, setCatalogOpen] = useState(false)

	const categories = splitParam(search.category)
	const productFamilies = splitParam(search.product_family)
	const productTypes = splitParam(search.product_type)
	const priceTiers = splitParam(search.price_tier)
	const hasActiveFilters = !!(
		search.q ||
		categories.length ||
		productFamilies.length ||
		productTypes.length ||
		search.availability ||
		priceTiers.length
	)

	const handleMarketSearch = useCallback(
		(q: string) =>
			navigate({
				search: { ...search, q: q || undefined, page: 1 },
			}),
		[navigate, search],
	)

	function nav(overrides: Partial<typeof search>) {
		navigate({ search: { ...search, ...overrides, page: overrides.page ?? 1 } })
	}

	function toggleCategory(cat: string) {
		const next = categories.includes(cat)
			? categories.filter((c) => c !== cat)
			: [...categories, cat]
		nav({
			category: next.length ? next.join(',') : undefined,
			product_family: undefined,
			product_type: undefined,
		})
	}

	function toggleProductFamily(productFamily: string) {
		const next = productFamilies.includes(productFamily)
			? productFamilies.filter((item) => item !== productFamily)
			: [...productFamilies, productFamily]
		nav({
			product_family: next.length ? next.join(',') : undefined,
			product_type: undefined,
		})
	}

	function clearCatalogFilters() {
		navigate({ search: {} })
	}

	const productByTypeSlug = useMemo(
		() =>
			new Map(
				data.items.flatMap((product) =>
					product.product_type_slug
						? [[product.product_type_slug, product]]
						: [],
				),
			),
		[data.items],
	)

	return (
		<div className="min-h-screen pb-16 pt-[88px] md:pt-[104px]">
			{/* Top bar */}
			<section className="border-b border-[var(--site-rule)] px-4 pb-8 sm:px-6 md:pb-10 lg:px-12 lg:pb-12">
				<div className="mx-auto max-w-[1400px]">
					<div className="grid items-end gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)] lg:gap-16">
						<div>
							<p className="hq-kicker mb-4 text-[var(--color-primary)]">
								{t('market.eyebrow')}
							</p>
							<h1 className="hq-display hq-title-section max-w-[780px] font-bold text-[var(--color-text)]">
								{t('market.pageTitle')}
							</h1>
							<p className="mt-5 max-w-[590px] text-[14px] leading-7 text-[var(--color-text-muted)] sm:text-[15px]">
								{t('market.subtitle')}
							</p>
						</div>
						<div className="w-full border-t border-[var(--site-rule)] pt-4 lg:border-t-0 lg:pt-0">
							<p className="hq-kicker mb-3 text-[var(--color-text-subtle)]">
								{t('market.searchLabel')}
							</p>
							<MarketSearch
								items={data.items}
								categories={data.categories}
								initialQuery={search.q}
								onSearch={handleMarketSearch}
							/>
						</div>
					</div>
				</div>
			</section>

			{/* Product grid */}
			<section className="px-4 py-8 sm:px-6 sm:py-10 lg:px-12 lg:py-12">
				<div className="mx-auto grid max-w-[1400px] gap-8 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start lg:gap-12">
					<HierarchySidebar
						categories={data.categories}
						locale={locale}
						selectedCategories={categories}
						selectedGroups={productFamilies}
						productsByTypeSlug={productByTypeSlug}
						onClear={clearCatalogFilters}
						onToggleCategory={toggleCategory}
						onToggleGroup={toggleProductFamily}
					/>
					<div className="min-w-0">
						<button
							type="button"
							onClick={() => setCatalogOpen(true)}
							className="mb-6 flex h-12 w-full items-center justify-between border border-[var(--site-rule)] bg-[var(--site-concrete)] px-4 text-start text-[13px] font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)]/40 lg:hidden"
						>
							<span className="inline-flex items-center gap-2">
								<SlidersHorizontal size={16} strokeWidth={1.8} />
								{t('market.catalog')}
							</span>
							<span className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.14em]">
								{t('market.browse')}
							</span>
						</button>
						{data.items.length === 0 ? (
							<EmptyState
								icon={<SearchX size={48} />}
								title={t('market.emptyTitle')}
								description={t('market.emptyBody')}
								action={
									hasActiveFilters
										? {
												label: t('market.emptyCTA'),
												onClick: () => navigate({ search: {} }),
											}
										: undefined
								}
								className="mt-8"
							/>
						) : (
							<>
								<div className="mb-7 flex items-center justify-between border-b border-[var(--site-rule)] pb-4">
									<p
										className={`text-[13px] text-[var(--color-text-subtle)]${hasActiveFilters ? ' hidden lg:block' : ''}`}
									>
										{t('market.resultCount', { count: data.total })}
									</p>
									{hasActiveFilters && (
										<button
											type="button"
											onClick={clearCatalogFilters}
											className="rounded-full border border-[var(--color-error)]/25 bg-[var(--color-error)]/[0.035] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-error)] transition-colors hover:border-[var(--color-error)]/45 hover:bg-[var(--color-error)]/[0.075] lg:hidden"
										>
											{t('market.clearFilters', { defaultValue: 'Clear' })}
										</button>
									)}
									<Select
										selectedKey={search.sort || 'relevance'}
										onSelectionChange={(key) =>
											nav({
												sort: key as
													| 'relevance'
													| 'name'
													| 'category'
													| 'availability',
											})
										}
										aria-label={t('market.sortLabel')}
									>
										<Label className="sr-only">{t('market.sortLabel')}</Label>
										<Button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]">
											<SelectValue />
											<ChevronsUpDown
												size={14}
												className="opacity-40"
												aria-hidden="true"
											/>
										</Button>
										<Popover className="z-50 w-44 overflow-hidden rounded-lg border border-[var(--color-text)]/[0.08] bg-[var(--color-base)] shadow-[0_16px_48px_rgba(0,0,0,0.1)]">
											<ListBox className="p-1">
												{SORT_OPTIONS.map((opt) => (
													<ListBoxItem
														key={opt.id}
														id={opt.id}
														className="cursor-pointer rounded-md px-3 py-2 text-[13px] text-[var(--color-text)] outline-none hover:bg-[var(--color-text)]/[0.03] data-[focused]:bg-[var(--color-text)]/[0.03] data-[selected]:font-medium data-[selected]:text-[var(--color-primary)]"
													>
														{t(opt.labelKey, { defaultValue: opt.id })}
													</ListBoxItem>
												))}
											</ListBox>
										</Popover>
									</Select>
								</div>

								<motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ duration: 0.25, ease: 'easeOut' }}
									className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-11"
								>
									{data.items.map((item: PublicProduct) => (
										<ProductCard
											key={item.id}
											product={item}
											variant="grid"
											categoryLabel={hierarchyLabelFor(
												item,
												data.categories,
												locale,
											)}
										/>
									))}
								</motion.div>

								<Pagination
									total={data.total}
									page={search.page || 1}
									limit={24}
									onPageChange={(page) => nav({ page })}
								/>
							</>
						)}
					</div>
				</div>
			</section>
			<MobileHierarchySheet
				open={catalogOpen}
				onClose={() => setCatalogOpen(false)}
				categories={data.categories}
				locale={locale}
				selectedCategories={categories}
				selectedGroups={productFamilies}
				productsByTypeSlug={productByTypeSlug}
				onClear={clearCatalogFilters}
				onToggleCategory={toggleCategory}
				onToggleGroup={toggleProductFamily}
			/>
		</div>
	)
}

const MARKET_FILTER_SKELETON_KEYS = Array.from(
	{ length: 6 },
	(_, i) => `market-filter-skel-${i}`,
)
const MARKET_CARD_SKELETON_KEYS = Array.from(
	{ length: 9 },
	(_, i) => `market-card-skel-${i}`,
)

function HierarchySidebar({
	categories,
	locale,
	selectedCategories,
	selectedGroups,
	productsByTypeSlug,
	onClear,
	onToggleCategory,
	onToggleGroup,
}: {
	categories: PublicCatalogResult['categories']
	locale: 'ar' | 'en'
	selectedCategories: string[]
	selectedGroups: string[]
	productsByTypeSlug: Map<string, PublicProduct>
	onClear: () => void
	onToggleCategory: (slug: string) => void
	onToggleGroup: (slug: string) => void
}) {
	return (
		<aside className="hidden lg:sticky lg:top-28 lg:block">
			<HierarchyPanelContent
				categories={categories}
				locale={locale}
				selectedCategories={selectedCategories}
				selectedGroups={selectedGroups}
				productsByTypeSlug={productsByTypeSlug}
				onClear={onClear}
				onToggleCategory={onToggleCategory}
				onToggleGroup={onToggleGroup}
			/>
		</aside>
	)
}

function MobileHierarchySheet({
	open,
	onClose,
	categories,
	locale,
	selectedCategories,
	selectedGroups,
	productsByTypeSlug,
	onClear,
	onToggleCategory,
	onToggleGroup,
}: {
	open: boolean
	onClose: () => void
	categories: PublicCatalogResult['categories']
	locale: 'ar' | 'en'
	selectedCategories: string[]
	selectedGroups: string[]
	productsByTypeSlug: Map<string, PublicProduct>
	onClear: () => void
	onToggleCategory: (slug: string) => void
	onToggleGroup: (slug: string) => void
}) {
	const { t } = useTranslation('website')

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
						aria-label={t('market.closeCatalog')}
						onClick={onClose}
						className="absolute inset-0 h-full w-full cursor-default"
					/>
					<motion.div
						initial={{ y: 32, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						exit={{ y: 32, opacity: 0 }}
						transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
						className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-base)] p-5 shadow-[0_-24px_80px_rgba(0,0,0,0.18)]"
					>
						<div className="mb-4 flex items-center justify-between">
							<p className="font-[family-name:var(--font-plex-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
								{t('market.catalog')}
							</p>
							<div className="flex items-center gap-1">
								{selectedCategories.length > 0 || selectedGroups.length > 0 ? (
									<button
										type="button"
										onClick={onClear}
										className="h-9 px-2 text-[12px] font-semibold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
									>
										{t('market.clearFilters')}
									</button>
								) : null}
								<button
									type="button"
									onClick={onClose}
									className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-text)]/[0.06] hover:text-[var(--color-text)]"
									aria-label={t('market.closeCatalog')}
								>
									<X size={17} strokeWidth={1.8} />
								</button>
							</div>
						</div>
						<HierarchyPanelContent
							categories={categories}
							locale={locale}
							selectedCategories={selectedCategories}
							selectedGroups={selectedGroups}
							productsByTypeSlug={productsByTypeSlug}
							onClear={onClear}
							onToggleCategory={onToggleCategory}
							onToggleGroup={onToggleGroup}
							compact
						/>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}

function HierarchyPanelContent({
	categories,
	locale,
	selectedCategories,
	selectedGroups,
	productsByTypeSlug,
	onClear,
	onToggleCategory,
	onToggleGroup,
	compact = false,
}: {
	categories: PublicCatalogResult['categories']
	locale: 'ar' | 'en'
	selectedCategories: string[]
	selectedGroups: string[]
	productsByTypeSlug: Map<string, PublicProduct>
	onClear: () => void
	onToggleCategory: (slug: string) => void
	onToggleGroup: (slug: string) => void
	compact?: boolean
}) {
	const { t } = useTranslation('website')
	const { items } = useQuoteCart()
	const isAllActive =
		selectedCategories.length === 0 && selectedGroups.length === 0
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
			const product = productsByTypeSlug.get(typeSlug)
			return (
				selectedProductSlugs.has(typeSlug) ||
				(product ? selectedProductIds.has(product.id) : false)
			)
		},
		[productsByTypeSlug, selectedProductIds, selectedProductSlugs],
	)

	return (
		<nav
			aria-label={t('market.categoryLabel', { defaultValue: 'Catalog' })}
			className={compact ? '' : 'border-e border-[var(--color-border)] pe-6'}
		>
			{!compact && (
				<div className="mb-5 flex items-center justify-between gap-3">
					<p className="font-[family-name:var(--font-plex-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
						{t('market.catalog')}
					</p>
					{!isAllActive && (
						<button
							type="button"
							onClick={onClear}
							className="rounded-full border border-[var(--color-error)]/25 bg-[var(--color-error)]/[0.035] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-error)] transition-colors hover:border-[var(--color-error)]/45 hover:bg-[var(--color-error)]/[0.075]"
						>
							{t('market.clearFilters', { defaultValue: 'Clear' })}
						</button>
					)}
				</div>
			)}

			<div className="space-y-1">
				{categories.map((category) => {
					const isActive = selectedCategories.includes(category.slug)
					const containsQuantity = category.productFamilies.some((family) =>
						family.productTypes.some((type) =>
							productTypeHasQuantity(type.slug),
						),
					)
					const label =
						locale === 'ar' && category.name_ar
							? category.name_ar
							: category.name || category.slug.replace(/_/g, ' ')
					return (
						<div key={category.slug}>
							<button
								type="button"
								onClick={() => onToggleCategory(category.slug)}
								aria-expanded={isActive}
								className={`flex min-h-10 w-full min-w-0 items-center justify-between gap-3 border-s-2 ps-3 text-start transition-colors ${
									isActive
										? 'border-[#2563eb]'
										: 'border-transparent hover:border-[#2563eb]/35'
								} ${
									containsQuantity
										? 'text-[#2563eb]'
										: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
								}`}
							>
								<span className="min-w-0 truncate text-[14px] font-semibold">
									{label}
								</span>
								<span className="font-[family-name:var(--font-plex-mono)] text-[10px] opacity-55">
									{category.productFamilies.length}
								</span>
							</button>
							<AnimatePresence initial={false}>
								{isActive && (
									<motion.div
										initial={{ height: 0, opacity: 0, y: -4 }}
										animate={{ height: 'auto', opacity: 1, y: 0 }}
										exit={{ height: 0, opacity: 0, y: -4 }}
										transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
										className="overflow-hidden"
									>
										<ProductGroupBrowser
											groups={familyGroups([category], [category.slug], locale)}
											productsByTypeSlug={productsByTypeSlug}
											selectedGroups={selectedGroups}
											onToggleGroup={onToggleGroup}
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
	productsByTypeSlug,
	selectedGroups,
	onToggleGroup,
}: {
	groups: ReturnType<typeof familyGroups>
	productsByTypeSlug: Map<string, PublicProduct>
	selectedGroups: string[]
	onToggleGroup: (slug: string) => void
}) {
	const { items } = useQuoteCart()
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
				const isExpanded = selectedGroups.includes(group.slug)
				const containsQuantity = group.productTypes.some((type) => {
					const product = productsByTypeSlug.get(type.slug)
					return (
						selectedProductSlugs.has(type.slug) ||
						(product ? selectedProductIds.has(product.id) : false)
					)
				})
				return (
					<div key={group.slug}>
						<button
							type="button"
							onClick={() => onToggleGroup(group.slug)}
							aria-pressed={isExpanded}
							aria-expanded={isExpanded}
							className={`flex min-h-9 w-full min-w-0 items-center justify-between gap-2 text-start text-[13px] transition-colors ${
								isExpanded ? 'font-semibold' : ''
							} ${
								containsQuantity
									? 'text-[#2563eb]'
									: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
							}`}
						>
							<span className="min-w-0 truncate">{group.label}</span>
							<span className="font-[family-name:var(--font-plex-mono)] text-[10px] opacity-55">
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
										<WebsiteHierarchyProductRow
											key={type.slug}
											label={type.label}
											product={productsByTypeSlug.get(type.slug)}
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

function WebsiteHierarchyProductRow({
	label,
	product,
}: {
	label: string
	product?: PublicProduct
}) {
	const { t } = useTranslation('website')
	const { add, updateQuantity, items } = useQuoteCart()
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
			<div className="px-3 py-2 text-[13px] text-[var(--color-text-muted)]">
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
					nameAr: purchasableProduct.name_ar,
					category: purchasableProduct.category,
					categoryName: purchasableProduct.category_name,
					categoryNameAr: purchasableProduct.category_name_ar,
					unitOfMeasure: purchasableProduct.unit_of_measure,
					unitOfMeasureAr: purchasableProduct.unit_of_measure_ar,
					imageUrl: purchasableProduct.image_urls?.[0] ?? null,
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
				className="flex min-w-0 items-center gap-2 rounded-sm bg-[#2563eb]/[0.06] px-2 py-1.5"
			>
				<span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#2563eb]">
					<button
						type="button"
						onClick={() => setEditing(false)}
						className="min-w-0 truncate text-start transition-colors hover:text-[#1d4ed8]"
					>
						{label}
					</button>
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
					className="h-7 w-16 rounded-sm border border-[#2563eb]/30 bg-transparent text-center font-[family-name:var(--font-plex-mono)] text-[13px] text-[var(--color-text)] outline-none focus:border-[#2563eb]"
				/>
				<button
					type="button"
					onClick={submit}
					className="h-7 rounded-sm bg-[#2563eb] px-2 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#1d4ed8]"
				>
					{t('market.add')}
				</button>
			</motion.div>
		)
	}

	return (
		<button
			type="button"
			onClick={() => setEditing(true)}
			className={`flex min-h-9 w-full min-w-0 items-center justify-between gap-3 rounded-sm px-3 py-1.5 text-start text-[13px] transition-colors hover:bg-[#2563eb]/[0.06] hover:text-[#2563eb] ${
				existing ? 'font-semibold text-[#2563eb]' : 'text-[var(--color-text)]'
			}`}
		>
			<span className="min-w-0 truncate">{label}</span>
			<span className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.14em] text-[#2563eb]">
				{existing ? existing.quantity : '+'}
			</span>
		</button>
	)
}

function MarketLoading() {
	return (
		<div className="min-h-screen pt-[72px] md:pt-[88px]">
			<section className="px-4 pb-5 sm:px-6 lg:px-12 lg:pb-6">
				<div className="mx-auto max-w-[1400px]">
					<div className="h-10 w-48 rounded-lg bg-[var(--color-surface)] animate-pulse" />
				</div>
			</section>
			<section className="hidden border-y border-[var(--color-border)] py-3 sm:block">
				<div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12 flex gap-2">
					{MARKET_FILTER_SKELETON_KEYS.map((k) => (
						<div
							key={k}
							className="h-8 w-20 rounded-full bg-[var(--color-surface)] animate-pulse"
						/>
					))}
				</div>
			</section>
			<section className="px-4 py-6 sm:px-6 sm:py-8 lg:px-12">
				<div className="mx-auto max-w-[1400px]">
					<div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-8 lg:grid-cols-3 lg:gap-x-6">
						{MARKET_CARD_SKELETON_KEYS.map((k) => (
							<div key={k} className="animate-pulse">
								<div className="aspect-[3/2] rounded-lg bg-[var(--color-surface)]" />
								<div className="mt-3 h-4 w-3/4 rounded bg-[var(--color-surface)]" />
								<div className="mt-2 h-3 w-1/2 rounded bg-[var(--color-surface)]" />
							</div>
						))}
					</div>
				</div>
			</section>
		</div>
	)
}

function MarketError() {
	const { t } = useTranslation('website')
	const navigate = useNavigate({ from: Route.fullPath })

	return (
		<div className="px-6 lg:px-12 py-12">
			<EmptyState
				icon={
					<AlertTriangle size={48} className="text-[var(--color-warning)]" />
				}
				title={t('market.errorTitle')}
				description={t('market.errorBody')}
				action={{
					label: t('market.errorCTA'),
					onClick: () => navigate({ search: {} }),
				}}
			/>
		</div>
	)
}
