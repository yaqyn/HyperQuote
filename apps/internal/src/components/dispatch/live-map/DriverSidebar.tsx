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

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return drivers
    const q = searchQuery.toLowerCase()
    return drivers.filter((d) => d.name.toLowerCase().includes(q))
  }, [drivers, searchQuery])

  return (
    <div
      className="flex h-full flex-col overflow-hidden border-s border-black/[0.06] bg-white/80 backdrop-blur-xl transition-[width] duration-300 ease-in-out dark:border-white/[0.06] dark:bg-black/80"
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

          {/* Driver count */}
          <div className="px-3 pb-2">
            <span className="text-[11px] text-black/40 dark:text-white/40">
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{filtered.length}</span>
              {' '}{t('drivers', 'drivers')}
            </span>
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

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start transition-colors ${
        isSelected
          ? 'bg-[#2563EB]/[0.08]'
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
            {currentStop.customerName}
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

      {/* ETA or speed */}
      {currentStop && currentStop.timeWindow.start && (
        <span className="shrink-0 font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-black/40 dark:text-white/40">
          {currentStop.timeWindow.start}
        </span>
      )}
    </button>
  )
}
