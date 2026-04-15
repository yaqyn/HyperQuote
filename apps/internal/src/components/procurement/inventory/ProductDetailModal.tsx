import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  Modal,
  ModalOverlay,
  Button as AriaButton,
  Heading,
} from 'react-aria-components'
import { X, Flame, Check, Clock, Truck, Bell, Loader2, Pencil, Phone, ChevronRight } from 'lucide-react'
import {
  getInventoryProductDetail,
  updateSupplierQuote,
} from '../../../lib/server/inventory'
import type { QuoteFreshness } from '../../../lib/server/inventory'
import { SupplierProfileView } from './SupplierProfileView'

interface ProductDetailModalProps {
  slug: string | null
  onClose: () => void
}

const TIER_LABEL = {
  preferred: 'Preferred',
  approved: 'Approved',
  conditional: 'Conditional',
  new: 'New',
} as const

const TIER_TONE = {
  preferred: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20',
  approved: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] ring-[var(--color-primary)]/20',
  conditional: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-500/25',
  new: 'bg-black/[0.06] text-black/60 dark:bg-white/[0.08] dark:text-white/60 ring-black/10 dark:ring-white/10',
} as const

/** Supplier-friendly freshness pill: none of these labels imply a crisis. */
const QUOTE_LABEL: Record<QuoteFreshness, string> = {
  confirmed: 'Confirmed',
  reconfirm: 'Re-confirm',
  needs_quote: 'Needs quote',
}

const QUOTE_TONE: Record<QuoteFreshness, string> = {
  confirmed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20',
  reconfirm: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-500/25',
  needs_quote: 'bg-black/[0.06] text-black/55 dark:bg-white/[0.08] dark:text-white/55 ring-black/10 dark:ring-white/10',
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—'
  const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000
  if (hours < 1) return `${Math.round(hours * 60)}m ago`
  if (hours < 24) return `${Math.round(hours)}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function ProductDetailModal({ slug, onClose }: ProductDetailModalProps) {
  const isOpen = !!slug
  const qc = useQueryClient()

  // View mode — flip to supplier profile when a supplier row is clicked.
  const [activeSupplier, setActiveSupplier] = useState<string | null>(null)

  // Reset the supplier view whenever the product changes or modal closes.
  useEffect(() => {
    if (!slug) setActiveSupplier(null)
  }, [slug])

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-product-detail', slug],
    queryFn: () => getInventoryProductDetail({ data: { slug: slug! } }),
    enabled: isOpen,
    staleTime: 30_000,
  })

  const quoteMutation = useMutation({
    mutationFn: updateSupplierQuote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-product-detail', slug] })
      qc.invalidateQueries({ queryKey: ['inventory-overview'] })
      qc.invalidateQueries({ queryKey: ['sales-outdated-prices'] })
    },
  })

  const handleSaveQuote = (supplierId: string, rawCost: number) => {
    if (!slug) return
    quoteMutation.mutate({ data: { slug, supplierId, rawCost } })
  }

  const best = data?.suppliers
    ? [...data.suppliers].sort((a, b) => a.rawCost - b.rawCost)[0]
    : null

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <Modal className="w-full max-w-4xl mx-4">
        <Dialog
          isKeyboardDismissDisabled
          className="rounded-2xl bg-[var(--color-surface)] dark:bg-[#0A0A0A] shadow-2xl outline-none overflow-hidden border border-black/[0.08] dark:border-white/[0.08]"
        >
          {() => (
            <div className="flex flex-col max-h-[85vh]">
              {/* Close button — always visible */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute top-3 right-3 z-30 rounded-md p-1.5 bg-white dark:bg-[#161616] border border-black/10 dark:border-white/10 text-black/50 dark:text-white/50 hover:text-[var(--color-text)] transition-colors outline-none cursor-pointer"
              >
                <X size={14} strokeWidth={2} />
              </button>

              {isLoading || !data ? (
                <div className="flex items-center justify-center py-32">
                  <Loader2 size={20} strokeWidth={1.5} className="animate-spin text-[var(--color-text-subtle)]" />
                </div>
              ) : activeSupplier ? (
                <SupplierProfileView
                  name={activeSupplier}
                  onBack={() => setActiveSupplier(null)}
                />
              ) : (
                <>
                  {/* Two-column body */}
                  <div className="grid grid-cols-[1.15fr_1fr] min-h-0">
                    {/* ── LEFT: product info (reworked) ─────────── */}
                    <div className="flex flex-col min-h-0 overflow-y-auto border-e border-black/[0.06] dark:border-white/[0.06]">
                      {/* Compact hero */}
                      <div className="relative h-44 shrink-0 overflow-hidden">
                        <img
                          src={data.image}
                          alt={data.name}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                        <div className="absolute bottom-3 left-5 right-5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/80">
                              {data.broadCategory}
                            </span>
                            <span className="h-[1px] w-6 bg-white/40" />
                            <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-white/70">
                              {data.sku}
                            </span>
                          </div>
                          <Heading
                            slot="title"
                            className="text-[20px] font-semibold leading-tight text-white"
                          >
                            {data.name}
                          </Heading>
                          <p className="mt-0.5 text-[11px] text-white/60">
                            {data.name_ar}
                          </p>
                        </div>
                      </div>

                      {/* Cost band — the thing the inventory employee cares about */}
                      <div className="shrink-0 px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.06]">
                        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
                          Current supplier cost
                        </div>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="font-[family-name:var(--font-geist-mono)] text-[28px] font-semibold leading-none tabular-nums text-[var(--color-text)]">
                            {data.currentRawCost > 0
                              ? data.currentRawCost.toLocaleString('en-EG', { minimumFractionDigits: 2 })
                              : '—'}
                          </span>
                          <span className="text-[11px] text-black/40 dark:text-white/40">
                            EGP / {data.unit}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-black/45 dark:text-white/45">
                          <span>Sell-ready: {data.currentSupplierCost.toLocaleString('en-EG', { minimumFractionDigits: 2 })} EGP (incl. buffer)</span>
                          {data.lastUpdatedAt && (
                            <>
                              <span>·</span>
                              <span>updated {formatRelative(data.lastUpdatedAt)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Meta + description */}
                      <div className="flex-1 px-5 py-4 space-y-5">
                        {/* Compact meta row */}
                        <dl className="flex items-center gap-5 text-[11px] text-black/55 dark:text-white/55">
                          <div>
                            <dt className="text-[8px] uppercase tracking-[0.14em] text-black/35 dark:text-white/35">Unit</dt>
                            <dd className="mt-0.5 text-[var(--color-text)] font-medium">{data.unit}</dd>
                          </div>
                          <div className="h-8 w-px bg-black/[0.08] dark:bg-white/[0.08]" />
                          <div>
                            <dt className="text-[8px] uppercase tracking-[0.14em] text-black/35 dark:text-white/35">Weight</dt>
                            <dd className="mt-0.5 text-[var(--color-text)] font-medium font-[family-name:var(--font-geist-mono)] tabular-nums">
                              {data.weight_kg} kg
                            </dd>
                          </div>
                          <div className="h-8 w-px bg-black/[0.08] dark:bg-white/[0.08]" />
                          <div className="min-w-0">
                            <dt className="text-[8px] uppercase tracking-[0.14em] text-black/35 dark:text-white/35">Brand</dt>
                            <dd className="mt-0.5 text-[var(--color-text)] font-medium truncate">{data.brand ?? '—'}</dd>
                          </div>
                        </dl>

                        {/* Description */}
                        <p className="text-[12px] leading-relaxed text-black/65 dark:text-white/65">
                          {data.description}
                        </p>

                        {/* Specifications */}
                        <div>
                          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40 mb-2">
                            Specifications
                          </div>
                          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                            {Object.entries(data.specifications).map(([k, v]) => (
                              <div
                                key={k}
                                className="flex items-baseline justify-between gap-2 border-b border-dashed border-black/[0.05] dark:border-white/[0.05] pb-1"
                              >
                                <dt className="text-[10px] text-black/45 dark:text-white/45 capitalize">
                                  {k.replace(/_/g, ' ')}
                                </dt>
                                <dd className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text)] text-end">
                                  {String(v)}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </div>

                        {/* Tags */}
                        {data.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {data.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-full bg-black/[0.05] dark:bg-white/[0.05] px-2 py-0.5 text-[10px] text-black/55 dark:text-white/55"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── RIGHT: supplier list ─────────────────── */}
                    <div className="flex flex-col min-h-0 overflow-y-auto">
                      <div className="sticky top-0 z-10 px-5 py-4 bg-[var(--color-surface)] dark:bg-[#0A0A0A] border-b border-black/[0.05] dark:border-white/[0.05]">
                        <div className="flex items-baseline justify-between">
                          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
                            Suppliers
                          </div>
                          <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-black/35 dark:text-white/35">
                            {data.suppliers.length}
                          </span>
                        </div>
                        {data.pendingRequests.length > 0 && (
                          <div className="mt-2 flex items-center gap-1.5 rounded-md bg-red-500/[0.07] dark:bg-red-500/10 px-2.5 py-1.5">
                            <Bell size={11} strokeWidth={2.5} className="text-red-500 shrink-0" />
                            <span className="text-[10px] text-red-700 dark:text-red-300">
                              {data.pendingRequests.length} active request · {data.pendingRequests.map((r) => r.customerContext).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>

                      <ul className="flex flex-col divide-y divide-black/[0.05] dark:divide-white/[0.05] px-2 pb-4">
                        {data.suppliers.map((s) => (
                          <SupplierRow
                            key={s.id}
                            supplier={s}
                            unit={data.unit}
                            isBest={best?.id === s.id}
                            isSaving={
                              quoteMutation.isPending &&
                              quoteMutation.variables?.data.supplierId === s.id
                            }
                            onSave={(rawCost) => handleSaveQuote(s.id, rawCost)}
                            onOpenProfile={() => setActiveSupplier(s.name)}
                          />
                        ))}
                      </ul>

                      <div className="mt-auto px-5 py-3 border-t border-black/[0.06] dark:border-white/[0.06] bg-black/[0.015] dark:bg-white/[0.02]">
                        <div className="flex items-center justify-between text-[10px] text-black/50 dark:text-white/50">
                          <span className="inline-flex items-center gap-1">
                            <Check size={10} strokeWidth={2.5} className="text-emerald-500" />
                            Price last saved {formatRelative(data.lastUpdatedAt)}
                          </span>
                          <AriaButton
                            className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline outline-none cursor-pointer"
                            onPress={onClose}
                          >
                            Close
                          </AriaButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}

interface SupplierRowProps {
  supplier: {
    id: string
    name: string
    rawCost: number
    leadTimeDays: number
    minOrderQty: number
    lastQuotedAt: string
    quoteFreshness: QuoteFreshness
    tier: 'preferred' | 'approved' | 'conditional' | 'new'
    paymentTerms: string
    notes: string | null
    isPrimary: boolean
  }
  unit: string
  isBest: boolean
  isSaving: boolean
  onSave: (rawCost: number) => void
  onOpenProfile: () => void
}

function SupplierRow({ supplier, unit, isBest, isSaving, onSave, onOpenProfile }: SupplierRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const beginEdit = () => {
    setDraft(String(supplier.rawCost))
    setEditing(true)
  }
  const commit = () => {
    const v = parseFloat(draft.replace(/,/g, ''))
    if (!isNaN(v) && v >= 0 && v !== supplier.rawCost) {
      onSave(v)
    }
    setEditing(false)
  }
  const cancel = () => {
    setEditing(false)
    setDraft('')
  }

  return (
    <li
      className={`group relative rounded-xl px-3 py-3 ${
        supplier.isPrimary
          ? 'bg-[var(--color-primary)]/[0.04] ring-1 ring-[var(--color-primary)]/15'
          : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onOpenProfile}
              className="group/name inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-text)] truncate outline-none cursor-pointer hover:text-[var(--color-primary)] transition-colors"
            >
              {supplier.name}
              <ChevronRight
                size={11}
                strokeWidth={2.5}
                className="text-black/25 dark:text-white/25 opacity-0 group-hover/name:opacity-100 transition-opacity"
              />
            </button>
            {supplier.isPrimary && (
              <span className="inline-flex items-center rounded-full bg-[var(--color-primary)]/15 px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                Current
              </span>
            )}
            {isBest && !supplier.isPrimary && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                <Flame size={8} strokeWidth={3} />
                Best
              </span>
            )}
            <span
              className={`inline-flex items-center rounded-full px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider ring-1 ring-inset ${QUOTE_TONE[supplier.quoteFreshness]}`}
            >
              {QUOTE_LABEL[supplier.quoteFreshness]}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-full px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider ring-1 ring-inset ${TIER_TONE[supplier.tier]}`}
            >
              {TIER_LABEL[supplier.tier]}
            </span>
            <span className="text-[10px] text-black/40 dark:text-white/40">
              {supplier.paymentTerms}
            </span>
          </div>
        </div>

        {/* Last price — click to edit */}
        <div className="shrink-0 text-end">
          <div className="text-[8px] font-semibold uppercase tracking-[0.14em] text-black/35 dark:text-white/35 mb-0.5">
            Last price
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
              className="w-24 bg-transparent text-end font-[family-name:var(--font-geist-mono)] text-[16px] font-semibold tabular-nums text-[var(--color-text)] outline-none border-b border-[var(--color-primary)]/50 pb-0.5"
            />
          ) : (
            <button
              type="button"
              onClick={beginEdit}
              disabled={isSaving}
              className="group/price inline-flex items-baseline gap-1 outline-none cursor-pointer disabled:cursor-wait"
            >
              <span className="font-[family-name:var(--font-geist-mono)] text-[16px] font-semibold tabular-nums text-[var(--color-text)] leading-none">
                {isSaving ? (
                  <Loader2 size={14} strokeWidth={2.5} className="inline animate-spin text-[var(--color-primary)]" />
                ) : (
                  supplier.rawCost.toLocaleString('en-EG', { minimumFractionDigits: 2 })
                )}
              </span>
              <Pencil
                size={10}
                strokeWidth={2}
                className="text-black/25 dark:text-white/25 opacity-0 group-hover/price:opacity-100 transition-opacity"
              />
            </button>
          )}
          <div className="mt-0.5 text-[9px] text-black/35 dark:text-white/35">
            EGP / {unit}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 text-[10px] text-black/45 dark:text-white/45 flex-wrap">
        <span className="inline-flex items-center gap-1">
          <Truck size={10} strokeWidth={2} />
          {supplier.leadTimeDays}d lead
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock size={10} strokeWidth={2} />
          quoted {formatRelative(supplier.lastQuotedAt)}
        </span>
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
          MOQ {supplier.minOrderQty}
        </span>
        {supplier.quoteFreshness !== 'confirmed' && (
          <span className="inline-flex items-center gap-1 text-black/50 dark:text-white/50">
            <Phone size={10} strokeWidth={2} />
            call to re-confirm
          </span>
        )}
      </div>

      {supplier.notes && (
        <p className="mt-1.5 text-[10px] italic text-black/45 dark:text-white/45">
          {supplier.notes}
        </p>
      )}
    </li>
  )
}

