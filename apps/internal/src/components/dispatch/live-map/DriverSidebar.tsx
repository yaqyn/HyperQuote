/**
 * Right-side slide-in panel for live map.
 * Compact driver rows: name + status dot + current stop + ETA.
 * Click to center map on driver.
 */
import { useState, useMemo } from 'react'
import { SearchField, Input, Label } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type {
  Driver,
  DeliveryRoute,
  GPSPosition,
  RouteStop,
  VehicleStatus,
} from '../../../types/dispatch'

const STATUS_DOT_COLORS: Record<VehicleStatus, string> = {
  loading: '#EAB308',
  transit: '#22C55E',
  at_site: '#2563EB',
  delivered: '#16A34A',
  problem: '#EF4444',
  offline: '#9CA3AF',
}

interface DriverSidebarProps {
  open: boolean
  drivers: Driver[]
  routes: DeliveryRoute[]
  positions: Map<string, GPSPosition>
  selectedDriverId: string | null
  onSelectDriver: (driverId: string) => void
}

export function DriverSidebar({
  open,
  drivers,
  routes,
  positions,
  selectedDriverId,
  onSelectDriver,
}: DriverSidebarProps) {
  const { t } = useTranslation('dispatch')
  const [searchQuery, setSearchQuery] = useState('')

  // Status priority: problem first, then transit, at_site, loading, delivered, offline
  const STATUS_PRIORITY: Record<VehicleStatus, number> = {
    problem: 0,
    transit: 1,
    at_site: 2,
    loading: 3,
    delivered: 4,
    offline: 5,
  }

  const filtered = useMemo(() => {
    let result = drivers
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((d) => d.name.toLowerCase().includes(q))
    }
    // Sort by live status priority
    return [...result].sort((a, b) => {
      const aStatus = positions.get(a.id)?.status ?? 'offline'
      const bStatus = positions.get(b.id)?.status ?? 'offline'
      return (STATUS_PRIORITY[aStatus] ?? 5) - (STATUS_PRIORITY[bStatus] ?? 5)
    })
  }, [drivers, searchQuery, positions])

  return (
    <div
      className="flex h-full flex-col overflow-hidden border-s border-black/[0.06] bg-white/80 transition-[width] duration-300 ease-in-out dark:border-white/[0.06] dark:bg-black/80"
      style={{ width: open ? 280 : 0 }}
      aria-label={t('driverSidebar', 'Driver sidebar')}
    >
      {open && (
        <>
          {/* Search */}
          <div className="px-3 pt-3 pb-2">
            <SearchField
              aria-label={t('searchDrivers', 'Search drivers')}
              value={searchQuery}
              onChange={setSearchQuery}
              className="w-full"
            >
              <Label className="sr-only">{t('searchDrivers', 'Search drivers')}</Label>
              <Input
                placeholder={t('searchPlaceholder', 'Search...')}
                className="w-full rounded-lg border border-black/[0.08] bg-black/[0.03] px-3 py-1.5 text-sm text-black outline-none placeholder:text-black/30 focus:ring-1 focus:ring-[#2563EB] dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/30"
              />
            </SearchField>
          </div>

          {/* Driver count + status summary */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 pb-2">
            <span className="text-[11px] text-black/40 dark:text-white/40">
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{filtered.length}</span>
              {' '}{t('drivers', 'drivers')}
            </span>
            {(() => {
              const problemCount = filtered.filter((d: Driver) => (positions.get(d.id)?.status ?? 'offline') === 'problem').length
              const transitCount = filtered.filter((d: Driver) => (positions.get(d.id)?.status ?? 'offline') === 'transit').length
              return (
                <>
                  {problemCount > 0 && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{problemCount}</span>
                      {' '}problem
                    </span>
                  )}
                  {transitCount > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-black/40 dark:text-white/40">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{transitCount}</span>
                      {' '}in transit
                    </span>
                  )}
                </>
              )
            })()}
          </div>

          {/* Scrollable driver list */}
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {filtered.map((driver: Driver) => (
              <DriverRow
                key={driver.id}
                driver={driver}
                position={positions.get(driver.id)}
                route={routes.find((r) => r.driverId === driver.id)}
                isSelected={selectedDriverId === driver.id}
                onSelect={() => onSelectDriver(driver.id)}
              />
            ))}
            {filtered.length === 0 && (
              <p className="py-6 text-center text-xs text-black/30 dark:text-white/30">
                {t('noDriversFound', 'No drivers found')}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Driver Row ─────────────────────────────────────────

function estimateETAMinutes(position: GPSPosition | undefined, stop: RouteStop | undefined): number | null {
  if (!position || !stop) return null
  // Simple estimate based on straight-line distance and speed
  const R = 6_371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(stop.lat - position.lat)
  const dLng = toRad(stop.lng - position.lng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(position.lat)) * Math.cos(toRad(stop.lat)) * Math.sin(dLng / 2) ** 2
  const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  // Assume 30 km/h average in Cairo traffic if speed is 0
  const speedKmh = position.speed > 0 ? position.speed : 30
  const minutes = Math.round((distKm / speedKmh) * 60)
  return minutes > 0 ? minutes : 1
}

function isDriverDelayed(position: GPSPosition | undefined, currentStop: RouteStop | undefined): boolean {
  if (!position || !currentStop || position.status !== 'transit') return false
  // Delayed if past the time window end
  if (!currentStop.timeWindow.end) return false
  const now = new Date()
  const [hours, minutes] = currentStop.timeWindow.end.split(':').map(Number)
  if (hours === undefined || minutes === undefined) return false
  const windowEnd = new Date()
  windowEnd.setHours(hours, minutes, 0, 0)
  return now > windowEnd
}

function DriverRow({
  driver,
  position,
  route,
  isSelected,
  onSelect,
}: {
  driver: Driver
  position: GPSPosition | undefined
  route: DeliveryRoute | undefined
  isSelected: boolean
  onSelect: () => void
}) {
  const status = position?.status ?? 'offline'
  const dotColor = STATUS_DOT_COLORS[status]
  const currentStop = route?.stops.find((s) => s.status === 'en_route' || s.status === 'arrived')
  const completedStops = route?.stops.filter((s) => s.status === 'delivered').length ?? 0
  const totalStops = route?.stops.length ?? 0
  const etaMinutes = estimateETAMinutes(position, currentStop)
  const delayed = isDriverDelayed(position, currentStop)
  const isProblem = status === 'problem'

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start transition-colors ${
        isSelected
          ? 'bg-[#2563EB]/[0.08]'
          : delayed || isProblem
            ? 'bg-red-50/40 hover:bg-red-50/60 dark:bg-red-900/10 dark:hover:bg-red-900/20'
            : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
      }`}
    >
      {/* Status dot */}
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: dotColor }}
      />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-black dark:text-white">{driver.name}</p>
        {currentStop ? (
          <p className="truncate text-[11px] text-black/40 dark:text-white/40">
            Next: {currentStop.customerName}
          </p>
        ) : (
          totalStops > 0 && (
            <p className="text-[11px] text-black/30 dark:text-white/30">
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                {completedStops}/{totalStops}
              </span>
              {' '}complete
            </p>
          )
        )}
      </div>

      {/* ETA */}
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        {etaMinutes !== null && currentStop && (
          <span className={`font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums ${
            delayed ? 'font-semibold text-red-600 dark:text-red-400' : 'text-black/40 dark:text-white/40'
          }`}>
            {delayed ? `${etaMinutes} min late` : `${etaMinutes} min`}
          </span>
        )}
        {delayed && (
          <span className="text-[9px] font-medium uppercase text-red-500">
            Delayed
          </span>
        )}
        {isProblem && !delayed && (
          <span className="text-[9px] font-medium uppercase text-red-500">
            Problem
          </span>
        )}
      </div>
    </button>
  )
}
