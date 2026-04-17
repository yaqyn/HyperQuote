import { useEffect, useState } from 'react'

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
		return -calculateBusinessTimeBetween(
			deadlineDate,
			now,
			businessStartHour,
			businessEndHour,
		)
	}

	return calculateBusinessTimeBetween(
		now,
		deadlineDate,
		businessStartHour,
		businessEndHour,
	)
}

function calculateBusinessTimeBetween(
	start: Date,
	end: Date,
	businessStartHour: number,
	businessEndHour: number,
): number {
	const current = new Date(start)
	let totalMs = 0

	while (current < end) {
		const dayOfWeek = current.getDay()

		// Skip Friday (5) and Saturday (6) -- Egyptian weekend
		if (dayOfWeek === 5 || dayOfWeek === 6) {
			current.setDate(current.getDate() + 1)
			current.setHours(businessStartHour, 0, 0, 0)
			continue
		}

		const dayStart = new Date(current)
		dayStart.setHours(businessStartHour, 0, 0, 0)

		const dayEnd = new Date(current)
		dayEnd.setHours(businessEndHour, 0, 0, 0)

		const effectiveStart = current < dayStart ? dayStart : current
		const effectiveEnd = end < dayEnd ? end : dayEnd

		if (effectiveStart < effectiveEnd) {
			totalMs += effectiveEnd.getTime() - effectiveStart.getTime()
		}

		current.setDate(current.getDate() + 1)
		current.setHours(businessStartHour, 0, 0, 0)
	}

	return totalMs
}

function formatCountdown(ms: number): string {
	const abMs = Math.abs(ms)
	const totalMinutes = Math.floor(abMs / 60_000)
	const totalHours = Math.floor(totalMinutes / 60)
	const remainingMinutes = totalMinutes % 60
	return `${totalHours}h ${remainingMinutes}m`
}

// Rough SLA total hours per tier for color ratio calculation
const TIER_SLA_HOURS: Record<string, number> = {
	A: 2,
	B: 4,
	C: 8,
	new: 4,
}

function getUrgencyColor(ms: number, totalSlaMs: number): string {
	if (ms <= 0) return 'text-red-600 dark:text-red-400'
	const ratio = ms / totalSlaMs
	if (ratio < 0.25) return 'text-red-600 dark:text-red-400'
	if (ratio < 0.5) return 'text-yellow-600 dark:text-yellow-400'
	return 'text-green-600 dark:text-green-400'
}

export function SLACountdown({ deadline, tier }: SLACountdownProps) {
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
	const totalSlaMsEstimate = slaHours * 3_600_000
	const isOverdue = remainingMs <= 0
	const colorClass = getUrgencyColor(remainingMs, totalSlaMsEstimate)

	return (
		<span
			className={[
				'font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums',
				colorClass,
				isOverdue ? 'animate-pulse' : '',
			].join(' ')}
		>
			{formatCountdown(remainingMs)}{' '}
			<span className="text-[11px]">{isOverdue ? 'overdue' : 'remaining'}</span>
		</span>
	)
}
