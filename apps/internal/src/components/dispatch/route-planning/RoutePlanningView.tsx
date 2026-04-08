/**
 * The Planner — split: route list on left, map on right.
 * Top bar: date picker + optimize + publish.
 */
import { useState, useEffect, useCallback } from 'react'
import { Button } from 'react-aria-components'
import { ClientOnly } from '../../../lib/client-only'
import { useDispatchStore } from '../../../stores/dispatch'
import { getDispatchBoard, getDriverList } from '../../../lib/server/dispatch'
import type { DeliveryRoute, Driver, RouteStop, Vehicle } from '../../../types/dispatch'
import { SplitPane } from './SplitPane'
import { RouteList } from './RouteList'
import { RoutePlanningMap } from './RoutePlanningMap'
import { OptimizeButton } from './OptimizeButton'
import { PublishButton } from './PublishButton'
import { MapSkeleton } from '../shared/MapSkeleton'

export function RoutePlanningView() {
  const { routePlanningDate, setRoutePlanningDate, selectedRouteId, setSelectedRouteId, mapMode, setMapMode } =
    useDispatchStore()

  const [routes, setRoutes] = useState<DeliveryRoute[]>([])
  const [unassigned, setUnassigned] = useState<RouteStop[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)

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

        const vehicleMap = new Map<string, Vehicle>()
        for (const route of board.routes) {
          if (route.vehicleId && !vehicleMap.has(route.vehicleId)) {
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

        if (board.routes.length > 0 && !selectedRouteId) {
          setSelectedRouteId(board.routes[0]!.id)
        }
      } catch {
        // Server error
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [routePlanningDate, selectedRouteId, setSelectedRouteId])

  const handleReorder = useCallback(
    (routeId: string, reorderedStops: RouteStop[]) => {
      setRoutes((prev: DeliveryRoute[]) =>
        prev.map((r: DeliveryRoute) =>
          r.id === routeId
            ? { ...r, stops: reorderedStops, totalWeight: reorderedStops.reduce((s: number, st: RouteStop) => s + st.weight, 0) }
            : r,
        ),
      )
    },
    [],
  )

  const handleInsert = useCallback(
    (targetRouteId: string, stop: RouteStop, index: number) => {
      setRoutes((prev: DeliveryRoute[]) => {
        const updated = prev.map((r: DeliveryRoute) => ({
          ...r,
          stops: r.stops.filter((s: RouteStop) => s.id !== stop.id),
        }))
        return updated.map((r: DeliveryRoute) => {
          if (r.id !== targetRouteId) return r
          const newStops = [...r.stops]
          newStops.splice(index, 0, { ...stop, sequence: index + 1 })
          const resequenced = newStops.map((s: RouteStop, i: number) => ({ ...s, sequence: i + 1 }))
          return { ...r, stops: resequenced, totalWeight: resequenced.reduce((sum: number, s: RouteStop) => sum + s.weight, 0) }
        })
      })
      setUnassigned((prev: RouteStop[]) => prev.filter((s: RouteStop) => s.id !== stop.id))
    },
    [],
  )

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
      <div className="flex items-center gap-3 border-b border-black/[0.06] px-4 py-2 dark:border-white/[0.06]">
        {/* Planning / Live toggle */}
        <div className="flex items-center rounded-full bg-black/[0.04] p-0.5 dark:bg-white/[0.04]">
          <Button
            onPress={() => setMapMode('planning')}
            className={`rounded-full px-3 py-1 text-[12px] font-medium outline-none transition-all cursor-pointer
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
              ${mapMode === 'planning'
                ? 'bg-white text-black shadow-sm dark:bg-black dark:text-white'
                : 'text-black/40 dark:text-white/40'
              }`}
          >
            Planning
          </Button>
          <Button
            onPress={() => setMapMode('live')}
            className={`rounded-full px-3 py-1 text-[12px] font-medium outline-none transition-all cursor-pointer
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
              ${mapMode === 'live'
                ? 'bg-white text-black shadow-sm dark:bg-black dark:text-white'
                : 'text-black/40 dark:text-white/40'
              }`}
          >
            Live
          </Button>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-black/40 dark:text-white/40">Date</span>
          <input
            type="date"
            value={routePlanningDate}
            onChange={(e) => setRoutePlanningDate(e.target.value)}
            className="rounded-lg border border-black/[0.08] bg-transparent px-2 py-1 font-[family-name:var(--font-geist-mono)] text-sm tabular-nums dark:border-white/[0.08]"
          />
        </label>
        <div className="flex-1" />
        <OptimizeButton selectedRoute={selectedRoute ?? null} onOptimized={handleOptimized} />
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
              <RoutePlanningMap
                routes={routes}
                unassigned={unassigned}
                selectedRouteId={selectedRouteId}
                onStopClick={(stopId) => {
                  for (const route of routes) {
                    if (route.stops.some((s: RouteStop) => s.id === stopId)) {
                      setSelectedRouteId(route.id)
                      break
                    }
                  }
                }}
              />
            </ClientOnly>
          }
        />
      )}
    </div>
  )
}
