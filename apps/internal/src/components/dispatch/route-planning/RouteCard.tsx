/**
 * Expandable route detail — compact header, stop sequence as numbered list.
 * Capacity bar, DnD stop reordering via React Aria GridList.
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
import { ConstraintBadge } from '../shared/ConstraintBadge'
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
      const movedIds = new Set(keys.map(String))
      const moved = currentStops.filter((s) => movedIds.has(s.id))
      const remaining = currentStops.filter((s) => !movedIds.has(s.id))
      let targetIdx = remaining.findIndex((s) => s.id === targetKey)
      if (e.target.dropPosition === 'after') targetIdx += 1
      if (targetIdx < 0) targetIdx = remaining.length
      remaining.splice(targetIdx, 0, ...moved)
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
            } catch { /* ignore */ }
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
            } catch { /* ignore */ }
          })
        }
      }
    },
  })

  const totalWeight = route.stops.reduce((sum, s) => sum + s.weight, 0)

  // Aggregate all violations across stops for the route-level summary
  const allViolations = useMemo(() => {
    const violations: ConstraintViolation[] = []
    for (const [, stopViolations] of violationsMap) {
      for (const v of stopViolations) {
        // Deduplicate by type+message
        if (!violations.some((existing) => existing.type === v.type && existing.message === v.message)) {
          violations.push(v)
        }
      }
    }
    // Errors first, then warnings
    return violations.sort((a, b) => (a.severity === 'error' ? -1 : 1) - (b.severity === 'error' ? -1 : 1))
  }, [violationsMap])

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect() }}
      className={`rounded-xl border p-3 transition-colors ${
        selected
          ? 'border-[#2563EB]/40 bg-[#2563EB]/[0.04]'
          : allViolations.some((v: ConstraintViolation) => v.severity === 'error')
            ? 'border-red-300/60 hover:bg-red-50/30 dark:border-red-700/40 dark:hover:bg-red-900/10'
            : 'border-black/[0.06] hover:bg-black/[0.02] dark:border-white/[0.06] dark:hover:bg-white/[0.02]'
      }`}
    >
      {/* Constraint violations banner — top of card */}
      {allViolations.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {allViolations.map((v: ConstraintViolation, i: number) => (
            <ConstraintBadge key={`${v.type}-${i}`} violation={v} />
          ))}
        </div>
      )}

      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-medium">{driver?.name ?? 'Unassigned'}</h4>
          <p className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-black/40 dark:text-white/40">
            {vehicle?.plateNumber ?? ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-black/50 dark:text-white/50">
            {route.stops.length}
          </span>
          <span className="text-[11px] text-black/30 dark:text-white/30">stops</span>
        </div>
      </div>

      {/* Capacity */}
      {vehicle && (
        <div className="mb-2">
          <CapacityBar currentKg={totalWeight} capacityKg={vehicle.capacityKg} />
        </div>
      )}

      {/* Stop list */}
      <GridList
        aria-label={`${driver?.name ?? 'Route'} stops`}
        items={route.stops.map((s) => ({ ...s, key: s.id }))}
        dragAndDropHooks={dragAndDropHooks}
        renderEmptyState={() => (
          <div className="px-2 py-3 text-center text-xs text-black/30 dark:text-white/30">
            Drop stops here
          </div>
        )}
        className="space-y-1"
      >
        {(item) => (
          <GridListItem
            key={item.id}
            id={item.id}
            textValue={item.customerName}
            className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            <StopItem stop={item} violations={violationsMap.get(item.id) ?? []} />
          </GridListItem>
        )}
      </GridList>

      {/* Route summary */}
      <div className="mt-2 flex items-center gap-3 border-t border-black/[0.04] pt-2 text-[11px] text-black/40 dark:border-white/[0.04] dark:text-white/40">
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
          {route.totalDistance} km
        </span>
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
          {route.estimatedDuration} min
        </span>
        <span className={`ms-auto text-[11px] font-medium ${
          route.status === 'draft'
            ? 'text-black/30 dark:text-white/30'
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
