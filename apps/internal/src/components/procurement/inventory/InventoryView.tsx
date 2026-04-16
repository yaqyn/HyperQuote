import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  Bell,
  Flame,
  Check,
  Loader2,
  Pencil,
  ArrowRight,
} from 'lucide-react'
import {
  getInventoryOverview,
  getTopSuppliers,
  updateInventoryPrice,
  type InventoryProductView,
  type TopSupplier,
} from '../../../lib/server/inventory'
import type { BroadCategory } from '@hyperquote/types'
import { ProductDetailModal } from './ProductDetailModal'
import { SupplierProfileModal } from './SupplierProfileModal'
import { PriceConfirmDialog } from './PriceConfirmDialog'
import { sanitizeCost } from '../../../lib/inputs'

// ─── Palette + helpers ───────────────────────────────────

const CATEGORY_LABELS: Record<BroadCategory, string> = {
  cement: 'Cement',
  steel: 'Steel',
  aggregates: 'Aggregates',
  bricks: 'Masonry',
  timber: 'Timber',
  finishing: 'Finishing',
}

function formatHoursAgo(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${Math.round(hours)}h`
  const d = Math.floor(hours / 24)
  if (d < 30) return `${d}d`
  return `${Math.round(d / 30)}mo`
}

// Age → freshness meter fill. Fresh < 24h, aging 24-72h, stale beyond.
// The meter fills from bottom up and shifts color as it does.
function freshnessMeter(hours: number): { fillPct: number; tone: 'fresh' | 'aging' | 'stale' } {
  if (hours < 24) {
    // 0-24h: 100% → 60% fill, emerald
    const pct = Math.max(60, 100 - (hours / 24) * 40)
    return { fillPct: pct, tone: 'fresh' }
  }
  if (hours < 72) {
    // 24-72h: 60% → 30% fill, amber
    const pct = Math.max(30, 60 - ((hours - 24) / 48) * 30)
    return { fillPct: pct, tone: 'aging' }
  }
  // beyond 72h: 30% → 8% fill, stale grey
  const pct = Math.max(8, 30 - Math.min(hours - 72, 240) * 0.08)
  return { fillPct: pct, tone: 'stale' }
}

// ─── Inline stat ──────────────────────────────────────────

function InlineStat({
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
  const color = {
    neutral: 'text-[var(--color-text)]',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    amber: 'text-amber-700 dark:text-amber-400',
    red: 'text-red-700 dark:text-red-300',
    primary: 'text-[var(--color-primary)]',
  }[tone]
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`font-[family-name:var(--font-geist-mono)] text-[18px] font-semibold leading-none tabular-nums ${color}`}>
        {value}
      </span>
      <span className="inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
        {icon}
        {label}
      </span>
    </div>
  )
}

// ─── Chip (category + filter) ─────────────────────────────

function Chip({
  label,
  count,
  attention,
  active,
  onPress,
}: {
  label: string
  count: number
  attention?: number
  active: boolean
  onPress: () => void
}) {
  const hasAttention = (attention ?? 0) > 0
  return (
    <button
      type="button"
      onClick={onPress}
      className={`group relative inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-[11px] font-medium ring-1 transition-all ${
        active
          ? 'text-[var(--color-text)] ring-black/[0.07] dark:ring-white/[0.1]'
          : 'text-[var(--color-text-muted)] ring-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
      }`}
    >
      {hasAttention && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 end-0 w-[35%] rounded-e-md bg-gradient-to-l from-red-500/[0.09] via-red-500/[0.03] to-transparent"
        />
      )}
      <span className="relative">{label}</span>
      <span className="relative font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
        {count}
      </span>
      {hasAttention && (
        <span className="relative font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold tabular-nums text-red-600 dark:text-red-400">
          {attention}
        </span>
      )}
    </button>
  )
}

// ─── Call-once-fix-many strip ────────────────────────────

function CallOnceStrip({
  suppliers,
  onOpen,
}: {
  suppliers: TopSupplier[]
  onOpen: (name: string) => void
}) {
  if (suppliers.length === 0) return null
  const totalOutdated = suppliers.reduce((s, x) => s + x.outdatedQuotes, 0)
  const totalUrgent = suppliers.reduce((s, x) => s + x.urgentQuotes, 0)

  return (
    <section className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-black/[0.05] bg-black/[0.015] px-4 py-3 dark:border-white/[0.07] dark:bg-white/[0.02]">
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
          Call once · fix many
        </span>
        <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-muted)]">
          {suppliers.length} calls
        </span>
        <span className="text-[10px] text-[var(--color-text-subtle)]">→</span>
        <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-muted)]">
          {totalOutdated} prices refreshed
          {totalUrgent > 0 && (
            <span className="ms-1 text-red-600 dark:text-red-400">
              ({totalUrgent} urgent)
            </span>
          )}
        </span>
      </div>
      <div className="ms-auto flex flex-wrap items-center gap-1.5">
        {suppliers.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => onOpen(s.name)}
            className="group inline-flex items-center gap-1.5 rounded-md border border-black/[0.06] bg-[var(--color-surface)] px-2.5 py-1 text-[10.5px] font-medium text-[var(--color-text-muted)] transition-colors hover:border-black/15 hover:text-[var(--color-text)] dark:border-white/[0.08] dark:bg-[#111] dark:hover:border-white/25"
          >
            <span className="truncate max-w-[160px]">{s.name}</span>
            <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
              {s.outdatedQuotes}
            </span>
            {s.urgentQuotes > 0 && (
              <span className="font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold tabular-nums text-red-600 dark:text-red-400">
                {s.urgentQuotes}
              </span>
            )}
            <ArrowRight
              size={10}
              strokeWidth={2.5}
              className="text-[var(--color-text-subtle)] opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
            />
          </button>
        ))}
      </div>
    </section>
  )
}

// ─── Freshness meter ─────────────────────────────────────

function FreshnessMeter({ hours }: { hours: number }) {
  const { fillPct, tone } = freshnessMeter(hours)
  const fillColor = {
    fresh: 'bg-emerald-500',
    aging: 'bg-amber-500',
    stale: 'bg-[var(--color-text-subtle)]/60',
  }[tone]
  return (
    <div
      className="relative h-7 w-[6px] overflow-hidden rounded-full bg-black/[0.04] dark:bg-white/[0.06]"
      title={`Last quoted ${formatHoursAgo(hours)} ago`}
    >
      <div
        className={`absolute inset-x-0 bottom-0 rounded-full ${fillColor} transition-[height]`}
        style={{ height: `${fillPct}%` }}
      />
    </div>
  )
}

// ─── Table row ───────────────────────────────────────────

function PriceRow({
  product,
  onOpenDetail,
  onSave,
  isSaving,
  justSaved,
}: {
  product: InventoryProductView
  onOpenDetail: (slug: string) => void
  onSave: (slug: string, rawCost: number) => void
  isSaving: boolean
  justSaved: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const beginEdit = () => {
    setDraft(String(product.rawCost))
    setEditing(true)
  }
  const commit = () => {
    const v = sanitizeCost(draft)
    // Silently reject garbage (NaN, negative, overflow, same value).
    if (v !== null && v !== product.rawCost) {
      onSave(product.slug, v)
    }
    setEditing(false)
  }
  const cancel = () => {
    setEditing(false)
    setDraft('')
  }

  return (
    <div
      className={`group grid items-center gap-4 border-b border-black/[0.04] px-3 py-2.5 transition-colors dark:border-white/[0.04] ${
        product.isUrgent
          ? 'bg-red-500/[0.015] hover:bg-red-500/[0.03]'
          : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
      }`}
      style={{
        gridTemplateColumns: '10px minmax(0,2fr) minmax(130px,1fr) minmax(80px,0.5fr) minmax(0,1.2fr) minmax(100px,0.8fr) 40px',
      }}
    >
      <FreshnessMeter hours={product.hoursSinceUpdate} />

      {/* Product name + SKU */}
      <button
        type="button"
        onClick={() => onOpenDetail(product.slug)}
        className="min-w-0 text-start outline-none"
      >
        <p className="truncate text-[12.5px] font-medium text-[var(--color-text)] transition-colors group-hover:text-[var(--color-primary)]">
          {product.name}
        </p>
        <p className="truncate font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
          {product.sku} · {product.subcategory.replace(/_/g, ' ')}
        </p>
      </button>

      {/* Cost — inline-editable */}
      <div className="flex items-baseline gap-1.5">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // Prevent the same Enter from bubbling into the about-to-open
                // confirmation dialog as a confirming keystroke.
                e.preventDefault()
                e.stopPropagation()
                commit()
              }
              if (e.key === 'Escape') cancel()
            }}
            className="w-24 bg-transparent font-[family-name:var(--font-geist-mono)] text-[14px] font-semibold tabular-nums text-[var(--color-text)] outline-none border-b border-[var(--color-primary)]/50 pb-0.5"
          />
        ) : (
          <button
            type="button"
            onClick={beginEdit}
            className="group/price inline-flex items-baseline gap-1 outline-none"
          >
            <span className="font-[family-name:var(--font-geist-mono)] text-[14px] font-semibold tabular-nums text-[var(--color-text)]">
              {product.rawCost > 0
                ? product.rawCost.toLocaleString('en-EG', { minimumFractionDigits: 2 })
                : '—'}
            </span>
            <span className="text-[10px] text-[var(--color-text-subtle)]">/ {product.unit}</span>
            <Pencil
              size={9}
              strokeWidth={2}
              className="ms-0.5 text-[var(--color-text-subtle)] opacity-0 transition-opacity group-hover/price:opacity-100"
            />
          </button>
        )}
      </div>

      {/* Age + recently ordered flag */}
      <div className="flex items-center gap-1.5">
        <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-muted)]">
          {formatHoursAgo(product.hoursSinceUpdate)}
        </span>
        {product.recentlyOrdered && (
          <Flame
            size={10}
            strokeWidth={2.5}
            className={product.isUrgent ? 'text-red-500' : 'text-amber-500'}
          />
        )}
      </div>

      {/* Supplier + pending requests */}
      <div className="min-w-0">
        <p className="truncate text-[11px] text-[var(--color-text-muted)]">
          {product.supplierName}
        </p>
        {product.pendingRequestCount > 0 && (
          <p className="inline-flex items-center gap-1 text-[9.5px] text-[var(--color-primary)]">
            <Bell size={8} strokeWidth={2.5} />
            {product.pendingRequestCount} requested
          </p>
        )}
      </div>

      {/* Status micro */}
      <div className="text-[10px] font-medium">
        {isSaving ? (
          <span className="inline-flex items-center gap-1 text-[var(--color-primary)]">
            <Loader2 size={10} strokeWidth={2.5} className="animate-spin" />
            Saving
          </span>
        ) : justSaved ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <Check size={10} strokeWidth={2.5} />
            Saved
          </span>
        ) : product.isUrgent ? (
          <span className="text-red-600 dark:text-red-400">Urgent</span>
        ) : product.priceStatus === 'outdated' ? (
          <span className="text-amber-600 dark:text-amber-400">Outdated</span>
        ) : (
          <span className="text-[var(--color-text-subtle)]">Fresh</span>
        )}
      </div>

      {/* Drill-down chevron */}
      <button
        type="button"
        onClick={() => onOpenDetail(product.slug)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-subtle)] opacity-0 transition-all hover:bg-black/[0.04] hover:text-[var(--color-text)] group-hover:opacity-100 dark:hover:bg-white/[0.05]"
        aria-label="Open product detail"
      >
        <ArrowRight size={12} strokeWidth={2} />
      </button>
    </div>
  )
}

// ─── Main view ───────────────────────────────────────────

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
  const [pendingPriceEdit, setPendingPriceEdit] = useState<{
    slug: string
    productName: string
    supplierName: string
    unit: string
    oldCost: number
    newCost: number
  } | null>(null)

  // Queue the price change for confirmation instead of committing immediately.
  const handleSave = (slug: string, rawCost: number) => {
    const product = data?.products.find((p) => p.slug === slug)
    if (!product) return
    setPendingPriceEdit({
      slug,
      productName: product.name,
      supplierName: product.supplierName,
      unit: product.unit,
      oldCost: product.rawCost,
      newCost: rawCost,
    })
  }

  const commitPendingEdit = (_proof?: string) => {
    // _proof is captured here and will be piped into a dedicated
    // price_change_log accessor once the server contract lands. Mocked DB
    // has no audit trail table yet, so the justification lives only in the
    // dialog's local state for now — enough for the UX gate to stand.
    if (!pendingPriceEdit) return
    const { slug, newCost } = pendingPriceEdit
    mutation.mutate(
      { data: { slug, rawCost: newCost } },
      {
        onSuccess: () => {
          setJustSavedSlug(slug)
          setTimeout(
            () => setJustSavedSlug((prev) => (prev === slug ? null : prev)),
            1800,
          )
        },
      },
    )
    setPendingPriceEdit(null)
  }

  const filtered = useMemo(() => {
    if (!data) return []
    let list: InventoryProductView[] = data.products
    if (activeCategory !== 'all')
      list = list.filter((p) => p.broadCategory === activeCategory)
    if (onlyUrgent) list = list.filter((p) => p.isUrgent)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.supplierName.toLowerCase().includes(q) ||
          (p.allSupplierNames ?? []).some((s) => s.toLowerCase().includes(q)),
      )
    }
    // Priority ladder, top to bottom:
    //   1. Rows with a pending price request from Sales — someone is
    //      actively waiting on procurement to act, those always float up.
    //   2. Within the requested bucket, rows with the most requests first.
    //   3. Urgent (outdated + recently ordered) rows next.
    //   4. Finally, stalest price first so the oldest data gets attention.
    return [...list].sort((a, b) => {
      const aRequested = a.pendingRequestCount > 0 ? 1 : 0
      const bRequested = b.pendingRequestCount > 0 ? 1 : 0
      if (aRequested !== bRequested) return bRequested - aRequested
      if (aRequested && a.pendingRequestCount !== b.pendingRequestCount) {
        return b.pendingRequestCount - a.pendingRequestCount
      }
      if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1
      return b.hoursSinceUpdate - a.hoursSinceUpdate
    })
  }, [data, activeCategory, onlyUrgent, search])

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={18} strokeWidth={1.5} className="animate-spin text-[var(--color-text-subtle)]" />
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col bg-[var(--color-surface)] dark:bg-[#0A0A0A]">
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5" data-module-content>
        <div className="mx-auto flex max-w-[1280px] flex-col gap-5">
          {/* Header — thin row, eyebrow left, inline stats right */}
          <header className="flex items-center justify-between gap-6 border-b border-black/[0.04] pb-4 dark:border-white/[0.04]">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
                Procurement · Price desk
              </span>
            </div>
            <div className="flex items-baseline gap-5">
              <InlineStat label="total" value={data.totals.total} />
              <InlineStat label="fresh" value={data.totals.fresh} tone="emerald" />
              <InlineStat label="outdated" value={data.totals.outdated} tone="amber" />
              <InlineStat label="urgent" value={data.totals.urgent} tone="red" />
              <InlineStat
                label="requests"
                value={data.totals.pendingRequests}
                tone="primary"
                icon={<Bell size={9} strokeWidth={2.5} />}
              />
            </div>
          </header>

          {/* Call-once strip */}
          <CallOnceStrip
            suppliers={topSuppliersData?.suppliers ?? []}
            onOpen={setSupplierProfileName}
          />

          {/* Category chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto p-1">
            <Chip
              label="All"
              count={data.totals.total}
              attention={data.totals.urgent}
              active={activeCategory === 'all'}
              onPress={() => setActiveCategory('all')}
            />
            {data.categories.map((cat) => (
              <Chip
                key={cat.id}
                label={CATEGORY_LABELS[cat.id]}
                count={cat.totalCount}
                attention={cat.urgentCount}
                active={activeCategory === cat.id}
                onPress={() => setActiveCategory(cat.id)}
              />
            ))}
          </div>

          {/* Search + filter */}
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-md border border-black/[0.08] px-3 py-1.5 dark:border-white/[0.08]">
              <Search size={12} strokeWidth={2} className="text-[var(--color-text-subtle)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product, SKU, or supplier"
                className="flex-1 bg-transparent text-[12px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-[10px] text-[var(--color-text-subtle)] hover:text-[var(--color-text)]"
                >
                  clear
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOnlyUrgent((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium ring-1 transition-all ${
                onlyUrgent
                  ? 'text-red-700 ring-red-500/30 dark:text-red-300'
                  : 'text-[var(--color-text-muted)] ring-black/[0.08] hover:bg-black/[0.03] dark:ring-white/[0.1] dark:hover:bg-white/[0.04]'
              }`}
            >
              <Flame size={11} strokeWidth={2.5} />
              Only urgent
            </button>
          </div>

          {/* Table header */}
          {filtered.length > 0 && (
            <div
              className="grid items-center gap-4 border-b border-black/[0.06] px-3 pb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-subtle)] dark:border-white/[0.06]"
              style={{
                gridTemplateColumns: '10px minmax(0,2fr) minmax(130px,1fr) minmax(80px,0.5fr) minmax(0,1.2fr) minmax(100px,0.8fr) 40px',
              }}
            >
              <div />
              <div>Product</div>
              <div>Cost</div>
              <div>Age</div>
              <div>Primary supplier</div>
              <div>State</div>
              <div />
            </div>
          )}

          {/* Rows */}
          {filtered.length > 0 ? (
            <div className="flex flex-col">
              {filtered.map((p) => (
                <PriceRow
                  key={p.slug}
                  product={p}
                  onOpenDetail={setDetailSlug}
                  onSave={handleSave}
                  isSaving={mutation.isPending && mutation.variables?.data.slug === p.slug}
                  justSaved={justSavedSlug === p.slug}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-black/[0.1] py-16 text-center dark:border-white/[0.1]">
              <Check size={24} strokeWidth={1.5} className="text-emerald-500/70" />
              <p className="mt-2 text-[12px] font-medium text-[var(--color-text)]">
                Nothing to refresh
              </p>
              <p className="mt-0.5 text-[10px] text-[var(--color-text-subtle)]">
                {onlyUrgent
                  ? 'No urgent items — you can breathe.'
                  : 'No products match your filters.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <ProductDetailModal slug={detailSlug} onClose={() => setDetailSlug(null)} />
      <SupplierProfileModal
        name={supplierProfileName}
        onClose={() => setSupplierProfileName(null)}
      />
      <PriceConfirmDialog
        isOpen={pendingPriceEdit !== null}
        productName={pendingPriceEdit?.productName ?? ''}
        supplierName={pendingPriceEdit?.supplierName}
        unit={pendingPriceEdit?.unit ?? ''}
        oldCost={pendingPriceEdit?.oldCost ?? 0}
        newCost={pendingPriceEdit?.newCost ?? 0}
        onConfirm={commitPendingEdit}
        onCancel={() => setPendingPriceEdit(null)}
      />
    </div>
  )
}
