import { useMemo, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { Button } from 'react-aria-components'
import { getPOList } from '../../../lib/server/procurement-po'
import type { PurchaseOrder, POStatus } from '../../../types/procurement'

// ─── Status Badge ─────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-black/5 text-black/60 border-black/10 dark:bg-white/10 dark:text-white/60 dark:border-white/10',
  sent: 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20',
  confirmed: 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20',
  in_production: 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20',
  shipped: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-800',
  partially_received: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-800',
  received: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800',
  inspected: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800',
  closed: 'bg-black/5 text-black/40 border-black/10 dark:bg-white/5 dark:text-white/40 dark:border-white/10',
  rejected: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800',
  cancelled: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? STATUS_COLORS.draft}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

// ─── Formatting ───────────────────────────────────────────

function formatEGP(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(isoDate))
}

// ─── Filter Tabs ──────────────────────────────────────────

type FilterTab = 'all' | 'draft' | 'active' | 'completed'

const TAB_FILTERS: Record<FilterTab, (po: PurchaseOrder) => boolean> = {
  all: () => true,
  draft: (po) => po.status === 'draft',
  active: (po) =>
    ['sent', 'confirmed', 'in_production', 'shipped', 'partially_received', 'received', 'inspected'].includes(po.status),
  completed: (po) => ['closed', 'rejected', 'cancelled'].includes(po.status),
}

// ─── Component ────────────────────────────────────────────

interface POListProps {
  onSelectPO: (poId: string) => void
  selectedPOId: string | null
}

export function POList({ onSelectPO, selectedPOId }: POListProps) {
  const { t, i18n } = useTranslation('internal')
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'

  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [sorting, setSorting] = useState<SortingState>([])
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['po-list', { page }],
    queryFn: () => getPOList({ data: { page, limit: 20 } }),
    staleTime: 30_000,
  })

  const allPOs = data?.pos ?? []
  const filteredPOs = useMemo(() => {
    const filterFn = TAB_FILTERS[activeTab]
    return allPOs.filter(filterFn)
  }, [allPOs, activeTab])

  const columns = useMemo<ColumnDef<PurchaseOrder, unknown>[]>(
    () => [
      {
        id: 'poNumber',
        accessorKey: 'poNumber',
        header: () => <span className="text-xs">PO Number</span>,
        cell: ({ row }) => (
          <span className="font-[family-name:var(--font-geist-mono)] text-sm font-medium tabular-nums">
            {row.original.poNumber}
          </span>
        ),
        size: 140,
      },
      {
        id: 'supplier',
        accessorKey: 'supplierName',
        header: () => <span className="text-xs">Supplier</span>,
        cell: ({ row }) => (
          <span className="text-sm truncate">{row.original.supplierName}</span>
        ),
        size: 180,
      },
      {
        id: 'value',
        accessorKey: 'total',
        header: () => <span className="text-xs">Value</span>,
        cell: ({ row }) => (
          <span className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
            {formatEGP(row.original.total, locale)}
          </span>
        ),
        size: 130,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: () => <span className="text-xs">Status</span>,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        size: 140,
      },
      {
        id: 'items',
        accessorKey: 'items',
        header: () => <span className="text-xs">Items</span>,
        cell: ({ row }) => (
          <span className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
            {row.original.items.length}
          </span>
        ),
        size: 60,
      },
      {
        id: 'expectedDelivery',
        accessorKey: 'expectedDeliveryDate',
        header: () => <span className="text-xs">Expected</span>,
        cell: ({ row }) => (
          <span className="font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-black/60 dark:text-white/60">
            {formatDate(row.original.expectedDeliveryDate, locale)}
          </span>
        ),
        size: 120,
      },
    ],
    [locale],
  )

  const table = useReactTable({
    data: filteredPOs,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  // J/K keyboard navigation
  const tableRef = useRef<HTMLDivElement>(null)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'j' && e.key !== 'k') return
      e.preventDefault()

      const rows = table.getRowModel().rows
      if (rows.length === 0) return

      const currentIndex = rows.findIndex((r) => r.original.id === selectedPOId)
      let nextIndex: number
      if (e.key === 'j') {
        nextIndex = currentIndex < rows.length - 1 ? currentIndex + 1 : 0
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : rows.length - 1
      }
      onSelectPO(rows[nextIndex].original.id)
    },
    [selectedPOId, table, onSelectPO],
  )

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'draft', label: 'Draft' },
    { id: 'active', label: 'Active' },
    { id: 'completed', label: 'Completed' },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-black/40 dark:text-white/40">Loading purchase orders...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-black/10 dark:border-white/10 px-4 py-2 overflow-x-auto">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium outline-none transition-colors
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
              ${
                activeTab === tab.id
                  ? 'bg-[#2563EB] text-white'
                  : 'text-black/60 dark:text-white/60 data-[hovered]:bg-black/5 dark:data-[hovered]:bg-white/10'
              }`}
            onPress={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div
        ref={tableRef}
        className="flex-1 overflow-auto focus:outline-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="grid"
        aria-label="Purchase orders"
      >
        <table className="w-full text-start">
          <thead className="sticky top-0 z-10 bg-white/95 dark:bg-black/95 backdrop-blur-sm border-b border-black/10 dark:border-white/10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-start font-medium text-black/50 dark:text-white/50"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`cursor-pointer border-b border-black/5 dark:border-white/5 transition-colors
                  hover:bg-black/3 dark:hover:bg-white/5
                  ${row.original.id === selectedPOId ? 'bg-[#2563EB]/5' : ''}`}
                onClick={() => onSelectPO(row.original.id)}
                aria-selected={row.original.id === selectedPOId}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {filteredPOs.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-black/40 dark:text-white/40">
                  No purchase orders found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(data?.total ?? 0) > 20 && (
        <div className="flex items-center justify-between border-t border-black/10 dark:border-white/10 px-4 py-2">
          <span className="text-xs text-black/40 dark:text-white/40">
            Page <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{page}</span>
          </span>
          <div className="flex gap-1">
            <Button
              className="rounded-md border border-black/10 px-2 py-1 text-xs outline-none data-[hovered]:bg-black/5
                data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 data-[disabled]:opacity-30
                dark:border-white/10 dark:data-[hovered]:bg-white/10"
              isDisabled={page <= 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              className="rounded-md border border-black/10 px-2 py-1 text-xs outline-none data-[hovered]:bg-black/5
                data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
                dark:border-white/10 dark:data-[hovered]:bg-white/10"
              onPress={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
