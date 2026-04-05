import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface SLACountdownProps {
  deadline: string
  tier: string
}

/**
 * Calculate remaining business time in milliseconds, skipping Fri-Sat (Egyptian weekend).
 * Business hours: Sun-Thu, configurable start/end (default 9:00-18:00 Cairo time).
 */
export function calculateBusinessTimeRemaining(
  deadline: string,
  now: Date,
  businessStartHour = 9,
  businessEndHour = 18,
): number {
  const deadlineDate = new Date(deadline)

  if (deadlineDate <= now) {
    // Overdue: return negative elapsed business time
    return -(calculateBusinessTimeBetween(deadlineDate, now, businessStartHour, businessEndHour))
  }

  return calculateBusinessTimeBetween(now, deadlineDate, businessStartHour, businessEndHour)
}

function calculateBusinessTimeBetween(
  start: Date,
  end: Date,
  businessStartHour: number,
  businessEndHour: number,
): number {
  const businessDayMs = (businessEndHour - businessStartHour) * 60 * 60 * 1000
  let totalMs = 0
  const current = new Date(start)

  while (current < end) {
    const dayOfWeek = current.getDay() // 0=Sun, 5=Fri, 6=Sat

    // Skip Friday (5) and Saturday (6) -- Egyptian weekend
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      current.setDate(current.getDate() + 1)
      current.setHours(businessStartHour, 0, 0, 0)
      continue
    }

    // Clamp to business hours
    const dayStart = new Date(current)
    dayStart.setHours(businessStartHour, 0, 0, 0)

    const dayEnd = new Date(current)
    dayEnd.setHours(businessEndHour, 0, 0, 0)

    const effectiveStart = current < dayStart ? dayStart : current
    const effectiveEnd = end < dayEnd ? end : dayEnd

    if (effectiveStart < effectiveEnd) {
      totalMs += effectiveEnd.getTime() - effectiveStart.getTime()
    }

    // Move to next day start
    current.setDate(current.getDate() + 1)
    current.setHours(businessStartHour, 0, 0, 0)
  }

  return totalMs
}

function formatCountdown(ms: number): string {
  const abMs = Math.abs(ms)
  const totalMinutes = Math.floor(abMs / (1000 * 60))
  const totalHours = Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60

  return `${totalHours}h ${remainingMinutes}m`
}

function getColorClass(ms: number, totalSlaMs: number): string {
  if (ms <= 0) return 'text-red-600 animate-pulse' // overdue
  const ratio = ms / totalSlaMs
  if (ratio < 0.25) return 'text-red-600'
  if (ratio < 0.5) return 'text-yellow-600'
  return 'text-green-600'
}

// Rough SLA total hours per tier for color ratio calculation
const TIER_SLA_HOURS: Record<string, number> = {
  A: 2,
  B: 4,
  C: 8,
  new: 4,
}

export function SLACountdown({ deadline, tier }: SLACountdownProps) {
  const { t } = useTranslation('internal')
  const [remainingMs, setRemainingMs] = useState(() =>
    calculateBusinessTimeRemaining(deadline, new Date()),
  )

  useEffect(() => {
    setRemainingMs(calculateBusinessTimeRemaining(deadline, new Date()))

    const interval = setInterval(() => {
      setRemainingMs(calculateBusinessTimeRemaining(deadline, new Date()))
    }, 1000)

    return () => clearInterval(interval)
  }, [deadline])

  const slaHours = TIER_SLA_HOURS[tier] ?? 4
  const totalSlaMsEstimate = slaHours * 60 * 60 * 1000
  const isOverdue = remainingMs <= 0

  return (
    <span
      className={`font-[family-name:var(--font-geist-mono)] text-sm tabular-nums ${getColorClass(remainingMs, totalSlaMsEstimate)}`}
    >
      {formatCountdown(remainingMs)} {isOverdue ? 'overdue' : 'remaining'}
    </span>
  )
}
