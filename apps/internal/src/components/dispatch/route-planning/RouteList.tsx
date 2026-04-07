/**
 * Left panel — compact routes with unassigned pool at top.
 */
import type { DeliveryRoute, Driver, RouteStop, Vehicle } from '../../../types/dispatch'
import { RouteCard } from './RouteCard'
import { UnassignedPool } from './UnassignedPool'

interface RouteListProps {
  routes: DeliveryRoute[]
  unassigned: RouteStop[]
  drivers: Driver[]
  vehicles: Vehicle[]
  selectedRouteId: string | null
  onSelectRoute: (routeId: string) => void
  onReorder: (routeId: string, reorderedStops: RouteStop[]) => void
  onInsert: (routeId: string, stop: RouteStop, index: number) => void
}

export function RouteList({
  routes,
  unassigned,
  drivers,
  vehicles,
  selectedRouteId,
  onSelectRoute,
  onReorder,
  onInsert,
}: RouteListProps) {
  const allStops = [...unassigned, ...routes.flatMap((r) => r.stops)]

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <UnassignedPool stops={unassigned} />

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {routes.map((route) => {
          const driver = drivers.find((d) => d.id === route.driverId)
          const vehicle = vehicles.find((v) => v.id === route.vehicleId)

          return (
            <RouteCard
              key={route.id}
              route={route}
              driver={driver}
              vehicle={vehicle}
              selected={route.id === selectedRouteId}
              onSelect={() => onSelectRoute(route.id)}
              onReorder={onReorder}
              onInsert={onInsert}
              allStops={allStops}
            />
          )
        })}

        {routes.length === 0 && (
          <div className="py-8 text-center text-sm text-black/30 dark:text-white/30">
            No routes for this date
          </div>
        )}
      </div>
    </div>
  )
}
