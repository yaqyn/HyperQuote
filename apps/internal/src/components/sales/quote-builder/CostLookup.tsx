import { Button, TooltipTrigger, Tooltip } from 'react-aria-components'
import type { FreshnessIndicator } from '../../../types/sales'

interface CostLookupProps {
  freshness: FreshnessIndicator
}

const FRESHNESS_CONFIG: Record<
  FreshnessIndicator,
  { letter: string; dotClass: string; tooltipLabel: string; showVerify?: boolean }
> = {
  fresh: {
    letter: 'F',
    dotClass: 'text-green-600 dark:text-green-400',
    tooltipLabel: 'Fresh -- updated < 24h ago',
  },
  aging: {
    letter: 'A',
    dotClass: 'text-yellow-600 dark:text-yellow-400',
    tooltipLabel: 'Aging -- 1-3 days old, click to verify',
    showVerify: true,
  },
  stale: {
    letter: 'S',
    dotClass: 'text-red-600 dark:text-red-400',
    tooltipLabel: 'Stale -- awaiting procurement input',
  },
  missing: {
    letter: 'M',
    dotClass: 'text-[var(--color-text-subtle)]',
    tooltipLabel: 'Missing -- no price available',
  },
}

/**
 * Freshness indicator for supplier cost per line item.
 * Single-letter indicator (F/A/S/M) with tooltip -- not a full badge.
 * Aging costs show a clickable verify action.
 */
export function CostLookup({ freshness }: CostLookupProps) {
  const config = FRESHNESS_CONFIG[freshness]

  if (config.showVerify) {
    return (
      <TooltipTrigger delay={300}>
        <Button
          className={`font-[family-name:var(--font-geist-mono)] text-[11px] font-medium outline-none ${config.dotClass}`}
          onPress={() => {
            // Placeholder: trigger price refresh from procurement
          }}
          aria-label="Verify cost freshness"
        >
          {config.letter}
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
      <span
        className={`font-[family-name:var(--font-geist-mono)] text-[11px] font-medium ${config.dotClass}`}
        role="img"
        aria-label={config.tooltipLabel}
      >
        {config.letter}
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
