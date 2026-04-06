/**
 * Draggable stop item rendered inside a GridList Item.
 * Shows sequence, customer, address, weight, equipment, and constraint badges.
 * Red border if any error-severity violations.
 */
import { GripVertical } from 'lucide-react'
import type { ConstraintViolation, RouteStop } from '../../../types/dispatch'
import { ConstraintBadge } from '../shared/ConstraintBadge'

interface StopItemProps {
  stop: RouteStop
  violations: ConstraintViolation[]
}

const EQUIPMENT_LABELS: Record<string, string> = {
  moffett: 'Moffett',
  boom: 'Boom',
  crane: 'Crane',
}

export function StopItem({ stop, violations }: StopItemProps) {
  const hasErrors = violations.some((v) => v.severity === 'error')

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border bg-white/60 p-2 dark:bg-black/40 ${
        hasErrors
          ? 'border-red-400 dark:border-red-600'
          : 'border-[var(--color-border)]'
      }`}
    >
      {/* Drag handle */}
      <div className="mt-0.5 shrink-0 cursor-grab text-black/30 dark:text-white/30">
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Sequence number */}
      <span className="mt-0.5 shrink-0 font-[family-name:var(--font-geist-mono)] text-xs font-semibold tabular-nums text-black/50 dark:text-white/50">
        {stop.sequence}
      </span>

      {/* Stop details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{stop.customerName}</span>
          {stop.equipmentNeeded !== 'none' && (
            <span className="shrink-0 rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-medium uppercase dark:bg-white/5">
              {EQUIPMENT_LABELS[stop.equipmentNeeded] ?? stop.equipmentNeeded}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-black/50 dark:text-white/50">
          {stop.address}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-black/60 dark:text-white/60">
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
            {stop.weight.toLocaleString()} kg
          </span>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
            {stop.timeWindow.start}–{stop.timeWindow.end}
          </span>
        </div>

        {/* Constraint badges */}
        {violations.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {violations.map((v, i) => (
              <ConstraintBadge key={`${v.type}-${i}`} violation={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
