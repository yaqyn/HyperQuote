/**
 * Vehicle info popup shown when clicking a pin on the map.
 * Displays driver name, speed, heading, status, current/next stop, actions.
 * Uses React Aria for accessibility. Geist Mono for all numbers.
 */
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useDispatchStore } from '../../../stores/dispatch'
import type { GPSPosition, DeliveryRoute, Driver, VehicleStatus } from '../../../types/dispatch'

// ─── Status Config ──────────────────────────────────────

const STATUS_CONFIG: Record<VehicleStatus, { color: string; label: string }> = {
  loading: { color: '#EAB308', label: 'Loading' },
  transit: { color: '#22C55E', label: 'In Transit' },
  at_site: { color: '#2563EB', label: 'At Site' },
  delivered: { color: '#16A34A', label: 'Delivered' },
  problem: { color: '#EF4444', label: 'Problem' },
  offline: { color: '#9CA3AF', label: 'Offline' },
}

// ─── Props ──────────────────────────────────────────────

interface VehiclePopupProps {
  position: GPSPosition
  driver: Driver
  route: DeliveryRoute | null
  onClose: () => void
}

// ─── Component ──────────────────────────────────────────

export function VehiclePopup({ position, driver, route, onClose }: VehiclePopupProps) {
  const { t } = useTranslation('dispatch')
  const setSelectedDriverId = useDispatchStore((s) => s.setSelectedDriverId)

  const statusCfg = STATUS_CONFIG[position.status]

  // Current and next stop
  const currentStopIndex = route?.stops.findIndex(
    (s) => s.status === 'en_route' || s.status === 'arrived',
  ) ?? -1
  const currentStop = route?.stops[currentStopIndex]
  const nextStop = route?.stops[currentStopIndex + 1]
  const totalStops = route?.stops.length ?? 0

  // Heading to compass direction
  const headingLabel = getCompassDirection(position.heading)

  return (
    <div
      className="w-72 rounded-xl bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden"
      role="dialog"
      aria-label={`${driver.name} vehicle details`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm text-black dark:text-white truncate">
              {driver.name}
            </span>
            <span
              className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${statusCfg.color}20`, color: statusCfg.color }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: statusCfg.color }}
              />
              {statusCfg.label}
            </span>
          </div>
          <Button
            aria-label="Close popup"
            onPress={onClose}
            className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white p-0.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
        {driver.vehicleId && (
          <p className="text-xs text-black/50 dark:text-white/50 mt-0.5 font-mono">
            {driver.vehicleId}
          </p>
        )}
      </div>

      {/* Speed & Heading */}
      <div className="px-4 py-2 flex items-center gap-4 border-b border-black/5 dark:border-white/5">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40">
            {t('speed', 'Speed')}
          </p>
          <p className="font-mono text-sm text-black dark:text-white">
            {position.speed.toFixed(0)} km/h
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40">
            {t('heading', 'Heading')}
          </p>
          <p className="font-mono text-sm text-black dark:text-white">
            {position.heading.toFixed(0)}&deg; {headingLabel}
          </p>
        </div>
      </div>

      {/* Route Progress */}
      {route && (
        <div className="px-4 py-2 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40">
              {t('routeProgress', 'Route Progress')}
            </p>
            <span className="font-mono text-xs text-black/60 dark:text-white/60">
              {currentStop ? currentStopIndex + 1 : 0}/{totalStops}
            </span>
          </div>
          {currentStop && (
            <p className="text-xs text-black/70 dark:text-white/70 truncate">
              {currentStop.customerName}
            </p>
          )}
          {nextStop && (
            <div className="mt-1">
              <p className="text-[10px] text-black/40 dark:text-white/40">
                {t('nextStop', 'Next')}:
              </p>
              <p className="text-xs text-black/70 dark:text-white/70 truncate">
                {nextStop.customerName}
              </p>
              <p className="font-mono text-xs text-black/50 dark:text-white/50">
                {nextStop.timeWindow.start} - {nextStop.timeWindow.end}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-2 flex items-center gap-2 flex-wrap">
        <a
          href={`tel:${driver.phone}`}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-[#2563EB] text-white hover:bg-[#2563EB]/90 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
          </svg>
          {t('callDriver', 'Call')}
        </a>
        <Button
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-white/10 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          onPress={() => {
            window.dispatchEvent(
              new CustomEvent('dispatch-message', {
                detail: { driverId: driver.id, driverName: driver.name },
              }),
            )
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
          </svg>
          {t('message', 'Message')}
        </Button>
        <Button
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-white/10 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          onPress={() => {
            setSelectedDriverId(driver.id)
          }}
        >
          {t('details', 'Details')}
        </Button>
      </div>
    </div>
  )
}

// ─── Compass Helper ─────────────────────────────────────

function getCompassDirection(heading: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(heading / 45) % 8
  return dirs[index]!
}
