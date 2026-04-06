/**
 * Root route planning view with split pane layout.
 * Left: RouteList with DnD stops. Right: RoutePlanningMap (ClientOnly).
 * Top bar: date picker, auto-optimize, publish routes.
 */
import { useState, useEffect, useCallback } from 'react'
import { ClientOnly } from '@tanstack/react-start'
import { useDispatchStore } from '../../../stores/dispatch'
import { getDispatchBoard, getDriverList } from '../../../lib/server/dispatch'
import type {
  DeliveryRoute,
  Driver,
  RouteStop,
  Vehicle,
} from '../../../types/dispatch'
import { SplitPane } from './SplitPane'
import { RouteList } from './RouteList'
import { RoutePlanningMap } from './RoutePlanningMap'
import { OptimizeButton } from './OptimizeButton'
import { PublishButton } from './PublishButton'
import { MapSkeleton } from '../shared/MapSkeleton'

export function RoutePlanningView() {
  const { routePlanningDate, setRoutePlanningDate, selectedRouteId, setSelectedRouteId } =
    useDispatchStore()

  // Local state for routes and unassigned
  const [routes, setRoutes] = useState<DeliveryRoute[]>([])
  const [unassigned, setUnassigned] = useState<RouteStop[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)

  // Load data from server
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const [board, driverList] = await Promise.all([
          getDispatchBoard(),
          getDriverList(),
        ])
        if (cancelled) return

        setRoutes(board.routes)
        setDrivers(driverList)

        // Extract vehicles from routes (mock -- in production, fetch separately)
        const vehicleMap = new Map<string, Vehicle>()
        for (const route of board.routes) {
          if (route.vehicleId && !vehicleMap.has(route.vehicleId)) {
            // Find matching driver to get vehicle info
            const driver = driverList.find((d) => d.id === route.driverId)
            if (driver) {
              vehicleMap.set(route.vehicleId, {
                id: route.vehicleId,
                plateNumber: route.vehicleId,
                type: 'flatbed',
                capacityKg: 12_000,
                hasEquipment: { moffett: false, boom: false, crane: false },
                currentDriverId: driver.id,
                status: 'transit',
              })
            }
          }
        }
        setVehicles([...vehicleMap.values()])

        // Select first route by default
        if (board.routes.length > 0 && !selectedRouteId) {
          setSelectedRouteId(board.routes[0]!.id)
        }
      } catch {
        // Server error -- keep empty state
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [routePlanningDate, selectedRouteId, setSelectedRouteId])

  // Reorder stops within a route
  const handleReorder = useCallback(
    (routeId: string, reorderedStops: RouteStop[]) => {
      setRoutes((prev: DeliveryRoute[]) =>
        prev.map((r: DeliveryRoute) =>
          r.id === routeId
            ? {
                ...r,
                stops: reorderedStops,
                totalWeight: reorderedStops.reduce((s: number, st: RouteStop) => s + st.weight, 0),
              }
            : r,
        ),
      )
    },
    [],
  )

  // Insert stop from another route or unassigned pool
  const handleInsert = useCallback(
    (targetRouteId: string, stop: RouteStop, index: number) => {
      setRoutes((prev: DeliveryRoute[]) => {
        // Remove stop from its current route
        const updated = prev.map((r: DeliveryRoute) => ({
          ...r,
          stops: r.stops.filter((s: RouteStop) => s.id !== stop.id),
        }))

        // Add to target route at index
        return updated.map((r: DeliveryRoute) => {
          if (r.id !== targetRouteId) return r
          const newStops = [...r.stops]
          newStops.splice(index, 0, { ...stop, sequence: index + 1 })
          // Re-sequence
          const resequenced = newStops.map((s: RouteStop, i: number) => ({ ...s, sequence: i + 1 }))
          return {
            ...r,
            stops: resequenced,
            totalWeight: resequenced.reduce((sum: number, s: RouteStop) => sum + s.weight, 0),
          }
        })
      })

      // Also remove from unassigned pool if it was there
      setUnassigned((prev: RouteStop[]) => prev.filter((s: RouteStop) => s.id !== stop.id))
    },
    [],
  )

  // Update routes after optimization
  const handleOptimized = useCallback(
    (routeId: string, optimizedStops: RouteStop[]) => {
      setRoutes((prev: DeliveryRoute[]) =>
        prev.map((r: DeliveryRoute) =>
          r.id === routeId
            ? {
                ...r,
                stops: optimizedStops.map((s: RouteStop, i: number) => ({ ...s, sequence: i + 1 })),
                totalWeight: optimizedStops.reduce((sum: number, s: RouteStop) => sum + s.weight, 0),
              }
            : r,
        ),
      )
    },
    [],
  )

  const selectedRoute = routes.find((r: DeliveryRoute) => r.id === selectedRouteId)

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-black/60 dark:text-white/60">Date</span>
          <input
            type="date"
            value={routePlanningDate}
            onChange={(e) => setRoutePlanningDate(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-transparent px-2 py-1 font-[family-name:var(--font-geist-mono)] text-sm tabular-nums"
          />
        </label>

        <div className="flex-1" />

        <OptimizeButton
          selectedRoute={selectedRoute ?? null}
          onOptimized={handleOptimized}
        />

        <PublishButton routes={routes} />
      </div>

      {/* Split pane */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-black/30 dark:text-white/30">
          Loading routes...
        </div>
      ) : (
        <SplitPane
          left={
            <RouteList
              routes={routes}
              unassigned={unassigned}
              drivers={drivers}
              vehicles={vehicles}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
              onReorder={handleReorder}
              onInsert={handleInsert}
            />
          }
          right={
            <ClientOnly fallback={<MapSkeleton className="h-full" />}>
              {() => (
                <RoutePlanningMap
                  routes={routes}
                  unassigned={unassigned}
                  selectedRouteId={selectedRouteId}
                  onStopClick={(stopId) => {
                    // Find which route this stop belongs to
                    for (const route of routes) {
                      if (route.stops.some((s: RouteStop) => s.id === stopId)) {
                        setSelectedRouteId(route.id)
                        break
                      }
                    }
                  }}
                />
              )}
            </ClientOnly>
          }
        />
      )}
    </div>
  )
}
