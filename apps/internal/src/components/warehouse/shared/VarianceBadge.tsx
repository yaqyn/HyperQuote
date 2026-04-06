interface VarianceBadgeProps {
  variancePercent: number
  tolerance?: number
}

/**
 * Shows variance with color coding.
 * Green = 0%, yellow = within tolerance (default 2%), red = exceeds.
 * Geist Mono for the percentage number.
 */
export function VarianceBadge({
  variancePercent,
  tolerance = 0.02,
}: VarianceBadgeProps) {
  const absVariance = Math.abs(variancePercent)

  const { bgClass, textClass } =
    absVariance === 0
      ? { bgClass: 'bg-green-100', textClass: 'text-green-700' }
      : absVariance <= tolerance
        ? { bgClass: 'bg-yellow-100', textClass: 'text-yellow-700' }
        : { bgClass: 'bg-red-100', textClass: 'text-red-700' }

  const sign = variancePercent > 0 ? '+' : variancePercent < 0 ? '-' : ''
  const display = `${sign}${(absVariance * 100).toFixed(1)}%`

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-[family-name:var(--font-geist-mono)] tabular-nums font-medium ${bgClass} ${textClass}`}
    >
      {display}
    </span>
  )
}
