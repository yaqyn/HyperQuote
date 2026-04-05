import { useTranslation } from 'react-i18next'
import type { StockFreshness } from '../../../types/procurement'

interface FreshnessIndicatorProps {
  freshness: StockFreshness
  timestamp?: string
  compact?: boolean
}

const FRESHNESS_CONFIG: Record<StockFreshness, { dot: string; label: string }> = {
  fresh: { dot: 'bg-green-500', label: 'procurement.freshness.fresh' },
  aging: { dot: 'bg-yellow-500', label: 'procurement.freshness.aging' },
  stale: { dot: 'bg-red-500', label: 'procurement.freshness.stale' },
  suppressed: { dot: 'bg-black/30 dark:bg-white/30', label: 'procurement.freshness.suppressed' },
}

export function FreshnessIndicator({ freshness, timestamp, compact }: FreshnessIndicatorProps) {
  const { t } = useTranslation('internal')
  const config = FRESHNESS_CONFIG[freshness]

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${config.dot}`} />
        <span className="text-xs text-black/50 dark:text-white/50">{t(config.label)}</span>
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-2 w-2 rounded-full ${config.dot}`} />
      <span className="text-sm">{t(config.label)}</span>
      {timestamp && (
        <span className="font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-black/40 dark:text-white/40">
          {new Date(timestamp).toLocaleString()}
        </span>
      )}
    </div>
  )
}
