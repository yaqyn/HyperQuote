import { useState, useMemo } from 'react'
import {
  Cell,
  Column,
  Row,
  Table,
  TableBody,
  TableHeader,
} from 'react-aria-components'
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

const STATUS_STYLES: Record<string, string> = {
  po_placed: 'bg-black/5 text-black/60 dark:bg-white/5 dark:text-white/60',
  'Pending PO': 'bg-black/5 text-black/60 dark:bg-white/5 dark:text-white/60',
  'PO Sent': 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300',
  confirmed: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300',
  manufacturing: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300',
  in_transit: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300',
  at_warehouse: 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300',
  shipped: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300',
  received: 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300',
  ready: 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300',
  delivered: 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300',
}

function statusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Per-line-item status table using React Aria Table.
 * Sortable by status and ETA columns.
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
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 overflow-x-auto">
      <h3 className="text-sm font-semibold mb-3">Line Items</h3>

      <Table aria-label="Order line items" className="w-full text-sm">
        <TableHeader>
          <Column isRowHeader className="text-start text-xs font-medium text-black/50 dark:text-white/50 pb-2 pe-4">
            Item
          </Column>
          <Column className="text-start text-xs font-medium text-black/50 dark:text-white/50 pb-2 pe-4">
            Supplier
          </Column>
          <Column className="text-start text-xs font-medium text-black/50 dark:text-white/50 pb-2 pe-4">
            PO Number
          </Column>
          <Column className="text-start text-xs font-medium text-black/50 dark:text-white/50 pb-2 pe-4 cursor-pointer select-none"
            id="status"
          >
            <button type="button" onClick={() => handleSort('status')} className="inline-flex items-center gap-1">
              Status {sortKey === 'status' ? (sortDir === 'asc' ? '\u2191' : '\u2193') : ''}
            </button>
          </Column>
          <Column className="text-start text-xs font-medium text-black/50 dark:text-white/50 pb-2 pe-4">
            Quantity
          </Column>
          <Column className="text-start text-xs font-medium text-black/50 dark:text-white/50 pb-2 cursor-pointer select-none"
            id="eta"
          >
            <button type="button" onClick={() => handleSort('eta')} className="inline-flex items-center gap-1">
              ETA {sortKey === 'eta' ? (sortDir === 'asc' ? '\u2191' : '\u2193') : ''}
            </button>
          </Column>
        </TableHeader>
        <TableBody>
          {sorted.map((item) => (
            <Row key={item.id} className="border-t border-black/5 dark:border-white/5">
              <Cell className="py-2.5 pe-4 font-medium">{item.productName}</Cell>
              <Cell className="py-2.5 pe-4 text-black/70 dark:text-white/70">{item.supplier}</Cell>
              <Cell className="py-2.5 pe-4 font-geist-mono text-[13px]">{item.poNumber}</Cell>
              <Cell className="py-2.5 pe-4">
                <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[item.status] ?? 'bg-black/5 text-black/60 dark:bg-white/5 dark:text-white/60'}`}>
                  {statusLabel(item.status)}
                </span>
              </Cell>
              <Cell className="py-2.5 pe-4 font-geist-mono text-[13px]">
                {item.fulfilledQuantity} / {item.quantity}
              </Cell>
              <Cell className="py-2.5 font-geist-mono text-[13px]">
                {new Date(item.eta).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Cell>
            </Row>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
