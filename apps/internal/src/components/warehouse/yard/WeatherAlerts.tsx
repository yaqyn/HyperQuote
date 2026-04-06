import { useState } from 'react'
import { Button } from 'react-aria-components'
import type { WeatherAlert } from '../../../types/warehouse'

interface WeatherAlertsProps {
  alerts: WeatherAlert[]
}

const ALERT_ICONS: Record<WeatherAlert['type'], string> = {
  khamsin: '🌪️',
  rain: '🌧️',
  wind: '💨',
  heat: '🌡️',
}

/**
 * Weather alert bar at top of yard view.
 * Khamsin-specific: auto-pause outdoor ops above 30 km/h wind,
 * block sheet material deliveries when sheetDeliveryBlocked.
 * Dismissible per alert (local state only — server alerts always return).
 */
export function WeatherAlerts({ alerts }: WeatherAlertsProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  const visibleAlerts = alerts.filter((a) => !dismissedIds.has(a.id))

  if (visibleAlerts.length === 0) return null

  const dismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id))
  }

  return (
    <div className="flex flex-col gap-2">
      {visibleAlerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} onDismiss={() => dismiss(alert.id)} />
      ))}
    </div>
  )
}

// ─── Alert Card ──────────────────────────────────────────

interface AlertCardProps {
  alert: WeatherAlert
  onDismiss: () => void
}

function AlertCard({ alert, onDismiss }: AlertCardProps) {
  const isCritical = alert.severity === 'critical'
  const borderColor = isCritical ? 'border-red-300' : 'border-amber-300'
  const bgColor = isCritical ? 'bg-red-50' : 'bg-amber-50'
  const textColor = isCritical ? 'text-red-800' : 'text-amber-800'

  return (
    <div className={`flex items-start gap-3 rounded-lg border ${borderColor} ${bgColor} px-4 py-3`}>
      {/* Type icon */}
      <span className="mt-0.5 text-lg" aria-hidden="true">
        {ALERT_ICONS[alert.type]}
      </span>

      <div className="flex-1">
        {/* Severity badge + message */}
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
              isCritical
                ? 'bg-red-200 text-red-900'
                : 'bg-amber-200 text-amber-900'
            }`}
          >
            {alert.severity}
          </span>
          <span className={`text-sm font-semibold ${textColor}`}>{alert.message}</span>
        </div>

        {/* Khamsin-specific behaviors */}
        <div className="mt-1 flex flex-col gap-0.5">
          {/* Wind speed */}
          {alert.windSpeedKmh > 0 && (
            <span className={`text-xs ${textColor}`}>
              Wind:{' '}
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium">
                {alert.windSpeedKmh}
              </span>{' '}
              km/h
            </span>
          )}

          {/* Auto-pause outdoor operations above 30 km/h */}
          {alert.windSpeedKmh > 30 && (
            <span className="text-xs font-semibold text-red-700">
              Outdoor operations paused
            </span>
          )}

          {/* Sheet delivery blocked */}
          {alert.sheetDeliveryBlocked && (
            <span className="text-xs font-semibold text-red-700">
              Sheet material deliveries blocked
            </span>
          )}

          {/* Recommendation */}
          <span className={`mt-1 text-xs ${textColor} opacity-80`}>
            {alert.recommendation}
          </span>
        </div>
      </div>

      {/* Dismiss */}
      <Button
        onPress={onDismiss}
        className={`shrink-0 rounded p-1 text-sm cursor-pointer ${textColor} opacity-60 hover:opacity-100`}
        aria-label="Dismiss alert"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </Button>
    </div>
  )
}
