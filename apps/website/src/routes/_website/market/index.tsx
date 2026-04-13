import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useState, useMemo, useCallback } from 'react'
import { motion } from 'motion/react'
import {
  SearchX,
  AlertTriangle,
  X,
  ShoppingCart,
  ChevronsUpDown,
} from 'lucide-react'
import {
  Label,
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
import { SearchDropdown, type SearchEntry } from '../../../components/shared/SearchDropdown'
import { EmptyState } from '@hyperquote/ui'
import { getPublicCatalog } from '../../../lib/catalog'
import { ProductCard } from '../../../components/market/ProductCard'
import { Pagination } from '../../../components/market/Pagination'
import { QuoteCartPanel } from '../../../components/market/QuoteCartPanel'
import { useQuoteCart } from '../../../hooks/useQuoteCart'

// ── Search schema ──
// category and price_tier come as comma-separated strings in the URL,
// transformed to arrays for the component. All navigate calls must serialize back.

const marketSearchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  availability: z.enum(['available', 'low_stock']).optional(),
  price_tier: z.string().optional(),
  sort: z.enum(['relevance', 'name', 'category', 'availability']).catch('relevance').optional(),
  page: z.coerce.number().int().min(1).catch(1).optional(),
})

/** Split comma-separated string into array, or empty array */
function splitParam(s?: string): string[] {
  return s ? s.split(',').filter(Boolean) : []
}

export const Route = createFileRoute('/_website/market/')({
  validateSearch: marketSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    getPublicCatalog({
      data: {
        category: splitParam(deps.category),
        availability: deps.availability || 'all',
        priceTier: splitParam(deps.price_tier),
        search: deps.q,
        sort: deps.sort || 'relevance',
        page: deps.page || 1,
        limit: 24,
      },
    }),
  head: () => ({
    meta: [
      { title: 'Market — HyperQuote' },
      { name: 'description', content: 'Browse building materials from verified Egyptian suppliers.' },
    ],
  }),
  component: MarketPage,
  pendingComponent: MarketLoading,
  errorComponent: MarketError,
})

const CATEGORIES = ['cement', 'steel', 'aggregates', 'bricks', 'timber', 'finishing'] as const

const SORT_OPTIONS = [
  { id: 'relevance', labelKey: 'market.sortRelevance' },
  { id: 'name', labelKey: 'market.sortName' },
  { id: 'category', labelKey: 'market.sortCategory' },
  { id: 'availability', labelKey: 'market.sortAvailability' },
] as const


// ── Market Search ──

function MarketSearch({
  items: catalogItems,
  onSearch,
}: {
  items: Array<{ id: string; slug: string; name: string; name_ar: string | null; category: string; unit_of_measure: string; [key: string]: unknown }>
  onSearch: (q: string) => void
}) {
  const { t, i18n } = useTranslation('website')
  const navigate = useNavigate({ from: Route.fullPath })
  const locale = i18n.language === 'ar' ? 'ar' : 'en'

  const searchItems: SearchEntry[] = useMemo(
    () =>
      catalogItems.map((p) => {
        const name = locale === 'ar' ? p.name_ar || p.name : p.name
        const category = t(`categories.${p.category}`, { defaultValue: p.category.replace(/_/g, ' ') })
        const unit = t(`units.${p.unit_of_measure}`, { defaultValue: p.unit_of_measure })
        const description = (locale === 'ar' ? (p.description_ar as string) : (p.description as string)) ?? ''
        const brand = (p.brand as string) ?? ''

        return {
          id: p.id,
          title: name,
          subtitle: [category, unit].filter(Boolean).join(' · '),
          body: [p.name, p.name_ar, description, brand, category].filter(Boolean).join(' '),
          href: `/market/${p.slug}`,
        }
      }),
    [catalogItems, locale, t],
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
            <Dialog aria-label={t('cart.title')} className="bg-[var(--color-base)] rounded-t-2xl max-h-[70vh] overflow-y-auto outline-none">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                <span className="text-[16px] font-semibold">{t('cart.title')}</span>
                <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-[var(--color-surface)]">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4"><QuoteCartPanel /></div>
            </Dialog>
          </Modal>
        </ModalOverlay>
      )}
    </>
  )
}

// ── Main Page ──

function MarketPage() {
  const { t } = useTranslation('website')
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const categories = splitParam(search.category)
  const priceTiers = splitParam(search.price_tier)
  const hasActiveFilters = !!(search.q || categories.length || search.availability || priceTiers.length)

  function nav(overrides: Partial<typeof search>) {
    navigate({ search: { ...search, ...overrides, page: overrides.page ?? 1 } })
  }

  function toggleCategory(cat: string) {
    const next = categories.includes(cat) ? categories.filter((c) => c !== cat) : [...categories, cat]
    nav({ category: next.length ? next.join(',') : undefined })
  }

  return (
    <div className="min-h-screen pt-20 max-md:pt-16">
      {/* Top bar */}
      <section className="px-6 lg:px-12 pb-6">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-[28px] lg:text-[36px] font-extrabold tracking-[-0.02em]">
              {t('market.pageTitle')}
            </h1>
            <div className="w-full md:w-auto md:min-w-[360px] lg:min-w-[420px]">
              <MarketSearch
                items={data.items}
                onSearch={(q) => nav({ q: q || undefined })}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Category strip + sort */}
      <section className="border-y border-[var(--color-border)] py-3">
        <div className="mx-auto max-w-[1400px] flex items-center gap-4 px-6 lg:px-12">
          <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2">
              {CATEGORIES.map((cat) => {
                const isActive = categories.includes(cat)
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
                    {t(`marketPreview.categories.${cat}`, { defaultValue: cat })}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sort */}
          <div className="hidden md:flex items-center shrink-0">
            <Select
              selectedKey={search.sort || 'relevance'}
              onSelectionChange={(key) => nav({ sort: key as string })}
              aria-label={t('market.sortLabel')}
            >
              <Label className="sr-only">{t('market.sortLabel')}</Label>
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
        </div>
      </section>

      {/* Product grid */}
      <section className="px-6 lg:px-12 py-8">
        <div className="mx-auto max-w-[1400px]">
          {data.items.length === 0 ? (
            <EmptyState
              icon={<SearchX size={48} />}
              title={t('market.emptyTitle')}
              description={t('market.emptyBody')}
              action={hasActiveFilters ? { label: t('market.emptyCTA'), onClick: () => navigate({ search: {} }) } : undefined}
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
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6"
              >
                {data.items.map((item) => (
                  <ProductCard key={item.id} product={item} variant="grid" />
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

      <MobileCartButton />
    </div>
  )
}

function MarketLoading() {
  return (
    <div className="min-h-screen pt-20 max-md:pt-16">
      <section className="px-6 lg:px-12 pb-6">
        <div className="mx-auto max-w-[1400px]">
          <div className="h-10 w-48 rounded-lg bg-[var(--color-surface)] animate-pulse" />
        </div>
      </section>
      <section className="border-y border-[var(--color-border)] py-3">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12 flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-20 rounded-full bg-[var(--color-surface)] animate-pulse" />
          ))}
        </div>
      </section>
      <section className="px-6 lg:px-12 py-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="animate-pulse">
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
        icon={<AlertTriangle size={48} className="text-[var(--color-warning)]" />}
        title={t('market.errorTitle')}
        description={t('market.errorBody')}
        action={{ label: t('market.errorCTA'), onClick: () => navigate({ search: {} }) }}
      />
    </div>
  )
}
