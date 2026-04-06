/**
 * Collapsible left sidebar for live map view.
 * Hierarchical tree: Driver Type groups > Individual drivers.
 * Quick filters, search, unassigned tasks, drag-to-assign.
 */
import { useState, useMemo, useCallback } from 'react'
import { SearchField, Input, Label, Button, GridList, GridListItem } from 'react-aria-components'
import { useDragAndDrop } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type {
  Driver,
  DriverType,
  DeliveryRoute,
  GPSPosition,
  VehicleStatus,
} from '../../../types/dispatch'

// ─── Status Colors ──────────────────────────────────────

const STATUS_DOT_COLORS: Record<VehicleStatus, string> = {
  loading: '#EAB308',
  transit: '#22C55E',
  at_site: '#2563EB',
  delivered: '#16A34A',
  problem: '#EF4444',
  offline: '#9CA3AF',
}

// ─── Filter Types ───────────────────────────────────────

type QuickFilter = 'all' | 'problems' | 'arriving' | 'completed'

// ─── Props ──────────────────────────────────────────────

interface DriverSidebarProps {
  collapsed: boolean
  drivers: Driver[]
  routes: DeliveryRoute[]
  positions: Map<string, GPSPosition>
  selectedDriverId: string | null
  onSelectDriver: (driverId: string) => void
  onAssignTask?: (taskId: string, driverId: string) => void
}

// ─── Group Config ───────────────────────────────────────

const GROUP_ORDER: DriverType[] = ['INTERNAL', 'CONTRACTED', 'ON_DEMAND']
const GROUP_LABELS: Record<DriverType, string> = {
  INTERNAL: 'Internal',
  CONTRACTED: 'Contracted',
  ON_DEMAND: 'On-Demand',
}

// ─── Component ──────────────────────────────────────────

export function DriverSidebar({
  collapsed,
  drivers,
  routes,
  positions,
  selectedDriverId,
  onSelectDriver,
  onAssignTask,
}: DriverSidebarProps) {
  const { t } = useTranslation('dispatch')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<QuickFilter>('all')
  const [expandedGroups, setExpandedGroups] = useState<Set<DriverType>>(
    () => new Set(GROUP_ORDER),
  )

  // Unassigned tasks (routes with no driver or draft status)
  const unassignedTasks = useMemo(
    () =>
      routes.filter(
        (r) =>
          !r.driverId ||
          !drivers.some((d) => d.id === r.driverId),
      ),
    [routes, drivers],
  )

  // Filter drivers
  const filteredDrivers = useMemo(() => {
    let result = drivers

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((d) => {
        const matchName = d.name.toLowerCase().includes(q)
        const driverRoutes = routes.filter((r) => r.driverId === d.id)
        const matchOrder = driverRoutes.some((r) =>
          r.stops.some((s) => s.orderId.toLowerCase().includes(q)),
        )
        return matchName || matchOrder
      })
    }

    // Quick filter
    if (activeFilter !== 'all') {
      result = result.filter((d) => {
        const pos = positions.get(d.id)
        const driverRoutes = routes.filter((r) => r.driverId === d.id)

        switch (activeFilter) {
          case 'problems':
            return pos?.status === 'problem'
          case 'arriving': {
            return driverRoutes.some((r) =>
              r.stops.some((s) => s.status === 'en_route'),
            )
          }
          case 'completed':
            return driverRoutes.every(
              (r) => r.status === 'completed' || r.stops.every((s) => s.status === 'delivered'),
            )
          default:
            return true
        }
      })
    }

    return result
  }, [drivers, searchQuery, activeFilter, positions, routes])

  // Group by driver type
  const grouped = useMemo(() => {
    const map = new Map<DriverType, Driver[]>()
    for (const type of GROUP_ORDER) {
      map.set(type, [])
    }
    for (const d of filteredDrivers) {
      const arr = map.get(d.type)
      if (arr) arr.push(d)
    }
    return map
  }, [filteredDrivers])

  const toggleGroup = useCallback((type: DriverType) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }, [])

  // DnD for unassigned tasks
  const { dragAndDropHooks } = useDragAndDrop({
    acceptedDragTypes: ['dispatch-task'],
    getItems(keys) {
      return [...keys].map((key) => ({
        'dispatch-task': String(key),
        'text/plain': String(key),
      }))
    },
    onRootDrop(e) {
      if (!onAssignTask) return
      for (const item of e.items) {
        if (item.kind === 'text') {
          void item.getText('dispatch-task').then((taskId) => {
            // Will be handled by parent
            onAssignTask(taskId, '')
          })
        }
      }
    },
  })

  return (
    <div
      className="h-full bg-white/80 dark:bg-black/80 backdrop-blur-xl border-e border-black/10 dark:border-white/10 flex flex-col overflow-hidden transition-[width] duration-300 ease-in-out"
      style={{ width: collapsed ? 0 : 320 }}
      aria-label={t('driverSidebar', 'Driver sidebar')}
    >
      {!collapsed && (
        <>
          {/* Search */}
          <div className="px-3 pt-3 pb-2">
            <SearchField
              aria-label={t('searchDrivers', 'Search drivers')}
              value={searchQuery}
              onChange={setSearchQuery}
              className="w-full"
            >
              <Label className="sr-only">{t('searchDrivers', 'Search drivers')}</Label>
              <Input
                placeholder={t('searchPlaceholder', 'Search driver or order...')}
                className="w-full text-sm px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </SearchField>
          </div>

          {/* Quick Filters */}
          <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
            {(
              [
                ['all', t('filterAll', 'All')],
                ['problems', t('filterProblems', 'Problems')],
                ['arriving', t('filterArriving', 'Arriving Soon')],
                ['completed', t('filterCompleted', 'Completed')],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveFilter(key)}
                className={`text-xs px-2 py-1 rounded-md transition-colors ${
                  activeFilter === key
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {/* Unassigned Tasks */}
            {unassignedTasks.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-1">
                  {t('unassigned', 'Unassigned')} ({unassignedTasks.length})
                </p>
                <GridList
                  aria-label={t('unassignedTasks', 'Unassigned tasks')}
                  items={unassignedTasks.map((r) => ({ id: r.id, ...r }))}
                  dragAndDropHooks={dragAndDropHooks}
                  className="space-y-1"
                >
                  {(item) => (
                    <GridListItem
                      key={item.id}
                      textValue={item.id}
                      className="text-xs px-2 py-1.5 rounded-md bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 cursor-grab"
                    >
                      <span className="font-mono">{item.stops.length}</span> stops
                      &middot; <span className="font-mono">{item.totalWeight.toLocaleString()}</span> kg
                    </GridListItem>
                  )}
                </GridList>
              </div>
            )}

            {/* Driver Groups */}
            {GROUP_ORDER.map((type) => {
              const groupDrivers = grouped.get(type) ?? []
              if (groupDrivers.length === 0) return null
              const isExpanded = expandedGroups.has(type)

              return (
                <div key={type} className="mb-2">
                  <button
                    type="button"
                    onClick={() => toggleGroup(type)}
                    className="w-full flex items-center gap-1.5 py-1 text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40 hover:text-black/60 dark:hover:text-white/60"
                  >
                    <svg
                      className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                    {GROUP_LABELS[type]} ({groupDrivers.length})
                  </button>

                  {isExpanded && (
                    <div className="space-y-0.5 mt-0.5">
                      {groupDrivers.map((driver) => (
                        <DriverRow
                          key={driver.id}
                          driver={driver}
                          position={positions.get(driver.id)}
                          route={routes.find((r) => r.driverId === driver.id)}
                          isSelected={selectedDriverId === driver.id}
                          onSelect={() => onSelectDriver(driver.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Driver Row ─────────────────────────────────────────

function DriverRow({
  driver,
  position,
  route,
  isSelected,
  onSelect,
}: {
  driver: Driver
  position: GPSPosition | undefined
  route: DeliveryRoute | undefined
  isSelected: boolean
  onSelect: () => void
}) {
  const status = position?.status ?? 'offline'
  const dotColor = STATUS_DOT_COLORS[status]

  const completedStops = route?.stops.filter((s) => s.status === 'delivered').length ?? 0
  const totalStops = route?.stops.length ?? 0

  const nextStop = route?.stops.find((s) => s.status === 'en_route' || s.status === 'pending')

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-start transition-colors ${
        isSelected
          ? 'bg-[#2563EB]/10 border border-[#2563EB]/40'
          : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
      }`}
    >
      {/* Status dot */}
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: dotColor }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-black dark:text-white truncate">{driver.name}</p>
        <div className="flex items-center gap-2 text-[11px] text-black/50 dark:text-white/50">
          {totalStops > 0 && (
            <span className="font-mono">
              {completedStops}/{totalStops}
            </span>
          )}
          {nextStop && (
            <span className="truncate">
              {nextStop.timeWindow.start}
            </span>
          )}
        </div>
      </div>

      {/* Speed indicator */}
      {position && position.speed > 0 && (
        <span className="font-mono text-[11px] text-black/40 dark:text-white/40 shrink-0">
          {position.speed.toFixed(0)}
        </span>
      )}
    </button>
  )
}
