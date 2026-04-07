import { useEffect, useState } from 'react'

interface AgeTimerProps {
  createdAt: string
}

function getElapsedMs(createdAt: string): number {
  return Math.max(0, Date.now() - new Date(createdAt).getTime())
}

function formatElapsed(ms: number): { value: string; unit: string } {
  const totalMinutes = Math.floor(ms / 60_000)
  const totalHours = Math.floor(totalMinutes / 60)
  const totalDays = Math.floor(totalHours / 24)

  if (totalDays >= 1) {
    const remainingHours = totalHours % 24
    return { value: `${totalDays}d ${remainingHours}h`, unit: '' }
  }
  if (totalHours >= 1) {
    const remainingMinutes = totalMinutes % 60
    return { value: `${totalHours}h ${remainingMinutes}m`, unit: '' }
  }
  const totalSeconds = Math.floor(ms / 1000)
  const remainingSeconds = totalSeconds % 60
  return { value: `${totalMinutes}m ${remainingSeconds}s`, unit: '' }
}

function getUrgencyColor(ms: number): string {
  const hours = ms / 3_600_000
  if (hours > 24) return 'text-red-600 dark:text-red-400'
  if (hours > 8) return 'text-red-600 dark:text-red-400'
  if (hours > 4) return 'text-orange-500 dark:text-orange-400'
  if (hours > 2) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}

function shouldPulse(ms: number): boolean {
  return ms / 3_600_000 > 24
}

export function AgeTimer({ createdAt }: AgeTimerProps) {
  const [elapsedMs, setElapsedMs] = useState(() => getElapsedMs(createdAt))

  useEffect(() => {
    setElapsedMs(getElapsedMs(createdAt))
    const interval = setInterval(() => {
      setElapsedMs(getElapsedMs(createdAt))
    }, 1000)
    return () => clearInterval(interval)
  }, [createdAt])

  const { value } = formatElapsed(elapsedMs)
  const colorClass = getUrgencyColor(elapsedMs)
  const pulse = shouldPulse(elapsedMs)

  return (
    <span
      className={[
        'font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums',
        colorClass,
        pulse ? 'animate-pulse' : '',
      ].join(' ')}
    >
      {value}
    </span>
  )
}
