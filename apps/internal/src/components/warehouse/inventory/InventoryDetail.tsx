import { useState } from 'react'
import type { InventoryItem } from '../../../types/warehouse'
import { MovementHistory } from './MovementHistory'

interface InventoryDetailProps {
  item: InventoryItem
  onBack: () => void
}

const CAIRO_SKYLINE_PLACEHOLDER = 'https://cdn.hyperquote.io/placeholders/cairo-skyline.jpg'

/**
 * "The Stock" — Product profile.
 * SKU + name + category. Stock by location as clean list.
 * Reorder point indicator as thin bar. Batch/lot tracking.
 */
export function InventoryDetail({ item, onBack }: InventoryDetailProps) {
  const [showHistory, setShowHistory] = useState(false)

  const reorderStatus = getReorderStatus(item.quantityAvailable, item.reorderPoint)
  const reorderPercent = item.reorderPoint > 0
    ? Math.min((item.quantityAvailable / item.reorderPoint) * 100, 200)
    : 100

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Header ──────────────────────────────────────── */}
      <div className="flex items-center gap-4 border-b border-[var(--color-border)] pb-4">
        <button
          type="button"
          onClick={onBack}
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-black/[0.02] active:scale-95 transition-all"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] truncate">
            {item.productName}
          </h2>
          <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm text-[var(--color-text-secondary)]">
            {item.sku}
          </p>
        </div>
        <img
          src={item.photoUrl || CAIRO_SKYLINE_PLACEHOLDER}
          alt={item.productName}
          className="w-14 h-14 rounded-lg object-cover border border-[var(--color-border)] shrink-0"
        />
      </div>

      {/* ─── Stock Numbers (hero) ────────────────────────── */}
      <div className="grid grid-cols-3 gap-6">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">On-Hand</span>
          <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-bold text-[var(--color-text-primary)] mt-0.5">
            {item.quantityOnHand}
          </p>
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Reserved</span>
          <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-bold text-[var(--color-text-secondary)] mt-0.5">
            {item.quantityReserved}
          </p>
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Available</span>
          <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-bold text-[#2563EB] mt-0.5">
            {item.quantityAvailable}
          </p>
        </div>
      </div>

      {/* ─── Location + Lot Details ──────────────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] p-4">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Location</span>
            <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-base font-bold text-[var(--color-text-primary)] mt-0.5">
              {item.locationCode}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Lot</span>
            <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-base font-semibold text-[var(--color-text-primary)] mt-0.5">
              {item.lotNumber}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Expiry</span>
            <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm text-[var(--color-text-secondary)] mt-0.5">
              {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '--'}
            </p>
          </div>
          {item.daysRemaining >= 0 && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Days Left</span>
              <p className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-bold mt-0.5 ${
                item.daysRemaining < 30 ? 'text-red-600' : item.daysRemaining < 60 ? 'text-amber-600' : 'text-green-600'
              }`}>
                {item.daysRemaining}
              </p>
            </div>
          )}
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Condition</span>
            <p className={`text-sm font-semibold mt-0.5 ${
              item.condition === 'good' ? 'text-green-600' : item.condition === 'minor_damage' ? 'text-amber-600' : 'text-red-600'
            }`}>
              {item.condition.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Reorder Point — thin bar indicator ──────────── */}
      <div className="rounded-xl border border-[var(--color-border)] p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Reorder Status</span>
          <ReorderBadge status={reorderStatus} />
        </div>

        {/* Thin bar */}
        <div className="relative h-2 w-full rounded-full bg-[var(--color-border)]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              reorderStatus === 'below' ? 'bg-red-500' : reorderStatus === 'approaching' ? 'bg-amber-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(reorderPercent, 100)}%` }}
          />
          {/* Reorder point marker */}
          <div
            className="absolute top-[-3px] h-[14px] w-0.5 bg-[var(--color-text-primary)]"
            style={{ left: `${Math.min((100 / (reorderPercent > 100 ? reorderPercent : 100)) * 100, 100)}%` }}
            title="Reorder point"
          />
        </div>

        <div className="flex items-baseline gap-6 mt-3">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Available</span>
            <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-lg font-bold text-[var(--color-text-primary)]">
              {item.quantityAvailable}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Reorder At</span>
            <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-lg font-bold text-[var(--color-text-primary)]">
              {item.reorderPoint}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Days of Supply</span>
            <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-lg font-bold text-[var(--color-text-primary)]">
              {item.daysOfSupply}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Movement History toggle ─────────────────────── */}
      {!showHistory ? (
        <button
          type="button"
          onClick={() => setShowHistory(true)}
          className="min-h-[48px] rounded-xl border border-[var(--color-border)] text-sm font-bold text-[#2563EB] hover:bg-black/[0.02] transition-colors"
        >
          View Movement History
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Movement History</span>
            <button
              type="button"
              onClick={() => setShowHistory(false)}
              className="text-xs font-bold text-[#2563EB] min-h-[48px] flex items-center"
            >
              Hide
            </button>
          </div>
          <MovementHistory inventoryId={item.id} />
        </div>
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────

type ReorderStatus = 'adequate' | 'approaching' | 'below'

function getReorderStatus(available: number, reorderPoint: number): ReorderStatus {
  if (available <= reorderPoint) return 'below'
  if (available <= reorderPoint * 1.5) return 'approaching'
  return 'adequate'
}

function ReorderBadge({ status }: { status: ReorderStatus }) {
  const config: Record<ReorderStatus, { label: string; color: string; bg: string }> = {
    adequate: { label: 'Adequate', color: '#15803d', bg: 'rgba(22, 163, 74, 0.06)' },
    approaching: { label: 'Approaching', color: '#a16207', bg: 'rgba(234, 179, 8, 0.06)' },
    below: { label: 'Below Reorder', color: '#b91c1c', bg: 'rgba(239, 68, 68, 0.06)' },
  }

  const { label, color, bg } = config[status]

  return (
    <span className="text-[10px] font-bold px-2.5 py-1 rounded-md" style={{ color, background: bg }}>
      {label}
    </span>
  )
}
