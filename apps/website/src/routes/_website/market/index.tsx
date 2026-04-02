import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useState } from 'react'
import { motion } from 'motion/react'
import {
  SearchX,
  AlertTriangle,
  X,
  ShoppingCart,
  Search,
  SlidersHorizontal,
  ChevronsUpDown,
} from 'lucide-react'
import {
  SearchField,
  Label,
  Input,
  Select,
  SelectValue,
  Button,
  Popover,
  ListBox,
  ListBoxItem,
  Dialog,
  Modal,
  ModalOverlay,
} from 'react-aria-components'
import { EmptyState } from '@hyperquote/ui'
import { getPublicCatalog } from '../../../lib/catalog'
import { ProductCard } from '../../../components/market/ProductCard'
import { Pagination } from '../../../components/market/Pagination'
import { QuoteCartPanel } from '../../../components/market/QuoteCartPanel'
import { MobileFilterSheet } from '../../../components/market/MobileFilterSheet'
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
      { title: 'Market \u2014 HyperQuote' },
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

// ── Category chips for horizontal filter strip ──

const CATEGORIES = [
  'cement',
  'reinforcing_steel',
  'structural_steel',
  'aggregates',
  'sand',
  'ready_mix_concrete',
  'bricks',
  'blocks',
  'tiles_ceramic',
  'tiles_porcelain',
  'marble',
  'granite',
  'paint',
  'glass',
  'gypsum_board',
  'pipes_pvc',
  'pipes_metal',
  'electrical_cable',
  'electrical_conduit',
  'lumber',
  'plywood',
  'insulation',
  'waterproofing',
  'roofing',
  'aluminum_profiles',
  'adhesives',
  'hardware_fasteners',
] as const

const SORT_OPTIONS = [
  { id: 'relevance', labelKey: 'market.sortRelevance' },
  { id: 'name', labelKey: 'market.sortName' },
  { id: 'category', labelKey: 'market.sortCategory' },
  { id: 'availability', labelKey: 'market.sortAvailability' },
] as const

const reveal = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
}

const viewportOnce = { once: true, margin: '-60px' as const }

// ── Floating mobile cart button ──

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

      {open && (
        <ModalOverlay
          isOpen={open}
          onOpenChange={(o) => { if (!o) setOpen(false) }}
          isDismissable
          className="xl:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        >
          <Modal className="fixed inset-x-0 bottom-0 z-50">
            <Dialog
              aria-label={t('cart.title')}
              className="bg-[var(--color-base)] rounded-t-2xl max-h-[70vh] overflow-y-auto outline-none"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                <span className="text-[16px] font-semibold">{t('cart.title')}</span>
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
            </Dialog>
          </Modal>
        </ModalOverlay>
      )}
    </>
  )
}

// ── Main page ──

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

  const toggleCategory = (cat: string) => {
    navigate({
      search: (prev: Record<string, unknown>) => {
        const current = ((prev.category as string) ?? '').split(',').filter(Boolean)
        const next = current.includes(cat)
          ? current.filter((c: string) => c !== cat)
          : [...current, cat]
        return {
          ...prev,
          category: next.length ? next.join(',') : undefined,
          page: 1,
        }
      },
    })
  }

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={reveal}
        className="px-6 pb-12 pt-24 lg:px-12 lg:pb-16 lg:pt-36"
      >
        <div className="mx-auto max-w-[1400px]">
          <h1
            className="font-bold leading-[0.95] tracking-[-0.03em]"
            style={{ fontSize: 'clamp(2.8rem, 6vw, 4.5rem)' }}
          >
            {t('market.pageTitle', { defaultValue: 'Market' })}
          </h1>
          <p className="mt-4 text-[15px] opacity-35 max-w-[440px] leading-relaxed">
            {t('market.subtitle', {
              defaultValue:
                'Browse building materials from verified Egyptian suppliers. No published prices — request a quote for current rates.',
            })}
          </p>

          {/* Search */}
          <div className="mt-10 max-w-[480px]">
            <SearchField
              aria-label={t('market.searchPlaceholder', { defaultValue: 'Search materials...' })}
              defaultValue={search.q ?? ''}
              onSubmit={(val) => {
                navigate({
                  search: (prev: Record<string, unknown>) => ({
                    ...prev,
                    q: val || undefined,
                    page: 1,
                  }),
                })
              }}
              className="w-full"
            >
              <Label className="sr-only">
                {t('market.searchPlaceholder', { defaultValue: 'Search materials...' })}
              </Label>
              <div className="flex items-center border-b border-[var(--color-text)]/[0.1] pb-3 transition-colors duration-200 focus-within:border-[var(--color-primary)]/40">
                <Search size={16} className="shrink-0 opacity-25" />
                <Input
                  placeholder={t('market.searchPlaceholder', { defaultValue: 'Search materials...' })}
                  className="ms-3 w-full border-0 bg-transparent text-[15px] outline-none placeholder:opacity-30"
                />
              </div>
            </SearchField>
          </div>
        </div>
      </motion.section>

      {/* ── Divider ── */}
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
      </div>

      {/* ── Filter strip + sort ── */}
      <section className="px-6 lg:px-12 py-6">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex items-center gap-4">
            {/* Category chips — horizontal scroll */}
            <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-2 pb-1">
                {CATEGORIES.map((cat) => {
                  const isActive = search.category?.includes(cat)
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`shrink-0 px-3.5 py-1.5 text-[13px] font-medium rounded-full transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-[var(--color-text)] text-[var(--color-base)]'
                          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-text)]/[0.04]'
                      }`}
                    >
                      {t(`categories.${cat}`, { defaultValue: cat.replace(/_/g, ' ') })}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Sort */}
            <div className="hidden md:flex items-center gap-3 shrink-0">
              <Select
                selectedKey={search.sort || 'relevance'}
                onSelectionChange={(key) =>
                  navigate({
                    search: (prev: Record<string, unknown>) => ({
                      ...prev,
                      sort: key as string,
                    }),
                  })
                }
                aria-label={t('market.sortLabel', { defaultValue: 'Sort' })}
              >
                <Label className="sr-only">{t('market.sortLabel', { defaultValue: 'Sort' })}</Label>
                <Button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                  <SelectValue />
                  <ChevronsUpDown size={14} className="opacity-40" aria-hidden="true" />
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

            {/* Mobile: filter + sort */}
            <div className="md:hidden shrink-0">
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

          {/* Active filter chips — availability & price tier (categories shown as chips above) */}
          {(search.availability || search.price_tier?.length) && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {search.availability && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-[var(--color-text)]/[0.04] text-[var(--color-text)]">
                  {search.availability === 'available'
                    ? t('market.availabilityAvailable', { defaultValue: 'In Stock' })
                    : t('market.availabilityLowStock', { defaultValue: 'Low Stock' })}
                  <button
                    type="button"
                    onClick={() =>
                      navigate({
                        search: (prev: Record<string, unknown>) => ({
                          ...prev,
                          availability: undefined,
                          page: 1,
                        }),
                      })
                    }
                    className="opacity-40 hover:opacity-80 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {search.price_tier?.map((tier) => (
                <span
                  key={tier}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-[var(--color-text)]/[0.04] text-[var(--color-text)]"
                >
                  {tier === 'budget'
                    ? t('market.filterBudget', { defaultValue: 'Budget' })
                    : tier === 'mid_range'
                      ? t('market.filterMidRange', { defaultValue: 'Mid Range' })
                      : t('market.filterPremium', { defaultValue: 'Premium' })}
                  <button
                    type="button"
                    onClick={() =>
                      navigate({
                        search: (prev: Record<string, unknown>) => {
                          const tiers = ((prev.price_tier as string) ?? '')
                            .split(',')
                            .filter((t: string) => t !== tier)
                          return {
                            ...prev,
                            price_tier: tiers.length ? tiers.join(',') : undefined,
                            page: 1,
                          }
                        },
                      })
                    }
                    className="opacity-40 hover:opacity-80 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  {t('market.clearAll', { defaultValue: 'Clear all' })}
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Product grid ── */}
      <section className="px-6 lg:px-12 pb-20">
        <div className="mx-auto max-w-[1400px]">
          {data.items.length === 0 ? (
            <EmptyState
              icon={<SearchX size={48} />}
              title={t('market.emptyTitle', { defaultValue: 'No materials found' })}
              description={t('market.emptyBody', { defaultValue: 'Try adjusting your search or filters.' })}
              action={
                hasActiveFilters
                  ? { label: t('market.emptyCTA', { defaultValue: 'Clear filters' }), onClick: handleClearFilters }
                  : undefined
              }
              className="mt-8"
            />
          ) : (
            <>
              {/* Result count */}
              <div className="flex items-center justify-between mb-6">
                <p className="text-[13px] text-[var(--color-text-subtle)]">
                  <span className="font-[family-name:var(--font-mono)]">{data.total}</span>{' '}
                  {t('market.resultCount', { defaultValue: 'materials', count: data.total })}
                </p>
              </div>

              {/* Grid — 3 columns max for breathing room */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={viewportOnce}
                variants={reveal}
                className="grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
              >
                {data.items.map((item) => (
                  <ProductCard key={item.id} product={item} variant="grid" />
                ))}
              </motion.div>

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
      </section>

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
        title={t('market.errorTitle', { defaultValue: 'Something went wrong' })}
        description={t('market.errorBody', { defaultValue: 'Failed to load the market. Please try again.' })}
        action={{
          label: t('market.errorCTA', { defaultValue: 'Try again' }),
          onClick: () => navigate({ search: {} }),
        }}
      />
    </div>
  )
}
