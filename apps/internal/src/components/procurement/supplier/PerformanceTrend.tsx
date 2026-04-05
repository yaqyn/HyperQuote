import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

type Trend = 'improving' | 'declining' | 'stable'

interface PerformanceTrendProps {
  trend: Trend
  /** Show text label next to icon */
  showLabel?: boolean
  /** Invert colors (for metrics where lower is better, e.g. rejection rate) */
  inverted?: boolean
}

const TREND_CONFIG: Record<Trend, { icon: typeof TrendingUp; label: string; color: string; invertedColor: string }> = {
  improving: {
    icon: TrendingUp,
    label: 'Improving',
    color: 'text-green-600',
    invertedColor: 'text-red-600',
  },
  declining: {
    icon: TrendingDown,
    label: 'Declining',
    color: 'text-red-600',
    invertedColor: 'text-green-600',
  },
  stable: {
    icon: Minus,
    label: 'Stable',
    color: 'text-black/40',
    invertedColor: 'text-black/40',
  },
}

export function PerformanceTrend({ trend, showLabel = false, inverted = false }: PerformanceTrendProps) {
  const config = TREND_CONFIG[trend]
  const Icon = config.icon
  const color = inverted ? config.invertedColor : config.color

  return (
    <span className={`inline-flex items-center gap-1 ${color}`}>
      <Icon className="size-4" aria-hidden="true" />
      {showLabel && <span className="text-xs">{config.label}</span>}
    </span>
  )
}
