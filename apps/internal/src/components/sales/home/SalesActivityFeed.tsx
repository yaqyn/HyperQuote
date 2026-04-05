import { useState, useCallback, useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import {
  FileText,
  Eye,
  CreditCard,
  Truck,
  Trophy,
  XCircle,
  Mail,
  UserPlus,
  AlertCircle,
  Activity,
} from 'lucide-react'
import { getActivityFeed } from '../../../lib/server/sales-activity'
import type { ActivityEvent } from '../../../types/sales'

type FilterType = 'all' | 'rfq' | 'quote' | 'order' | 'payment' | 'comms'

const FILTER_TABS: { id: FilterType; label: string }[] = [
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
  rfq_new: <FileText className="size-4" />,
  quote_viewed: <Eye className="size-4" />,
  quote_sent: <Mail className="size-4" />,
  quote_won: <Trophy className="size-4 text-green-600" />,
  quote_lost: <XCircle className="size-4 text-red-500" />,
  payment_received: <CreditCard className="size-4" />,
  delivery_confirmed: <Truck className="size-4" />,
  customer_claimed: <UserPlus className="size-4" />,
  approval_requested: <AlertCircle className="size-4" />,
}

function getRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  return (
    <div className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-black/5 dark:hover:bg-white/5">
      <div className="mt-0.5 shrink-0 text-black/40 dark:text-white/40">
        {TYPE_ICONS[event.type] ?? <Activity className="size-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug text-black/80 dark:text-white/80">
          {event.description}
        </p>
        <span className="font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-black/40 dark:text-white/40">
          {getRelativeTime(event.timestamp)}
        </span>
      </div>
      {event.actionLabel && event.actionUrl && (
        <Button
          onPress={() => {
            // Navigate to action URL (within SPA)
            window.location.href = event.actionUrl!
          }}
          className="shrink-0 rounded-md border border-black/10 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
        >
          {event.actionLabel}
        </Button>
      )}
    </div>
  )
}

export function SalesActivityFeed() {
  const { t } = useTranslation('internal')
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<FilterType>('all')
  const [visibleCount, setVisibleCount] = useState(10)

  // Fetch activity feed
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
    // Polling fallback when Supabase Realtime not available (dev/mock mode)
    refetchInterval: 30_000,
  })

  // Supabase Realtime subscription for live updates
  useEffect(() => {
    let channel: ReturnType<typeof Object.create> | null = null

    async function setupRealtime() {
      try {
        // Dynamic import to avoid bundling supabase client in non-configured envs
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
              // Invalidate query cache to trigger refetch on new activity
              queryClient.invalidateQueries({ queryKey: ['sales-activity'] })
            },
          )
          .subscribe()
      } catch {
        // Supabase not available -- polling fallback handles updates
      }
    }

    setupRealtime()

    return () => {
      if (channel && typeof channel.unsubscribe === 'function') {
        channel.unsubscribe()
      }
    }
  }, [queryClient])

  // Client-side filter by type category
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
    <div className="flex flex-col">
      {/* Header + filter tabs */}
      <div className="flex items-center justify-between px-1 pb-2">
        <h3 className="text-sm font-medium text-black/60 dark:text-white/60">
          {t('sales.home.activityFeed', 'Activity Feed')}
        </h3>
      </div>

      {/* Filter tabs */}
      <div className="mb-2 flex gap-1 px-1">
        {FILTER_TABS.map((tab) => (
          <Button
            key={tab.id}
            onPress={() => {
              setFilter(tab.id)
              setVisibleCount(10)
            }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              filter === tab.id
                ? 'bg-[#2563EB] text-white'
                : 'text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/5'
            }`}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Activity list */}
      {isLoading ? (
        <div className="flex flex-col gap-2 p-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-black/5 dark:bg-white/5" />
          ))}
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-black/30 dark:text-white/30">
          <Activity className="size-8 opacity-30" />
          <span className="text-sm">
            {t('sales.home.noActivity', 'No recent activity')}
          </span>
        </div>
      ) : (
        <div className="flex flex-col">
          {visibleActivities.map((event) => (
            <ActivityRow key={event.id} event={event} />
          ))}
          {hasMore && (
            <Button
              onPress={handleLoadMore}
              className="mx-3 mt-2 rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
            >
              {t('sales.home.loadMore', 'Load more')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
