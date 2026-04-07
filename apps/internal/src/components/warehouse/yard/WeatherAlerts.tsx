import { useState } from 'react'
import { Button } from 'react-aria-components'
import type { WeatherAlert } from '../../../types/warehouse'

interface WeatherAlertsProps {
  alerts: WeatherAlert[]
}

/**
 * "The Gate" — Compact inline weather banner.
 * Icon + temp + condition. Only shows if weather affects operations.
 * Khamsin-specific: auto-pause outdoor ops above 30 km/h,
 * block sheet material deliveries when sheetDeliveryBlocked.
 * Dismissible per alert (local state only).
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
        <AlertBanner key={alert.id} alert={alert} onDismiss={() => dismiss(alert.id)} />
      ))}
    </div>
  )
}

// ─── Alert Banner (compact inline) ──────────────────────────

function AlertBanner({ alert, onDismiss }: { alert: WeatherAlert; onDismiss: () => void }) {
  const isCritical = alert.severity === 'critical'

  const style = isCritical
    ? { border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.04)', color: '#b91c1c' }
    : { border: '1px solid rgba(234, 179, 8, 0.2)', background: 'rgba(234, 179, 8, 0.04)', color: '#a16207' }

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={style}
    >
      {/* Type icon */}
      <WeatherIcon type={alert.type} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
            style={{
              background: isCritical ? 'rgba(239, 68, 68, 0.08)' : 'rgba(234, 179, 8, 0.08)',
            }}
          >
            {alert.severity}
          </span>
          <span className="text-sm font-bold truncate">{alert.message}</span>
        </div>

        {/* Khamsin-specific data */}
        <div className="flex items-center gap-4 mt-1">
          {alert.windSpeedKmh > 0 && (
            <span className="text-xs">
              Wind{' '}
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-bold">
                {alert.windSpeedKmh}
              </span>{' '}
              km/h
            </span>
          )}

          {alert.windSpeedKmh > 30 && (
            <span className="text-xs font-bold" style={{ color: '#b91c1c' }}>
              Outdoor ops paused
            </span>
          )}

          {alert.sheetDeliveryBlocked && (
            <span className="text-xs font-bold" style={{ color: '#b91c1c' }}>
              Sheet deliveries blocked
            </span>
          )}
        </div>

        {alert.recommendation && (
          <p className="text-[10px] mt-1 opacity-70">{alert.recommendation}</p>
        )}
      </div>

      {/* Dismiss */}
      <Button
        onPress={onDismiss}
        className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg opacity-50 hover:opacity-100 cursor-pointer"
        aria-label="Dismiss alert"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </Button>
    </div>
  )
}

// ─── Weather Icon (SVG, no emoji) ───────────────────────────

function WeatherIcon({ type }: { type: WeatherAlert['type'] }) {
  const iconMap: Record<WeatherAlert['type'], React.ReactNode> = {
    khamsin: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 10C5 7 8 4 12 6C16 8 14 13 10 12C6 11 8 7 12 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    rain: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M6 14L5 17M10 14L9 17M14 14L13 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M4 11C4 8.79 5.79 7 8 7C8.34 5.27 9.93 4 12 4C14.21 4 16 5.79 16 8C17.1 8 18 8.9 18 10C18 11.1 17.1 12 16 12H4C2.9 12 2 11.1 2 10C2 8.9 2.9 8 4 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    wind: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 8H13C14.1 8 15 7.1 15 6C15 4.9 14.1 4 13 4C12.5 4 12 4.2 11.7 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M3 12H15C16.1 12 17 12.9 17 14C17 15.1 16.1 16 15 16C14.5 16 14 15.8 13.7 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    heat: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2V4M10 16V18M4 10H2M18 10H16M5.64 5.64L4.22 4.22M15.78 15.78L14.36 14.36M14.36 5.64L15.78 4.22M4.22 15.78L5.64 14.36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  }

  return <span className="shrink-0">{iconMap[type]}</span>
}
