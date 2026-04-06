/**
 * Individual route card with driver info, capacity bar, and draggable stops.
 * Uses React Aria useDragAndDrop with GridList for stop reordering and cross-route DnD.
 */
import { useMemo } from 'react'
import { GridList, GridListItem, useDragAndDrop } from 'react-aria-components'
import type {
  ConstraintViolation,
  DeliveryRoute,
  Driver,
  RouteStop,
  Vehicle,
} from '../../../types/dispatch'
import { validateAllConstraints } from '../../../lib/constraints'
import { CapacityBar } from '../shared/CapacityBar'
import { StopItem } from './StopItem'

interface RouteCardProps {
  route: DeliveryRoute
  driver: Driver | undefined
  vehicle: Vehicle | undefined
  selected: boolean
  onSelect: () => void
  onReorder: (routeId: string, reorderedStops: RouteStop[]) => void
  onInsert: (routeId: string, stop: RouteStop, index: number) => void
  allStops: RouteStop[]
}

export function RouteCard({
  route,
  driver,
  vehicle,
  selected,
  onSelect,
  onReorder,
  onInsert,
  allStops,
}: RouteCardProps) {
  // Pre-compute constraint violations for each stop
  const violationsMap = useMemo(() => {
    const map = new Map<string, ConstraintViolation[]>()
    if (!driver || !vehicle) return map

    const routeDate = new Date(route.date)
    for (const stop of route.stops) {
      const violations = validateAllConstraints(stop, driver, vehicle, routeDate)
      map.set(stop.id, violations)
    }
    return map
  }, [route.stops, route.date, driver, vehicle])

  const { dragAndDropHooks } = useDragAndDrop({
    acceptedDragTypes: ['route-stop'],
    getItems(keys) {
      return [...keys].map((key) => ({
        'route-stop': JSON.stringify(
          route.stops.find((s) => s.id === String(key)) ??
            allStops.find((s) => s.id === String(key)),
        ),
        'text/plain': String(key),
      }))
    },
    onReorder(e) {
      const keys = [...e.keys]
      const targetKey = String(e.target.key)
      const currentStops = [...route.stops]

      // Find moved items
      const movedIds = new Set(keys.map(String))
      const moved = currentStops.filter((s) => movedIds.has(s.id))
      const remaining = currentStops.filter((s) => !movedIds.has(s.id))

      // Find target index in remaining
      let targetIdx = remaining.findIndex((s) => s.id === targetKey)
      if (e.target.dropPosition === 'after') targetIdx += 1
      if (targetIdx < 0) targetIdx = remaining.length

      remaining.splice(targetIdx, 0, ...moved)

      // Update sequence numbers
      const resequenced = remaining.map((s, i) => ({ ...s, sequence: i + 1 }))
      onReorder(route.id, resequenced)
    },
    onInsert(e) {
      for (const item of e.items) {
        if (item.kind === 'text') {
          item.getText('route-stop').then((json) => {
            try {
              const stop = JSON.parse(json) as RouteStop
              onInsert(route.id, stop, e.target.dropPosition === 'after'
                ? route.stops.findIndex((s) => s.id === String(e.target.key)) + 1
                : route.stops.findIndex((s) => s.id === String(e.target.key)))
            } catch {
              // Invalid data -- ignore
            }
          })
        }
      }
    },
    onRootDrop(e) {
      for (const item of e.items) {
        if (item.kind === 'text') {
          item.getText('route-stop').then((json) => {
            try {
              const stop = JSON.parse(json) as RouteStop
              onInsert(route.id, stop, route.stops.length)
            } catch {
              // Invalid data -- ignore
            }
          })
        }
      }
    },
  })

  const totalWeight = route.stops.reduce((sum, s) => sum + s.weight, 0)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect()
      }}
      className={`rounded-xl border p-3 transition-colors ${
        selected
          ? 'border-[#2563EB] bg-[#2563EB]/5'
          : 'border-[var(--color-border)] bg-[var(--color-card)]/50 hover:bg-[var(--color-card)]/80'
      }`}
    >
      {/* Header: driver + vehicle */}
      <div className="mb-2 flex items-center justify-between">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold">
            {driver?.name ?? 'Unassigned'}
          </h4>
          <p className="text-xs text-black/50 dark:text-white/50">
            {vehicle?.plateNumber ?? ''} &middot; {vehicle?.type ?? ''}
          </p>
        </div>
        <span className="shrink-0 rounded bg-black/5 px-2 py-0.5 font-[family-name:var(--font-geist-mono)] text-xs tabular-nums dark:bg-white/5">
          {route.stops.length} stops
        </span>
      </div>

      {/* Capacity bar */}
      {vehicle && (
        <div className="mb-2">
          <CapacityBar currentKg={totalWeight} capacityKg={vehicle.capacityKg} />
        </div>
      )}

      {/* Draggable stop list */}
      <GridList
        aria-label={`${driver?.name ?? 'Route'} stops`}
        items={route.stops.map((s) => ({ ...s, key: s.id }))}
        dragAndDropHooks={dragAndDropHooks}
        renderEmptyState={() => (
          <div className="px-2 py-3 text-center text-xs text-black/30 dark:text-white/30">
            Drop stops here
          </div>
        )}
        className="space-y-1.5"
      >
        {(item) => (
          <GridListItem
            key={item.id}
            id={item.id}
            textValue={item.customerName}
            className="outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-lg"
          >
            <StopItem
              stop={item}
              violations={violationsMap.get(item.id) ?? []}
            />
          </GridListItem>
        )}
      </GridList>

      {/* Route summary */}
      <div className="mt-2 flex items-center gap-3 border-t border-[var(--color-border)] pt-2 text-xs text-black/50 dark:text-white/50">
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
          {route.totalDistance} km
        </span>
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
          {route.estimatedDuration} min
        </span>
        <span className={`ms-auto text-xs font-medium ${
          route.status === 'draft'
            ? 'text-black/40 dark:text-white/40'
            : route.status === 'in_progress'
              ? 'text-[#2563EB]'
              : 'text-green-600 dark:text-green-400'
        }`}>
          {route.status.replace('_', ' ')}
        </span>
      </div>
    </div>
  )
}
