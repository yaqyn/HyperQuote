interface WeightTrackerProps {
  currentWeightKg: number
  maxCapacityKg: number
}

/**
 * Live weight display — huge mono number + target + tolerance band as thin bar.
 * Green when in range (<75%), amber 75-90%, red >90%.
 * Airport-style: the number IS the UI.
 */
export function WeightTracker({ currentWeightKg, maxCapacityKg }: WeightTrackerProps) {
  const percentLoaded = maxCapacityKg > 0
    ? Math.round((currentWeightKg / maxCapacityKg) * 100)
    : 0

  const colorClass =
    percentLoaded > 90
      ? 'text-red-600 dark:text-red-400'
      : percentLoaded > 75
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-green-600 dark:text-green-400'

  const barColorClass =
    percentLoaded > 90
      ? 'bg-red-500'
      : percentLoaded > 75
        ? 'bg-amber-500'
        : 'bg-[#2563EB]'

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Huge weight number */}
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-[40px] font-bold leading-none ${colorClass}`}>
            {formatWeight(currentWeightKg)}
          </span>
          <span className="text-sm text-black/30 dark:text-white/30">
            / {formatWeight(maxCapacityKg)}
          </span>
        </div>
        <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-xl font-bold ${colorClass}`}>
          {percentLoaded}%
        </span>
      </div>

      {/* Thin capacity bar */}
      <div className="h-1.5 w-full rounded-full bg-black/5 dark:bg-white/5">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColorClass}`}
          style={{ width: `${Math.min(percentLoaded, 100)}%` }}
        />
      </div>

      {/* Label */}
      <span className="text-xs font-medium text-black/40 dark:text-white/40 uppercase tracking-wider">
        Load Weight
      </span>
    </div>
  )
}

function formatWeight(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}t`
  }
  return `${kg.toLocaleString()}kg`
}
