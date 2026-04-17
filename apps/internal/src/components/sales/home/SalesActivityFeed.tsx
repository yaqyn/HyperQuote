import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
	Activity,
	AlertCircle,
	CreditCard,
	Eye,
	FileText,
	Mail,
	Trophy,
	Truck,
	UserPlus,
	XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from 'react-aria-components'
import { getActivityFeed } from '../../../lib/server/sales-activity'
import type { ActivityEvent } from '../../../types/sales'

type FilterType = 'all' | 'rfq' | 'quote' | 'order' | 'payment' | 'comms'

const FILTERS: { id: FilterType; label: string }[] = [
	{ id: 'all', label: 'All' },
	{ id: 'rfq', label: 'RFQs' },
	{ id: 'quote', label: 'Quotes' },
	{ id: 'order', label: 'Orders' },
	{ id: 'payment', label: 'Payments' },
	{ id: 'comms', label: 'Comms' },
]

const TYPE_TO_FILTER: Record<string, FilterType> = {
	rfq_new: 'rfq',
	quote_viewed: 'quote',
	quote_sent: 'quote',
	quote_won: 'quote',
	quote_lost: 'quote',
	payment_received: 'payment',
	delivery_confirmed: 'order',
	customer_claimed: 'comms',
	approval_requested: 'quote',
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
	rfq_new: <FileText className="size-3.5" />,
	quote_viewed: <Eye className="size-3.5" />,
	quote_sent: <Mail className="size-3.5" />,
	quote_won: <Trophy className="size-3.5 text-green-600" />,
	quote_lost: <XCircle className="size-3.5 text-red-500" />,
	payment_received: <CreditCard className="size-3.5" />,
	delivery_confirmed: <Truck className="size-3.5" />,
	customer_claimed: <UserPlus className="size-3.5" />,
	approval_requested: <AlertCircle className="size-3.5" />,
}

function getRelativeTime(timestamp: string): string {
	const diff = Date.now() - new Date(timestamp).getTime()
	const minutes = Math.floor(diff / 60_000)
	if (minutes < 1) return 'now'
	if (minutes < 60) return `${minutes}m`
	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `${hours}h`
	const days = Math.floor(hours / 24)
	return `${days}d`
}

export function SalesActivityFeed() {
	const queryClient = useQueryClient()
	const [filter, setFilter] = useState<FilterType>('all')
	const [visibleCount, setVisibleCount] = useState(10)

	const { data, isLoading } = useQuery({
		queryKey: ['sales-activity', filter],
		queryFn: () =>
			getActivityFeed({
				data: {
					filters: filter !== 'all' ? { type: filter } : {},
					page: 1,
					limit: 50,
				},
			}),
		staleTime: 30_000,
		refetchInterval: 30_000,
	})

	useEffect(() => {
		let channel: ReturnType<typeof Object.create> | null = null

		async function setupRealtime() {
			try {
				const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
				const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
				if (!supabaseUrl || !supabaseAnonKey) return

				const { createClient } = await import('@supabase/supabase-js')
				const supabase = createClient(supabaseUrl, supabaseAnonKey)

				channel = supabase
					.channel('sales-activity')
					.on(
						'postgres_changes',
						{ event: 'INSERT', schema: 'public', table: 'activity_events' },
						() => {
							queryClient.invalidateQueries({ queryKey: ['sales-activity'] })
						},
					)
					.subscribe()
			} catch {
				// Polling fallback handles updates
			}
		}

		setupRealtime()
		return () => {
			if (channel && typeof channel.unsubscribe === 'function') {
				channel.unsubscribe()
			}
		}
	}, [queryClient])

	const filteredActivities = useMemo(() => {
		const activities = data?.activities ?? []
		if (filter === 'all') return activities
		return activities.filter((evt) => TYPE_TO_FILTER[evt.type] === filter)
	}, [data?.activities, filter])

	const visibleActivities = filteredActivities.slice(0, visibleCount)
	const hasMore = visibleCount < filteredActivities.length

	const handleLoadMore = useCallback(() => {
		setVisibleCount((prev) => prev + 10)
	}, [])

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex items-center justify-between mb-3">
				<p className="text-xs font-medium text-[var(--color-text-subtle)] uppercase tracking-wider">
					Activity
				</p>
			</div>

			{/* Filter pills */}
			<div className="flex gap-1 mb-3">
				{FILTERS.map((tab) => (
					<Button
						key={tab.id}
						onPress={() => {
							setFilter(tab.id)
							setVisibleCount(10)
						}}
						className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-150 cursor-pointer outline-none ${
							filter === tab.id
								? 'bg-[var(--color-text)] text-[var(--color-surface)]'
								: 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
						}`}
					>
						{tab.label}
					</Button>
				))}
			</div>

			{/* Activity list */}
			<div className="flex-1 min-h-0 overflow-y-auto" data-module-content>
				{isLoading ? (
					<div className="flex flex-col gap-2">
						{[1, 2, 3].map((i) => (
							<div
								key={i}
								className="h-10 animate-pulse rounded-lg bg-black/[0.03] dark:bg-white/[0.03]"
							/>
						))}
					</div>
				) : filteredActivities.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-2 py-12 text-[var(--color-text-subtle)]">
						<Activity className="size-6 opacity-30" />
						<span className="text-xs">No recent activity</span>
					</div>
				) : (
					<div className="flex flex-col">
						{visibleActivities.map((event) => (
							<ActivityRow key={event.id} event={event} />
						))}
						{hasMore && (
							<Button
								onPress={handleLoadMore}
								className="mt-2 py-1.5 text-[11px] font-medium text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition-colors cursor-pointer outline-none"
							>
								Load more
							</Button>
						)}
					</div>
				)}
			</div>
		</div>
	)
}

function ActivityRow({ event }: { event: ActivityEvent }) {
	return (
		<div className="flex items-start gap-2.5 py-2.5 group">
			<div className="mt-0.5 shrink-0 text-[var(--color-text-subtle)]">
				{TYPE_ICONS[event.type] ?? <Activity className="size-3.5" />}
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-[13px] leading-snug text-[var(--color-text)]">
					{event.description}
				</p>
				<span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
					{getRelativeTime(event.timestamp)}
				</span>
			</div>
			{event.actionLabel && event.actionUrl && (
				<Button
					onPress={() => {
						if (event.actionUrl) {
							window.location.href = event.actionUrl
						}
					}}
					className="shrink-0 opacity-0 group-hover:opacity-100 px-2 py-1 rounded text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-all duration-150 cursor-pointer outline-none"
				>
					{event.actionLabel}
				</Button>
			)}
		</div>
	)
}
