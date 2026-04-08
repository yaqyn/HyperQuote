import { useMemo } from 'react'
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
  descKey: string
  descFallback: string
  unitKey: string
  unitFallback: string
  badgeField: keyof WarehouseDashboard
  shortcut: number
}

const TILES: TileDef[] = [
  { key: '1-Inbound', tab: 'inbound', labelKey: 'warehouse.tiles.inbound', fallback: 'Inbound', descKey: 'warehouse.tiles.inboundDesc', descFallback: '{{count}} deliveries waiting', unitKey: 'warehouse.tiles.inboundUnit', unitFallback: 'deliveries waiting', badgeField: 'pendingReceiving', shortcut: 1 },
  { key: '2-Outbound', tab: 'outbound', labelKey: 'warehouse.tiles.outbound', fallback: 'Outbound', descKey: 'warehouse.tiles.outboundDesc', descFallback: '{{count}} orders to pick', unitKey: 'warehouse.tiles.outboundUnit', unitFallback: 'orders to pick', badgeField: 'pendingPicking', shortcut: 2 },
  { key: '3-Inventory', tab: 'inventory', labelKey: 'warehouse.tiles.inventory', fallback: 'Inventory', descKey: 'warehouse.tiles.inventoryDesc', descFallback: '{{count}} counts pending', unitKey: 'warehouse.tiles.inventoryUnit', unitFallback: 'counts pending', badgeField: 'pendingCounts', shortcut: 3 },
]

/**
 * Worker Tile Grid — large touch tiles (min 80px height).
 * Each tile: action name + descriptive count ("Inbound: 3 deliveries waiting").
 * Tiles sorted by urgency — most pending work first.
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

  // Sort tiles by pending count (most urgent first)
  const sortedTiles = useMemo(() => {
    if (!dashboard) return TILES
    return [...TILES].sort((a, b) => {
      const countA = (dashboard[a.badgeField] as number) ?? 0
      const countB = (dashboard[b.badgeField] as number) ?? 0
      return countB - countA
    })
  }, [dashboard])

  return (
    <div className="flex flex-col gap-4 px-6 py-4">
      {sortedTiles.map((tile) => {
        const count = dashboard ? (dashboard[tile.badgeField] as number) : 0

        return (
          <Button
            key={tile.key}
            onPress={() => setActiveTab(tile.tab)}
            className="relative flex items-center justify-between min-h-[88px] rounded-2xl border border-black/10 dark:border-white/10 px-6 py-5 cursor-pointer transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03] pressed:bg-black/[0.05] dark:pressed:bg-white/[0.05] outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
          >
            {/* Action name + pending description */}
            <div className="flex flex-col gap-1">
              <span className="text-[16px] font-semibold text-black/80 dark:text-white/80">
                {t(tile.labelKey, tile.fallback)}
              </span>
              <span className={`text-[14px] ${count > 0 ? 'text-black/50 dark:text-white/50' : 'text-black/20 dark:text-white/20'}`}>
                {count > 0
                  ? t(tile.descKey, tile.descFallback, { count })
                  : t('warehouse.tiles.noPending', 'All clear')}
              </span>
            </div>

            {/* Count — huge mono number */}
            <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-[28px] font-bold ${count > 0 ? 'text-black/90 dark:text-white/90' : 'text-black/10 dark:text-white/10'}`}>
              {count}
            </span>

            {/* Shortcut hint */}
            <span className="absolute top-3 end-3 text-[11px] font-[family-name:var(--font-geist-mono)] tabular-nums text-black/15 dark:text-white/15">
              {tile.shortcut}
            </span>
          </Button>
        )
      })}
    </div>
  )
}
