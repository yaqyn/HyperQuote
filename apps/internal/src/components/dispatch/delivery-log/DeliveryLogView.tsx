/**
 * The Record — filterable list of past deliveries.
 * Each: DN # (mono) + customer + date + status + driver.
 * Expandable for details + POD photos.
 */
import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { SearchField, Input, Button } from 'react-aria-components'
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

type DeliveryLogStatus = 'all' | 'delivered' | 'in_progress' | 'pending' | 'failed' | 'needs_review'
type SortField = 'date' | 'customer' | 'driver' | 'status'
type SortDir = 'asc' | 'desc'

interface DeliveryLogEntry {
  stop: RouteStop
  route: DeliveryRoute
  driver: Driver | undefined
  pod: PODRecord | null
}

const PAGE_SIZE = 20

const MOCK_PODS: PODRecord[] = [
  {
    id: 'pod-001', deliveryId: 'del-001', driverId: 'drv-001',
    photos: ['https://cdn.hyperquote.io/pod/del-001-front.jpg', 'https://cdn.hyperquote.io/pod/del-001-offload.jpg'],
    signatureUrl: 'https://cdn.hyperquote.io/pod/del-001-sig.png',
    gpsLat: 29.9602, gpsLng: 31.2569,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    deliveredQty: { 'cement-50kg': 200, 'rebar-12mm': 50 },
    driverNotes: 'Delivered to site entrance. Foreman signed.',
    durationMinutes: 28, autoChecksPassed: true,
  },
  {
    id: 'pod-002', deliveryId: 'del-006', driverId: 'drv-002',
    photos: ['https://cdn.hyperquote.io/pod/del-006-front.jpg'],
    signatureUrl: 'https://cdn.hyperquote.io/pod/del-006-sig.png',
    gpsLat: 30.087, gpsLng: 31.328,
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    deliveredQty: { 'marble-slab': 30, 'granite-tile': 100 },
    driverNotes: 'Boom crane used for marble slabs. Minor chip noted on 2 slabs.',
    durationMinutes: 45, autoChecksPassed: false,
  },
  {
    id: 'pod-003', deliveryId: 'del-007', driverId: 'drv-002',
    photos: ['https://cdn.hyperquote.io/pod/del-007-front.jpg', 'https://cdn.hyperquote.io/pod/del-007-side.jpg'],
    signatureUrl: 'https://cdn.hyperquote.io/pod/del-007-sig.png',
    gpsLat: 30.0495, gpsLng: 31.35,
    timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
    deliveredQty: { 'steel-beam-6m': 15, 'bolt-set': 200 },
    driverNotes: '', durationMinutes: 18, autoChecksPassed: true,
  },
]

const MOCK_EXPECTED_QTY: Record<string, Record<string, number>> = {
  'del-001': { 'cement-50kg': 200, 'rebar-12mm': 50 },
  'del-006': { 'marble-slab': 35, 'granite-tile': 100 },
  'del-007': { 'steel-beam-6m': 15, 'bolt-set': 200 },
}

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

const STATUS_DOTS: Record<RouteStopStatus, string> = {
  delivered: 'bg-green-500',
  en_route: 'bg-[#2563EB]',
  arrived: 'bg-[#2563EB]',
  failed: 'bg-red-500',
  pending: 'bg-black/20 dark:bg-white/20',
}

export function DeliveryLogView() {
  const { t, i18n } = useTranslation('dispatch')
  const locale = i18n.language
  const setSelectedDeliveryId = useDispatchStore((s) => s.setSelectedDeliveryId)

  const reviewingDeliveryId = useDispatchStore((s) => s.reviewingDeliveryId)
  const setReviewingDeliveryId = useDispatchStore((s) => s.setReviewingDeliveryId)

  const [statusFilter, setStatusFilter] = useState<DeliveryLogStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)
  const [dateFilter, setDateFilter] = useState<'today' | 'all'>('today')

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

  const podMap = useMemo(() => {
    const map = new Map<string, PODRecord>()
    for (const pod of MOCK_PODS) map.set(pod.deliveryId, pod)
    return map
  }, [])

  const driverMap = useMemo(() => {
    const map = new Map<string, Driver>()
    if (drivers) for (const d of drivers) map.set(d.id, d)
    return map
  }, [drivers])

  const allEntries = useMemo((): DeliveryLogEntry[] => {
    if (!board) return []
    const entries: DeliveryLogEntry[] = []
    for (const route of board.routes) {
      for (const stop of route.stops) {
        entries.push({
          stop, route,
          driver: driverMap.get(route.driverId),
          pod: podMap.get(stop.deliveryId) ?? null,
        })
      }
    }
    return entries
  }, [board, driverMap, podMap])

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])

  const filtered = useMemo((): DeliveryLogEntry[] => {
    let result = allEntries

    // Date filter: default to today
    if (dateFilter === 'today') {
      result = result.filter((e: DeliveryLogEntry) => e.route.date === todayStr)
    }

    if (statusFilter === 'needs_review') {
      result = result.filter((e: DeliveryLogEntry) => e.stop.status === 'delivered' && e.pod && !e.pod.autoChecksPassed)
    } else if (statusFilter === 'delivered') {
      result = result.filter((e: DeliveryLogEntry) => e.stop.status === 'delivered')
    } else if (statusFilter === 'in_progress') {
      result = result.filter((e: DeliveryLogEntry) => e.stop.status === 'en_route' || e.stop.status === 'arrived')
    } else if (statusFilter === 'pending') {
      result = result.filter((e: DeliveryLogEntry) => e.stop.status === 'pending')
    } else if (statusFilter === 'failed') {
      result = result.filter((e: DeliveryLogEntry) => e.stop.status === 'failed')
    }
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
  }, [allEntries, statusFilter, searchQuery, dateFilter, todayStr])

  // Stats for the banner
  const todayStats = useMemo(() => {
    const todayEntries = allEntries.filter((e: DeliveryLogEntry) => e.route.date === todayStr)
    const total = todayEntries.length
    const delivered = todayEntries.filter((e: DeliveryLogEntry) => e.stop.status === 'delivered').length
    const failed = todayEntries.filter((e: DeliveryLogEntry) => e.stop.status === 'failed').length
    const rate = total > 0 ? Math.round((delivered / total) * 100) : 0
    return { total, delivered, failed, rate }
  }, [allEntries, todayStr])

  const sorted = useMemo((): DeliveryLogEntry[] => {
    const copy = [...filtered]
    copy.sort((a: DeliveryLogEntry, b: DeliveryLogEntry) => {
      // Failed deliveries always float to top regardless of sort
      const aFailed = a.stop.status === 'failed' ? 0 : 1
      const bFailed = b.stop.status === 'failed' ? 0 : 1
      if (aFailed !== bFailed) return aFailed - bFailed

      let cmp = 0
      switch (sortField) {
        case 'date': cmp = a.route.date.localeCompare(b.route.date); break
        case 'customer': cmp = a.stop.customerName.localeCompare(b.stop.customerName); break
        case 'driver': cmp = (a.driver?.name ?? '').localeCompare(b.driver?.name ?? ''); break
        case 'status': {
          const order: Record<RouteStopStatus, number> = { failed: 0, pending: 1, en_route: 2, arrived: 3, delivered: 4 }
          cmp = (order[a.stop.status] ?? 0) - (order[b.stop.status] ?? 0)
          break
        }
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
    return copy
  }, [filtered, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

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

  const handleRowClick = useCallback(
    (deliveryId: string) => {
      setSelectedDeliveryId(deliveryId)
      setReviewingDeliveryId(deliveryId)
    },
    [setSelectedDeliveryId, setReviewingDeliveryId],
  )

  // POD Review drill-down
  if (reviewingDeliveryId) {
    const entry = allEntries.find((e: DeliveryLogEntry) => e.stop.deliveryId === reviewingDeliveryId)
    const pod = podMap.get(reviewingDeliveryId)
    if (entry && pod) {
      return (
        <PODReviewSplit
          pod={pod}
          stop={entry.stop}
          expectedQty={MOCK_EXPECTED_QTY[reviewingDeliveryId] ?? {}}
          onBack={() => { setReviewingDeliveryId(null); setSelectedDeliveryId(null) }}
          onActionComplete={() => { setReviewingDeliveryId(null); setSelectedDeliveryId(null) }}
        />
      )
    }
  }

  const FILTER_TABS: Array<{ key: DeliveryLogStatus; label: string }> = [
    { key: 'all', label: t('deliveryLog.filter.all', 'All') },
    { key: 'delivered', label: t('deliveryLog.filter.delivered', 'Delivered') },
    { key: 'in_progress', label: t('deliveryLog.filter.inProgress', 'In Progress') },
    { key: 'pending', label: t('deliveryLog.filter.pending', 'Pending') },
    { key: 'failed', label: t('deliveryLog.filter.failed', 'Failed') },
    { key: 'needs_review', label: t('deliveryLog.filter.needsReview', 'Needs Review') },
  ]

  if (!board) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-black/30 dark:text-white/30">
        {t('common.loading', 'Loading...')}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-auto p-6">
      {/* Today's stats banner */}
      {todayStats.total > 0 && (
        <div className="mb-4 flex items-center gap-4 rounded-xl border border-black/[0.06] bg-white/60 px-4 py-3 backdrop-blur-sm dark:border-white/[0.06] dark:bg-black/60">
          <div className="flex items-center gap-2">
            <span className="font-[family-name:var(--font-geist-mono)] text-lg font-semibold tabular-nums">
              {formatNumber(todayStats.delivered, locale)}/{formatNumber(todayStats.total, locale)}
            </span>
            <span className="text-sm text-black/50 dark:text-white/50">
              {t('deliveryLog.deliveredToday', 'delivered today')}
            </span>
          </div>
          <span className={`font-[family-name:var(--font-geist-mono)] text-sm font-semibold tabular-nums ${
            todayStats.rate >= 90
              ? 'text-green-600 dark:text-green-400'
              : todayStats.rate >= 70
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400'
          }`}>
            ({formatNumber(todayStats.rate, locale)}%)
          </span>
          {todayStats.failed > 0 && (
            <div className="ms-auto flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{formatNumber(todayStats.failed, locale)}</span>
                {' '}{t('deliveryLog.failed', 'failed')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Top: filters + search */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Date toggle */}
        <div className="flex items-center rounded-full bg-black/[0.04] p-0.5 dark:bg-white/[0.04]">
          <button
            type="button"
            onClick={() => { setDateFilter('today'); setPage(0) }}
            className={`rounded-full px-3 py-1 text-[12px] font-medium transition-all ${
              dateFilter === 'today'
                ? 'bg-white text-black shadow-sm dark:bg-black dark:text-white'
                : 'text-black/40 dark:text-white/40'
            }`}
          >
            {t('deliveryLog.today', 'Today')}
          </button>
          <button
            type="button"
            onClick={() => { setDateFilter('all'); setPage(0) }}
            className={`rounded-full px-3 py-1 text-[12px] font-medium transition-all ${
              dateFilter === 'all'
                ? 'bg-white text-black shadow-sm dark:bg-black dark:text-white'
                : 'text-black/40 dark:text-white/40'
            }`}
          >
            {t('deliveryLog.allDates', 'All Dates')}
          </button>
        </div>

        <div className="flex gap-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setStatusFilter(tab.key); setPage(0) }}
              className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                statusFilter === tab.key
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-black/40 hover:text-black/60 dark:text-white/40 dark:hover:text-white/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="ms-auto min-w-[200px] max-w-[280px]">
          <SearchField
            value={searchQuery}
            onChange={(v) => { setSearchQuery(v); setPage(0) }}
            aria-label={t('deliveryLog.search', 'Search deliveries')}
            className="flex items-center gap-2 rounded-lg border border-black/[0.08] bg-black/[0.02] px-3 py-1.5 dark:border-white/[0.08] dark:bg-white/[0.02]"
          >
            <svg className="h-4 w-4 shrink-0 text-black/30 dark:text-white/30" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <Input
              placeholder={t('deliveryLog.searchPlaceholder', 'Order, customer, or driver...')}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
            />
          </SearchField>
        </div>
      </div>

      {/* Delivery rows */}
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-black/[0.06] px-2 py-2 text-[11px] font-medium text-black/40 dark:border-white/[0.06] dark:text-white/40">
          <button type="button" onClick={() => toggleSort('date')} className="w-20 text-start hover:text-black dark:hover:text-white">
            {t('deliveryLog.col.date', 'Date')} {sortField === 'date' && (sortDir === 'asc' ? '\u2191' : '\u2193')}
          </button>
          <span className="w-24">{t('deliveryLog.col.order', 'Order #')}</span>
          <button type="button" onClick={() => toggleSort('customer')} className="min-w-0 flex-1 text-start hover:text-black dark:hover:text-white">
            {t('deliveryLog.col.customer', 'Customer')} {sortField === 'customer' && (sortDir === 'asc' ? '\u2191' : '\u2193')}
          </button>
          <button type="button" onClick={() => toggleSort('driver')} className="w-28 text-start hover:text-black dark:hover:text-white">
            {t('deliveryLog.col.driver', 'Driver')} {sortField === 'driver' && (sortDir === 'asc' ? '\u2191' : '\u2193')}
          </button>
          <button type="button" onClick={() => toggleSort('status')} className="w-20 text-start hover:text-black dark:hover:text-white">
            {t('deliveryLog.col.status', 'Status')} {sortField === 'status' && (sortDir === 'asc' ? '\u2191' : '\u2193')}
          </button>
          <span className="w-16 text-end">{t('deliveryLog.col.duration', 'Time')}</span>
          <span className="w-8" />
        </div>

        {/* Rows */}
        {paged.map(({ stop, route, driver, pod }: DeliveryLogEntry) => (
          <button
            key={stop.id}
            type="button"
            onClick={() => handleRowClick(stop.deliveryId)}
            className={`flex items-center gap-3 border-b border-black/[0.04] px-2 py-3 text-start transition-colors dark:border-white/[0.04] ${
              stop.status === 'failed'
                ? 'bg-red-50/30 hover:bg-red-50/50 dark:bg-red-900/5 dark:hover:bg-red-900/10'
                : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
            }`}
          >
            <span className="w-20 font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-black/50 dark:text-white/50">
              {route.date}
            </span>
            <span className="w-24 font-[family-name:var(--font-geist-mono)] text-sm tabular-nums font-medium">
              {stop.orderId}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-black/70 dark:text-white/70">
              {stop.customerName}
            </span>
            <span className="w-28 truncate text-sm text-black/50 dark:text-white/50">
              {driver?.name ?? route.driverId}
            </span>
            <span className="flex w-28 items-center gap-1.5">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOTS[stop.status] ?? 'bg-black/20'}`} />
              <span className="text-xs text-black/60 dark:text-white/60">
                {getStatusLabel(stop.status, t)}
              </span>
              {stop.status === 'failed' && (
                <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  Action
                </span>
              )}
            </span>
            <span className="w-16 text-end font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-black/40 dark:text-white/40">
              {pod ? `${formatNumber(pod.durationMinutes, locale)}m` : '\u2014'}
            </span>
            {pod ? (
              <svg className="h-4 w-4 shrink-0 text-black/20 rtl:rotate-180 dark:text-white/20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            ) : (
              <span className="w-4" />
            )}
          </button>
        ))}
        {paged.length === 0 && (
          <p className="py-8 text-center text-sm text-black/30 dark:text-white/30">
            {t('deliveryLog.noDeliveries', 'No deliveries to display')}
          </p>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-black/50 dark:text-white/50">
          <span>
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
              {formatNumber(page * PAGE_SIZE + 1, locale)}
            </span>
            {'\u2013'}
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
              {formatNumber(Math.min((page + 1) * PAGE_SIZE, sorted.length), locale)}
            </span>
            {' '}{t('deliveryLog.of', 'of')}{' '}
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
              {formatNumber(sorted.length, locale)}
            </span>
          </span>
          <div className="flex gap-1">
            <Button
              isDisabled={page === 0}
              onPress={() => setPage((p: number) => Math.max(0, p - 1))}
              aria-label={t('deliveryLog.prevPage', 'Previous page')}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.08] transition-colors hover:bg-black/[0.04] disabled:opacity-30 dark:border-white/[0.08] dark:hover:bg-white/[0.04]"
            >
              <svg className="h-4 w-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </Button>
            <span className="flex items-center px-3 font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
              {formatNumber(page + 1, locale)} / {formatNumber(totalPages, locale)}
            </span>
            <Button
              isDisabled={page >= totalPages - 1}
              onPress={() => setPage((p: number) => Math.min(totalPages - 1, p + 1))}
              aria-label={t('deliveryLog.nextPage', 'Next page')}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.08] transition-colors hover:bg-black/[0.04] disabled:opacity-30 dark:border-white/[0.08] dark:hover:bg-white/[0.04]"
            >
              <svg className="h-4 w-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
