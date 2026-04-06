import { useState } from 'react'
import type { InventoryItem } from '../../../types/warehouse'
import { MovementHistory } from './MovementHistory'

interface InventoryDetailProps {
  item: InventoryItem
  onBack: () => void
}

const CAIRO_SKYLINE_PLACEHOLDER = 'https://cdn.hyperquote.io/placeholders/cairo-skyline.jpg'

/**
 * Drill-down for a single product/location.
 * Shows per-location breakdown, reorder point status with days-of-supply calculation,
 * and toggle to view movement history.
 *
 * Reorder point formula: (Avg daily demand x Lead time days) x 1.5 reliability factor
 * per Egyptian market rules.
 */
export function InventoryDetail({ item, onBack }: InventoryDetailProps) {
  const [showHistory, setShowHistory] = useState(false)

  // Reorder point status
  const reorderStatus = getReorderStatus(item.quantityAvailable, item.reorderPoint)
  const daysRemaining = item.daysRemaining
  const daysOfSupply = item.daysOfSupply

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-[#2563EB] font-medium min-h-[48px] min-w-[48px] flex items-center"
        >
          Back
        </button>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Inventory Detail
        </h2>
        <div className="w-12" />
      </div>

      {/* Product header */}
      <div className="flex gap-4 items-start">
        <img
          src={item.photoUrl || CAIRO_SKYLINE_PLACEHOLDER}
          alt={item.productName}
          className="w-20 h-20 rounded-lg object-cover border border-[var(--color-border)]"
        />
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
            {item.productName}
          </h3>
          <p className="font-mono tabular-nums text-sm text-[var(--color-text-secondary)]">
            SKU: {item.sku}
          </p>
        </div>
      </div>

      {/* Per-location breakdown */}
      <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-surface)]">
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
            <tr className="border-t border-[var(--color-border)]">
              <td className="px-3 py-2 text-xs text-[var(--color-text-primary)]">
                {item.locationCode}
              </td>
              <td className="px-3 py-2 font-mono tabular-nums text-[var(--color-text-secondary)]">
                {item.lotNumber}
              </td>
              <td className="px-3 py-2 text-end font-mono tabular-nums text-[var(--color-text-secondary)]">
                {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '—'}
              </td>
              <td className="px-3 py-2 text-end">
                {daysRemaining >= 0 ? (
                  <span className={`font-mono tabular-nums text-xs font-medium px-2 py-0.5 rounded ${
                    daysRemaining < 30
                      ? 'text-red-700 bg-red-50'
                      : daysRemaining < 60
                        ? 'text-yellow-700 bg-yellow-50'
                        : 'text-green-700 bg-green-50'
                  }`}>
                    {daysRemaining}d
                  </span>
                ) : (
                  <span className="font-mono tabular-nums text-xs text-[var(--color-text-secondary)]">N/A</span>
                )}
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
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  item.condition === 'good'
                    ? 'bg-green-100 text-green-800'
                    : item.condition === 'minor_damage'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                }`}>
                  {item.condition.replace('_', ' ')}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Reorder point status */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col gap-3">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Reorder Point Status</h3>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-[var(--color-text-secondary)]">Available</span>
            <span className="font-mono tabular-nums text-lg font-medium text-[var(--color-text-primary)]">
              {item.quantityAvailable}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-[var(--color-text-secondary)]">Reorder Point</span>
            <span className="font-mono tabular-nums text-lg font-medium text-[var(--color-text-primary)]">
              {item.reorderPoint}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-[var(--color-text-secondary)]">Days of Supply</span>
            <span className="font-mono tabular-nums text-lg font-medium text-[var(--color-text-primary)]">
              {daysOfSupply}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ReorderStatusBadge status={reorderStatus} />
          <span className="text-xs text-[var(--color-text-secondary)]">
            Days of supply = available / avg daily demand
          </span>
        </div>

        <p className="text-xs text-[var(--color-text-secondary)] italic">
          Reorder point = (Avg daily demand x Lead time days) x 1.5 reliability factor per Egyptian market rules
        </p>
      </div>

      {/* View Movement History toggle */}
      {!showHistory ? (
        <button
          type="button"
          onClick={() => setShowHistory(true)}
          className="min-h-[48px] rounded-xl border border-[var(--color-border)] text-base font-medium text-[#2563EB] hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          View Movement History
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Movement History</h3>
            <button
              type="button"
              onClick={() => setShowHistory(false)}
              className="text-xs text-[#2563EB] font-medium min-h-[48px] flex items-center"
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

function ReorderStatusBadge({ status }: { status: ReorderStatus }) {
  const styles: Record<ReorderStatus, string> = {
    adequate: 'bg-green-100 text-green-800',
    approaching: 'bg-yellow-100 text-yellow-800',
    below: 'bg-red-100 text-red-800',
  }

  const labels: Record<ReorderStatus, string> = {
    adequate: 'Adequate',
    approaching: 'Approaching Reorder',
    below: 'Below Reorder Point',
  }

  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
