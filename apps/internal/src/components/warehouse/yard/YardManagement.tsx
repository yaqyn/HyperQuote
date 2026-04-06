import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getYardZones, getWeatherAlerts } from '../../../lib/server/warehouse-yard'
import { WeatherAlerts } from './WeatherAlerts'
import { YardZoneMap } from './YardZoneMap'
import { ZoneDetail } from './ZoneDetail'
import type { YardZone } from '../../../types/warehouse'

/**
 * Container for yard management view.
 * Layout: WeatherAlerts bar at top, YardZoneMap below,
 * ZoneDetail panel on right when a zone is selected.
 */
export function YardManagement() {
  const [selectedZone, setSelectedZone] = useState<YardZone | null>(null)

  const { data: zonesData, isLoading: zonesLoading } = useQuery({
    queryKey: ['yard-zones'],
    queryFn: () => getYardZones({ data: {} }),
    staleTime: 30_000,
  })

  const { data: alertsData } = useQuery({
    queryKey: ['weather-alerts'],
    queryFn: () => getWeatherAlerts({ data: {} }),
    staleTime: 60_000,
  })

  const zones = zonesData?.zones ?? []
  const alerts = alertsData?.alerts ?? []

  if (zonesLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-[var(--color-text-secondary)]">
        Loading yard zones...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Weather alerts bar */}
      {alerts.length > 0 && <WeatherAlerts alerts={alerts} />}

      {/* Main content: map + optional detail panel */}
      <div className="flex gap-4">
        {/* Zone map */}
        <div className="flex-1">
          <YardZoneMap
            zones={zones}
            selectedZoneId={selectedZone?.id ?? null}
            onZoneSelect={setSelectedZone}
          />
        </div>

        {/* Zone detail panel */}
        {selectedZone && (
          <div className="w-72 shrink-0">
            <ZoneDetail zone={selectedZone} onClose={() => setSelectedZone(null)} />
          </div>
        )}
      </div>
    </div>
  )
}
