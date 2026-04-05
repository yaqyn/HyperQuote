import { useEffect, useState } from 'react'

interface AgeTimerProps {
  createdAt: string
}

function getElapsedMs(createdAt: string): number {
  return Math.max(0, Date.now() - new Date(createdAt).getTime())
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const totalMinutes = Math.floor(totalSeconds / 60)
  const totalHours = Math.floor(totalMinutes / 60)

  if (totalHours >= 1) {
    const remainingMinutes = totalMinutes % 60
    return `${totalHours}h ${remainingMinutes}m`
  }

  const remainingSeconds = totalSeconds % 60
  return `${totalMinutes}m ${remainingSeconds}s`
}

function getColorClass(ms: number): string {
  const hours = ms / (1000 * 60 * 60)

  if (hours > 24) return 'text-red-600 animate-pulse'
  if (hours > 8) return 'text-red-600'
  if (hours > 4) return 'text-orange-500'
  if (hours > 2) return 'text-yellow-600'
  return 'text-green-600'
}

export function AgeTimer({ createdAt }: AgeTimerProps) {
  const [elapsedMs, setElapsedMs] = useState(() => getElapsedMs(createdAt))

  useEffect(() => {
    // Reset on createdAt change
    setElapsedMs(getElapsedMs(createdAt))

    const interval = setInterval(() => {
      setElapsedMs(getElapsedMs(createdAt))
    }, 1000)

    return () => clearInterval(interval)
  }, [createdAt])

  return (
    <span
      className={`font-[family-name:var(--font-geist-mono)] text-sm tabular-nums ${getColorClass(elapsedMs)}`}
    >
      {formatElapsed(elapsedMs)}
    </span>
  )
}
