import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useState, useRef, useCallback, useEffect } from 'react'
import { SearchField, Input, ToggleButton } from 'react-aria-components'
import { Search, Zap } from 'lucide-react'
import { WindowShell } from '../../components/windows/WindowShell'
import { FloatingAIButton } from '../../components/windows/FloatingAIButton'
import { MarketProductGrid } from '../../components/market/MarketProductGrid'
import { FilterSidebar } from '../../components/market/FilterSidebar'
import { InfiniteScrollSentinel } from '../../components/market/InfiniteScrollSentinel'
import { QuickAddPopover } from '../../components/market/QuickAddPopover'
import { getMarketProducts } from '../../lib/server/market'
import type { MarketProduct } from '../../lib/server/market'

export const Route = createFileRoute('/_portal/market')({
  component: MarketWindow,
})

function MarketWindow() {
  const { t } = useTranslation('portal')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [quickAddMode, setQuickAddMode] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Quick-add popover state
  const [quickAddProduct, setQuickAddProduct] = useState<MarketProduct | null>(null)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)

  // Responsive detection
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => { setIsMobile(e.matches) }
    mq.addEventListener('change', handler)
    return () => { mq.removeEventListener('change', handler) }
  }, [])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search) }, 300)
    return () => { clearTimeout(timer) }
  }, [search])

  // Infinite query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['market-products', debouncedSearch, selectedCategory],
    queryFn: async ({ pageParam = 1 }) => {
      const result = await getMarketProducts({
        data: {
          search: debouncedSearch || undefined,
          category: selectedCategory || undefined,
          page: pageParam,
          limit: 20,
        },
      })
      return result
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    maxPages: 5,
  })

  const allProducts = data?.pages.flatMap((page) => page.products) ?? []

  const handleQuickAdd = useCallback(
    (product: MarketProduct, triggerEl: HTMLElement) => {
      triggerRef.current = triggerEl
      setQuickAddProduct(product)
      setIsPopoverOpen(true)
    },
    [],
  )

  const handleFetchNext = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <>
      <WindowShell title={t('market.windowTitle', 'Market')}>
        {/* Toolbar: search + quick add toggle + mobile filter button */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-[var(--color-border)] shrink-0 flex-wrap">
          {/* Search field */}
          <SearchField
            value={search}
            onChange={setSearch}
            aria-label={t('market.searchPlaceholder', 'Search products...')}
            className="relative flex-1 min-w-0 max-w-[240px] max-md:max-w-full max-md:flex-auto"
          >
            <div className="relative">
              <Search
                size={16}
                className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
              />
              <Input
                placeholder={t('market.searchPlaceholder', 'Search products...')}
                className="w-full h-9 ps-9 pe-3 rounded-lg border border-[var(--color-border)] bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
          </SearchField>

          {/* Quick Add toggle */}
          <ToggleButton
            isSelected={quickAddMode}
            onChange={setQuickAddMode}
            className={({ isSelected }) => [
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm cursor-pointer',
              'transition-colors duration-150',
              isSelected
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
            ].join(' ')}
          >
            <Zap size={14} />
            {t('market.quickAdd')}
          </ToggleButton>

          {/* Mobile filter button */}
          {isMobile && (
            <FilterSidebar
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              showFavoritesOnly={showFavoritesOnly}
              onFavoritesToggle={setShowFavoritesOnly}
              isMobile
            />
          )}
        </div>

        {/* Main content: sidebar + grid */}
        <div className="flex flex-1 overflow-hidden">
          {/* Desktop filter sidebar */}
          {!isMobile && (
            <div className="py-4 ps-6">
              <FilterSidebar
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                showFavoritesOnly={showFavoritesOnly}
                onFavoritesToggle={setShowFavoritesOnly}
                isMobile={false}
              />
            </div>
          )}

          {/* Product grid + infinite scroll */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-card)]"
                  >
                    <div className="aspect-[4/3] bg-[var(--color-surface)] animate-pulse" />
                    <div className="flex flex-col gap-2 p-4">
                      <div className="h-4 w-3/4 rounded bg-[var(--color-surface)] animate-pulse" />
                      <div className="h-4 w-1/2 rounded bg-[var(--color-surface)] animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : allProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <p className="text-lg font-semibold text-[var(--color-text)]">
                  {t('empty.market.title')}
                </p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {t('empty.market.body')}
                </p>
              </div>
            ) : (
              <>
                <MarketProductGrid
                  products={allProducts}
                  quickAddMode={quickAddMode}
                  onQuickAdd={handleQuickAdd}
                />

                <InfiniteScrollSentinel
                  onIntersect={handleFetchNext}
                  isLoading={isFetchingNextPage}
                  hasNextPage={!!hasNextPage}
                />
              </>
            )}
          </div>
        </div>

        {/* Quick Add Popover */}
        <QuickAddPopover
          product={quickAddProduct}
          triggerRef={triggerRef}
          isOpen={isPopoverOpen}
          onOpenChange={setIsPopoverOpen}
        />
      </WindowShell>
      <FloatingAIButton />
    </>
  )
}
