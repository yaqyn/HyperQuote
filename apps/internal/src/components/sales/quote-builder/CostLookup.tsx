import { Button, TooltipTrigger, Tooltip } from 'react-aria-components'
import { Flame } from 'lucide-react'
import type { PriceStatus, PriceUrgency } from '../../../types/sales'
import { getPriceUrgency } from '../../../types/sales'

interface CostLookupProps {
  priceStatus: PriceStatus
  recentlyOrdered: boolean
  onRequestUpdate?: () => void
}

const URGENCY_CONFIG: Record<
  PriceUrgency,
  {
    dotClass: string
    label: string
    tooltipLabel: string
    actionable: boolean
  }
> = {
  normal: {
    dotClass: 'bg-emerald-500/70',
    label: 'Updated',
    tooltipLabel: 'Price is up to date',
    actionable: false,
  },
  hot: {
    dotClass: 'bg-emerald-500',
    label: 'Updated · Hot',
    tooltipLabel: 'Updated price · recently ordered',
    actionable: false,
  },
  stale: {
    dotClass: 'bg-amber-500/80',
    label: 'Outdated',
    tooltipLabel: 'Price outdated — click to request update',
    actionable: true,
  },
  urgent: {
    dotClass: 'bg-red-500',
    label: 'Urgent',
    tooltipLabel: 'Outdated AND recently ordered — request update now',
    actionable: true,
  },
}

/**
 * Two-axis price indicator for a quote line.
 * - Dot color: urgency derived from (priceStatus × recentlyOrdered)
 * - Flame icon: appears when item was recently ordered by a customer
 * - Actionable urgencies (stale/urgent) render as a button that triggers onRequestUpdate.
 */
export function CostLookup({ priceStatus, recentlyOrdered, onRequestUpdate }: CostLookupProps) {
  const urgency = getPriceUrgency(priceStatus, recentlyOrdered)
  const config = URGENCY_CONFIG[urgency]

  const dot = (
    <span className="relative inline-flex items-center justify-center">
      <span className={`block h-2 w-2 rounded-full ${config.dotClass}`} />
      {urgency === 'urgent' && (
        <span className="absolute inline-flex h-2 w-2 rounded-full bg-red-500 opacity-60 animate-ping" />
      )}
    </span>
  )

  const flame = recentlyOrdered ? (
    <Flame
      size={10}
      strokeWidth={2}
      className={urgency === 'urgent' ? 'text-red-500' : 'text-amber-500'}
    />
  ) : null

  const content = (
    <span className="inline-flex items-center gap-1">
      {dot}
      {flame}
    </span>
  )

  if (config.actionable && onRequestUpdate) {
    return (
      <TooltipTrigger delay={300}>
        <Button
          className="outline-none cursor-pointer transition-opacity hover:opacity-70"
          onPress={onRequestUpdate}
          aria-label={config.tooltipLabel}
        >
          {content}
        </Button>
        <Tooltip
          className="rounded-md bg-black/90 px-2.5 py-1 text-[11px] text-white shadow-lg dark:bg-white/90 dark:text-black"
          offset={4}
        >
          {config.tooltipLabel}
        </Tooltip>
      </TooltipTrigger>
    )
  }

  return (
    <TooltipTrigger delay={300}>
      <span role="img" aria-label={config.tooltipLabel}>
        {content}
      </span>
      <Tooltip
        className="rounded-md bg-black/90 px-2.5 py-1 text-[11px] text-white shadow-lg dark:bg-white/90 dark:text-black"
        offset={4}
      >
        {config.tooltipLabel}
      </Tooltip>
    </TooltipTrigger>
  )
}
