import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { getYardZones, getWeatherAlerts } from '../../../lib/server/warehouse-yard'
import { WeatherAlerts } from './WeatherAlerts'
import { YardZoneMap } from './YardZoneMap'
import { ZoneDetail } from './ZoneDetail'
import type { YardZone } from '../../../types/warehouse'

/**
 * "The Gate" — Yard management container.
 * Zone map as clean grid. Each zone: zone name + capacity bar + vehicle count.
 * Zones colored by status. Weather alerts as compact inline banner.
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

  // Summary stats
  const totalCapacity = zones.reduce((sum, z) => sum + z.maxCapacity, 0)
  const totalUsage = zones.reduce((sum, z) => sum + z.currentUsage, 0)
  const overallPercent = totalCapacity > 0 ? Math.round((totalUsage / totalCapacity) * 100) : 0

  if (zonesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[#2563EB]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Weather alerts (compact banner) ─────────────── */}
      {alerts.length > 0 && <WeatherAlerts alerts={alerts} />}

      {/* ─── Header ──────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Yard</h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Zone management</p>
        </div>
        <div className="text-end">
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-bold text-[var(--color-text-primary)]">
            {overallPercent}%
          </span>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
            Utilization
          </p>
        </div>
      </div>

      {/* ─── Main content ────────────────────────────────── */}
      <div className="flex gap-4">
        {/* Zone map */}
        <div className="flex-1">
          <YardZoneMap
            zones={zones}
            selectedZoneId={selectedZone?.id ?? null}
            onZoneSelect={setSelectedZone}
          />
        </div>

        {/* Zone detail panel (slides in) */}
        <AnimatePresence>
          {selectedZone && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 288 }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2, ease: 'easeIn' }}
              className="shrink-0 overflow-hidden"
            >
              <ZoneDetail zone={selectedZone} onClose={() => setSelectedZone(null)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
