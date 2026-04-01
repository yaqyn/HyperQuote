import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { SearchX, AlertTriangle, X, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@hyperquote/ui'
import { getPublicCatalog } from '../../../lib/catalog'
import { SearchBar } from '../../../components/market/SearchBar'
import { FilterSidebar } from '../../../components/market/FilterSidebar'
import { MobileFilterSheet } from '../../../components/market/MobileFilterSheet'
import { ProductGrid } from '../../../components/market/ProductGrid'
import { Pagination } from '../../../components/market/Pagination'
import { QuoteCartPanel } from '../../../components/market/QuoteCartPanel'
import { useQuoteCart } from '../../../hooks/useQuoteCart'


const marketSearchSchema = z.object({
	q: z.string().optional(),
	category: z
		.string()
		.transform((s) => (s ? s.split(',') : undefined))
		.optional(),
	availability: z.enum(['available', 'low_stock']).optional(),
	price_tier: z
		.string()
		.transform((s) => (s ? s.split(',') : undefined))
		.optional(),
	sort: z
		.enum(['relevance', 'name', 'category', 'availability'])
		.catch('relevance')
		.optional(),
	view: z.enum(['grid', 'list']).optional(),
	page: z.coerce.number().int().min(1).catch(1).optional(),
})

export const Route = createFileRoute('/_website/market/')({
	validateSearch: marketSearchSchema,
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) =>
		getPublicCatalog({
			data: {
				category: deps.category,
				availability: deps.availability || 'all',
				priceTier: deps.price_tier,
				search: deps.q,
				sort: deps.sort || 'relevance',
				page: deps.page || 1,
				limit: 24,
			},
		}),
	head: () => ({
		meta: [
			{ title: 'Market — HyperQuote' },
			{
				name: 'description',
				content:
					'Browse building materials from verified Egyptian suppliers. Cement, steel, aggregates, and more.',
			},
		],
	}),
	component: MarketPage,
	errorComponent: MarketError,
})

// Active filter chip strip
function ActiveFilterChips({
	search,
	navigate,
}: {
	search: Record<string, unknown>
	navigate: ReturnType<typeof useNavigate>
}) {
	const { t } = useTranslation('website')
	const chips: { type: string; value: string; label: string }[] = []

	const categories = search.category as string[] | undefined
	const availability = search.availability as string | undefined
	const priceTiers = search.price_tier as string[] | undefined

	categories?.forEach((cat) =>
		chips.push({ type: 'category', value: cat, label: t(`categories.${cat}`) }),
	)
	if (availability)
		chips.push({
			type: 'availability',
			value: availability,
			label:
				availability === 'available'
					? t('market.availabilityAvailable')
					: t('market.availabilityLowStock'),
		})
	priceTiers?.forEach((tier) =>
		chips.push({
			type: 'price_tier',
			value: tier,
			label:
				tier === 'budget'
					? t('market.filterBudget')
					: tier === 'mid_range'
						? t('market.filterMidRange')
						: t('market.filterPremium'),
		}),
	)

	if (chips.length === 0) return null

	const removeChip = (type: string, value: string) => {
		navigate({
			search: (prev: Record<string, unknown>) => {
				const next = { ...prev }
				if (type === 'category') {
					const cats = ((prev.category as string) ?? '').split(',').filter((c: string) => c !== value)
					next.category = cats.length ? cats.join(',') : undefined
				} else if (type === 'availability') {
					next.availability = undefined
				} else if (type === 'price_tier') {
					const tiers = ((prev.price_tier as string) ?? '').split(',').filter((t: string) => t !== value)
					next.price_tier = tiers.length ? tiers.join(',') : undefined
				}
				next.page = 1
				return next
			},
		})
	}

	return (
		<div className="flex flex-wrap items-center gap-2 mb-4">
			{chips.map((chip) => (
				<span
					key={`${chip.type}-${chip.value}`}
					className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-medium text-[var(--color-text)]"
				>
					{chip.label}
					<button
						type="button"
						onClick={() => removeChip(chip.type, chip.value)}
						className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
					>
						<X size={12} />
					</button>
				</span>
			))}
		</div>
	)
}

// Floating mobile cart button
function MobileCartButton() {
	const { t } = useTranslation('website')
	const cartCount = useQuoteCart((s) => s.items.length)
	const [open, setOpen] = useState(false)

	if (cartCount === 0) return null

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="xl:hidden fixed bottom-6 end-6 z-40 w-14 h-14 rounded-full bg-[var(--color-primary)] text-white shadow-lg flex items-center justify-center hover:bg-[var(--color-primary-hover)] transition-colors"
				aria-label={t('cart.label')}
			>
				<ShoppingCart size={22} />
				<span className="absolute -top-1 -end-1 min-w-[20px] h-[20px] rounded-full bg-white text-[var(--color-primary)] text-[11px] font-bold flex items-center justify-center px-1 shadow">
					{cartCount}
				</span>
			</button>

			{/* Bottom sheet cart */}
			{open && (
				<div className="xl:hidden fixed inset-0 z-50">
					<div
						className="absolute inset-0 bg-black/50"
						onClick={() => setOpen(false)}
						onKeyDown={() => {}}
						role="presentation"
					/>
					<div className="absolute bottom-0 inset-x-0 max-h-[70vh] bg-[var(--color-base)] rounded-t-2xl overflow-y-auto">
						<div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
							<span className="text-[16px] font-semibold text-[var(--color-text)]">
								{t('cart.title')}
							</span>
							<button
								type="button"
								onClick={() => setOpen(false)}
								className="p-1 rounded-lg hover:bg-[var(--color-surface)]"
							>
								<X size={20} />
							</button>
						</div>
						<div className="p-4">
							<QuoteCartPanel />
						</div>
					</div>
				</div>
			)}
		</>
	)
}

function MarketPage() {
	const { t } = useTranslation('website')
	const data = Route.useLoaderData()
	const search = Route.useSearch()
	const navigate = useNavigate({ from: Route.fullPath })

	const hasActiveFilters = !!(
		search.q ||
		search.category?.length ||
		search.availability ||
		search.price_tier?.length
	)

	const handleClearFilters = () => {
		navigate({ search: {} })
	}

	return (
		<div className="pt-24 pb-16">
			{/* Compact header */}
			<div className="px-6 lg:px-10 mb-6 flex items-center gap-6">
				<h1 className="text-[24px] font-bold text-[var(--color-text)] leading-tight shrink-0">
					{t('market.pageTitle')}
				</h1>
				<SearchBar
					defaultValue={search.q}
					onSearch={(q) =>
						navigate({
							search: (prev: Record<string, unknown>) => ({
								...prev,
								q: q || undefined,
								page: 1,
							}),
						})
					}
				/>
			</div>

			{data.items.length === 0 && !hasActiveFilters ? (
				<div className="px-6 lg:px-10">
					<EmptyState
						icon={<SearchX size={48} />}
						title={t('market.emptyTitle')}
						description={t('market.emptyBody')}
						className="mt-8"
					/>
				</div>
			) : (
				<div className="px-6 lg:px-10">
					<div className="flex gap-10">
						{/* Filter sidebar */}
						<aside className="hidden lg:block w-56 shrink-0">
							<FilterSidebar
								category={search.category}
								availability={search.availability}
								priceTier={search.price_tier}
								onFilterChange={(filters) =>
									navigate({
										search: (prev: Record<string, unknown>) => ({
											...prev,
											...filters,
											page: 1,
										}),
									})
								}
								onClearAll={handleClearFilters}
								hasActiveFilters={hasActiveFilters}
							/>
						</aside>

						{/* Main content — full remaining width */}
						<div className="flex-1 min-w-0">
							{/* Mobile filter */}
							<div className="lg:hidden mb-4">
								<MobileFilterSheet
									category={search.category}
									availability={search.availability}
									priceTier={search.price_tier}
									onFilterChange={(filters) =>
										navigate({
											search: (prev: Record<string, unknown>) => ({
												...prev,
												...filters,
												page: 1,
											}),
										})
									}
									onClearAll={handleClearFilters}
								/>
							</div>

							{/* Active filter chips */}
							<ActiveFilterChips search={search} navigate={navigate} />

							{data.items.length === 0 ? (
								<EmptyState
									icon={<SearchX size={48} />}
									title={t('market.emptyTitle')}
									description={t('market.emptyBody')}
									action={{ label: t('market.emptyCTA'), onClick: handleClearFilters }}
									className="mt-8"
								/>
							) : (
								<>
									<ProductGrid
										items={data.items}
										total={data.total}
										sort={search.sort || 'relevance'}
										view={search.view}
										onSortChange={(sort) =>
											navigate({
												search: (prev: Record<string, unknown>) => ({
													...prev,
													sort,
												}),
											})
										}
										onViewChange={(view) =>
											navigate({
												search: (prev: Record<string, unknown>) => ({
													...prev,
													view,
												}),
											})
										}
									/>

									<Pagination
										total={data.total}
										page={search.page || 1}
										limit={24}
										onPageChange={(page) =>
											navigate({
												search: (prev: Record<string, unknown>) => ({
													...prev,
													page,
												}),
											})
										}
									/>
								</>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Mobile floating cart */}
			<MobileCartButton />
		</div>
	)
}

function MarketError() {
	const { t } = useTranslation('website')
	const navigate = useNavigate({ from: Route.fullPath })

	return (
		<div className="px-6 lg:px-12 py-12">
			<EmptyState
				icon={<AlertTriangle size={48} className="text-[var(--color-warning)]" />}
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
