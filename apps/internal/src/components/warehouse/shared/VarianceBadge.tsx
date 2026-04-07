interface VarianceBadgeProps {
  /** Raw signed number (e.g. +3, -2) OR percentage as decimal */
  value: number
  /** Display as percentage (multiply by 100) or as raw count */
  mode?: 'percent' | 'count'
  tolerance?: number
}

/**
 * Signed variance number in Geist Mono.
 * Green for positive, red for negative.
 * No background — just colored text for data density.
 */
export function VarianceBadge({
  value,
  mode = 'percent',
  tolerance = 0.02,
}: VarianceBadgeProps) {
  const absValue = Math.abs(value)

  const colorClass =
    value === 0
      ? 'text-black/40 dark:text-white/40'
      : value > 0
        ? 'text-green-600 dark:text-green-400'
        : 'text-red-600 dark:text-red-400'

  const sign = value > 0 ? '+' : ''

  const display =
    mode === 'percent'
      ? `${sign}${(value * 100).toFixed(1)}%`
      : `${sign}${value}`

  return (
    <span
      className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-semibold ${colorClass}`}
    >
      {display}
    </span>
  )
}
