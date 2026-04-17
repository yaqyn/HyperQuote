import { useEffect, useState } from 'react'

interface DeadlineCountdownProps {
	deadline: string
}

function getRemainingMs(deadline: string): number {
	return Math.max(0, new Date(deadline).getTime() - Date.now())
}

function formatRemaining(ms: number): string {
	if (ms <= 0) return '0h 0m'

	const totalMinutes = Math.floor(ms / 60_000)
	const totalHours = Math.floor(totalMinutes / 60)
	const days = Math.floor(totalHours / 24)
	const hours = totalHours % 24
	const minutes = totalMinutes % 60

	if (days > 0) return `${days}d ${hours}h`
	if (hours > 0) return `${hours}h ${minutes}m`
	return `${minutes}m`
}

function getUrgencyClass(ms: number): string {
	const hours = ms / (1000 * 60 * 60)

	if (hours <= 0) return 'text-[var(--color-text)] animate-pulse'
	if (hours < 4) return 'text-[var(--color-text)]'
	if (hours < 24) return 'text-[var(--color-text-muted)]'
	return 'text-[var(--color-text-subtle)]'
}

export function DeadlineCountdown({ deadline }: DeadlineCountdownProps) {
	const [remainingMs, setRemainingMs] = useState(() => getRemainingMs(deadline))

	useEffect(() => {
		setRemainingMs(getRemainingMs(deadline))

		const interval = setInterval(() => {
			setRemainingMs(getRemainingMs(deadline))
		}, 60_000) // Update every minute (deadlines are hours/days away)

		return () => clearInterval(interval)
	}, [deadline])

	return (
		<span
			className={`font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums ${getUrgencyClass(remainingMs)}`}
		>
			{formatRemaining(remainingMs)}
		</span>
	)
}
