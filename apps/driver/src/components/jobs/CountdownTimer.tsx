import { useEffect, useRef, useState } from 'react'

interface CountdownTimerProps {
	expiresAt: string
	onExpired?: () => void
}

function formatRemaining(ms: number): string {
	if (ms <= 0) return '00:00'
	const totalSeconds = Math.floor(ms / 1000)
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds % 60
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function CountdownTimer({ expiresAt, onExpired }: CountdownTimerProps) {
	const [remaining, setRemaining] = useState(() => {
		return new Date(expiresAt).getTime() - Date.now()
	})
	const expiredCalled = useRef(false)

	useEffect(() => {
		expiredCalled.current = false

		const update = () => {
			const ms = new Date(expiresAt).getTime() - Date.now()
			setRemaining(ms)

			if (ms <= 0 && !expiredCalled.current) {
				expiredCalled.current = true
				onExpired?.()
			}
		}

		update()
		const interval = setInterval(update, 1000)
		return () => clearInterval(interval)
	}, [expiresAt, onExpired])

	const isUrgent = remaining > 0 && remaining < 5 * 60 * 1000

	return (
		<span
			className={`font-[var(--font-mono)] text-2xl font-medium ${
				isUrgent ? 'text-[var(--color-danger)]' : 'text-[var(--text-primary)]'
			}`}
		>
			{formatRemaining(remaining)}
		</span>
	)
}
