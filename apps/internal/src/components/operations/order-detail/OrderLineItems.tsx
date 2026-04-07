import { useState, useMemo } from 'react'
import type { OrderLineItem } from '../../../types/operations'

interface OrderLineItemsProps {
  items: OrderLineItem[]
}

type SortKey = 'status' | 'eta'
type SortDir = 'asc' | 'desc'

const STATUS_ORDER: Record<string, number> = {
  po_placed: 0,
  'Pending PO': 0,
  'PO Sent': 1,
  confirmed: 2,
  manufacturing: 3,
  in_transit: 4,
  at_warehouse: 5,
  shipped: 6,
  received: 7,
  ready: 8,
  delivered: 9,
}

function statusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Clean list — product + qty (mono) + unit price + line total.
 * No heavy table borders. Subtle separators.
 * Sortable by status and ETA.
 */
export function OrderLineItems({ items }: OrderLineItemsProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const sorted = useMemo(() => {
    if (!sortKey) return items
    return [...items].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'status') {
        cmp = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
      } else if (sortKey === 'eta') {
        cmp = new Date(a.eta).getTime() - new Date(b.eta).getTime()
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
  }, [items, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div>
      <span className="text-[10px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40 mb-3 block">
        Line Items
      </span>

      {/* Header row */}
      <div className="flex items-center gap-4 px-2 pb-2 text-[10px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30">
        <span className="flex-[2]">Product</span>
        <span className="w-28 shrink-0">Supplier</span>
        <span className="w-24 shrink-0 font-[family-name:var(--font-geist-mono)]">PO</span>
        <button
          type="button"
          onClick={() => handleSort('status')}
          className="w-20 shrink-0 inline-flex items-center gap-0.5 outline-none cursor-pointer"
        >
          Status {sortKey === 'status' ? (sortDir === 'asc' ? '\u2191' : '\u2193') : ''}
        </button>
        <span className="w-20 shrink-0">Qty</span>
        <button
          type="button"
          onClick={() => handleSort('eta')}
          className="w-16 shrink-0 inline-flex items-center gap-0.5 outline-none cursor-pointer"
        >
          ETA {sortKey === 'eta' ? (sortDir === 'asc' ? '\u2191' : '\u2193') : ''}
        </button>
      </div>

      {/* Rows */}
      <div className="flex flex-col">
        {sorted.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 px-2 py-2.5 border-b border-black/[0.04] dark:border-white/[0.04] last:border-b-0"
          >
            <span className="flex-[2] text-[13px] font-medium truncate">{item.productName}</span>
            <span className="w-28 shrink-0 text-[13px] text-black/50 dark:text-white/50 truncate">{item.supplier}</span>
            <span className="w-24 shrink-0 font-[family-name:var(--font-geist-mono)] text-[12px] text-black/40 dark:text-white/40">{item.poNumber}</span>
            <span className="w-20 shrink-0">
              <span className="text-[11px] font-medium text-black/50 dark:text-white/50">
                {statusLabel(item.status)}
              </span>
            </span>
            <span className="w-20 shrink-0 font-[family-name:var(--font-geist-mono)] text-[13px]">
              {item.fulfilledQuantity}/{item.quantity}
            </span>
            <span className="w-16 shrink-0 font-[family-name:var(--font-geist-mono)] text-[12px] text-black/40 dark:text-white/40">
              {new Date(item.eta).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
