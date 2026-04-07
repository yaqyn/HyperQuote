/**
 * Minimal vehicle popup — driver name, status, current delivery, ETA.
 * No heavy card. Just the essentials for spatial awareness.
 */
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useDispatchStore } from '../../../stores/dispatch'
import type { GPSPosition, DeliveryRoute, Driver, VehicleStatus } from '../../../types/dispatch'

const STATUS_CONFIG: Record<VehicleStatus, { color: string; label: string }> = {
  loading: { color: '#EAB308', label: 'Loading' },
  transit: { color: '#22C55E', label: 'In Transit' },
  at_site: { color: '#2563EB', label: 'At Site' },
  delivered: { color: '#16A34A', label: 'Delivered' },
  problem: { color: '#EF4444', label: 'Problem' },
  offline: { color: '#9CA3AF', label: 'Offline' },
}

interface VehiclePopupProps {
  position: GPSPosition
  driver: Driver
  route: DeliveryRoute | null
  onClose: () => void
}

function getCompassDirection(heading: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(heading / 45) % 8
  return dirs[index]!
}

export function VehiclePopup({ position, driver, route, onClose }: VehiclePopupProps) {
  const { t } = useTranslation('dispatch')
  const setSelectedDriverId = useDispatchStore((s) => s.setSelectedDriverId)

  const statusCfg = STATUS_CONFIG[position.status]
  const currentStopIndex = route?.stops.findIndex(
    (s) => s.status === 'en_route' || s.status === 'arrived',
  ) ?? -1
  const currentStop = route?.stops[currentStopIndex]
  const totalStops = route?.stops.length ?? 0

  return (
    <div
      className="w-56 rounded-xl border border-black/[0.08] bg-white/95 shadow-xl backdrop-blur-xl dark:border-white/[0.08] dark:bg-black/95"
      role="dialog"
      aria-label={`${driver.name} vehicle details`}
    >
      {/* Name + status */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: statusCfg.color }}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-black dark:text-white">
          {driver.name}
        </span>
        <Button
          aria-label="Close popup"
          onPress={onClose}
          className="shrink-0 text-black/30 hover:text-black dark:text-white/30 dark:hover:text-white"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </Button>
      </div>

      {/* Speed + heading + route progress — single dense line */}
      <div className="flex items-center gap-3 border-t border-black/[0.04] px-3 py-2 dark:border-white/[0.04]">
        <span className="font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-black/60 dark:text-white/60">
          {position.speed.toFixed(0)} km/h
        </span>
        <span className="font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-black/40 dark:text-white/40">
          {position.heading.toFixed(0)}&deg; {getCompassDirection(position.heading)}
        </span>
        {totalStops > 0 && (
          <span className="ms-auto font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-black/50 dark:text-white/50">
            {currentStop ? currentStopIndex + 1 : 0}/{totalStops}
          </span>
        )}
      </div>

      {/* Current stop */}
      {currentStop && (
        <div className="border-t border-black/[0.04] px-3 py-2 dark:border-white/[0.04]">
          <p className="truncate text-xs text-black/70 dark:text-white/70">
            {currentStop.customerName}
          </p>
          <p className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-black/40 dark:text-white/40">
            {currentStop.timeWindow.start} - {currentStop.timeWindow.end}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 border-t border-black/[0.04] px-3 py-2 dark:border-white/[0.04]">
        <a
          href={`tel:${driver.phone}`}
          className="rounded-md bg-[#2563EB] px-2.5 py-1 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
        >
          {t('callDriver', 'Call')}
        </a>
        <Button
          className="rounded-md border border-black/[0.08] px-2.5 py-1 text-[11px] text-black/60 transition-colors hover:bg-black/[0.03] dark:border-white/[0.08] dark:text-white/60 dark:hover:bg-white/[0.03]"
          onPress={() => {
            window.dispatchEvent(
              new CustomEvent('dispatch-message', {
                detail: { driverId: driver.id, driverName: driver.name },
              }),
            )
          }}
        >
          {t('message', 'Message')}
        </Button>
        <Button
          className="ms-auto text-[11px] font-medium text-[#2563EB]"
          onPress={() => setSelectedDriverId(driver.id)}
        >
          {t('details', 'Details')}
        </Button>
      </div>
    </div>
  )
}
