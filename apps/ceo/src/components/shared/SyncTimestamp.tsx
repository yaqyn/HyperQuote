import { useEffect, useState } from 'react'

interface SyncTimestampProps {
  syncedAt: number
}

/**
 * "Last synced" display in Geist Mono with staleness color coding.
 * Fresh (< 15 min): muted gray
 * Stale (15-30 min): warning yellow
 * Very stale (> 30 min): error red
 *
 * Updates every minute via setInterval.
 */
export function SyncTimestamp({ syncedAt }: SyncTimestampProps) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1)
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  const elapsed = Date.now() - syncedAt
  const minutes = Math.floor(elapsed / 60_000)

  const color = getStalenessColor(minutes)
  const relativeText = formatRelativeTime(elapsed)

  return (
    <span className={`font-mono text-xs ${color}`}>
      Last synced {relativeText}
    </span>
  )
}

function getStalenessColor(minutes: number): string {
  if (minutes >= 30) return 'text-[var(--color-error)]'
  if (minutes >= 15) return 'text-[var(--color-warning)]'
  return 'text-[var(--color-text-subtle)]'
}

function formatRelativeTime(elapsedMs: number): string {
  const seconds = Math.floor(elapsedMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  // Use Intl.RelativeTimeFormat for locale-aware formatting
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (days > 0) return rtf.format(-days, 'day')
  if (hours > 0) return rtf.format(-hours, 'hour')
  if (minutes > 0) return rtf.format(-minutes, 'minute')
  return rtf.format(-seconds, 'second')
}
