import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button as AriaButton } from 'react-aria-components'
import {
  ArrowLeft,
  Check,
  Loader2,
  Pencil,
  Phone,
  Plus,
  Star,
  X as XIcon,
} from 'lucide-react'
import {
  getSupplierProfile,
  updateSupplierProfile,
  updateSupplierQuoteByRow,
  type QuoteFreshness,
  type SupplierTier,
} from '../../../lib/server/inventory'

interface SupplierProfileViewProps {
  name: string
  onBack: () => void
}

const TIER_OPTIONS: { value: SupplierTier; label: string; tone: string }[] = [
  { value: 'preferred', label: 'Preferred', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/25' },
  { value: 'approved', label: 'Approved', tone: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] ring-[var(--color-primary)]/25' },
  { value: 'conditional', label: 'Conditional', tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-500/30' },
  { value: 'new', label: 'New', tone: 'bg-black/[0.06] text-black/60 dark:bg-white/[0.08] dark:text-white/60 ring-black/10 dark:ring-white/10' },
]

const QUOTE_LABEL: Record<QuoteFreshness, string> = {
  confirmed: 'Confirmed',
  reconfirm: 'Re-confirm',
  needs_quote: 'Needs quote',
}

const QUOTE_TONE: Record<QuoteFreshness, string> = {
  confirmed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  reconfirm: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  needs_quote: 'bg-black/[0.06] text-black/55 dark:bg-white/[0.08] dark:text-white/55',
}

const SUGGESTED_BADGES = [
  'fast-delivery',
  'bulk-discounts',
  'quality-certified',
  'owner-account',
  'whatsapp-contact',
  'import-agent',
]

function formatRelative(iso: string): string {
  const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${Math.round(hours)}h`
  return `${Math.floor(hours / 24)}d`
}

export function SupplierProfileView({ name, onBack }: SupplierProfileViewProps) {
  const qc = useQueryClient()
  const queryKey = ['inventory-supplier-profile', name]

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getSupplierProfile({ data: { name } }),
    staleTime: 10_000,
  })

  const profileMutation = useMutation({
    mutationFn: updateSupplierProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  })

  const priceMutation = useMutation({
    mutationFn: updateSupplierQuoteByRow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey })
      qc.invalidateQueries({ queryKey: ['inventory-overview'] })
      qc.invalidateQueries({ queryKey: ['inventory-product-detail'] })
      qc.invalidateQueries({ queryKey: ['sales-outdated-prices'] })
    },
  })

  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null)
  const [quoteDraft, setQuoteDraft] = useState('')
  const [addBadgeOpen, setAddBadgeOpen] = useState(false)

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={20} strokeWidth={1.5} className="animate-spin text-[var(--color-text-subtle)]" />
      </div>
    )
  }

  const { supplier, quotes, quoteCount, primaryForCount, confirmedCount, reconfirmCount, staleCount } = data

  const setTier = (tier: SupplierTier) => {
    profileMutation.mutate({ data: { name, tier } })
  }

  const addBadge = (badge: string) => {
    profileMutation.mutate({ data: { name, addBadge: badge } })
    setAddBadgeOpen(false)
  }

  const removeBadge = (badge: string) => {
    profileMutation.mutate({ data: { name, removeBadge: badge } })
  }

  const savePrice = (slug: string, supplierRowId: string) => {
    const v = parseFloat(quoteDraft.replace(/,/g, ''))
    if (!isNaN(v) && v >= 0) {
      priceMutation.mutate({ data: { slug, supplierRowId, rawCost: v } })
    }
    setEditingQuoteId(null)
    setQuoteDraft('')
  }

  const availableBadges = SUGGESTED_BADGES.filter((b) => !supplier.customBadges.includes(b))

  return (
    <div className="flex flex-col max-h-[85vh]">
      {/* ── Header bar ── */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[11px] text-black/55 dark:text-white/55 hover:text-[var(--color-text)] transition-colors outline-none cursor-pointer"
        >
          <ArrowLeft size={13} strokeWidth={2} />
          Back to product
        </button>
        <div className="flex-1" />
        <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-black/35 dark:text-white/35">
          Supplier profile
        </span>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Identity block */}
        <div className="px-6 pt-6 pb-5 border-b border-black/[0.05] dark:border-white/[0.05]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/40 dark:text-white/40 mb-1">
                Supplier
              </div>
              <h2 className="text-[26px] font-semibold leading-tight text-[var(--color-text)] tracking-tight">
                {supplier.name}
              </h2>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-black/55 dark:text-white/55">
                <span className="inline-flex items-center gap-1">
                  <Star size={11} strokeWidth={2} className="text-amber-500" />
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {supplier.rating.toFixed(1)}
                  </span>
                </span>
                {supplier.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone size={11} strokeWidth={2} />
                    {supplier.phone}
                  </span>
                )}
                <span>{supplier.paymentTerms}</span>
              </div>
            </div>

            {/* Big stats */}
            <div className="flex items-start gap-6 shrink-0 pt-2">
              <SupplierStat label="Quotes" value={quoteCount} />
              <SupplierStat label="Primary" value={primaryForCount} tone="primary" />
              <SupplierStat label="Confirmed" value={confirmedCount} tone="emerald" />
              <SupplierStat label="Re-confirm" value={reconfirmCount} tone="amber" />
              <SupplierStat label="Stale" value={staleCount} tone="neutral" />
            </div>
          </div>

          {/* Tier picker */}
          <div className="mt-5">
            <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40 mb-1.5">
              Tier
            </div>
            <div className="flex items-center gap-1.5">
              {TIER_OPTIONS.map((opt) => {
                const active = supplier.tier === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTier(opt.value)}
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset transition-all outline-none cursor-pointer ${
                      active
                        ? `${opt.tone} scale-100`
                        : 'bg-transparent text-black/40 dark:text-white/40 ring-black/[0.08] dark:ring-white/[0.08] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Badges */}
          <div className="mt-4">
            <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40 mb-1.5">
              Badges
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {supplier.customBadges.map((badge) => (
                <span
                  key={badge}
                  className="group inline-flex items-center gap-1 rounded-full bg-black/[0.05] dark:bg-white/[0.06] px-2.5 py-1 text-[10px] text-black/65 dark:text-white/65 ring-1 ring-inset ring-black/[0.06] dark:ring-white/[0.06]"
                >
                  {badge}
                  <button
                    type="button"
                    onClick={() => removeBadge(badge)}
                    aria-label={`Remove ${badge}`}
                    className="opacity-40 hover:opacity-100 hover:text-red-500 transition-opacity outline-none"
                  >
                    <XIcon size={10} strokeWidth={2.5} />
                  </button>
                </span>
              ))}

              {addBadgeOpen ? (
                <div className="inline-flex items-center gap-1">
                  {availableBadges.length === 0 ? (
                    <span className="text-[10px] italic text-black/35 dark:text-white/35">
                      No more suggested badges
                    </span>
                  ) : (
                    availableBadges.map((badge) => (
                      <button
                        key={badge}
                        type="button"
                        onClick={() => addBadge(badge)}
                        className="inline-flex items-center rounded-full border border-dashed border-black/20 dark:border-white/20 px-2 py-0.5 text-[10px] text-black/55 dark:text-white/55 hover:border-[var(--color-primary)]/60 hover:text-[var(--color-primary)] transition-colors outline-none cursor-pointer"
                      >
                        + {badge}
                      </button>
                    ))
                  )}
                  <button
                    type="button"
                    onClick={() => setAddBadgeOpen(false)}
                    className="inline-flex items-center rounded-full p-1 text-black/40 dark:text-white/40 hover:text-[var(--color-text)] outline-none cursor-pointer"
                    aria-label="Close badge picker"
                  >
                    <XIcon size={11} strokeWidth={2.5} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddBadgeOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-black/15 dark:border-white/15 px-2.5 py-1 text-[10px] text-black/45 dark:text-white/45 hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)] transition-colors outline-none cursor-pointer"
                >
                  <Plus size={10} strokeWidth={2.5} />
                  Add badge
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quotes table */}
        <div className="px-6 py-4">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
              All quotes · {quoteCount}
            </h3>
            <span className="text-[10px] text-black/35 dark:text-white/35">
              Click any price to update
            </span>
          </div>

          {quotes.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-[12px] text-black/40 dark:text-white/40">
                This supplier isn&rsquo;t quoting any catalog product yet.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-black/[0.04] dark:divide-white/[0.04]">
              {quotes.map((q) => {
                const isEditing = editingQuoteId === q.supplierRowId
                const isSavingThis =
                  priceMutation.isPending &&
                  priceMutation.variables?.data.supplierRowId === q.supplierRowId
                return (
                  <li
                    key={q.supplierRowId}
                    className="flex items-center gap-4 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-[var(--color-text)] truncate">
                          {q.productName}
                        </span>
                        {q.isPrimary && (
                          <span className="inline-flex items-center rounded-full bg-[var(--color-primary)]/15 px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                            Primary
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center rounded-full px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider ${QUOTE_TONE[q.quoteFreshness]}`}
                        >
                          {QUOTE_LABEL[q.quoteFreshness]}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-black/40 dark:text-white/40">
                        <span className="uppercase tracking-wider">{q.productCategory}</span>
                        <span>·</span>
                        <span>quoted {formatRelative(q.lastQuotedAt)} ago</span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="shrink-0 text-end w-32">
                      {isEditing ? (
                        <input
                          autoFocus
                          value={quoteDraft}
                          onChange={(e) => setQuoteDraft(e.target.value)}
                          onBlur={() => savePrice(q.productSlug, q.supplierRowId)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') savePrice(q.productSlug, q.supplierRowId)
                            if (e.key === 'Escape') {
                              setEditingQuoteId(null)
                              setQuoteDraft('')
                            }
                          }}
                          className="w-full bg-transparent text-end font-[family-name:var(--font-geist-mono)] text-[15px] font-semibold tabular-nums text-[var(--color-text)] outline-none border-b border-[var(--color-primary)]/50 pb-0.5"
                        />
                      ) : (
                        <button
                          type="button"
                          disabled={isSavingThis}
                          onClick={() => {
                            setEditingQuoteId(q.supplierRowId)
                            setQuoteDraft(String(q.rawCost))
                          }}
                          className="group inline-flex items-baseline gap-1 outline-none cursor-pointer disabled:cursor-wait"
                        >
                          <span className="font-[family-name:var(--font-geist-mono)] text-[15px] font-semibold tabular-nums text-[var(--color-text)] leading-none">
                            {isSavingThis ? (
                              <Loader2 size={13} strokeWidth={2.5} className="inline animate-spin text-[var(--color-primary)]" />
                            ) : (
                              q.rawCost.toLocaleString('en-EG', { minimumFractionDigits: 2 })
                            )}
                          </span>
                          <Pencil
                            size={10}
                            strokeWidth={2}
                            className="text-black/25 dark:text-white/25 opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </button>
                      )}
                      <div className="mt-0.5 text-[9px] text-black/35 dark:text-white/35">
                        EGP / {q.unit}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-black/[0.06] dark:border-white/[0.06] bg-black/[0.015] dark:bg-white/[0.02]">
        <span className="inline-flex items-center gap-1 text-[10px] text-black/50 dark:text-white/50">
          {profileMutation.isPending ? (
            <>
              <Loader2 size={10} strokeWidth={2.5} className="animate-spin" />
              Saving profile…
            </>
          ) : (
            <>
              <Check size={10} strokeWidth={2.5} className="text-emerald-500" />
              Profile up to date
            </>
          )}
        </span>
        <AriaButton
          onPress={onBack}
          className="inline-flex items-center gap-1 text-[10px] text-[var(--color-primary)] hover:underline outline-none cursor-pointer"
        >
          Back to product
        </AriaButton>
      </div>
    </div>
  )
}

function SupplierStat({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: number
  tone?: 'default' | 'primary' | 'emerald' | 'amber' | 'neutral'
}) {
  const toneClass =
    tone === 'primary'
      ? 'text-[var(--color-primary)]'
      : tone === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'amber'
      ? 'text-amber-600 dark:text-amber-400'
      : tone === 'neutral'
      ? 'text-black/55 dark:text-white/55'
      : 'text-[var(--color-text)]'
  return (
    <div className="flex flex-col items-start">
      <div className="text-[8px] font-semibold uppercase tracking-[0.15em] text-black/35 dark:text-white/35">
        {label}
      </div>
      <div className={`font-[family-name:var(--font-geist-mono)] text-[20px] font-semibold leading-none tabular-nums ${toneClass} mt-0.5`}>
        {value}
      </div>
    </div>
  )
}
