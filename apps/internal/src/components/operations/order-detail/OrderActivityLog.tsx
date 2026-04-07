import type { ActivityLogEntry } from '../../../types/operations'

interface OrderActivityLogProps {
  activityLog: ActivityLogEntry[]
}

/**
 * Vertical timeline thread — each event: timestamp (mono) + description + actor.
 * Most recent at top. Minimal chrome — the timeline IS the content.
 */
export function OrderActivityLog({ activityLog }: OrderActivityLogProps) {
  const sorted = [...activityLog].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )

  return (
    <div>
      <span className="text-[10px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40 mb-4 block">
        Activity
      </span>

      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute start-[3px] top-1.5 bottom-1.5 w-px bg-black/8 dark:bg-white/8" />

        <div className="flex flex-col gap-4">
          {sorted.map((entry, index) => (
            <div key={entry.id} className="flex gap-3.5 relative">
              {/* Dot */}
              <div
                className={`w-[7px] h-[7px] rounded-full mt-1.5 shrink-0 relative z-10 ${
                  index === 0
                    ? 'bg-[#2563EB]'
                    : 'bg-black/15 dark:bg-white/15'
                }`}
              />

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className={`text-[13px] font-medium ${index === 0 ? '' : 'text-black/70 dark:text-white/70'}`}>
                    {entry.action}
                  </span>
                  <span className="font-[family-name:var(--font-geist-mono)] text-[11px] text-black/30 dark:text-white/30">
                    {new Date(entry.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-[12px] text-black/40 dark:text-white/40 mt-0.5">
                  {entry.actor}
                </p>
                {entry.details && (
                  <p className="text-[12px] text-black/50 dark:text-white/50 mt-0.5">
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
