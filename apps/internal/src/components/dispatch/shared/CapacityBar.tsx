/**
 * Horizontal capacity bar for route weight visualization.
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
      <div className="flex-1 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-xs font-medium ${textColor}`}
      >
        {rounded}%
      </span>
    </div>
  )
}
