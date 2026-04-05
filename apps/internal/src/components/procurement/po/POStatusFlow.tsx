import { useTranslation } from 'react-i18next'
import { HAPPY_PATH_STATUSES } from '../../../types/procurement'
import type { POStatus } from '../../../types/procurement'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  confirmed: 'Confirmed',
  in_production: 'In Production',
  shipped: 'Shipped',
  partially_received: 'Partially Received',
  received: 'Received',
  inspected: 'Inspected',
  closed: 'Closed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

interface POStatusFlowProps {
  currentStatus: POStatus
}

/**
 * Visual 9-step horizontal pipeline for PO status.
 * Current step highlighted blue (#2563EB), completed filled, future outline.
 * Terminal states (rejected/cancelled) shown as red badge below pipeline.
 */
export function POStatusFlow({ currentStatus }: POStatusFlowProps) {
  const { t } = useTranslation('internal')

  const isTerminal = currentStatus === 'rejected' || currentStatus === 'cancelled'
  const currentIndex = HAPPY_PATH_STATUSES.indexOf(currentStatus)

  // For terminal states, find the last happy-path status before termination
  // sent -> rejected means we were at 'sent' (index 1)
  // We show pipeline up to the termination point
  const terminalIndex = isTerminal
    ? HAPPY_PATH_STATUSES.indexOf('sent') // Default to sent for rejected, draft for cancelled
    : -1

  return (
    <div className="flex flex-col gap-2">
      {/* Pipeline */}
      <div className="flex flex-wrap items-center gap-1">
        {HAPPY_PATH_STATUSES.map((status, index) => {
          const isCompleted = !isTerminal && currentIndex > index
          const isCurrent = !isTerminal && currentIndex === index
          const isFuture = isTerminal || currentIndex < index

          return (
            <div key={status} className="flex items-center gap-1">
              {/* Step */}
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors
                  ${
                    isCurrent
                      ? 'bg-[#2563EB] text-white'
                      : isCompleted
                        ? 'bg-[#2563EB]/10 text-[#2563EB]'
                        : 'border border-black/10 text-black/40 dark:border-white/10 dark:text-white/40'
                  }`}
              >
                {isCompleted && (
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                <span>{STATUS_LABELS[status]}</span>
              </div>

              {/* Connector arrow (except last) */}
              {index < HAPPY_PATH_STATUSES.length - 1 && (
                <svg className="h-3 w-3 shrink-0 text-black/20 dark:text-white/20" viewBox="0 0 12 12" fill="none">
                  <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          )
        })}
      </div>

      {/* Terminal state badge */}
      {isTerminal && (
        <div className="flex items-center gap-2 ps-2">
          <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-300">
            {STATUS_LABELS[currentStatus]}
          </span>
        </div>
      )}
    </div>
  )
}
