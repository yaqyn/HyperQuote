import { Button } from 'react-aria-components'
import type { FreshnessIndicator } from '../../../types/sales'

interface CostLookupProps {
  freshness: FreshnessIndicator
}

const FRESHNESS_CONFIG: Record<
  FreshnessIndicator,
  { dotClass: string; label: string; showVerify?: boolean }
> = {
  fresh: {
    dotClass: 'bg-green-500',
    label: 'Live',
  },
  aging: {
    dotClass: 'bg-yellow-500',
    label: 'Verify',
    showVerify: true,
  },
  stale: {
    dotClass: 'bg-red-500',
    label: 'Awaiting Procurement Input',
  },
  missing: {
    dotClass: 'bg-black/20 dark:bg-white/20',
    label: 'No Price Available',
  },
}

/**
 * Freshness indicator for supplier cost per line item (Step 3).
 * Fresh (<24h): green dot + "Live"
 * Aging (1-3 days): yellow dot + "Verify" button
 * Stale (>3 days): red dot + "Awaiting Procurement Input"
 * Missing: dash + "No Price Available"
 *
 * Dots are small colored circles (6px) -- data-semantic colors per three-color rule.
 */
export function CostLookup({ freshness }: CostLookupProps) {
  const config = FRESHNESS_CONFIG[freshness]

  if (freshness === 'missing') {
    return (
      <span className="text-xs text-black/40 dark:text-white/40">
        &mdash;
      </span>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${config.dotClass}`}
        aria-hidden="true"
      />
      {config.showVerify ? (
        <Button
          className="text-xs font-medium text-yellow-700 outline-none transition-colors
            data-[hovered]:text-yellow-900 data-[focus-visible]:ring-1 data-[focus-visible]:ring-yellow-500/50
            dark:text-yellow-400 dark:data-[hovered]:text-yellow-300"
          onPress={() => {
            // Placeholder: trigger price refresh from procurement
          }}
        >
          {config.label}
        </Button>
      ) : (
        <span className="text-xs text-black/50 dark:text-white/50">
          {config.label}
        </span>
      )}
    </div>
  )
}
