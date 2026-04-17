import { useQuery } from '@tanstack/react-query'
import { Flame, MessageCircle } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from 'react-aria-components'
import { useActivityFeed } from '../../hooks/useActivityFeed'
import {
	acknowledgeHandoff,
	getHandoffStatus,
} from '../../lib/server/activity-feed'
import { ActivityItem } from './ActivityItem'
import { MentionInput } from './MentionInput'
import type { ActivityFeedProps, HandoffStatus } from './types'

/** Calculate time remaining until escalation (30min window) */
function getTimeRemaining(assignedAt: string): string {
	const elapsed = Date.now() - new Date(assignedAt).getTime()
	const remaining = 30 * 60_000 - elapsed
	if (remaining <= 0) return '0m'
	const minutes = Math.ceil(remaining / 60_000)
	return `${minutes}m`
}

/** Hot Potato escalation banner */
function HandoffBanner({
	handoff,
	isAssignee,
	onAcknowledge,
}: {
	handoff: HandoffStatus
	isAssignee: boolean
	onAcknowledge: () => void
}) {
	const isEscalated = handoff.isEscalated

	return (
		<div
			className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
				isEscalated
					? 'bg-red-500/10 text-red-600 dark:text-red-400'
					: 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
			}`}
		>
			<Flame className="size-4 shrink-0" />
			{isEscalated ? (
				<span>
					Escalated to{' '}
					<span className="font-medium">{handoff.escalationTarget}</span>
				</span>
			) : (
				<span>
					Assigned to <span className="font-medium">{handoff.assignedTo}</span>
					{' -- '}
					<span className="font-[var(--font-mono)]">
						{getTimeRemaining(handoff.assignedAt)}
					</span>
					{' until escalation'}
				</span>
			)}
			{isAssignee && !handoff.acknowledgedAt && (
				<Button
					onPress={onAcknowledge}
					className="ms-auto rounded-md bg-orange-500 px-3 py-1 text-xs font-medium text-white hover:bg-orange-600"
				>
					Acknowledge
				</Button>
			)}
		</div>
	)
}

/** Loading skeleton */
function LoadingSkeleton() {
	return (
		<div className="flex flex-col gap-2 p-4">
			{[1, 2, 3].map((i) => (
				<div
					key={i}
					className="h-10 animate-pulse rounded-lg bg-[var(--color-surface)]"
				/>
			))}
		</div>
	)
}

/** Empty state */
function EmptyState() {
	return (
		<div className="flex flex-col items-center justify-center gap-2 py-8 text-[var(--color-text-muted)]">
			<MessageCircle className="size-8 opacity-30" />
			<span className="text-sm">No activity yet</span>
		</div>
	)
}

export function ActivityFeed({
	entityType,
	entityId,
	auth,
}: ActivityFeedProps) {
	const { entries, isLoading, postComment, isPosting } = useActivityFeed({
		entityType,
		entityId,
	})
	const scrollRef = useRef<HTMLDivElement>(null)

	// Handoff status query
	const { data: handoff } = useQuery({
		queryKey: ['handoff', entityType, entityId],
		queryFn: () => getHandoffStatus({ data: { entityType, entityId } }),
		staleTime: 30_000,
	})

	// Auto-scroll to bottom on new entries
	useEffect(() => {
		const el = scrollRef.current
		if (el) {
			el.scrollTop = el.scrollHeight
		}
	}, [])

	const handlePostComment = (body: string, isInternal: boolean) => {
		postComment({ body, isInternal })
	}

	const handleAcknowledge = async () => {
		await acknowledgeHandoff({ data: { entityType, entityId } })
	}

	const isAssignee = handoff ? handoff.assignedTo === auth.user.id : false

	return (
		<div className="flex flex-col">
			{/* Header */}
			<div className="px-4 py-2">
				<h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
					Activity
				</h3>
			</div>

			{/* Hot Potato banner */}
			{handoff && !handoff.acknowledgedAt && (
				<div className="px-4 pb-2">
					<HandoffBanner
						handoff={handoff}
						isAssignee={isAssignee}
						onAcknowledge={handleAcknowledge}
					/>
				</div>
			)}

			{/* Entries */}
			{isLoading ? (
				<LoadingSkeleton />
			) : entries.length === 0 ? (
				<EmptyState />
			) : (
				<div
					ref={scrollRef}
					className="flex max-h-[400px] flex-col gap-2 overflow-auto p-4"
				>
					{entries.map((entry) => (
						<ActivityItem key={entry.id} entry={entry} />
					))}
				</div>
			)}

			{/* Input */}
			<div className="px-4 pb-4">
				<MentionInput onSubmit={handlePostComment} isSubmitting={isPosting} />
			</div>
		</div>
	)
}
