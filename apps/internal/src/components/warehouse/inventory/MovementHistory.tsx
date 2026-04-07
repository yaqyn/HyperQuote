import { useQuery } from '@tanstack/react-query'
import { getMovementHistory } from '../../../lib/server/warehouse-inventory'
import type { StockMovement } from '../../../types/warehouse'

const MOVEMENT_TYPE_CONFIG: Record<StockMovement['type'], { label: string; color: string; bg: string }> = {
  receive: { label: 'Receive', color: '#2563EB', bg: 'rgba(37, 99, 235, 0.08)' },
  pick: { label: 'Pick', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.06)' },
  putaway: { label: 'Putaway', color: '#2563EB', bg: 'rgba(37, 99, 235, 0.08)' },
  adjustment: { label: 'Adjust', color: '#a16207', bg: 'rgba(234, 179, 8, 0.06)' },
  transfer: { label: 'Transfer', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.06)' },
}

interface MovementHistoryProps {
  inventoryId: string
}

/**
 * "The Stock" — Movement timeline.
 * Each movement is a dot on a vertical line.
 * Transfer in (blue), transfer out (muted), adjustment (yellow), count (green).
 * Compact entries. All numbers in Geist Mono.
 */
export function MovementHistory({ inventoryId }: MovementHistoryProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory', 'movements', inventoryId],
    queryFn: () => getMovementHistory({ data: { inventoryId } }),
  })

  const movements = data?.movements ?? []

  const sortedMovements = [...movements].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[#2563EB]" />
      </div>
    )
  }

  if (sortedMovements.length === 0) {
    return (
      <p className="text-center text-sm text-[var(--color-text-secondary)] py-8">
        No movement history
      </p>
    )
  }

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute start-[11px] top-0 bottom-0 w-px bg-[var(--color-border)]" />

      <div className="flex flex-col">
        {sortedMovements.map((mv, i) => {
          const config = MOVEMENT_TYPE_CONFIG[mv.type]
          const isPositive = mv.quantity > 0

          return (
            <div key={mv.id} className="relative flex items-start gap-4 py-3 ps-8">
              {/* Timeline dot */}
              <div
                className="absolute start-[6px] top-[18px] h-3 w-3 rounded-full border-2 border-white"
                style={{ background: config.color }}
              />

              {/* Content */}
              <div className="flex flex-1 items-center gap-3 min-w-0">
                {/* Type badge */}
                <span
                  className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold"
                  style={{ color: config.color, background: config.bg }}
                >
                  {config.label}
                </span>

                {/* Reference */}
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-secondary)] truncate min-w-0 flex-1">
                  {mv.reference}
                </span>

                {/* Timestamp */}
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-[var(--color-text-secondary)] shrink-0">
                  {new Date(mv.timestamp).toLocaleDateString()}
                </span>

                {/* Quantity — green positive, red negative */}
                <span
                  className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-bold shrink-0 w-16 text-end ${
                    isPositive ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {isPositive ? '+' : ''}{mv.quantity}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
