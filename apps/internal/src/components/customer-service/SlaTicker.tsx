import { useEffect, useState } from 'react'

/**
 * Live SLA countdown — ticks every second. The single visual cue for
 * "how long until this breaches" on an operator's console.
 *
 * Color ladder:
 *   - neutral: plenty of time left
 *   - amber:   ≤ 30% of the original window remaining
 *   - red:     breached (createdAt → deadline window exhausted)
 *
 * Formatting tightens to the scale of what's left:
 *   - < 60s      : "00:45"   (seconds visible, mm:ss)
 *   - < 60m      : "08:24"   (mm:ss, still heartbeat-level)
 *   - < 24h      : "3h 12m"
 *   - otherwise  : "2d 6h"
 */
export type SlaTone = 'neutral' | 'amber' | 'red'

interface SlaTickerProps {
	/** ISO timestamp when the ticket was created (used for the original window). */
	createdAt: string
	/** ISO timestamp of the SLA deadline. */
	deadline: string
	/**
	 * When true, the ticker is already past its deadline per the server's
	 * computed flag. Kept separate from the live clock so we don't flip
	 * state purely on client-drift seconds.
	 */
	breached?: boolean
	/** Hide the leading label ("SLA") when the caller already provides a label. */
	bare?: boolean
	className?: string
}

function formatRemaining(ms: number): string {
	const absMs = Math.abs(ms)
	const totalSec = Math.floor(absMs / 1000)
	const days = Math.floor(totalSec / 86400)
	const hours = Math.floor((totalSec % 86400) / 3600)
	const minutes = Math.floor((totalSec % 3600) / 60)
	const seconds = totalSec % 60

	if (days > 0) return `${days}d ${hours}h`
	if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, '0')}m`
	return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function useTick(enabled: boolean): number {
	const [now, setNow] = useState(() => Date.now())
	useEffect(() => {
		if (!enabled) return
		const id = window.setInterval(() => setNow(Date.now()), 1000)
		return () => window.clearInterval(id)
	}, [enabled])
	return now
}

export function SlaTicker({
	createdAt,
	deadline,
	breached,
	bare,
	className = '',
}: SlaTickerProps) {
	const now = useTick(true)
	const deadlineMs = new Date(deadline).getTime()
	const createdMs = new Date(createdAt).getTime()
	const remaining = deadlineMs - now
	const windowMs = Math.max(1, deadlineMs - createdMs)
	const pctLeft = remaining / windowMs

	let tone: SlaTone = 'neutral'
	if (breached || remaining <= 0) tone = 'red'
	else if (pctLeft <= 0.3) tone = 'amber'

	const toneClass =
		tone === 'red'
			? 'text-[var(--color-signal-red)]'
			: tone === 'amber'
				? 'text-[var(--color-signal-amber)]'
				: 'text-[var(--color-text-muted)]'

	const display =
		tone === 'red'
			? `-${formatRemaining(remaining)}`
			: formatRemaining(remaining)

	return (
		<span
			role="timer"
			className={`font-[family-name:var(--font-jetbrains-mono)] tabular-nums font-medium ${toneClass} ${className}`}
			aria-label={`SLA ${display}`}
		>
			{!bare && (
				<span className="opacity-60 text-[0.8em] tracking-[0.1em] me-1.5">
					SLA
				</span>
			)}
			{display}
		</span>
	)
}

// ─── Priority mark — single character, no colored pills ───

const PRIORITY_MARKS: Record<string, string> = {
	urgent: '■',
	high: '▲',
	medium: '●',
	low: '○',
}

export function PriorityMark({ priority }: { priority: string }) {
	const mark = PRIORITY_MARKS[priority] ?? '·'
	const tone =
		priority === 'urgent'
			? 'text-[var(--color-signal-red)]'
			: priority === 'high'
				? 'text-[var(--color-signal-amber)]'
				: priority === 'medium'
					? 'text-[var(--color-text-muted)]'
					: 'text-[var(--color-text-subtle)]'

	return (
		<span
			role="img"
			aria-label={`priority ${priority}`}
			className={`font-[family-name:var(--font-jetbrains-mono)] text-[11px] leading-none ${tone}`}
		>
			{mark}
		</span>
	)
}

// ─── Live dot — pulsing for active inbound, solid muted otherwise ───

export function LiveDot({
	active,
	tone = 'primary',
}: {
	active: boolean
	tone?: 'primary' | 'amber' | 'red' | 'muted'
}) {
	const colors: Record<string, string> = {
		primary: 'bg-[var(--color-primary)]',
		amber: 'bg-[var(--color-signal-amber)]',
		red: 'bg-[var(--color-signal-red)]',
		muted: 'bg-[var(--color-text-subtle)]/60',
	}
	return (
		<span
			aria-hidden
			className={`inline-block w-[6px] h-[6px] rounded-full ${colors[tone]} ${
				active ? 'animate-switchboard-pulse' : ''
			}`}
		/>
	)
}
