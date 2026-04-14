import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion } from 'motion/react'
import { SearchX } from 'lucide-react'
import { getMarketProducts } from '../../../lib/server/market'
import { SearchDropdown, type SearchEntry } from '../../../components/shared/SearchDropdown'
import { MarketProductCard } from '../../../components/market/MarketProductCard'
import { InfiniteScrollSentinel } from '../../../components/market/InfiniteScrollSentinel'

const CATEGORIES = ['cement', 'steel', 'aggregates', 'bricks', 'timber', 'finishing'] as const

/** Map umbrella pill categories to actual product categories in mock data */
const CATEGORY_MAP: Record<string, string[]> = {
  cement: ['cement', 'concrete'],
  steel: ['reinforcing_steel', 'structural_steel', 'plumbing', 'electrical'],
  aggregates: ['aggregates', 'sand'],
  bricks: ['bricks'],
  timber: ['wood', 'waterproofing', 'insulation'],
  finishing: ['paints', 'tiles', 'drywall', 'adhesives'],
}

export const Route = createFileRoute('/_portal/market/')({
  component: MarketGridView,
})

function MarketGridView() {
  const { t, i18n } = useTranslation('portal')
  const navigate = useNavigate()
  const locale = i18n.language === 'ar' ? 'ar' : 'en'
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const categoryFilter = selectedCategories.length > 0
    ? selectedCategories.flatMap((cat) => CATEGORY_MAP[cat] ?? [cat]).join(',')
    : undefined

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
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

  const allProducts = data?.pages.flatMap((page) => page.products) ?? []
  const hasActiveFilters = !!(debouncedSearch || selectedCategories.length)

  const searchItems: SearchEntry[] = useMemo(
    () =>
      allProducts.map((p) => {
        const name = locale === 'ar' ? p.nameAr : p.name
        const category = t(`market.cat.${p.category}`, { defaultValue: p.category.replace(/_/g, ' ') })
        return {
          id: p.id,
          title: name,
          subtitle: `${category} · ${p.unitOfMeasure}`,
          body: [p.name, p.nameAr, category].filter(Boolean).join(' '),
          href: `/market/${p.slug}`,
        }
      }),
    [allProducts, locale, t],
  )

  const handleSearchSelect = useCallback(
    (item: SearchEntry) => {
      if (item.href) navigate({ to: item.href })
    },
    [navigate],
  )

  const handleFetchNext = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

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
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar: title + search */}
      <div className="shrink-0 px-6 lg:px-8 pt-6 pb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-[22px] font-bold text-[var(--p-text)] tracking-tight">
            {t('market.windowTitle')}
          </h1>
          <div className="w-full md:w-auto md:min-w-[360px] lg:min-w-[420px]">
            <SearchDropdown
              items={searchItems}
              placeholder={t('market.searchPlaceholder')}
              askLyonLabel={t('market.searchPlaceholder')}
              onSelect={handleSearchSelect}
              onAskLyon={(q) => setSearchQuery(q)}
              maxResults={6}
              idPrefix="market-search"
            />
          </div>
        </div>
      </div>

      {/* Category strip */}
      <div className="shrink-0 border-y border-[var(--p-border)] py-2.5">
        <div className="flex items-center gap-1.5 px-6 lg:px-8 overflow-x-auto scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategories.includes(cat)
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={[
                  'shrink-0 px-3.5 py-1.5 text-[13px] font-medium rounded-full transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-[var(--p-text)] text-[var(--p-bg)]'
                    : 'text-[var(--p-text-muted)] hover:text-[var(--p-text)] hover:bg-[var(--p-text)]/[0.04]',
                ].join(' ')}
              >
                {t(`market.cat.${cat}`)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 lg:px-8 py-6">
          {isLoading ? (
            <GridSkeleton />
          ) : allProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <SearchX size={40} className="text-[var(--p-text-muted)]" />
              <p className="text-[15px] text-[var(--p-text)]">
                {t('empty.market.title')}
              </p>
              <p className="text-[13px] text-[var(--p-text-muted)]">
                {t('empty.market.body')}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-2 text-[13px] text-[var(--p-text-secondary)] hover:text-[var(--p-text)] hover:underline"
                >
                  {t('market.clearFilters')}
                </button>
              )}
            </div>
          ) : (
            <>
              <motion.div
                key={`${debouncedSearch}-${categoryFilter}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                {allProducts.map((product) => (
                  <MarketProductCard
                    key={product.id}
                    product={product}
                    onNavigate={() =>
                      navigate({
                        to: '/market/$productSlug',
                        params: { productSlug: product.slug },
                      })
                    }
                  />
                ))}
              </motion.div>

              <InfiniteScrollSentinel
                onIntersect={handleFetchNext}
                isLoading={isFetchingNextPage}
                hasNextPage={!!hasNextPage}
              />
            </>
          )}
        </div>
      </div>

    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i}>
          <div className="aspect-[3/2] rounded-lg bg-[var(--p-surface)] animate-pulse" />
          <div className="mt-3 h-4 w-3/4 rounded bg-[var(--p-surface)] animate-pulse" />
          <div className="mt-2 h-3 w-1/2 rounded bg-[var(--p-surface)] animate-pulse" />
        </div>
      ))}
    </div>
  )
}
