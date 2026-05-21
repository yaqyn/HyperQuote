import { EmptyState } from '@hyperquote/ui/feedback/EmptyState'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, ChevronsUpDown, SearchX } from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useMemo } from 'react'
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
import { getPublicCatalog, type PublicProduct } from '../../../lib/catalog'
import { isAbortedRouteLoad } from '../../../lib/route-loader'

// ── Search schema ──
// category and price_tier come as comma-separated strings in the URL,
// transformed to arrays for the component. All navigate calls must serialize back.

const marketSearchSchema = z.object({
	q: z.string().optional(),
	category: z.string().optional(),
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
	loader: async ({ deps, abortController }) => {
		try {
			return await getPublicCatalog({
				data: {
					category: splitParam(deps.category),
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
	head: () => ({
		meta: [
			{ title: 'Market — HyperQuote' },
			{
				name: 'description',
				content: 'Browse building materials from verified Egyptian suppliers.',
			},
		],
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

// ── Market Search ──

function MarketSearch({
	items: catalogItems,
	categories,
	onSearch,
}: {
	items: PublicProduct[]
	categories: Array<{ slug: string; name: string; name_ar: string }>
	onSearch: (q: string) => void
}) {
	const { t, i18n } = useTranslation('website')
	const navigate = useNavigate({ from: Route.fullPath })
	const locale = i18n.language === 'ar' ? 'ar' : 'en'

	const searchItems: SearchEntry[] = useMemo(
		() =>
			catalogItems.map((p) => {
				const name = locale === 'ar' ? p.name_ar || p.name : p.name
				const category = categoryLabelFor(p.category, categories, locale)
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
			onAskLyon={onSearch}
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
	const data = Route.useLoaderData()
	const search = Route.useSearch()
	const navigate = useNavigate({ from: Route.fullPath })

	const categories = splitParam(search.category)
	const priceTiers = splitParam(search.price_tier)
	const hasActiveFilters = !!(
		search.q ||
		categories.length ||
		search.availability ||
		priceTiers.length
	)

	function nav(overrides: Partial<typeof search>) {
		navigate({ search: { ...search, ...overrides, page: overrides.page ?? 1 } })
	}

	function toggleCategory(cat: string) {
		const next = categories.includes(cat)
			? categories.filter((c) => c !== cat)
			: [...categories, cat]
		nav({ category: next.length ? next.join(',') : undefined })
	}

	return (
		<div className="min-h-screen pt-[72px] pb-12 md:pt-[88px]">
			{/* Top bar */}
			<section className="px-4 pb-5 sm:px-6 lg:px-12 lg:pb-6">
				<div className="mx-auto max-w-[1400px]">
					<div className="flex flex-col items-center gap-4 text-center lg:flex-row lg:items-center lg:justify-between lg:text-start">
						<h1 className="w-full text-[28px] font-extrabold tracking-normal lg:w-auto lg:text-[36px]">
							{t('market.pageTitle')}
						</h1>
						<div className="mx-auto w-full max-w-[520px] lg:mx-0 lg:w-[420px]">
							<MarketSearch
								items={data.items}
								categories={data.categories}
								onSearch={(q) => nav({ q: q || undefined })}
							/>
						</div>
					</div>
				</div>
			</section>

			{/* Category strip + sort */}
			<section className="hidden border-y border-[var(--color-border)] py-3 sm:block">
				<div className="mx-auto flex max-w-[1400px] flex-col items-center gap-3 overflow-hidden px-4 sm:px-6 lg:flex-row lg:px-12">
					<div className="w-full min-w-0 lg:flex-1">
						<div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
							{data.categories.map((category) => {
								const isActive = categories.includes(category.slug)
								const label =
									locale === 'ar' && category.name_ar
										? category.name_ar
										: category.name || category.slug.replace(/_/g, ' ')
								return (
									<button
										key={category.slug}
										type="button"
										onClick={() => toggleCategory(category.slug)}
										className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors whitespace-nowrap sm:px-3.5 ${
											isActive
												? 'bg-[var(--color-text)] text-[var(--color-base)]'
												: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-text)]/[0.04]'
										}`}
									>
										{label}
									</button>
								)
							})}
						</div>
					</div>

					{/* Sort */}
					<div className="hidden shrink-0 items-center sm:flex">
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
							<Button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
								<SelectValue />
								<ChevronsUpDown
									size={14}
									className="opacity-40"
									aria-hidden="true"
								/>
							</Button>
							<Popover className="w-44 rounded-lg border border-[var(--color-text)]/[0.08] bg-[var(--color-base)] shadow-[0_16px_48px_rgba(0,0,0,0.1)] overflow-hidden z-50">
								<ListBox className="p-1">
									{SORT_OPTIONS.map((opt) => (
										<ListBoxItem
											key={opt.id}
											id={opt.id}
											className="px-3 py-2 text-[13px] rounded-md cursor-pointer text-[var(--color-text)] hover:bg-[var(--color-text)]/[0.03] data-[selected]:font-medium data-[selected]:text-[var(--color-primary)] outline-none data-[focused]:bg-[var(--color-text)]/[0.03]"
										>
											{t(opt.labelKey, { defaultValue: opt.id })}
										</ListBoxItem>
									))}
								</ListBox>
							</Popover>
						</Select>
					</div>
				</div>
			</section>

			{/* Product grid */}
			<section className="px-4 py-6 sm:px-6 sm:py-8 lg:px-12">
				<div className="mx-auto max-w-[1400px]">
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
							<div className="flex items-center justify-between mb-8">
								<p className="text-[13px] text-[var(--color-text-subtle)]">
									{t('market.resultCount', { count: data.total })}
								</p>
							</div>

							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ duration: 0.25, ease: 'easeOut' }}
								className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-8 lg:grid-cols-3 lg:gap-x-6"
							>
								{data.items.map((item: PublicProduct) => (
									<ProductCard
										key={item.id}
										product={item}
										variant="grid"
										categoryLabel={categoryLabelFor(
											item.category,
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
			</section>
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
