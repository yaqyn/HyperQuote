/**
 * Unassigned deliveries as a compact list.
 * Drag to route to assign. DnD type: 'route-stop'.
 */
import { GridList, GridListItem, useDragAndDrop } from 'react-aria-components'
import { GripVertical } from 'lucide-react'
import type { RouteStop } from '../../../types/dispatch'

interface UnassignedPoolProps {
  stops: RouteStop[]
}

export function UnassignedPool({ stops }: UnassignedPoolProps) {
  const { dragAndDropHooks } = useDragAndDrop({
    acceptedDragTypes: ['route-stop'],
    getItems(keys) {
      return [...keys].map((key) => ({
        'route-stop': JSON.stringify(stops.find((s) => s.id === String(key))),
        'text/plain': String(key),
      }))
    },
    onReorder() {
      // No reorder within unassigned pool
    },
  })

  return (
    <div className="rounded-xl border border-black/[0.06] p-3 dark:border-white/[0.06]">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
          Unassigned
        </h3>
        <span className="font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-[#2563EB]">
          {stops.length}
        </span>
      </div>

      <GridList
        aria-label="Unassigned deliveries"
        items={stops.map((s) => ({ ...s, key: s.id }))}
        dragAndDropHooks={dragAndDropHooks}
        renderEmptyState={() => (
          <div className="px-2 py-3 text-center text-[11px] text-black/30 dark:text-white/30">
            All deliveries assigned
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
            <div className="flex items-start gap-2 rounded-lg border border-black/[0.04] p-2 dark:border-white/[0.04]">
              <div className="mt-0.5 shrink-0 cursor-grab text-black/20 dark:text-white/20">
                <GripVertical className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-black/40 dark:text-white/40">
                    {item.orderId}
                  </span>
                  <span className="truncate text-[13px] font-medium">{item.customerName}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-[11px] text-black/50 dark:text-white/50">
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {item.weight.toLocaleString()} kg
                  </span>
                  {item.equipmentNeeded !== 'none' && (
                    <span className="rounded bg-black/[0.05] px-1 py-0.5 text-[9px] uppercase dark:bg-white/[0.05]">
                      {item.equipmentNeeded}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </GridListItem>
        )}
      </GridList>
    </div>
  )
}
