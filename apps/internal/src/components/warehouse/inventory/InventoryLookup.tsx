import { useState, useCallback } from 'react'
import { Button } from 'react-aria-components'
import { useQuery } from '@tanstack/react-query'
import { getInventoryLevels } from '../../../lib/server/warehouse-inventory'
import { ScanInput } from '../shared/ScanInput'
import type { InventoryItem } from '../../../types/warehouse'

interface InventoryLookupProps {
  onSelectItem: (item: InventoryItem) => void
  onStartCount?: (itemId: string) => void
}

/**
 * "The Stock" — Search-first inventory lookup.
 * Big search bar at top (full width). Results as compact rows:
 * SKU (mono) + product name + location + quantity (large mono) + status dot.
 * Glanceable, high-contrast. Data IS the design.
 */
export function InventoryLookup({ onSelectItem, onStartCount }: InventoryLookupProps) {
  const [search, setSearch] = useState('')
  const [belowReorder, setBelowReorder] = useState(false)
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', 'levels', { search, belowReorder, page }],
    queryFn: () => getInventoryLevels({ data: { search, belowReorder, page, limit } }),
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / limit)

  const handleScan = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(1)
  }, [])

  // Multi-base summary
  const totalOnHand = items.reduce((sum, i) => sum + i.quantityOnHand, 0)
  const totalReserved = items.reduce((sum, i) => sum + i.quantityReserved, 0)
  const totalAvailable = items.reduce((sum, i) => sum + i.quantityAvailable, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Header ──────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Inventory</h2>
        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Cross-location stock lookup</p>
      </div>

      {/* ─── Search (full width, prominent) ──────────────── */}
      <div className="flex flex-col gap-3">
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          className="h-14 w-full rounded-xl border-2 border-[var(--color-border)] px-4 text-base font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[#2563EB] focus:outline-none transition-colors"
          placeholder="Search SKU, product, or lot..."
        />
        <div className="flex items-center gap-3">
          <ScanInput label="Scan barcode" onScan={handleScan} />
          <label className="flex items-center gap-2 min-h-[48px] cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={belowReorder}
              onChange={(e) => { setBelowReorder(e.target.checked); setPage(1) }}
              className="w-5 h-5 rounded border-[var(--color-border)] accent-[#2563EB]"
            />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              Below reorder
            </span>
          </label>
        </div>
      </div>

      {/* ─── Results ─────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[#2563EB]" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-[var(--color-text-secondary)]">No inventory found</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectItem(item)}
              className="group flex items-center gap-4 border-b border-[var(--color-border)] px-2 py-3 text-start transition-colors hover:bg-black/[0.02] active:bg-black/[0.04] min-h-[64px]"
            >
              {/* Status dot */}
              <ConditionDot condition={item.condition} />

              {/* SKU */}
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-secondary)] w-24 shrink-0 truncate">
                {item.sku}
              </span>

              {/* Product name */}
              <span className="flex-1 text-sm font-semibold text-[var(--color-text-primary)] truncate min-w-0">
                {item.productName}
              </span>

              {/* Location */}
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-secondary)] shrink-0">
                {item.locationCode}
              </span>

              {/* Quantity — large mono */}
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-lg font-bold text-[var(--color-text-primary)] shrink-0 w-16 text-end">
                {item.quantityAvailable}
              </span>

              {/* Days remaining badge */}
              <DaysRemainingBadge days={item.daysRemaining} />

              {/* Start Count action */}
              {onStartCount && (
                <Button
                  onPress={(e) => {
                    e.continuePropagation?.()
                    onStartCount(item.id)
                  }}
                  className="shrink-0 rounded-lg border border-black/8 dark:border-white/8 px-2.5 py-1 text-[11px] font-medium text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80 hover:border-black/15 dark:hover:border-white/15 cursor-pointer outline-none opacity-0 group-hover:opacity-100 transition-all"
                >
                  Count
                </Button>
              )}

              {/* Arrow */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
                <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* ─── Summary strip ───────────────────────────────── */}
      {items.length > 0 && (
        <div className="flex items-center gap-8 border-t border-[var(--color-border)] pt-4">
          <SummaryStat label="On-Hand" value={totalOnHand} />
          <SummaryStat label="Reserved" value={totalReserved} muted />
          <SummaryStat label="Available" value={totalAvailable} bold />
        </div>
      )}

      {/* ─── Pagination ──────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="min-h-[48px] px-5 rounded-xl border border-[var(--color-border)] text-sm font-semibold disabled:opacity-40 transition-colors hover:bg-black/[0.02]"
          >
            Previous
          </button>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm text-[var(--color-text-secondary)]">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="min-h-[48px] px-5 rounded-xl border border-[var(--color-border)] text-sm font-semibold disabled:opacity-40 transition-colors hover:bg-black/[0.02]"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────

function SummaryStat({ label, value, muted, bold }: { label: string; value: number; muted?: boolean; bold?: boolean }) {
  return (
    <div>
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">{label}</span>
      <p className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-base ${bold ? 'font-bold text-[var(--color-text-primary)]' : muted ? 'font-medium text-[var(--color-text-secondary)]' : 'font-medium text-[var(--color-text-primary)]'}`}>
        {value}
      </p>
    </div>
  )
}

function DaysRemainingBadge({ days }: { days: number }) {
  if (days < 0) return <span className="w-12" />

  const style =
    days < 30
      ? { color: '#b91c1c', background: 'rgba(239, 68, 68, 0.06)' }
      : days < 60
        ? { color: '#a16207', background: 'rgba(234, 179, 8, 0.06)' }
        : { color: '#15803d', background: 'rgba(22, 163, 74, 0.06)' }

  return (
    <span
      className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0"
      style={style}
    >
      {days}d
    </span>
  )
}

function ConditionDot({ condition }: { condition: string }) {
  const color =
    condition === 'good'
      ? '#22c55e'
      : condition === 'minor_damage'
        ? '#eab308'
        : '#ef4444'

  return (
    <div className="shrink-0" title={condition.replace('_', ' ')}>
      <div className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
    </div>
  )
}
