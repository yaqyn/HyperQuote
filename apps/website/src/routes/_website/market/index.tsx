import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { SearchX, AlertTriangle } from 'lucide-react'
import { EmptyState } from '@hyperquote/ui'
import { getPublicCatalog } from '../../../lib/catalog'
import { SearchBar } from '../../../components/market/SearchBar'
import { FilterSidebar } from '../../../components/market/FilterSidebar'
import { MobileFilterSheet } from '../../../components/market/MobileFilterSheet'
import { ProductGrid } from '../../../components/market/ProductGrid'
import { Pagination } from '../../../components/market/Pagination'

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

	if (data.items.length === 0) {
		return (
			<div className="px-6 lg:px-12 py-12">
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
				<EmptyState
					icon={<SearchX size={48} />}
					title={t('market.emptyTitle')}
					description={t('market.emptyBody')}
					action={
						hasActiveFilters
							? { label: t('market.emptyCTA'), onClick: handleClearFilters }
							: undefined
					}
					className="mt-16"
				/>
			</div>
		)
	}

	return (
		<div className="px-6 lg:px-12 py-12">
			<div className="flex gap-8">
				{/* Desktop sidebar */}
				<aside className="hidden lg:block w-64 shrink-0">
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

				{/* Main content */}
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-3 mb-6">
						<div className="flex-1">
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
						{/* Mobile filter trigger */}
						<div className="lg:hidden">
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
					</div>

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
				</div>
			</div>
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
