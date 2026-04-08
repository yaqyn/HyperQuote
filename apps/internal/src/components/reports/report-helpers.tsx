/**
 * Shared helpers for all report dashboards.
 * DRY: TrendIndicator, formatKpiValue, formatCurrency used across 8 dashboards.
 */

export function TrendIndicator({ trend, direction }: { trend: number; direction: 'up' | 'down' | 'flat' }) {
  const arrow = direction === 'up' ? '\u2191' : direction === 'down' ? '\u2193' : '\u2192'
  const color = direction === 'up' ? 'text-green-600 dark:text-green-400' :
                direction === 'down' ? 'text-red-600 dark:text-red-400' :
                'text-black/30 dark:text-white/30'
  return (
    <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] ${color}`}>
      {arrow} {direction === 'up' ? '+' : ''}{trend}%
    </span>
  )
}

export function formatKpiValue(value: number | string, unit?: string): string {
  if (typeof value === 'number' && unit === 'EGP') return formatCurrency(value)
  if (typeof value === 'number' && unit === '%') return `${value}%`
  return String(value)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-EG').format(value)
}
