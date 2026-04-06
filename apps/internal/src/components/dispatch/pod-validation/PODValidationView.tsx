/**
 * POD Validation View — delivery list with review filter + POD review split-view.
 * Default: list of deliveries needing review.
 * On select: opens PODReviewSplit for that delivery.
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

// ─── Mock POD records (inline, matching server mock data) ──

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

// Mock expected quantities per delivery
const MOCK_EXPECTED_QTY: Record<string, Record<string, number>> = {
  'del-001': { 'cement-50kg': 200, 'rebar-12mm': 50 },
  'del-006': { 'marble-slab': 35, 'granite-tile': 100 },
  'del-007': { 'steel-beam-6m': 15, 'bolt-set': 200 },
}

// Mock review status
const MOCK_STATUS: Record<string, 'needs_review' | 'confirmed' | 'flagged'> = {
  'del-001': 'needs_review',
  'del-006': 'needs_review',
  'del-007': 'needs_review',
}

// ─── Driver name map ───────────────────────────────────

const DRIVER_NAMES: Record<string, string> = {
  'drv-001': 'Ahmed Hassan',
  'drv-002': 'Mohamed Saeed',
  'drv-003': 'Khaled Ibrahim',
  'drv-004': 'Youssef Farid',
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

  // Build stop lookup from routes
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

  // Merge POD records with route stop data
  const deliveries = useMemo(() => {
    return MOCK_PODS.map((pod) => {
      const stop = stopMap.get(pod.deliveryId)
      const status = reviewStatuses[pod.deliveryId] ?? 'needs_review'
      return { pod, stop, status }
    })
  }, [stopMap, reviewStatuses])

  // Filter by active tab
  const filtered = useMemo(() => {
    if (activeFilter === 'all') return deliveries
    return deliveries.filter((d: DeliveryEntry) => d.status === activeFilter)
  }, [deliveries, activeFilter])

  // Selected delivery for review
  const selected = deliveries.find((d: DeliveryEntry) => d.pod.deliveryId === selectedDeliveryId)

  const handleActionComplete = () => {
    if (selectedDeliveryId) {
      setReviewStatuses((prev: Record<string, ReviewStatus>) => ({ ...prev, [selectedDeliveryId]: 'confirmed' }))
    }
    setSelectedDeliveryId(null)
  }

  // ─── Review split-view ────────────────────────────────

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

  // ─── Delivery list ────────────────────────────────────

  const FILTER_TABS: Array<{ key: FilterTab; label: string }> = [
    { key: 'needs_review', label: t('pod.filter.needsReview', 'Needs Review') },
    { key: 'confirmed', label: t('pod.filter.confirmed', 'Confirmed') },
    { key: 'flagged', label: t('pod.filter.flagged', 'Flagged') },
    { key: 'all', label: t('pod.filter.all', 'All') },
  ]

  return (
    <div className="p-6 flex flex-col gap-4">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveFilter(tab.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              activeFilter === tab.key
                ? 'bg-[#2563EB] text-white'
                : 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Delivery table */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">
                {t('pod.table.order', 'Order #')}
              </th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">
                {t('pod.table.driver', 'Driver')}
              </th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">
                {t('pod.table.location', 'Location')}
              </th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">
                {t('pod.table.time', 'Time')}
              </th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">
                {t('pod.table.status', 'Status')}
              </th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">
                {t('pod.table.pod', 'POD')}
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ pod, stop, status }: DeliveryEntry) => {
              const time = new Date(pod.timestamp)
              return (
                <tr
                  key={pod.id}
                  className="border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {stop?.orderId ?? pod.deliveryId}
                  </td>
                  <td className="px-4 py-3">
                    {DRIVER_NAMES[pod.driverId] ?? pod.driverId}
                  </td>
                  <td className="px-4 py-3 text-black/60 dark:text-white/60 max-w-[200px] truncate">
                    {stop?.address ?? `${pod.gpsLat.toFixed(3)}, ${pod.gpsLng.toFixed(3)}`}
                  </td>
                  <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-4 py-3">
                    {pod.autoChecksPassed ? (
                      <svg className="w-4 h-4 text-green-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-amber-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setSelectedDeliveryId(pod.deliveryId)}
                      className="rounded-lg px-3 py-1 text-xs font-medium text-[#2563EB] bg-[#2563EB]/10 hover:bg-[#2563EB]/20 transition-colors"
                    >
                      {t('pod.review', 'Review')} &raquo;
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-black/40 dark:text-white/40">
                  {t('pod.noDeliveries', 'No deliveries to display')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Status Badge ───────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation('dispatch')
  const config: Record<string, { label: string; className: string }> = {
    needs_review: {
      label: t('pod.status.needsReview', 'Needs Review'),
      className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    },
    confirmed: {
      label: t('pod.status.confirmed', 'Confirmed'),
      className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    },
    flagged: {
      label: t('pod.status.flagged', 'Flagged'),
      className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    },
  }

  const cfg = config[status] ?? config.needs_review!

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}
