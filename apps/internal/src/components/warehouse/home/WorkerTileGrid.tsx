import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import {
  Package,
  ArrowDownToLine,
  PackageSearch,
  Truck,
  ClipboardCheck,
  ArrowLeftRight,
  Search,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react'
import { useWarehouseStore } from '../../../stores/warehouse'
import { getWarehouseDashboard } from '../../../lib/server/warehouse-dashboard'
import type { WarehouseTab, WarehouseDashboard } from '../../../types/warehouse'

interface TileDef {
  key: string
  tab: WarehouseTab
  icon: React.ComponentType<{ size?: number; className?: string }>
  labelKey: string
  fallback: string
  badgeField: keyof WarehouseDashboard
  shortcut: number
}

const TILES: TileDef[] = [
  { key: '1-Receive', tab: 'receiving', icon: Package, labelKey: 'warehouse.tiles.receive', fallback: 'Receive', badgeField: 'pendingReceiving', shortcut: 1 },
  { key: '2-Putaway', tab: 'putaway', icon: ArrowDownToLine, labelKey: 'warehouse.tiles.putaway', fallback: 'Putaway', badgeField: 'pendingPutaway', shortcut: 2 },
  { key: '3-Pick', tab: 'picking', icon: PackageSearch, labelKey: 'warehouse.tiles.pick', fallback: 'Pick', badgeField: 'pendingPicking', shortcut: 3 },
  { key: '4-Load', tab: 'staging', icon: Truck, labelKey: 'warehouse.tiles.load', fallback: 'Load', badgeField: 'pendingLoading', shortcut: 4 },
  { key: '5-Count', tab: 'count', icon: ClipboardCheck, labelKey: 'warehouse.tiles.count', fallback: 'Count', badgeField: 'pendingCounts', shortcut: 5 },
  { key: '6-Transfer', tab: 'lookup', icon: ArrowLeftRight, labelKey: 'warehouse.tiles.transfer', fallback: 'Transfer', badgeField: 'pendingTransfers', shortcut: 6 },
  { key: '7-Lookup', tab: 'lookup', icon: Search, labelKey: 'warehouse.tiles.lookup', fallback: 'Lookup', badgeField: 'pendingTransfers', shortcut: 7 },
  { key: '8-Returns', tab: 'receiving', icon: RotateCcw, labelKey: 'warehouse.tiles.returns', fallback: 'Returns', badgeField: 'pendingReturns', shortcut: 8 },
  { key: '9-Alerts', tab: 'home', icon: AlertTriangle, labelKey: 'warehouse.tiles.alerts', fallback: 'Alerts', badgeField: 'criticalAlerts', shortcut: 9 },
]

function getBadgeColor(count: number, field: keyof WarehouseDashboard): string {
  // Red = urgent/overdue, yellow = due today, green = ahead of schedule
  if (field === 'criticalAlerts' && count > 0) return 'bg-red-500 text-white'
  if (count > 5) return 'bg-red-500 text-white'
  if (count > 0) return 'bg-yellow-500 text-black'
  return 'bg-green-500 text-white'
}

export function WorkerTileGrid() {
  const { t } = useTranslation('internal')
  const setActiveTab = useWarehouseStore((s) => s.setActiveTab)

  const { data: dashboard } = useQuery({
    queryKey: ['warehouse', 'dashboard'],
    queryFn: () => getWarehouseDashboard({ data: {} }),
    staleTime: 30_000,
  })

  return (
    <div className="grid grid-cols-3 gap-3 p-4">
      {TILES.map((tile) => {
        const Icon = tile.icon
        const count = dashboard ? (dashboard[tile.badgeField] as number) : 0

        return (
          <Button
            key={tile.key}
            onPress={() => setActiveTab(tile.tab)}
            className="relative flex flex-col items-center justify-center gap-2 min-h-[64px] rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4 cursor-pointer transition-all hover:border-[#2563EB]/40 hover:bg-[#2563EB]/5 pressed:scale-[0.98] outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
          >
            {/* Shortcut number in corner */}
            <span className="absolute top-1.5 end-2 text-[10px] font-[family-name:var(--font-geist-mono)] tabular-nums text-black/30 dark:text-white/30">
              {tile.shortcut}
            </span>

            <Icon size={24} className="text-black/70 dark:text-white/70" />

            <span className="text-xs font-medium text-black/70 dark:text-white/70">
              {t(tile.labelKey, tile.fallback)}
            </span>

            {/* Badge count */}
            {count > 0 && (
              <span
                className={`absolute top-1.5 start-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[10px] font-[family-name:var(--font-geist-mono)] tabular-nums font-semibold ${getBadgeColor(count, tile.badgeField)}`}
              >
                {count}
              </span>
            )}
          </Button>
        )
      })}
    </div>
  )
}
