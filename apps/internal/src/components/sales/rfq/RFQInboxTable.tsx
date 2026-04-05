import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { getRFQQueue } from '../../../lib/server/sales-rfq'
import { autoAssignRFQ } from '../../../lib/server/sales-rfq'
import { useSalesStore } from '../../../stores/sales'
import type { RFQ } from '../../../types/sales'
import { RFQPriorityBadge } from './RFQPriorityBadge'
import { TierBadge } from '../shared/TierBadge'
import { AgeTimer } from '../shared/AgeTimer'
import { SLACountdown } from '../shared/SLACountdown'
import { RFQPreviewPane } from './RFQPreviewPane'
import { useState } from 'react'

function StatusPill({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    submitted: 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20',
    assigned: 'bg-black/5 text-black/60 border-black/10 dark:bg-white/10 dark:text-white/60 dark:border-white/10',
    reviewing: 'bg-black/5 text-black/60 border-black/10 dark:bg-white/10 dark:text-white/60 dark:border-white/10',
    awaiting_clarification: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-800',
    quoting: 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20',
    quoted: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800',
    declined: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800',
    expired: 'bg-black/3 text-black/40 border-black/10 dark:bg-white/5 dark:text-white/40 dark:border-white/10',
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${colorMap[status] ?? colorMap.submitted}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

function formatEGP(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(value)
}

const TAB_FILTERS: Record<string, (rfq: RFQ) => boolean> = {
  all: () => true,
  my: (rfq) => rfq.assignedRep !== null,
  unassigned: (rfq) => rfq.assignedRep === null,
  'needs-clarification': (rfq) => rfq.status === 'awaiting_clarification',
  urgent: (rfq) => rfq.priorityScore > 75,
}

export function RFQInboxTable() {
  const { t, i18n } = useTranslation('internal')
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'
  const queryClient = useQueryClient()

  const rfqInboxTab = useSalesStore((s) => s.rfqInboxTab)
  const setRfqInboxTab = useSalesStore((s) => s.setRfqInboxTab)
  const selectedRfqId = useSalesStore((s) => s.selectedRfqId)
  const setSelectedRfqId = useSalesStore((s) => s.setSelectedRfqId)

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'priorityScore', desc: true },
  ])

  const { data, isLoading } = useQuery({
    queryKey: ['rfq-queue', {}],
    queryFn: () => getRFQQueue({ data: { page: 1, limit: 50 } }),
    staleTime: 30_000,
  })

  const claimMutation = useMutation({
    mutationFn: (rfqId: string) => autoAssignRFQ({ data: { rfqId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfq-queue'] })
    },
  })

  const rfqs = data?.rfqs ?? []
  const filteredRfqs = useMemo(() => {
    const filterFn = TAB_FILTERS[rfqInboxTab] ?? TAB_FILTERS.all
    return rfqs.filter(filterFn)
  }, [rfqs, rfqInboxTab])

  const columns = useMemo<ColumnDef<RFQ, any>[]>(
    () => [
      {
        id: 'priorityScore',
        accessorKey: 'priorityScore',
        header: () => <span className="text-xs">Priority</span>,
        cell: ({ row }) => <RFQPriorityBadge score={row.original.priorityScore} />,
        size: 60,
      },
      {
        id: 'age',
        accessorKey: 'createdAt',
        header: () => <span className="text-xs">Age</span>,
        cell: ({ row }) => <AgeTimer createdAt={row.original.createdAt} />,
        size: 90,
      },
      {
        id: 'customer',
        accessorKey: 'customerName',
        header: () => <span className="text-xs">Customer</span>,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{row.original.customerName}</span>
            <TierBadge tier={row.original.customerTier} />
          </div>
        ),
        size: 200,
      },
      {
        id: 'value',
        accessorKey: 'estimatedValue',
        header: () => <span className="text-xs">Value</span>,
        cell: ({ row }) => (
          <span className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
            {formatEGP(row.original.estimatedValue, locale)}
          </span>
        ),
        size: 120,
      },
      {
        id: 'items',
        accessorKey: 'lineItemCount',
        header: () => <span className="text-xs">Items</span>,
        cell: ({ row }) => (
          <span className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
            {row.original.lineItemCount}
          </span>
        ),
        size: 60,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: () => <span className="text-xs">Status</span>,
        cell: ({ row }) => <StatusPill status={row.original.status} />,
        size: 130,
      },
      {
        id: 'assigned',
        accessorKey: 'assignedRep',
        header: () => <span className="text-xs">Assigned</span>,
        cell: ({ row }) =>
          row.original.assignedRep ? (
            <span className="text-sm text-black/60 dark:text-white/60 truncate">
              {row.original.assignedRep}
            </span>
          ) : (
            <Button
              className="rounded-md border border-[#2563EB]/20 bg-[#2563EB]/5 px-2 py-0.5 text-xs font-medium text-[#2563EB] outline-none
                data-[hovered]:bg-[#2563EB]/10 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
              onPress={() => claimMutation.mutate(row.original.id)}
              isDisabled={claimMutation.isPending}
            >
              Assign to Me
            </Button>
          ),
        size: 120,
      },
      {
        id: 'sla',
        accessorKey: 'slaDeadline',
        header: () => <span className="text-xs">SLA</span>,
        cell: ({ row }) => (
          <SLACountdown deadline={row.original.slaDeadline} tier={row.original.customerTier} />
        ),
        size: 120,
      },
    ],
    [locale, claimMutation],
  )

  const table = useReactTable({
    data: filteredRfqs,
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

      const currentIndex = rows.findIndex((r) => r.original.id === selectedRfqId)

      let nextIndex: number
      if (e.key === 'j') {
        nextIndex = currentIndex < rows.length - 1 ? currentIndex + 1 : 0
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : rows.length - 1
      }

      setSelectedRfqId(rows[nextIndex].original.id)
    },
    [selectedRfqId, table, setSelectedRfqId],
  )

  const tabs: { id: typeof rfqInboxTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'my', label: 'My RFQs' },
    { id: 'unassigned', label: 'Unassigned' },
    { id: 'needs-clarification', label: 'Needs Clarification' },
    { id: 'urgent', label: 'Urgent' },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-black/40 dark:text-white/40">Loading RFQs...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Left: Inbox list */}
      <div className="flex flex-col min-w-0 w-full md:w-[55%]">
        {/* Toolbar */}
        <div className="flex items-center gap-1 border-b border-black/10 dark:border-white/10 px-4 py-2 overflow-x-auto">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium outline-none transition-colors
                data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
                ${
                  rfqInboxTab === tab.id
                    ? 'bg-[#2563EB] text-white'
                    : 'text-black/60 dark:text-white/60 data-[hovered]:bg-black/5 dark:data-[hovered]:bg-white/10'
                }`}
              onPress={() => setRfqInboxTab(tab.id)}
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
          aria-label="RFQ inbox"
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
                    ${row.original.id === selectedRfqId ? 'bg-[#2563EB]/5' : ''}`}
                  onClick={() => setSelectedRfqId(row.original.id)}
                  aria-selected={row.original.id === selectedRfqId}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {filteredRfqs.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-black/40 dark:text-white/40">
                    No RFQs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right: Preview pane (desktop only) */}
      <div className="hidden md:flex md:w-[45%] border-s border-black/10 dark:border-white/10">
        {selectedRfqId ? (
          <RFQPreviewPane rfqId={selectedRfqId} />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <p className="text-sm text-black/30 dark:text-white/30">
              Select an RFQ to preview
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
