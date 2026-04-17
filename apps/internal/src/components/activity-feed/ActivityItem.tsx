import { Activity, Flame } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ActivityEntry } from './types'

/** Parse @[name](userId) mentions in body text into styled badges */
function renderBody(body: string): ReactNode {
	const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
	const parts: ReactNode[] = []
	let lastIndex = 0
	let match: RegExpExecArray | null = mentionRegex.exec(body)

	while (match !== null) {
		if (match.index > lastIndex) {
			parts.push(body.slice(lastIndex, match.index))
		}
		parts.push(
			<span
				key={match[2]}
				className="inline-flex items-center gap-0.5 px-1 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-medium"
			>
				@{match[1]}
			</span>,
		)
		lastIndex = match.index + match[0].length
		match = mentionRegex.exec(body)
	}

	if (lastIndex < body.length) {
		parts.push(body.slice(lastIndex))
	}

	return parts.length > 0 ? parts : body
}

/** Format a relative timestamp from ISO string */
function relativeTime(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime()
	const minutes = Math.floor(diff / 60_000)
	if (minutes < 1) return 'Just now'
	if (minutes < 60) return `${minutes}m ago`
	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `${hours}h ago`
	const days = Math.floor(hours / 24)
	if (days === 1) return 'Yesterday'
	return `${days}d ago`
}

/** Extract initials (first letter) from a name */
function initials(name: string): string {
	return name.charAt(0).toUpperCase()
}

interface ActivityItemProps {
	entry: ActivityEntry
}

export function ActivityItem({ entry }: ActivityItemProps) {
	const isSystem = entry.type === 'system'
	const isHandoff = entry.type === 'handoff'
	const isInternal =
		entry.type === 'comment_internal' || entry.type === 'mention'

	// System events: minimal styling, no avatar
	if (isSystem) {
		return (
			<div className="flex items-center gap-2 py-1.5 px-2">
				<Activity className="size-3.5 text-[var(--color-text-muted)] shrink-0" />
				<span className="text-xs italic text-[var(--color-text-muted)]">
					{entry.body}
				</span>
				<span className="text-xs text-[var(--color-text-muted)] font-[var(--font-mono)] ms-auto shrink-0">
					{relativeTime(entry.createdAt)}
				</span>
			</div>
		)
	}

	// Border color based on type
	const borderClass = isHandoff
		? 'border-s-2 border-orange-500'
		: isInternal
			? 'border-s-2 border-[var(--color-primary)]'
			: 'border-s-2 border-[var(--color-border)]'

	return (
		<div className={`flex gap-3 py-2 ps-3 pe-2 ${borderClass}`}>
			{/* Avatar */}
			{isHandoff ? (
				<div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
					<Flame className="size-3.5" />
				</div>
			) : (
				<div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-semibold">
					{initials(entry.actorName)}
				</div>
			)}

			{/* Content */}
			<div className="flex flex-1 flex-col gap-0.5 min-w-0">
				<div className="flex items-baseline gap-1.5">
					<span className="text-sm font-medium text-[var(--color-text)]">
						{entry.actorName}
					</span>
					{entry.actorRole && (
						<span className="text-xs text-[var(--color-text-muted)]">
							{entry.actorRole}
						</span>
					)}
					<span className="text-xs text-[var(--color-text-muted)] font-[var(--font-mono)] ms-auto shrink-0">
						{relativeTime(entry.createdAt)}
					</span>
				</div>
				<div className="text-sm text-[var(--color-text)]">
					{renderBody(entry.body)}
				</div>
			</div>
		</div>
	)
}
