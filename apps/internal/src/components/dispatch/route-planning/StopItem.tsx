/**
 * Each stop: sequence # + customer + address + delivery window + items count.
 * Draggable for reordering. Red border on error violations.
 */
import { GripVertical } from 'lucide-react'
import type { ConstraintViolation, RouteStop } from '../../../types/dispatch'
import { ConstraintBadge } from '../shared/ConstraintBadge'

interface StopItemProps {
  stop: RouteStop
  violations: ConstraintViolation[]
}

export function StopItem({ stop, violations }: StopItemProps) {
  const hasErrors = violations.some((v) => v.severity === 'error')

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border p-2 ${
        hasErrors
          ? 'border-red-300 dark:border-red-700'
          : 'border-black/[0.06] dark:border-white/[0.06]'
      }`}
    >
      {/* Drag handle */}
      <div className="mt-0.5 shrink-0 cursor-grab text-black/20 dark:text-white/20">
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      {/* Sequence */}
      <span className="mt-0.5 shrink-0 font-[family-name:var(--font-geist-mono)] text-[11px] font-semibold tabular-nums text-black/40 dark:text-white/40">
        {stop.sequence}
      </span>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium">{stop.customerName}</span>
          {stop.equipmentNeeded !== 'none' && (
            <span className="shrink-0 rounded bg-black/[0.05] px-1.5 py-0.5 text-[9px] font-medium uppercase dark:bg-white/[0.05]">
              {stop.equipmentNeeded}
            </span>
          )}
        </div>
        <p className="truncate text-[11px] text-black/40 dark:text-white/40">
          {stop.address}
        </p>
        <div className="mt-1 flex items-center gap-3 text-[11px] text-black/50 dark:text-white/50">
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
            {stop.weight.toLocaleString()} kg
          </span>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
            {stop.timeWindow.start}&ndash;{stop.timeWindow.end}
          </span>
        </div>

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
