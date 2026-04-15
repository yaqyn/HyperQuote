import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button as AriaButton, TooltipTrigger, Tooltip } from 'react-aria-components'
import { Search, Bell, Flame, Check, Loader2, Pencil } from 'lucide-react'
import {
  getInventoryOverview,
  getTopSuppliers,
  updateInventoryPrice,
  type InventoryProductView,
  type InventoryCategorySummary,
  type TopSupplier,
} from '../../../lib/server/inventory'
import type { BroadCategory } from '@hyperquote/types'
import { ProductDetailModal } from './ProductDetailModal'
import { SupplierProfileModal } from './SupplierProfileModal'

// ─── Category rail ─────────────────────────────────────────

const CATEGORY_LABELS: Record<BroadCategory, string> = {
  cement: 'Cement',
  steel: 'Steel',
  aggregates: 'Aggregates',
  bricks: 'Masonry',
  timber: 'Timber',
  finishing: 'Finishing',
}

function CategoryRail({
  categories,
  active,
  onSelect,
}: {
  categories: InventoryCategorySummary[]
  active: BroadCategory | 'all'
  onSelect: (id: BroadCategory | 'all') => void
}) {
  const totalUrgent = categories.reduce((s, c) => s + c.urgentCount, 0)
  const total = categories.reduce((s, c) => s + c.totalCount, 0)

  return (
    <div className="grid grid-cols-7 gap-2">
      <AriaButton
        onPress={() => onSelect('all')}
        className={`relative flex flex-col items-start justify-between h-32 rounded-2xl px-4 py-3 text-start outline-none cursor-pointer transition-all border ${
          active === 'all'
            ? 'border-black/25 dark:border-white/25 bg-black/[0.05] dark:bg-white/[0.05]'
            : 'border-black/[0.08] dark:border-white/[0.08] bg-[var(--color-surface)] dark:bg-[#111] hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
        }`}
      >
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
          All catalog
        </span>
        <div>
          <div className="font-[family-name:var(--font-geist-mono)] text-[32px] font-semibold leading-none tabular-nums text-[var(--color-text)]">
            {total}
          </div>
          {totalUrgent > 0 && (
            <div className="mt-1 font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-red-600 dark:text-red-400">
              {totalUrgent} urgent
            </div>
          )}
        </div>
      </AriaButton>

      {categories.map((cat) => {
        const isActive = active === cat.id
        const hasUrgent = cat.urgentCount > 0
        return (
          <AriaButton
            key={cat.id}
            onPress={() => onSelect(cat.id)}
            className={`group relative overflow-hidden h-32 rounded-2xl text-start outline-none cursor-pointer transition-all border ${
              isActive
                ? 'border-black/25 dark:border-white/25'
                : 'border-black/[0.06] dark:border-white/[0.06] hover:border-black/15 dark:hover:border-white/15'
            }`}
          >
            {/* Hero image */}
            <img
              src={cat.image}
              alt=""
              loading="lazy"
              className={`absolute inset-0 h-full w-full object-cover transition-all duration-300 ${
                isActive ? 'scale-105 brightness-[0.55]' : 'scale-100 brightness-[0.65] group-hover:scale-105 group-hover:brightness-[0.55]'
              }`}
            />
            {/* Bottom fade for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {/* Urgent ribbon — bottom-right corner */}
            {hasUrgent && (
              <div className="absolute bottom-0 right-0 z-20 flex items-center gap-1 rounded-tl-xl bg-red-500 px-2 py-1 text-white font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold tabular-nums">
                <Flame size={10} strokeWidth={2.5} />
                {cat.urgentCount}
              </div>
            )}

            <div className="relative z-10 flex h-full flex-col justify-between px-3.5 py-3">
              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/70">
                {CATEGORY_LABELS[cat.id]}
              </span>
              <div>
                <div className="font-[family-name:var(--font-geist-mono)] text-[28px] font-semibold leading-none tabular-nums text-white">
                  {cat.totalCount}
                </div>
                {cat.outdatedCount > 0 && !hasUrgent && (
                  <div className="mt-1 font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-white/60">
                    {cat.outdatedCount} outdated
                  </div>
                )}
              </div>
            </div>
          </AriaButton>
        )
      })}
    </div>
  )
}

// ─── Product card ─────────────────────────────────────────

function formatHoursAgo(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m ago`
  if (hours < 24) return `${Math.round(hours)}h ago`
  const d = Math.floor(hours / 24)
  return `${d}d ago`
}

function ProductCard({
  product,
  onSave,
  onOpenDetail,
  isSaving,
  justSaved,
}: {
  product: InventoryProductView
  onSave: (slug: string, rawCost: number) => void
  onOpenDetail: (slug: string) => void
  isSaving: boolean
  justSaved: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string>('')

  const beginEdit = () => {
    setDraft(String(product.rawCost))
    setEditing(true)
  }

  const commit = () => {
    const v = parseFloat(draft.replace(/,/g, ''))
    if (!isNaN(v) && v >= 0 && v !== product.rawCost) {
      onSave(product.slug, v)
    }
    setEditing(false)
  }

  const cancel = () => {
    setEditing(false)
    setDraft('')
  }

  const freshnessLabel =
    product.freshness === 'fresh'
      ? 'Fresh'
      : product.freshness === 'aging'
      ? 'Aging'
      : 'Stale'
  const freshnessTone =
    product.freshness === 'fresh'
      ? 'text-emerald-600 dark:text-emerald-400'
      : product.freshness === 'aging'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-black/50 dark:text-white/50'

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-black/[0.08] dark:border-white/[0.06] bg-[var(--color-surface)] dark:bg-[#111] hover:border-black/20 dark:hover:border-white/15 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.15)] transition-all duration-200"
    >
      {/* Urgent stripe on left edge */}
      {product.isUrgent && (
        <div className="absolute inset-y-0 left-0 w-[3px] bg-red-500" />
      )}

      {/* Image block — click opens detail */}
      <button
        type="button"
        onClick={() => onOpenDetail(product.slug)}
        className="relative h-36 overflow-hidden border-b border-black/[0.05] dark:border-white/[0.04] outline-none cursor-pointer text-start"
        aria-label={`View ${product.name} details`}
      >
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Top-right meta: SKU + recently ordered flame */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          {product.recentlyOrdered && (
            <TooltipTrigger delay={300}>
              <span className="inline-flex items-center justify-center rounded-full bg-white dark:bg-black border border-black/10 dark:border-white/15 h-6 w-6 shadow-sm">
                <Flame size={11} strokeWidth={2.5} className={product.isUrgent ? 'text-red-500' : 'text-amber-500'} />
              </span>
              <Tooltip className="rounded-md bg-black px-2.5 py-1 text-[11px] text-white shadow-lg dark:bg-white dark:text-black" offset={4}>
                Customer ordered recently
              </Tooltip>
            </TooltipTrigger>
          )}
          <span className="rounded-md bg-white dark:bg-black border border-black/10 dark:border-white/15 px-2 py-0.5 font-[family-name:var(--font-geist-mono)] text-[9px] font-semibold tabular-nums text-black/55 dark:text-white/55">
            {product.sku}
          </span>
        </div>

      </button>

      {/* Body */}
      <div className="flex flex-1 flex-col px-4 py-3.5">
        {/* Name + supplier — also opens detail */}
        <button
          type="button"
          onClick={() => onOpenDetail(product.slug)}
          className="text-start outline-none cursor-pointer"
        >
          <h3 className="text-[14px] font-semibold leading-tight text-[var(--color-text)] line-clamp-2 hover:text-[var(--color-primary)] transition-colors">
            {product.name}
          </h3>
          <p className="mt-0.5 text-[10px] text-black/40 dark:text-white/40 truncate">
            {product.supplierName}
            {product.brand && ` · ${product.brand}`}
          </p>
        </button>

        {/* Divider */}
        <div className="my-3 h-px bg-black/[0.05] dark:bg-white/[0.05]" />

        {/* Price row */}
        <div className="flex items-end justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-[9px] uppercase tracking-[0.15em] text-black/35 dark:text-white/35 mb-0.5">
              Supplier cost · EGP
            </div>
            {editing ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commit()
                  if (e.key === 'Escape') cancel()
                }}
                className="w-full bg-transparent font-[family-name:var(--font-geist-mono)] text-[22px] font-semibold tabular-nums text-[var(--color-text)] outline-none border-b border-[var(--color-primary)]/50 pb-0.5"
              />
            ) : (
              <button
                type="button"
                onClick={beginEdit}
                className="group/price flex items-baseline gap-1 outline-none cursor-pointer"
              >
                <span className="font-[family-name:var(--font-geist-mono)] text-[22px] font-semibold tabular-nums text-[var(--color-text)]">
                  {product.rawCost > 0
                    ? product.rawCost.toLocaleString('en-EG', { minimumFractionDigits: 2 })
                    : '—'}
                </span>
                <span className="text-[10px] text-black/35 dark:text-white/35">/{product.unit}</span>
                <Pencil
                  size={11}
                  strokeWidth={2}
                  className="ms-1 text-black/25 dark:text-white/25 opacity-0 group-hover/price:opacity-100 transition-opacity"
                />
              </button>
            )}
          </div>

          {/* Status badge */}
          <div className="shrink-0 text-right">
            {isSaving ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--color-primary)]">
                <Loader2 size={11} strokeWidth={2.5} className="animate-spin" />
                Saving
              </span>
            ) : justSaved ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <Check size={11} strokeWidth={2.5} />
                Saved
              </span>
            ) : (
              <span className={`text-[10px] font-medium uppercase tracking-wider ${freshnessTone}`}>
                {freshnessLabel}
              </span>
            )}
            <div className="mt-0.5 text-[9px] text-black/30 dark:text-white/30">
              {formatHoursAgo(product.hoursSinceUpdate)}
            </div>
          </div>
        </div>

        {product.pendingRequestedBy.length > 0 && (
          <div className="mt-3 rounded-md bg-black/[0.03] dark:bg-white/[0.04] px-2.5 py-1.5 text-[10px] text-black/55 dark:text-white/55">
            Requested by{' '}
            <span className="font-semibold text-[var(--color-text)]">
              {product.pendingRequestedBy.join(', ')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main view ─────────────────────────────────────────────

export function InventoryView() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-overview'],
    queryFn: () => getInventoryOverview({ data: {} }),
    staleTime: 30_000,
  })

  const { data: topSuppliersData } = useQuery({
    queryKey: ['inventory-top-suppliers'],
    queryFn: () => getTopSuppliers({ data: { limit: 5 } }),
    staleTime: 30_000,
  })

  const mutation = useMutation({
    mutationFn: updateInventoryPrice,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-overview'] })
      qc.invalidateQueries({ queryKey: ['inventory-top-suppliers'] })
      qc.invalidateQueries({ queryKey: ['sales-outdated-prices'] })
    },
  })

  const [activeCategory, setActiveCategory] = useState<BroadCategory | 'all'>('all')
  const [search, setSearch] = useState('')
  const [onlyUrgent, setOnlyUrgent] = useState(false)
  const [justSavedSlug, setJustSavedSlug] = useState<string | null>(null)
  const [detailSlug, setDetailSlug] = useState<string | null>(null)
  const [supplierProfileName, setSupplierProfileName] = useState<string | null>(null)

  const handleSave = (slug: string, rawCost: number) => {
    mutation.mutate(
      { data: { slug, rawCost } },
      {
        onSuccess: () => {
          setJustSavedSlug(slug)
          setTimeout(() => setJustSavedSlug((prev) => (prev === slug ? null : prev)), 1800)
        },
      },
    )
  }

  const filtered = useMemo(() => {
    if (!data) return []
    let list: InventoryProductView[] = data.products
    if (activeCategory !== 'all') list = list.filter((p) => p.broadCategory === activeCategory)
    if (onlyUrgent) list = list.filter((p) => p.isUrgent)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.supplierName.toLowerCase().includes(q),
      )
    }
    // Urgent first, then oldest updates
    return [...list].sort((a, b) => {
      if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1
      return b.hoursSinceUpdate - a.hoursSinceUpdate
    })
  }, [data, activeCategory, onlyUrgent, search])

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={20} strokeWidth={1.5} className="animate-spin text-[var(--color-text-subtle)]" />
      </div>
    )
  }

  const urgentItems = data.products.filter((p) => p.isUrgent)

  return (
    <div className="relative flex flex-col h-full bg-[var(--color-surface)] dark:bg-[#0A0A0A]">
      <div className="relative flex-1 min-h-0 overflow-y-auto" data-module-content>
        <div className="mx-auto max-w-[1600px] px-5 py-4 space-y-5">
          {/* Header bar */}
          <header className="flex items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/40 dark:text-white/40">
                  Inventory · Price desk
                </span>
                <span className="h-[1px] w-10 bg-black/20 dark:bg-white/20" />
                <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-black/40 dark:text-white/40">
                  {new Date().toLocaleDateString('en-EG', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <h1 className="mt-1 text-[32px] font-semibold leading-none tracking-tight text-[var(--color-text)]">
                Keep prices honest.
              </h1>
              <p className="mt-2 text-[12px] text-black/50 dark:text-white/50 max-w-xl">
                Sales can&rsquo;t sell what you haven&rsquo;t priced today. Urgent items below are the ones a customer just asked for.
              </p>
            </div>

            {/* Ledger stats */}
            <div className="flex items-start gap-8 pb-1">
              <Stat label="Total SKUs" value={data.totals.total} />
              <Stat label="Fresh" value={data.totals.fresh} tone="emerald" />
              <Stat label="Outdated" value={data.totals.outdated} tone="amber" />
              <Stat label="Urgent" value={data.totals.urgent} tone="red" />
              <Stat label="Requests" value={data.totals.pendingRequests} tone="primary" icon={<Bell size={14} strokeWidth={2} />} />
            </div>
          </header>

          {/* Urgent strip — inline queue of incoming requests */}
          {urgentItems.length > 0 && (
            <section className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] dark:bg-red-500/[0.06] px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Flame size={12} strokeWidth={2.5} className="text-red-500" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-700 dark:text-red-300">
                  Urgent queue · {urgentItems.length}
                </span>
                <span className="h-[1px] flex-1 bg-red-500/15" />
                <button
                  type="button"
                  onClick={() => {
                    setOnlyUrgent((prev) => !prev)
                    setActiveCategory('all')
                  }}
                  className="text-[10px] font-medium text-red-700 dark:text-red-300 hover:underline outline-none"
                >
                  {onlyUrgent ? 'Show all items' : 'Filter to urgent only'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {urgentItems.slice(0, 10).map((p) => (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => {
                      setSearch(p.name)
                      setActiveCategory('all')
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface)] dark:bg-[#111] border border-red-500/20 px-2.5 py-1 text-[10px] font-medium text-[var(--color-text)] hover:border-red-500/40 transition-colors outline-none cursor-pointer"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    {p.name}
                    {p.pendingRequestCount > 0 && (
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-red-600 dark:text-red-400">
                        · {p.pendingRequestCount}
                      </span>
                    )}
                  </button>
                ))}
                {urgentItems.length > 10 && (
                  <span className="inline-flex items-center px-2 py-1 text-[10px] text-red-600/70 dark:text-red-400/70">
                    +{urgentItems.length - 10} more
                  </span>
                )}
              </div>
            </section>
          )}

          {/* Top suppliers — call once, fix many */}
          {topSuppliersData && topSuppliersData.suppliers.length > 0 && (
            <TopSuppliersStrip
              suppliers={topSuppliersData.suppliers}
              onOpen={setSupplierProfileName}
            />
          )}

          {/* Category rail */}
          <CategoryRail
            categories={data.categories}
            active={activeCategory}
            onSelect={setActiveCategory}
          />

          {/* Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 rounded-full border border-black/[0.08] dark:border-white/[0.08] bg-[var(--color-surface)] dark:bg-[#111] px-4 py-2">
              <Search size={13} strokeWidth={2} className="text-black/40 dark:text-white/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by product, SKU, or supplier…"
                className="flex-1 bg-transparent text-[12px] text-[var(--color-text)] placeholder:text-black/30 dark:placeholder:text-white/30 outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-[10px] text-black/40 dark:text-white/40 hover:text-[var(--color-text)] outline-none"
                >
                  Clear
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOnlyUrgent((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-medium transition-colors outline-none cursor-pointer border ${
                onlyUrgent
                  ? 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300'
                  : 'border-black/[0.08] dark:border-white/[0.08] bg-[var(--color-surface)] dark:bg-[#111] text-black/60 dark:text-white/60 hover:border-black/20 dark:hover:border-white/20'
              }`}
            >
              <Flame size={11} strokeWidth={2.5} />
              Only urgent
            </button>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-2">
              <Check size={24} strokeWidth={1.5} className="text-emerald-500" />
              <p className="text-[13px] text-[var(--color-text-muted)]">No items match this view</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filtered.map((p) => (
                <ProductCard
                  key={p.slug}
                  product={p}
                  onSave={handleSave}
                  onOpenDetail={setDetailSlug}
                  isSaving={mutation.isPending && mutation.variables?.data.slug === p.slug}
                  justSaved={justSavedSlug === p.slug}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ProductDetailModal slug={detailSlug} onClose={() => setDetailSlug(null)} />
      <SupplierProfileModal
        name={supplierProfileName}
        onClose={() => setSupplierProfileName(null)}
      />
    </div>
  )
}

// ─── Top suppliers strip ──────────────────────────────────

const TIER_TONE = {
  preferred: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/25',
  approved: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] ring-[var(--color-primary)]/25',
  conditional: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-500/30',
  new: 'bg-black/[0.06] text-black/60 dark:bg-white/[0.08] dark:text-white/60 ring-black/10 dark:ring-white/10',
} as const

const CATEGORY_SHORT: Record<string, string> = {
  cement: 'Cement',
  steel: 'Steel',
  aggregates: 'Aggregates',
  bricks: 'Masonry',
  timber: 'Timber',
  finishing: 'Finishing',
}

function TopSuppliersStrip({
  suppliers,
  onOpen,
}: {
  suppliers: TopSupplier[]
  onOpen: (name: string) => void
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/50 dark:text-white/50">
            Call once · fix many
          </span>
          <span className="h-[1px] w-10 bg-black/15 dark:bg-white/15" />
          <span className="text-[10px] text-black/40 dark:text-white/40">
            Top suppliers ranked by how many prices one phone call unblocks
          </span>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2.5">
        {suppliers.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => onOpen(s.name)}
            className="group flex flex-col items-start gap-2 rounded-2xl border border-black/[0.08] dark:border-white/[0.06] bg-[var(--color-surface)] dark:bg-[#111] p-3 text-start outline-none cursor-pointer transition-all hover:border-black/20 dark:hover:border-white/15 hover:shadow-[0_6px_20px_-12px_rgba(0,0,0,0.15)]"
          >
            {/* Top row: name + tier */}
            <div className="flex items-start justify-between gap-2 w-full">
              <span className="text-[13px] font-semibold text-[var(--color-text)] leading-tight truncate">
                {s.name}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider ring-1 ring-inset shrink-0 ${TIER_TONE[s.tier]}`}
              >
                {s.tier}
              </span>
            </div>

            {/* Big outdated count */}
            <div className="flex items-baseline gap-1.5">
              <span className="font-[family-name:var(--font-geist-mono)] text-[26px] font-semibold leading-none tabular-nums text-[var(--color-text)]">
                {s.outdatedQuotes}
              </span>
              <span className="text-[10px] text-black/45 dark:text-white/45">
                outdated
                {s.urgentQuotes > 0 && (
                  <span className="text-red-600 dark:text-red-400">
                    {' · '}
                    {s.urgentQuotes} urgent
                  </span>
                )}
              </span>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-2 text-[9px] text-black/40 dark:text-white/40">
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                {s.primaryFor}/{s.totalQuotes} primary
              </span>
              {s.primaryForOutdatedCount > 0 && (
                <>
                  <span>·</span>
                  <span className="text-[var(--color-primary)]">
                    {s.primaryForOutdatedCount} will update product cost
                  </span>
                </>
              )}
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-1 mt-auto">
              {s.affectedCategories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center rounded-full bg-black/[0.04] dark:bg-white/[0.05] px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider text-black/55 dark:text-white/55"
                >
                  {CATEGORY_SHORT[cat] ?? cat}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

function Stat({
  label,
  value,
  tone = 'neutral',
  icon,
}: {
  label: string
  value: number
  tone?: 'neutral' | 'emerald' | 'amber' | 'red' | 'primary'
  icon?: React.ReactNode
}) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'amber'
      ? 'text-amber-600 dark:text-amber-400'
      : tone === 'red'
      ? 'text-red-600 dark:text-red-400'
      : tone === 'primary'
      ? 'text-[var(--color-primary)]'
      : 'text-[var(--color-text)]'
  return (
    <div className="flex flex-col items-start">
      <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-black/40 dark:text-white/40">
        {icon}
        {label}
      </div>
      <div className={`font-[family-name:var(--font-geist-mono)] text-[24px] font-semibold leading-none tabular-nums ${toneClass} mt-0.5`}>
        {value}
      </div>
    </div>
  )
}
