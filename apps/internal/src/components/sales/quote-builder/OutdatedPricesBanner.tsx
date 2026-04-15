import { Button } from 'react-aria-components'
import { AlertTriangle, Check, Loader2 } from 'lucide-react'

interface OutdatedPricesBannerProps {
  outdatedCount: number
  urgentCount: number
  pendingRequest: number
  isRequesting: boolean
  allRequested: boolean
  onRequestAll: () => void
}

/**
 * Quote-level notice shown when any line item has an outdated supplier price.
 * Highlights urgent items (outdated + recently ordered) and lets the rep
 * fire a bulk notification to the inventory employee in one click.
 */
export function OutdatedPricesBanner({
  outdatedCount,
  urgentCount,
  pendingRequest,
  isRequesting,
  allRequested,
  onRequestAll,
}: OutdatedPricesBannerProps) {
  const toneClass = 'bg-black/[0.03] border-black/10 dark:bg-white/[0.04] dark:border-white/10'
  const textClass = 'text-black/65 dark:text-white/65'

  return (
    <div className={`mt-4 rounded-lg border px-3.5 py-2.5 ${toneClass}`}>
      <div className="flex items-center gap-3">
        <AlertTriangle
          size={14}
          strokeWidth={2}
          className="text-black/45 dark:text-white/45"
        />

        <div className={`flex-1 text-[12px] leading-snug ${textClass}`}>
          <span className="font-medium">
            {outdatedCount} item{outdatedCount > 1 ? 's' : ''} with outdated prices
          </span>
          {urgentCount > 0 && (
            <span className="ms-1">
              · <span className="font-semibold">{urgentCount} urgent</span> (recently ordered)
            </span>
          )}
        </div>

        {allRequested ? (
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <Check size={12} strokeWidth={2.5} />
            Inventory notified
          </span>
        ) : (
          <Button
            onPress={onRequestAll}
            isDisabled={isRequesting || pendingRequest === 0}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium text-white outline-none transition-colors cursor-pointer bg-red-500 hover:bg-red-500/90 disabled:cursor-not-allowed disabled:bg-red-500/40"
          >
            {isRequesting ? (
              <>
                <Loader2 size={11} strokeWidth={2.5} className="animate-spin" />
                Requesting…
              </>
            ) : (
              <>Request updated prices ({pendingRequest})</>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
