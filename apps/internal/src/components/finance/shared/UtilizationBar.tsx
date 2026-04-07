import { motion } from 'motion/react'

interface UtilizationBarProps {
  percentage: number
  showLabel?: boolean
}

function getBarColor(pct: number): string {
  if (pct > 100) return 'bg-red-600'
  if (pct >= 95) return 'bg-red-500'
  if (pct >= 80) return 'bg-orange-500'
  if (pct >= 60) return 'bg-yellow-500'
  return 'bg-green-500'
}

/**
 * Thin horizontal bar (4px height), colored by utilization %.
 * 0-60% green, 60-80% yellow, 80-95% orange, 95-100% red, >100% pulsing red.
 * Label in Geist Mono.
 */
export function UtilizationBar({ percentage, showLabel = true }: UtilizationBarProps) {
  const barWidth = Math.min(percentage, 100)
  const colorClass = getBarColor(percentage)
  const isOverLimit = percentage > 100

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
        {isOverLimit ? (
          <motion.div
            className={`h-full rounded-full ${colorClass}`}
            style={{ width: '100%' }}
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
        ) : (
          <div
            className={`h-full rounded-full ${colorClass} transition-all duration-300`}
            style={{ width: `${barWidth}%` }}
          />
        )}
      </div>
      {showLabel && (
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/50 dark:text-white/50 min-w-[3rem] text-end">
          {percentage}%
        </span>
      )}
    </div>
  )
}
