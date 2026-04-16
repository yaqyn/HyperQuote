import { useEffect, useState } from 'react'
import { getMarginLevel, type MarginThresholds } from '../../../types/sales'
import { clampMargin, MAX_MARGIN_PCT } from '../../../lib/inputs'

interface LineMarginItem {
  productName: string
  supplierCost: number
  quantity: number
  marginPercent: number
}

interface LineMarginPanelProps {
  items: LineMarginItem[]
  currentIndex: number
  onSelectIndex: (index: number) => void
  marginFloor: number
  thresholds: MarginThresholds | null
  onChange: (index: number, margin: number) => void
  onApplyToAll: (margin: number) => void
  onClose: () => void
}

const DEFAULT_THRESHOLDS: MarginThresholds = {
  productCategory: 'default',
  target: 18,
  floor: 12,
  absoluteMin: 8,
}

function computeSellPrice(cost: number, margin: number): number {
  if (cost <= 0 || margin >= 100) return 0
  return Math.round((cost / (1 - margin / 100)) * 100) / 100
}

export function LineMarginPanel({
  items,
  currentIndex,
  onSelectIndex,
  marginFloor,
  thresholds,
  onChange,
  onApplyToAll,
  onClose,
}: LineMarginPanelProps) {
  const t = thresholds ?? DEFAULT_THRESHOLDS
  const current = items[currentIndex]
  const supplierCost = current?.supplierCost ?? 0
  const quantity = current?.quantity ?? 0
  const productName = current?.productName ?? ''
  const marginPercent = current?.marginPercent ?? 0
  const [draft, setDraft] = useState(marginPercent)

  // Re-sync draft whenever the active item or its persisted margin changes.
  useEffect(() => {
    setDraft(marginPercent)
  }, [currentIndex, marginPercent])

  const clamp = (m: number) => clampMargin(m, marginFloor)
  const commit = (m: number) => {
    const clamped = clamp(m)
    setDraft(clamped)
    onChange(currentIndex, clamped)
  }

  const level = getMarginLevel(draft, t)
  const sellPrice = computeSellPrice(supplierCost, draft)
  const lineTotal = Math.round(sellPrice * quantity * 100) / 100
  const lineCost = Math.round(supplierCost * quantity * 100) / 100
  const lineProfit = lineTotal - lineCost

  const heroTone = {
    green: 'text-green-600 dark:text-green-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    red: 'text-red-600 dark:text-red-400',
    blocked: 'text-red-600 dark:text-red-400',
  }[level]

  const levelLabel = {
    green: 'On target',
    yellow: 'Below target',
    red: 'Below floor',
    blocked: 'Below minimum',
  }[level]

  const barMax = Math.max(t.target + 12, draft + 5, 30)
  const pos = (v: number) => `${Math.min(Math.max((v / barMax) * 100, 0), 100)}%`

  const presets = [
    { label: 'Min', value: t.absoluteMin },
    { label: 'Floor', value: t.floor },
    { label: 'Target', value: t.target },
  ]

  const impactSteps = [-1, -0.5, 0.5, 1] as const

  return (
    <div className="flex h-full flex-col">
      {/* Eyebrow */}
      <div className="px-6 pt-5 pb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
          Line margin
        </p>
        <p className="mt-1 truncate text-[15px] font-semibold text-[var(--color-text)]">
          {productName}
        </p>
      </div>

      {/* Hero margin + sell price */}
      <div className="flex items-end justify-between px-6 pb-4">
        <div>
          <p className={`font-[family-name:var(--font-geist-mono)] text-[52px] leading-none font-semibold tabular-nums ${heroTone}`}>
            {draft}%
          </p>
          <p className="mt-1.5 text-[11px] uppercase tracking-wider text-[var(--color-text-subtle)]">
            {levelLabel}
          </p>
        </div>
        <div className="text-end">
          <p className="font-[family-name:var(--font-geist-mono)] text-[22px] font-semibold tabular-nums text-[var(--color-text)]">
            {sellPrice.toLocaleString('en-EG')}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)]">
            EGP per unit
          </p>
        </div>
      </div>

      {/* Threshold bar */}
      <div className="px-6 pb-6">
        <div className="relative h-1.5 w-full rounded-full bg-black/[0.05] dark:bg-white/[0.08]">
          <div className="absolute top-0 h-full w-px bg-red-500/70" style={{ left: pos(t.absoluteMin) }} />
          <div className="absolute top-0 h-full w-px bg-yellow-500/70" style={{ left: pos(t.floor) }} />
          <div className="absolute top-0 h-full w-px bg-green-500/80" style={{ left: pos(t.target) }} />
          <div
            className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow dark:border-black ${
              level === 'green' ? 'bg-green-500' : level === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ left: pos(draft) }}
          />
        </div>
        <div className="relative mt-2 h-3">
          <span className="absolute text-[9px] font-medium tabular-nums text-red-600/80 dark:text-red-400/80" style={{ left: pos(t.absoluteMin), transform: 'translateX(-50%)' }}>
            {t.absoluteMin}
          </span>
          <span className="absolute text-[9px] font-medium tabular-nums text-yellow-600/80 dark:text-yellow-400/80" style={{ left: pos(t.floor), transform: 'translateX(-50%)' }}>
            {t.floor}
          </span>
          <span className="absolute text-[9px] font-medium tabular-nums text-green-600/80 dark:text-green-400/80" style={{ left: pos(t.target), transform: 'translateX(-50%)' }}>
            {t.target}
          </span>
        </div>
      </div>

      {/* Slider */}
      <div className="px-6 pb-5">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={marginFloor}
            max={MAX_MARGIN_PCT}
            step={0.5}
            value={draft}
            onChange={(e) => commit(Number(e.target.value))}
            className="flex-1 accent-[var(--color-primary)]"
            aria-label="Margin percentage"
          />
          <div className="flex items-center rounded-lg border border-black/[0.08] px-2 py-1 dark:border-white/[0.1]">
            <input
              type="number"
              value={draft}
              step={0.5}
              onChange={(e) => commit(Number(e.target.value) || 0)}
              className="w-12 bg-transparent text-end font-[family-name:var(--font-geist-mono)] text-[13px] font-medium tabular-nums outline-none"
            />
            <span className="ms-0.5 text-[11px] text-[var(--color-text-subtle)]">%</span>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div className="px-6 pb-5">
        <p className="mb-2 text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)]">Presets</p>
        <div className="flex gap-1.5">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => commit(p.value)}
              className={`flex-1 rounded-full border py-2 font-[family-name:var(--font-geist-mono)] text-[11px] font-medium tabular-nums transition-colors ${
                Math.abs(draft - p.value) < 0.01
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/[0.08] text-[var(--color-primary)]'
                  : 'border-black/[0.08] text-[var(--color-text-muted)] hover:bg-black/[0.04] dark:border-white/[0.1] dark:hover:bg-white/[0.06]'
              }`}
            >
              {p.label} · {p.value}%
            </button>
          ))}
        </div>
      </div>

      {/* Nudge steppers */}
      <div className="px-6 pb-5">
        <p className="mb-2 text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)]">Nudge</p>
        <div className="grid grid-cols-4 gap-1.5">
          {impactSteps.map((step) => {
            const next = clamp(draft + step)
            const nextTotal = Math.round(computeSellPrice(supplierCost, next) * quantity * 100) / 100
            const diff = Math.round((nextTotal - lineTotal) * 100) / 100
            const disabled = next === draft
            return (
              <button
                key={step}
                type="button"
                disabled={disabled}
                onClick={() => commit(next)}
                className="flex flex-col items-center gap-0.5 rounded-lg border border-black/[0.06] bg-black/[0.02] py-2.5 text-[10px] transition-colors hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary)]/[0.04] disabled:opacity-30 disabled:cursor-not-allowed dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:bg-[var(--color-primary)]/[0.08]"
              >
                <span className="font-[family-name:var(--font-geist-mono)] text-[12px] font-semibold tabular-nums text-[var(--color-text)]">
                  {step > 0 ? '+' : ''}{step}%
                </span>
                <span className={`font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums ${
                  diff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {diff >= 0 ? '+' : ''}{diff.toLocaleString('en-EG')}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Breakdown */}
      <div className="mx-6 rounded-xl bg-black/[0.025] dark:bg-white/[0.035] px-4 py-3 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--color-text-subtle)]">Cost ({quantity} ×)</span>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text-muted)]">
            {lineCost.toLocaleString('en-EG')}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--color-text-subtle)]">Profit</span>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-green-700 dark:text-green-400">
            +{lineProfit.toLocaleString('en-EG')}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-black/[0.06] pt-1.5 dark:border-white/[0.06] text-[12px]">
          <span className="font-medium text-[var(--color-text)]">Line total</span>
          <span className="font-[family-name:var(--font-geist-mono)] font-semibold tabular-nums text-[var(--color-text)]">
            {lineTotal.toLocaleString('en-EG')} EGP
          </span>
        </div>
      </div>

      {/* Item toggle — switch between line items without closing.
          Lives at the bottom of the panel, above the actions. Wraps to
          multiple rows with vertical scroll. */}
      {items.length > 1 && (
        <div className="mx-6 mt-5 rounded-xl border border-black/[0.06] bg-black/[0.015] px-3 py-3 dark:border-white/[0.06] dark:bg-white/[0.02]">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
            Other items
          </p>
          <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto pe-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-black/20 dark:[&::-webkit-scrollbar-thumb]:bg-white/20">
            {items.map((it, i) => {
              const itLevel = getMarginLevel(it.marginPercent, t)
              const dot = {
                green: 'bg-green-500',
                yellow: 'bg-yellow-500',
                red: 'bg-red-500',
                blocked: 'bg-red-600',
              }[itLevel]
              const isActive = i === currentIndex
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelectIndex(i)}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                    isActive
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/[0.08] text-[var(--color-primary)]'
                      : 'border-black/[0.08] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-black/[0.04] dark:border-white/[0.1] dark:hover:bg-white/[0.06]'
                  }`}
                  title={it.productName}
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                  <span className="flex-1 truncate text-start">{it.productName}</span>
                  <span className="shrink-0 font-[family-name:var(--font-geist-mono)] tabular-nums opacity-60">
                    {it.marginPercent}%
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Actions — pinned bottom */}
      <div className="mt-auto flex items-center gap-2 border-t border-black/[0.05] bg-black/[0.01] px-6 py-4 dark:border-white/[0.05] dark:bg-white/[0.02]">
        <button
          type="button"
          onClick={() => {
            onApplyToAll(draft)
            onClose()
          }}
          className="flex-1 rounded-lg border border-black/[0.08] bg-white py-2.5 text-[11px] font-medium text-[var(--color-text-muted)] transition-colors hover:bg-black/[0.03] dark:border-white/[0.1] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
        >
          Apply to all items
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-lg bg-[var(--color-primary)] py-2.5 text-[11px] font-medium text-white transition-colors hover:bg-[var(--color-primary)]/90"
        >
          Done
        </button>
      </div>
    </div>
  )
}
