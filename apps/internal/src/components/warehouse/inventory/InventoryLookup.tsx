import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getInventoryLevels } from '../../../lib/server/warehouse-inventory'
import { ScanInput } from '../shared/ScanInput'
import type { InventoryItem } from '../../../types/warehouse'

interface InventoryLookupProps {
  onSelectItem: (item: InventoryItem) => void
}

/**
 * Cross-location inventory search with scan or text input.
 * Results show lot/expiry tracking with days remaining color coding.
 * Filter: belowReorder checkbox to show only items below reorder point.
 * Multi-base summary at bottom: total on-hand, total reserved, total available.
 */
export function InventoryLookup({ onSelectItem }: InventoryLookupProps) {
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
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Inventory Lookup</h2>

      {/* Search */}
      <div className="flex flex-col gap-3">
        <ScanInput
          label="Scan barcode (product, lot, location) or search"
          onScan={handleScan}
        />
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          className="h-12 rounded-lg border border-[var(--color-border)] px-3 text-base"
          placeholder="Search by SKU, name, or lot number..."
        />
      </div>

      {/* belowReorder filter */}
      <label className="flex items-center gap-2 min-h-[48px] cursor-pointer">
        <input
          type="checkbox"
          checked={belowReorder}
          onChange={(e) => {
            setBelowReorder(e.target.checked)
            setPage(1)
          }}
          className="w-5 h-5 rounded border-[var(--color-border)]"
        />
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          Show only items below reorder point
        </span>
      </label>

      {/* Results table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-sm text-[var(--color-text-secondary)]">Loading inventory...</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] overflow-x-auto">
          <table className="w-full text-sm" role="grid">
            <thead>
              <tr className="bg-[var(--color-surface)]">
                <th className="text-start px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)]">Product</th>
                <th className="text-start px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)]">SKU</th>
                <th className="text-start px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)]">Location</th>
                <th className="text-start px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)]">Lot#</th>
                <th className="text-end px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)]">Expiry</th>
                <th className="text-end px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)]">Days Left</th>
                <th className="text-end px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)]">On-Hand</th>
                <th className="text-end px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)]">Reserved</th>
                <th className="text-end px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)]">Available</th>
                <th className="text-start px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)]">Condition</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className="border-t border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <td className="px-3 py-2 text-[var(--color-text-primary)] font-medium">
                    {item.productName}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums text-[var(--color-text-secondary)]">
                    {item.sku}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)] text-xs">
                    {item.locationCode}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums text-[var(--color-text-secondary)]">
                    {item.lotNumber}
                  </td>
                  <td className="px-3 py-2 text-end font-mono tabular-nums text-[var(--color-text-secondary)]">
                    {item.expiryDate
                      ? new Date(item.expiryDate).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-end">
                    <DaysRemainingBadge days={item.daysRemaining} />
                  </td>
                  <td className="px-3 py-2 text-end font-mono tabular-nums text-[var(--color-text-primary)]">
                    {item.quantityOnHand}
                  </td>
                  <td className="px-3 py-2 text-end font-mono tabular-nums text-[var(--color-text-secondary)]">
                    {item.quantityReserved}
                  </td>
                  <td className="px-3 py-2 text-end font-mono tabular-nums font-medium text-[var(--color-text-primary)]">
                    {item.quantityAvailable}
                  </td>
                  <td className="px-3 py-2">
                    <ConditionBadge condition={item.condition} />
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-sm text-[var(--color-text-secondary)]">
                    No inventory found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Multi-base summary */}
      {items.length > 0 && (
        <div className="flex gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex flex-col">
            <span className="text-xs text-[var(--color-text-secondary)]">Total On-Hand</span>
            <span className="font-mono tabular-nums text-base font-medium text-[var(--color-text-primary)]">
              {totalOnHand}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-[var(--color-text-secondary)]">Total Reserved</span>
            <span className="font-mono tabular-nums text-base font-medium text-[var(--color-text-secondary)]">
              {totalReserved}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-[var(--color-text-secondary)]">Total Available</span>
            <span className="font-mono tabular-nums text-base font-semibold text-[var(--color-text-primary)]">
              {totalAvailable}
            </span>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="min-h-[48px] px-4 rounded-lg border border-[var(--color-border)] text-sm font-medium disabled:opacity-50"
          >
            Previous
          </button>
          <span className="font-mono tabular-nums text-sm text-[var(--color-text-secondary)]">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="min-h-[48px] px-4 rounded-lg border border-[var(--color-border)] text-sm font-medium disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────

function DaysRemainingBadge({ days }: { days: number }) {
  if (days < 0) {
    return <span className="font-mono tabular-nums text-xs text-[var(--color-text-secondary)]">N/A</span>
  }

  const color =
    days < 30
      ? 'text-red-700 bg-red-50'
      : days < 60
        ? 'text-yellow-700 bg-yellow-50'
        : 'text-green-700 bg-green-50'

  return (
    <span className={`font-mono tabular-nums text-xs font-medium px-2 py-0.5 rounded ${color}`}>
      {days}d
    </span>
  )
}

function ConditionBadge({ condition }: { condition: string }) {
  const styles: Record<string, string> = {
    good: 'bg-green-100 text-green-800',
    minor_damage: 'bg-yellow-100 text-yellow-800',
    major_damage: 'bg-red-100 text-red-800',
    rejected: 'bg-red-200 text-red-900',
  }

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${styles[condition] ?? 'bg-gray-100 text-gray-700'}`}>
      {condition.replace('_', ' ')}
    </span>
  )
}
