/**
 * The Evidence — POD validation list with review split-view.
 * Filter tabs, click to open PODReviewSplit.
 */
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getDispatchBoard } from '../../../lib/server/dispatch'
import { PODReviewSplit } from './PODReviewSplit'
import type { PODRecord, RouteStop } from '../../../types/dispatch'

type FilterTab = 'needs_review' | 'confirmed' | 'flagged' | 'all'
type ReviewStatus = 'needs_review' | 'confirmed' | 'flagged'
interface DeliveryEntry { pod: PODRecord; stop: RouteStop | undefined; status: ReviewStatus }

const MOCK_PODS: PODRecord[] = [
  {
    id: 'pod-001',
    deliveryId: 'del-001',
    driverId: 'drv-001',
    photos: [
      'https://cdn.hyperquote.io/pod/del-001-front.jpg',
      'https://cdn.hyperquote.io/pod/del-001-offload.jpg',
    ],
    signatureUrl: 'https://cdn.hyperquote.io/pod/del-001-sig.png',
    gpsLat: 29.9602,
    gpsLng: 31.2569,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    deliveredQty: { 'cement-50kg': 200, 'rebar-12mm': 50 },
    driverNotes: 'Delivered to site entrance. Foreman signed.',
    durationMinutes: 28,
    autoChecksPassed: true,
  },
  {
    id: 'pod-002',
    deliveryId: 'del-006',
    driverId: 'drv-002',
    photos: ['https://cdn.hyperquote.io/pod/del-006-front.jpg'],
    signatureUrl: 'https://cdn.hyperquote.io/pod/del-006-sig.png',
    gpsLat: 30.087,
    gpsLng: 31.328,
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    deliveredQty: { 'marble-slab': 30, 'granite-tile': 100 },
    driverNotes: 'Boom crane used for marble slabs. Minor chip noted on 2 slabs.',
    durationMinutes: 45,
    autoChecksPassed: false,
  },
  {
    id: 'pod-003',
    deliveryId: 'del-007',
    driverId: 'drv-002',
    photos: [
      'https://cdn.hyperquote.io/pod/del-007-front.jpg',
      'https://cdn.hyperquote.io/pod/del-007-side.jpg',
    ],
    signatureUrl: 'https://cdn.hyperquote.io/pod/del-007-sig.png',
    gpsLat: 30.0495,
    gpsLng: 31.35,
    timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
    deliveredQty: { 'steel-beam-6m': 15, 'bolt-set': 200 },
    driverNotes: '',
    durationMinutes: 18,
    autoChecksPassed: true,
  },
]

const MOCK_EXPECTED_QTY: Record<string, Record<string, number>> = {
  'del-001': { 'cement-50kg': 200, 'rebar-12mm': 50 },
  'del-006': { 'marble-slab': 35, 'granite-tile': 100 },
  'del-007': { 'steel-beam-6m': 15, 'bolt-set': 200 },
}

const MOCK_STATUS: Record<string, ReviewStatus> = {
  'del-001': 'needs_review',
  'del-006': 'needs_review',
  'del-007': 'needs_review',
}

const DRIVER_NAMES: Record<string, string> = {
  'drv-001': 'Ahmed Hassan',
  'drv-002': 'Mohamed Saeed',
  'drv-003': 'Khaled Ibrahim',
  'drv-004': 'Youssef Farid',
}

const STATUS_DOTS: Record<ReviewStatus, string> = {
  needs_review: 'bg-amber-500',
  confirmed: 'bg-green-500',
  flagged: 'bg-red-500',
}

export function PODValidationView() {
  const { t } = useTranslation('dispatch')
  const [activeFilter, setActiveFilter] = useState<FilterTab>('needs_review')
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null)
  const [reviewStatuses, setReviewStatuses] = useState(MOCK_STATUS)

  const { data: board } = useQuery({
    queryKey: ['dispatch', 'board'],
    queryFn: () => getDispatchBoard(),
    staleTime: 15_000,
  })

  const stopMap = useMemo(() => {
    const map = new Map<string, RouteStop>()
    if (board) {
      for (const route of board.routes) {
        for (const stop of route.stops) {
          map.set(stop.deliveryId, stop)
        }
      }
    }
    return map
  }, [board])

  const deliveries = useMemo(() => {
    return MOCK_PODS.map((pod) => {
      const stop = stopMap.get(pod.deliveryId)
      const status = reviewStatuses[pod.deliveryId] ?? 'needs_review'
      return { pod, stop, status }
    })
  }, [stopMap, reviewStatuses])

  const filtered = useMemo(() => {
    const STATUS_PRIORITY: Record<ReviewStatus, number> = {
      needs_review: 0,
      flagged: 1,
      confirmed: 2,
    }
    let result = activeFilter === 'all' ? deliveries : deliveries.filter((d: DeliveryEntry) => d.status === activeFilter)
    // Always sort needs_review to top, then flagged, then confirmed
    return [...result].sort((a: DeliveryEntry, b: DeliveryEntry) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status])
  }, [deliveries, activeFilter])

  const selected = deliveries.find((d: DeliveryEntry) => d.pod.deliveryId === selectedDeliveryId)

  const handleActionComplete = () => {
    if (selectedDeliveryId) {
      setReviewStatuses((prev: Record<string, ReviewStatus>) => ({ ...prev, [selectedDeliveryId]: 'confirmed' }))
    }
    setSelectedDeliveryId(null)
  }

  // Split-view when selected
  if (selected?.stop) {
    return (
      <PODReviewSplit
        pod={selected.pod}
        stop={selected.stop}
        expectedQty={MOCK_EXPECTED_QTY[selected.pod.deliveryId] ?? {}}
        onBack={() => setSelectedDeliveryId(null)}
        onActionComplete={handleActionComplete}
      />
    )
  }

  const FILTER_TABS: Array<{ key: FilterTab; label: string }> = [
    { key: 'needs_review', label: t('pod.filter.needsReview', 'Needs Review') },
    { key: 'confirmed', label: t('pod.filter.confirmed', 'Confirmed') },
    { key: 'flagged', label: t('pod.filter.flagged', 'Flagged') },
    { key: 'all', label: t('pod.filter.all', 'All') },
  ]

  const needsReviewCount = deliveries.filter((d: DeliveryEntry) => d.status === 'needs_review').length
  const flaggedCount = deliveries.filter((d: DeliveryEntry) => d.status === 'flagged').length
  const confirmedCount = deliveries.filter((d: DeliveryEntry) => d.status === 'confirmed').length

  return (
    <div className="flex h-full flex-col overflow-auto p-6">
      {/* Stats banner */}
      {deliveries.length > 0 && (
        <div className="mb-4 flex items-center gap-4 rounded-xl border border-black/[0.06] bg-white/60 px-4 py-3 dark:border-white/[0.06] dark:bg-black/60">
          <div className="flex items-center gap-2">
            <span className="font-[family-name:var(--font-geist-mono)] text-lg font-semibold tabular-nums">
              {confirmedCount}/{deliveries.length}
            </span>
            <span className="text-sm text-black/50 dark:text-white/50">
              {t('pod.reviewed', 'reviewed')}
            </span>
          </div>
          {needsReviewCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{needsReviewCount}</span>
                {' '}{t('pod.pendingReview', 'pending review')}
              </span>
            </div>
          )}
          {flaggedCount > 0 && (
            <div className="ms-auto flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{flaggedCount}</span>
                {' '}{t('pod.flagged', 'flagged')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Filter pills */}
      <div className="mb-4 flex gap-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveFilter(tab.key)}
            className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
              activeFilter === tab.key
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'text-black/40 hover:text-black/60 dark:text-white/40 dark:hover:text-white/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Delivery list — compact rows */}
      <div className="flex flex-col">
        {filtered.map(({ pod, stop, status }: DeliveryEntry) => {
          const time = new Date(pod.timestamp)
          return (
            <button
              key={pod.id}
              type="button"
              onClick={() => setSelectedDeliveryId(pod.deliveryId)}
              className="flex items-center gap-4 border-b border-black/[0.04] px-2 py-3 text-start transition-colors hover:bg-black/[0.02] dark:border-white/[0.04] dark:hover:bg-white/[0.02]"
            >
              {/* Status dot */}
              <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOTS[status]}`} />

              {/* Order + driver */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums font-medium">
                    {stop?.orderId ?? pod.deliveryId}
                  </span>
                  <span className="text-xs text-black/40 dark:text-white/40">
                    {DRIVER_NAMES[pod.driverId] ?? pod.driverId}
                  </span>
                </div>
                <p className="truncate text-xs text-black/50 dark:text-white/50">
                  {stop?.address ?? `${pod.gpsLat.toFixed(3)}, ${pod.gpsLng.toFixed(3)}`}
                </p>
              </div>

              {/* Time */}
              <span className="shrink-0 font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-black/40 dark:text-white/40">
                {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>

              {/* POD auto-check indicator */}
              {pod.autoChecksPassed ? (
                <svg className="h-4 w-4 shrink-0 text-green-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-4 w-4 shrink-0 text-amber-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              )}

              {/* Review arrow */}
              <svg className="h-4 w-4 shrink-0 text-black/20 rtl:rotate-180 dark:text-white/20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          )
        })}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-black/30 dark:text-white/30">
            {t('pod.noDeliveries', 'No deliveries to display')}
          </p>
        )}
      </div>
    </div>
  )
}
