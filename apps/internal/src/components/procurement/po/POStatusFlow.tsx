import { HAPPY_PATH_STATUSES } from '../../../types/procurement'
import type { POStatus } from '../../../types/procurement'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  confirmed: 'Confirmed',
  in_production: 'Production',
  shipped: 'Shipped',
  partially_received: 'Partial',
  received: 'Received',
  inspected: 'Inspected',
  closed: 'Closed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

interface POStatusFlowProps {
  currentStatus: POStatus
  /** Compact mode: dots only, no labels. Used in POList rows. */
  compact?: boolean
}

/**
 * Horizontal dot chain for PO status progression.
 * Filled dots = completed, blue dot = current, outline = future.
 * Terminal states (rejected/cancelled) shown as red inline indicator.
 */
export function POStatusFlow({ currentStatus, compact = false }: POStatusFlowProps) {
  const isTerminal = currentStatus === 'rejected' || currentStatus === 'cancelled'
  const currentIndex = HAPPY_PATH_STATUSES.indexOf(currentStatus)

  // For compact mode, show abbreviated dot chain
  if (compact) {
    return (
      <div className="flex items-center gap-0.5">
        {HAPPY_PATH_STATUSES.map((status, index) => {
          const isCompleted = !isTerminal && currentIndex > index
          const isCurrent = !isTerminal && currentIndex === index

          return (
            <div key={status} className="flex items-center gap-0.5">
              <div
                className={`
                  size-1.5 rounded-full transition-colors
                  ${isCurrent
                    ? 'bg-[#2563EB]'
                    : isCompleted
                      ? 'bg-black/25 dark:bg-white/25'
                      : 'bg-black/[0.06] dark:bg-white/[0.06]'
                  }
                `}
                title={STATUS_LABELS[status]}
              />
              {/* Connector */}
              {index < HAPPY_PATH_STATUSES.length - 1 && (
                <div className={`w-1 h-px ${isCompleted ? 'bg-black/20 dark:bg-white/20' : 'bg-black/[0.04] dark:bg-white/[0.04]'}`} />
              )}
            </div>
          )
        })}
        {isTerminal && (
          <span className="ms-1.5 text-[9px] font-medium text-red-500/70">
            {STATUS_LABELS[currentStatus]}
          </span>
        )}
      </div>
    )
  }

  // Full mode with labels
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center">
        {HAPPY_PATH_STATUSES.map((status, index) => {
          const isCompleted = !isTerminal && currentIndex > index
          const isCurrent = !isTerminal && currentIndex === index

          return (
            <div key={status} className="flex items-center">
              {/* Dot + label */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`
                    size-2 rounded-full transition-colors
                    ${isCurrent
                      ? 'bg-[#2563EB] ring-4 ring-[#2563EB]/10'
                      : isCompleted
                        ? 'bg-black/30 dark:bg-white/30'
                        : 'border border-black/15 dark:border-white/15'
                    }
                  `}
                />
                <span
                  className={`
                    text-[9px] leading-none whitespace-nowrap
                    ${isCurrent
                      ? 'font-medium text-[#2563EB]'
                      : isCompleted
                        ? 'text-black/40 dark:text-white/40'
                        : 'text-black/20 dark:text-white/20'
                    }
                  `}
                >
                  {STATUS_LABELS[status]}
                </span>
              </div>

              {/* Connector line */}
              {index < HAPPY_PATH_STATUSES.length - 1 && (
                <div
                  className={`mx-1 h-px flex-1 min-w-3 ${
                    isCompleted ? 'bg-black/20 dark:bg-white/20' : 'bg-black/[0.06] dark:bg-white/[0.06]'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Terminal badge */}
      {isTerminal && (
        <span className="self-start text-[10px] font-medium text-red-500/80">
          {STATUS_LABELS[currentStatus]}
        </span>
      )}
    </div>
  )
}
