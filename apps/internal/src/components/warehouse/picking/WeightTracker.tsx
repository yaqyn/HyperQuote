interface WeightTrackerProps {
  currentWeightKg: number
  maxCapacityKg: number
}

/**
 * Running weight vs truck capacity progress bar.
 * All numbers in Geist Mono. Color-coded: green <75%, yellow 75-90%, red >90%.
 * Blue fill bar using #2563EB.
 */
export function WeightTracker({ currentWeightKg, maxCapacityKg }: WeightTrackerProps) {
  const percentLoaded = maxCapacityKg > 0
    ? Math.round((currentWeightKg / maxCapacityKg) * 100)
    : 0

  const colorClass =
    percentLoaded > 90
      ? 'text-red-600'
      : percentLoaded > 75
        ? 'text-yellow-600'
        : 'text-green-600'

  const barColorClass =
    percentLoaded > 90
      ? 'bg-red-500'
      : percentLoaded > 75
        ? 'bg-yellow-500'
        : 'bg-[#2563EB]'

  const displayCurrent = formatWeight(currentWeightKg)
  const displayMax = formatWeight(maxCapacityKg)

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-[var(--color-border)] p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">
          Load Weight
        </span>
        <span className={`font-mono text-sm font-semibold ${colorClass}`}>
          {percentLoaded}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-[var(--color-border)]">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColorClass}`}
          style={{ width: `${Math.min(percentLoaded, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-[var(--color-text-primary)]">
          {displayCurrent}
        </span>
        <span className="font-mono text-xs text-[var(--color-text-secondary)]">
          / {displayMax}
        </span>
      </div>
    </div>
  )
}

function formatWeight(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}t`
  }
  return `${kg.toLocaleString()} kg`
}
