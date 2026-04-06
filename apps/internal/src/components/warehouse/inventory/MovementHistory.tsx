import { useQuery } from '@tanstack/react-query'
import { getMovementHistory } from '../../../lib/server/warehouse-inventory'
import type { StockMovement } from '../../../types/warehouse'

const MOVEMENT_TYPE_LABELS: Record<StockMovement['type'], string> = {
  receive: 'Receive',
  pick: 'Pick',
  putaway: 'Putaway',
  adjustment: 'Adjustment',
  transfer: 'Transfer',
}

interface MovementHistoryProps {
  inventoryId: string
}

/**
 * Recent transactions for a product.
 * Sorted by timestamp descending (most recent first). Shows last 20 movements.
 * Quantity: green for positive, red for negative. All numbers in Geist Mono.
 */
export function MovementHistory({ inventoryId }: MovementHistoryProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory', 'movements', inventoryId],
    queryFn: () => getMovementHistory({ data: { inventoryId } }),
  })

  const movements = data?.movements ?? []

  // Sort by timestamp descending (most recent first)
  const sortedMovements = [...movements].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-24">
        <p className="text-sm text-[var(--color-text-secondary)]">Loading movements...</p>
      </div>
    )
  }

  if (sortedMovements.length === 0) {
    return (
      <p className="text-center text-sm text-[var(--color-text-secondary)] py-6">
        No movement history
      </p>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--color-surface)]">
            <th className="text-start px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)]">Type</th>
            <th className="text-end px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)]">Quantity</th>
            <th className="text-end px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)]">Timestamp</th>
            <th className="text-start px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)]">Reference</th>
          </tr>
        </thead>
        <tbody>
          {sortedMovements.map((mv) => (
            <tr key={mv.id} className="border-t border-[var(--color-border)]">
              <td className="px-3 py-2 text-[var(--color-text-primary)]">
                {MOVEMENT_TYPE_LABELS[mv.type]}
              </td>
              <td className={`px-3 py-2 text-end font-mono tabular-nums font-medium ${
                mv.quantity > 0 ? 'text-green-700' : 'text-red-700'
              }`}>
                {mv.quantity > 0 ? '+' : ''}{mv.quantity}
              </td>
              <td className="px-3 py-2 text-end font-mono tabular-nums text-[var(--color-text-secondary)]">
                {new Date(mv.timestamp).toLocaleString()}
              </td>
              <td className="px-3 py-2 font-mono tabular-nums text-[var(--color-text-secondary)]">
                {mv.reference}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
