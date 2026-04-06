/**
 * Delivery Log View -- searchable, filterable, sortable table of all deliveries.
 * Click row -> opens PODReviewSplit inline (replaces list with back button).
 * "Needs Review" filter shows POD-pending deliveries.
 * All numbers use Geist Mono. Arabic-Indic numerals when locale is Arabic.
 */
import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { SearchField, Input, Button } from 'react-aria-components'
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getDispatchBoard, getDriverList } from '../../../lib/server/dispatch'
import { useDispatchStore } from '../../../stores/dispatch'
import { PODReviewSplit } from '../pod-validation/PODReviewSplit'
import type {
  DeliveryRoute,
  Driver,
  RouteStop,
  RouteStopStatus,
  PODRecord,
} from '../../../types/dispatch'

// ---- Types ----

type DeliveryLogStatus = 'all' | 'delivered' | 'in_progress' | 'pending' | 'failed' | 'needs_review'
type SortField = 'date' | 'customer' | 'driver' | 'status'
type SortDir = 'asc' | 'desc'

interface DeliveryLogEntry {
  stop: RouteStop
  route: DeliveryRoute
  driver: Driver | undefined
  pod: PODRecord | null
}

// ---- Constants ----

const PAGE_SIZE = 20

// Mock POD records (mirrors PODValidationView data)
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

// Mock expected quantities per delivery (for POD review)
const MOCK_EXPECTED_QTY: Record<string, Record<string, number>> = {
  'del-001': { 'cement-50kg': 200, 'rebar-12mm': 50 },
  'del-006': { 'marble-slab': 35, 'granite-tile': 100 },
  'del-007': { 'steel-beam-6m': 15, 'bolt-set': 200 },
}

// ---- Helpers ----

function formatNumber(n: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US').format(n)
}

function getStatusLabel(status: RouteStopStatus, t: (key: string, fallback: string) => string): string {
  const map: Record<RouteStopStatus, [string, string]> = {
    pending: ['deliveryLog.status.pending', 'Pending'],
    en_route: ['deliveryLog.status.enRoute', 'En Route'],
    arrived: ['deliveryLog.status.arrived', 'Arrived'],
    delivered: ['deliveryLog.status.delivered', 'Delivered'],
    failed: ['deliveryLog.status.failed', 'Failed'],
  }
  const [key, fallback] = map[status] ?? ['deliveryLog.status.pending', 'Pending']
  return t(key, fallback)
}

function getStatusBadgeClass(status: RouteStopStatus): string {
  switch (status) {
    case 'delivered':
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
    case 'en_route':
    case 'arrived':
      return 'bg-[#2563EB]/10 text-[#2563EB]'
    case 'failed':
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
    case 'pending':
    default:
      return 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60'
  }
}

// ---- Component ----

export function DeliveryLogView() {
  const { t, i18n } = useTranslation('dispatch')
  const locale = i18n.language
  const setSelectedDeliveryId = useDispatchStore((s) => s.setSelectedDeliveryId)

  // State
  const [statusFilter, setStatusFilter] = useState<DeliveryLogStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)
  const [reviewDeliveryId, setReviewDeliveryId] = useState<string | null>(null)

  // Data
  const { data: board } = useQuery({
    queryKey: ['dispatch', 'board'],
    queryFn: () => getDispatchBoard(),
    staleTime: 15_000,
  })

  const { data: drivers } = useQuery({
    queryKey: ['dispatch', 'drivers'],
    queryFn: () => getDriverList(),
    staleTime: 30_000,
  })

  // Build POD lookup
  const podMap = useMemo(() => {
    const map = new Map<string, PODRecord>()
    for (const pod of MOCK_PODS) {
      map.set(pod.deliveryId, pod)
    }
    return map
  }, [])

  // Build driver lookup
  const driverMap = useMemo(() => {
    const map = new Map<string, Driver>()
    if (drivers) {
      for (const d of drivers) {
        map.set(d.id, d)
      }
    }
    return map
  }, [drivers])

  // Flatten all stops into delivery log entries
  const allEntries = useMemo((): DeliveryLogEntry[] => {
    if (!board) return []
    const entries: DeliveryLogEntry[] = []
    for (const route of board.routes) {
      for (const stop of route.stops) {
        entries.push({
          stop,
          route,
          driver: driverMap.get(route.driverId),
          pod: podMap.get(stop.deliveryId) ?? null,
        })
      }
    }
    return entries
  }, [board, driverMap, podMap])

  // Filter
  const filtered = useMemo((): DeliveryLogEntry[] => {
    let result = allEntries

    // Status filter
    if (statusFilter === 'needs_review') {
      result = result.filter(
        (e: DeliveryLogEntry) => e.stop.status === 'delivered' && e.pod && !e.pod.autoChecksPassed,
      )
    } else if (statusFilter === 'delivered') {
      result = result.filter((e: DeliveryLogEntry) => e.stop.status === 'delivered')
    } else if (statusFilter === 'in_progress') {
      result = result.filter((e: DeliveryLogEntry) => e.stop.status === 'en_route' || e.stop.status === 'arrived')
    } else if (statusFilter === 'pending') {
      result = result.filter((e: DeliveryLogEntry) => e.stop.status === 'pending')
    } else if (statusFilter === 'failed') {
      result = result.filter((e: DeliveryLogEntry) => e.stop.status === 'failed')
    }

    // Search by order ID or customer name
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(
        (e: DeliveryLogEntry) =>
          e.stop.orderId.toLowerCase().includes(q) ||
          e.stop.customerName.toLowerCase().includes(q) ||
          (e.driver?.name.toLowerCase().includes(q) ?? false),
      )
    }

    return result
  }, [allEntries, statusFilter, searchQuery])

  // Sort
  const sorted = useMemo((): DeliveryLogEntry[] => {
    const copy = [...filtered]
    copy.sort((a: DeliveryLogEntry, b: DeliveryLogEntry) => {
      let cmp = 0
      switch (sortField) {
        case 'date':
          cmp = a.route.date.localeCompare(b.route.date)
          break
        case 'customer':
          cmp = a.stop.customerName.localeCompare(b.stop.customerName)
          break
        case 'driver':
          cmp = (a.driver?.name ?? '').localeCompare(b.driver?.name ?? '')
          break
        case 'status': {
          const order: Record<RouteStopStatus, number> = {
            failed: 0,
            pending: 1,
            en_route: 2,
            arrived: 3,
            delivered: 4,
          }
          cmp = (order[a.stop.status] ?? 0) - (order[b.stop.status] ?? 0)
          break
        }
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
    return copy
  }, [filtered, sortField, sortDir])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Sort toggle
  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d: SortDir) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortField(field)
        setSortDir('desc')
      }
      setPage(0)
    },
    [sortField],
  )

  // Handle row click -> store + drill-down
  const handleRowClick = useCallback(
    (deliveryId: string) => {
      setSelectedDeliveryId(deliveryId)
      setReviewDeliveryId(deliveryId)
    },
    [setSelectedDeliveryId],
  )

  // ---- POD Review drill-down ----

  if (reviewDeliveryId) {
    const entry = allEntries.find((e: DeliveryLogEntry) => e.stop.deliveryId === reviewDeliveryId)
    const pod = podMap.get(reviewDeliveryId)
    if (entry && pod) {
      return (
        <PODReviewSplit
          pod={pod}
          stop={entry.stop}
          expectedQty={MOCK_EXPECTED_QTY[reviewDeliveryId] ?? {}}
          onBack={() => {
            setReviewDeliveryId(null)
            setSelectedDeliveryId(null)
          }}
          onActionComplete={() => {
            setReviewDeliveryId(null)
            setSelectedDeliveryId(null)
          }}
        />
      )
    }
  }

  // ---- Filter tabs ----

  const FILTER_TABS: Array<{ key: DeliveryLogStatus; label: string }> = [
    { key: 'all', label: t('deliveryLog.filter.all', 'All') },
    { key: 'delivered', label: t('deliveryLog.filter.delivered', 'Delivered') },
    { key: 'in_progress', label: t('deliveryLog.filter.inProgress', 'In Progress') },
    { key: 'pending', label: t('deliveryLog.filter.pending', 'Pending') },
    { key: 'failed', label: t('deliveryLog.filter.failed', 'Failed') },
    { key: 'needs_review', label: t('deliveryLog.filter.needsReview', 'Needs Review') },
  ]

  // Sort indicator
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDir === 'asc' ? (
      <ChevronUp className="inline w-3 h-3 ms-1" />
    ) : (
      <ChevronDown className="inline w-3 h-3 ms-1" />
    )
  }

  // Loading
  if (!board) {
    return (
      <div className="p-6 text-center text-black/40 dark:text-white/40">
        {t('common.loading', 'Loading...')}
      </div>
    )
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      {/* Top bar: filter tabs + search */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Filter buttons */}
        <div className="flex gap-2 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setStatusFilter(tab.key)
                setPage(0)
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === tab.key
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[200px] max-w-[320px] ms-auto">
          <SearchField
            value={searchQuery}
            onChange={(v) => {
              setSearchQuery(v)
              setPage(0)
            }}
            aria-label={t('deliveryLog.search', 'Search deliveries')}
            className="flex items-center gap-2 rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm px-3 py-1.5"
          >
            <Search className="w-4 h-4 text-black/40 dark:text-white/40 shrink-0" />
            <Input
              placeholder={t('deliveryLog.searchPlaceholder', 'Order, customer, or driver...')}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
            />
            {searchQuery && (
              <Button className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white">
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </SearchField>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                <th
                  className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium cursor-pointer select-none"
                  onClick={() => toggleSort('date')}
                >
                  {t('deliveryLog.col.date', 'Date')}
                  <SortIcon field="date" />
                </th>
                <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">
                  {t('deliveryLog.col.order', 'Order #')}
                </th>
                <th
                  className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium cursor-pointer select-none"
                  onClick={() => toggleSort('customer')}
                >
                  {t('deliveryLog.col.customer', 'Customer')}
                  <SortIcon field="customer" />
                </th>
                <th
                  className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium cursor-pointer select-none"
                  onClick={() => toggleSort('driver')}
                >
                  {t('deliveryLog.col.driver', 'Driver')}
                  <SortIcon field="driver" />
                </th>
                <th
                  className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium cursor-pointer select-none"
                  onClick={() => toggleSort('status')}
                >
                  {t('deliveryLog.col.status', 'Status')}
                  <SortIcon field="status" />
                </th>
                <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">
                  {t('deliveryLog.col.duration', 'Duration')}
                </th>
                <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">
                  {t('deliveryLog.col.pod', 'POD')}
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {paged.map(({ stop, route, driver, pod }: DeliveryLogEntry) => (
                <tr
                  key={stop.id}
                  onClick={() => handleRowClick(stop.deliveryId)}
                  className="border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {route.date}
                  </td>
                  <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {stop.orderId}
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate">
                    {stop.customerName}
                  </td>
                  <td className="px-4 py-3">
                    {driver?.name ?? route.driverId}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(stop.status)}`}
                    >
                      {getStatusLabel(stop.status, t)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {pod
                      ? `${formatNumber(pod.durationMinutes, locale)} ${t('deliveryLog.min', 'min')}`
                      : '\u2014'}
                  </td>
                  <td className="px-4 py-3">
                    {pod ? (
                      pod.autoChecksPassed ? (
                        <svg
                          className="w-4 h-4 text-green-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4 text-amber-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )
                    ) : (
                      <span className="text-black/20 dark:text-white/20">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {pod && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRowClick(stop.deliveryId)
                        }}
                        className="rounded-lg px-3 py-1 text-xs font-medium text-[#2563EB] bg-[#2563EB]/10 hover:bg-[#2563EB]/20 transition-colors"
                      >
                        {t('deliveryLog.review', 'Review')} &raquo;
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-black/40 dark:text-white/40"
                  >
                    {t('deliveryLog.noDeliveries', 'No deliveries to display')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-black/60 dark:text-white/60">
          <span>
            {t('deliveryLog.showing', 'Showing')}{' '}
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
              {formatNumber(page * PAGE_SIZE + 1, locale)}
            </span>
            {'\u2013'}
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
              {formatNumber(Math.min((page + 1) * PAGE_SIZE, sorted.length), locale)}
            </span>{' '}
            {t('deliveryLog.of', 'of')}{' '}
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
              {formatNumber(sorted.length, locale)}
            </span>
          </span>
          <div className="flex gap-1">
            <Button
              isDisabled={page === 0}
              onPress={() => setPage((p: number) => Math.max(0, p - 1))}
              aria-label={t('deliveryLog.prevPage', 'Previous page')}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            </Button>
            <span className="flex items-center px-3 font-[family-name:var(--font-geist-mono)] tabular-nums text-sm">
              {formatNumber(page + 1, locale)} / {formatNumber(totalPages, locale)}
            </span>
            <Button
              isDisabled={page >= totalPages - 1}
              onPress={() => setPage((p: number) => Math.min(totalPages - 1, p + 1))}
              aria-label={t('deliveryLog.nextPage', 'Next page')}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
