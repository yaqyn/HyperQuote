/**
 * Thin horizontal bar (4px) showing used/total capacity.
 * Green <70%, Yellow 70-90%, Red >90%.
 * Geist Mono percentage label.
 */
export function CapacityBar({
  currentKg,
  capacityKg,
}: {
  currentKg: number
  capacityKg: number
}) {
  const pct = capacityKg > 0 ? Math.min((currentKg / capacityKg) * 100, 100) : 0
  const rounded = Math.round(pct)

  const barColor =
    pct > 90
      ? 'bg-red-500'
      : pct > 70
        ? 'bg-amber-500'
        : 'bg-green-500'

  const textColor =
    pct > 90
      ? 'text-red-600 dark:text-red-400'
      : pct > 70
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-green-600 dark:text-green-400'

  return (
    <div className="flex items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.06]">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums font-medium ${textColor}`}
      >
        {rounded}%
      </span>
    </div>
  )
}
