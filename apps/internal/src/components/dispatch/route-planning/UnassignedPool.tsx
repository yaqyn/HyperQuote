/**
 * Pool of unassigned deliveries (not yet on any route).
 * React Aria DnD GridList -- items can be dragged onto RouteCards.
 * Drag type: 'route-stop' for compatibility with RouteCard drop targets.
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
    <div className="rounded-xl border border-[var(--color-border)] bg-white/60 p-3 backdrop-blur-sm dark:bg-black/40">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Unassigned</h3>
        <span className="rounded-full bg-[#2563EB]/10 px-2 py-0.5 font-[family-name:var(--font-geist-mono)] text-xs font-medium tabular-nums text-[#2563EB]">
          {stops.length}
        </span>
      </div>

      {/* Draggable list */}
      <GridList
        aria-label="Unassigned deliveries"
        items={stops.map((s) => ({ ...s, key: s.id }))}
        dragAndDropHooks={dragAndDropHooks}
        renderEmptyState={() => (
          <div className="px-2 py-3 text-center text-xs text-black/30 dark:text-white/30">
            All deliveries assigned
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
            <div className="flex items-start gap-2 rounded-lg border border-[var(--color-border)] bg-white/40 p-2 dark:bg-black/30">
              <div className="mt-0.5 shrink-0 cursor-grab text-black/30 dark:text-white/30">
                <GripVertical className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-black/40 dark:text-white/40">
                    {item.orderId}
                  </span>
                  <span className="truncate text-sm font-medium">
                    {item.customerName}
                  </span>
                </div>
                <p className="truncate text-xs text-black/50 dark:text-white/50">
                  {item.address}
                </p>
                <div className="mt-1 flex items-center gap-3 text-xs text-black/60 dark:text-white/60">
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {item.weight.toLocaleString()} kg
                  </span>
                  {item.equipmentNeeded !== 'none' && (
                    <span className="rounded bg-black/5 px-1 py-0.5 text-[10px] uppercase dark:bg-white/5">
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
