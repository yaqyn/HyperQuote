import type { ActivityLogEntry } from '../../../types/operations'

interface OrderActivityLogProps {
  activityLog: ActivityLogEntry[]
}

/**
 * Timeline of order events -- newest at top, vertical line connecting dots.
 * Blue dot for latest, muted for older entries.
 */
export function OrderActivityLog({ activityLog }: OrderActivityLogProps) {
  const sorted = [...activityLog].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <h3 className="text-sm font-semibold mb-4">Activity Log</h3>

      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute start-[3px] top-2 bottom-2 w-0.5 bg-black/10 dark:bg-white/10" />

        <div className="space-y-4">
          {sorted.map((entry, index) => (
            <div key={entry.id} className="flex gap-3 relative">
              {/* Dot */}
              <div
                className={`w-2 h-2 rounded-full mt-1.5 shrink-0 relative z-10 ${
                  index === 0
                    ? 'bg-[#2563EB]'
                    : 'bg-black/20 dark:bg-white/20'
                }`}
              />

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-medium">{entry.action}</span>
                  <span className="font-geist-mono text-xs text-black/40 dark:text-white/40">
                    {new Date(entry.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-[13px] text-black/50 dark:text-white/50 mt-0.5">
                  {entry.actor}
                </p>
                {entry.details && (
                  <p className="text-[13px] text-black/60 dark:text-white/60 mt-0.5">
                    {entry.details}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
