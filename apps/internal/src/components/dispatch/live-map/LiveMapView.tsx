/**
 * Root live map view: collapsible sidebar + full-screen VehicleMap.
 * Loads initial data from server functions, subscribes to GPS broadcast.
 * ClientOnly wraps the map to prevent SSR crashes.
 */
import { useState, useCallback, useEffect } from 'react'
import { ClientOnly } from '@tanstack/react-start'
import { Button } from 'react-aria-components'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useDispatchStore } from '../../../stores/dispatch'
import { useGPSBroadcast } from '../../../hooks/useGPSBroadcast'
import { getDriverLocations, getDispatchBoard } from '../../../lib/server/dispatch'
import { MapSkeleton } from '../shared/MapSkeleton'
import { DriverSidebar } from './DriverSidebar'
import { VehicleMap } from './VehicleMap'
import type { GPSPosition, DeliveryRoute, Driver } from '../../../types/dispatch'

export function LiveMapView() {
  const { t } = useTranslation('dispatch')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const selectedDriverId = useDispatchStore((s) => s.selectedDriverId)
  const setSelectedDriverId = useDispatchStore((s) => s.setSelectedDriverId)
  const setMapViewport = useDispatchStore((s) => s.setMapViewport)

  // Server data
  const [initialPositions, setInitialPositions] = useState<GPSPosition[]>([])
  const [routes, setRoutes] = useState<DeliveryRoute[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)

  // Load initial data
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [posData, boardData] = await Promise.all([
          getDriverLocations(),
          getDispatchBoard(),
        ])
        if (cancelled) return
        setInitialPositions(posData)
        setRoutes(boardData.routes)
        // Extract drivers from routes + board data
        setDrivers(
          boardData.routes
            .filter((r) => r.driverId)
            .map((r) => ({
              id: r.driverId,
              name: r.driverId,
              type: 'INTERNAL' as const,
              phone: '',
              vehicleId: r.vehicleId,
              licenseExpiry: '',
              medicalExpiry: '',
              certifications: [],
              complianceStatus: 'valid' as const,
              activeRouteId: r.id,
              available: false,
            })),
        )
      } catch {
        // Silently handle -- dev mode may not have server
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    // Also fetch driver list for better data
    async function loadDrivers() {
      try {
        const { getDriverList } = await import('../../../lib/server/dispatch')
        const driverList = await getDriverList()
        if (!cancelled) setDrivers(driverList)
      } catch {
        // Fall back to route-derived drivers above
      }
    }

    void load()
    void loadDrivers()
    return () => { cancelled = true }
  }, [])

  // GPS broadcast (null supabase = dev simulation mode)
  const positions = useGPSBroadcast(null, initialPositions)

  // Selected vehicle
  const [selectedVehicle, setSelectedVehicle] = useState<GPSPosition | null>(null)
  const [highlightedRouteId, setHighlightedRouteId] = useState<string | null>(null)

  // When sidebar driver clicked, zoom to that driver
  const handleSelectDriver = useCallback(
    (driverId: string) => {
      setSelectedDriverId(driverId)
      const pos = positions.get(driverId)
      if (pos) {
        setMapViewport({ latitude: pos.lat, longitude: pos.lng, zoom: 14 })
        setSelectedVehicle(pos)
        const driverRoute = routes.find((r: DeliveryRoute) => r.driverId === driverId)
        setHighlightedRouteId(driverRoute?.id ?? null)
      }
    },
    [positions, routes, setSelectedDriverId, setMapViewport],
  )

  // Sync selectedDriverId from store to highlight
  useEffect(() => {
    if (selectedDriverId) {
      const driverRoute = routes.find((r: DeliveryRoute) => r.driverId === selectedDriverId)
      setHighlightedRouteId(driverRoute?.id ?? null)
    } else {
      setHighlightedRouteId(null)
    }
  }, [selectedDriverId, routes])

  const handleSelectVehicle = useCallback(
    (pos: GPSPosition | null) => {
      setSelectedVehicle(pos)
      if (pos) {
        setSelectedDriverId(pos.driverId)
        const driverRoute = routes.find((r: DeliveryRoute) => r.driverId === pos.driverId)
        setHighlightedRouteId(driverRoute?.id ?? null)
      } else {
        setSelectedDriverId(null)
        setHighlightedRouteId(null)
      }
    },
    [routes, setSelectedDriverId],
  )

  return (
    <div className="flex h-full relative">
      {/* Collapsible Sidebar */}
      <DriverSidebar
        collapsed={sidebarCollapsed}
        drivers={drivers}
        routes={routes}
        positions={positions}
        selectedDriverId={selectedDriverId}
        onSelectDriver={handleSelectDriver}
      />

      {/* Map Area */}
      <div className="flex-1 relative">
        {/* Sidebar toggle */}
        <div className="absolute top-3 start-3 z-10">
          <Button
            aria-label={sidebarCollapsed ? t('openSidebar', 'Open sidebar') : t('closeSidebar', 'Close sidebar')}
            onPress={() => setSidebarCollapsed((c: boolean) => !c)}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/90 dark:bg-black/90 backdrop-blur-sm border border-black/10 dark:border-white/10 shadow-lg text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Map */}
        <ClientOnly fallback={<MapSkeleton className="h-full" />}>
          {() =>
            loading ? (
              <MapSkeleton className="h-full" />
            ) : (
              <VehicleMap
                positions={positions}
                routes={routes}
                drivers={drivers}
                selectedVehicle={selectedVehicle}
                onSelectVehicle={handleSelectVehicle}
                highlightedRouteId={highlightedRouteId}
              />
            )
          }
        </ClientOnly>
      </div>
    </div>
  )
}
