import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { useWarehouseStore } from '../../../stores/warehouse'
import { getWarehouseDashboard } from '../../../lib/server/warehouse-dashboard'
import type { WarehouseTab, WarehouseDashboard } from '../../../types/warehouse'

interface TileDef {
  key: string
  tab: WarehouseTab
  labelKey: string
  fallback: string
  badgeField: keyof WarehouseDashboard
  shortcut: number
}

const TILES: TileDef[] = [
  { key: '1-Inbound', tab: 'inbound', labelKey: 'warehouse.tiles.inbound', fallback: 'Inbound', badgeField: 'pendingReceiving', shortcut: 1 },
  { key: '2-Outbound', tab: 'outbound', labelKey: 'warehouse.tiles.outbound', fallback: 'Outbound', badgeField: 'pendingPicking', shortcut: 2 },
  { key: '3-Inventory', tab: 'inventory', labelKey: 'warehouse.tiles.inventory', fallback: 'Inventory', badgeField: 'pendingCounts', shortcut: 3 },
]

/**
 * Worker Tile Grid — large touch tiles (min 80px height).
 * Each tile: action name + count badge. Tapping navigates to that workflow.
 * NO icons — just the name and number. Warehouse workers need words, not icons.
 * Glove-friendly: generous padding, high contrast.
 */
export function WorkerTileGrid() {
  const { t } = useTranslation('internal')
  const setActiveTab = useWarehouseStore((s) => s.setActiveTab)

  const { data: dashboard } = useQuery({
    queryKey: ['warehouse', 'dashboard'],
    queryFn: () => getWarehouseDashboard({ data: {} }),
    staleTime: 30_000,
  })

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-5">
      {TILES.map((tile) => {
        const count = dashboard ? (dashboard[tile.badgeField] as number) : 0

        return (
          <Button
            key={tile.key}
            onPress={() => setActiveTab(tile.tab)}
            className="relative flex items-center justify-between min-h-[80px] rounded-lg border border-black/10 dark:border-white/10 px-5 py-4 cursor-pointer transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03] pressed:bg-black/[0.05] dark:pressed:bg-white/[0.05] outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
          >
            {/* Action name */}
            <span className="text-base font-semibold text-black/80 dark:text-white/80">
              {t(tile.labelKey, tile.fallback)}
            </span>

            {/* Count — huge mono number */}
            <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-bold ${count > 0 ? 'text-black/90 dark:text-white/90' : 'text-black/15 dark:text-white/15'}`}>
              {count}
            </span>

            {/* Shortcut hint */}
            <span className="absolute top-2 end-2 text-[10px] font-[family-name:var(--font-geist-mono)] tabular-nums text-black/15 dark:text-white/15">
              {tile.shortcut}
            </span>
          </Button>
        )
      })}
    </div>
  )
}
