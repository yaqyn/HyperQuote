import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import {
  Table,
  TableHeader,
  TableBody,
  Row,
  Cell,
  Column,
} from 'react-aria-components'
import type { PipelineDeal, PipelineStageId } from '../../../types/sales'
import { getSalesPipeline } from '../../../lib/server/sales-pipeline'
import { useSalesStore } from '../../../stores/sales'
import { TierBadge } from '../shared/TierBadge'
import { StageAdvancePanel } from './StageAdvancePanel'

const STAGE_LABELS: Record<PipelineStageId, string> = {
  rfq_received: 'RFQ Received',
  reviewing: 'Reviewing',
  sourcing: 'Sourcing',
  quoting: 'Quoting',
  sent: 'Sent to Customer',
  negotiating: 'Negotiating',
  closing: 'Closing',
  won: 'Won',
  lost_expired: 'Lost / Expired',
}

const STAGE_COLORS: Record<PipelineStageId, string> = {
  rfq_received: 'bg-black/5 text-black/60 dark:bg-white/5 dark:text-white/60',
  reviewing: 'bg-black/5 text-black/60 dark:bg-white/5 dark:text-white/60',
  sourcing: 'bg-black/5 text-black/60 dark:bg-white/5 dark:text-white/60',
  quoting: 'bg-[#2563EB]/10 text-[#2563EB]',
  sent: 'bg-[#2563EB]/10 text-[#2563EB]',
  negotiating: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  closing: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  won: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  lost_expired: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
}

function getDaysColor(days: number): string {
  if (days < 5) return 'text-green-600'
  if (days <= 15) return 'text-yellow-600'
  return 'text-red-600'
}

const formatValue = (value: number) =>
  new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const columnHelper = createColumnHelper<PipelineDeal>()

export function PipelineListView() {
  const { t } = useTranslation('internal')
  const pipelineFilters = useSalesStore((s) => s.pipelineFilters)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [selectedDeal, setSelectedDeal] = useState<PipelineDeal | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['sales-pipeline', pipelineFilters],
    queryFn: () => getSalesPipeline({ data: { filters: pipelineFilters } }),
    staleTime: 30_000,
  })

  const columns = [
    columnHelper.accessor('stage', {
      header: () => t('sales.pipeline.stage', 'Stage'),
      cell: (info) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[info.getValue()]}`}
        >
          {STAGE_LABELS[info.getValue()]}
        </span>
      ),
    }),
    columnHelper.accessor('customerName', {
      header: () => t('sales.pipeline.customer', 'Customer'),
      cell: (info) => (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{info.getValue()}</span>
          <TierBadge tier={info.row.original.customerTier} />
        </div>
      ),
    }),
    columnHelper.accessor('dealValue', {
      header: () => t('sales.pipeline.dealValue', 'Deal Value'),
      cell: (info) => (
        <span className="font-[family-name:var(--font-geist-mono)] text-sm">
          {formatValue(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor('winProbability', {
      header: () => t('sales.pipeline.winProb', 'Win %'),
      cell: (info) => (
        <span className="font-[family-name:var(--font-geist-mono)] text-sm">
          {info.getValue()}%
        </span>
      ),
    }),
    columnHelper.accessor('daysInStage', {
      header: () => t('sales.pipeline.daysInStage', 'Days'),
      cell: (info) => (
        <span
          className={`font-[family-name:var(--font-geist-mono)] text-sm ${getDaysColor(info.getValue())}`}
        >
          {info.getValue()}d
        </span>
      ),
    }),
    columnHelper.accessor('assignedRep', {
      header: () => t('sales.pipeline.rep', 'Rep'),
      cell: (info) => <span className="text-sm">{info.getValue()}</span>,
    }),
    columnHelper.accessor('statusText', {
      header: () => t('sales.pipeline.status', 'Status'),
      cell: (info) => (
        <span className="text-xs text-black/50 dark:text-white/50">{info.getValue()}</span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: () => '',
      cell: (info) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setSelectedDeal(info.row.original)
            }}
            className="text-xs text-[#2563EB] hover:underline"
          >
            {t('sales.pipeline.advance', 'Advance')}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setSelectedDeal(info.row.original)
            }}
            className="text-xs text-black/40 hover:underline dark:text-white/40"
          >
            {t('sales.pipeline.details', 'Details')}
          </button>
        </div>
      ),
    }),
  ]

  const table = useReactTable({
    data: data?.deals ?? [],
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-black/40 dark:text-white/40">
          {t('common.loading', 'Loading...')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto px-4 py-3">
        <Table aria-label={t('sales.pipeline.pipelineList', 'Pipeline List')} className="w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) =>
              headerGroup.headers.map((header) => (
                <Column
                  key={header.id}
                  isRowHeader={header.index === 0}
                  className="cursor-pointer px-3 py-2 text-start text-xs font-medium text-black/50 dark:text-white/50"
                >
                  <button
                    type="button"
                    onClick={header.column.getToggleSortingHandler()}
                    className="flex items-center gap-1"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === 'asc'
                      ? ' \u2191'
                      : header.column.getIsSorted() === 'desc'
                        ? ' \u2193'
                        : ''}
                  </button>
                </Column>
              )),
            )}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row, rowIndex) => (
              <Row
                key={row.id}
                onAction={() => setSelectedDeal(row.original)}
                className={`cursor-pointer border-b border-black/5 hover:bg-black/3 dark:border-white/5 dark:hover:bg-white/3 ${
                  rowIndex % 2 === 1 ? 'bg-black/[0.02] dark:bg-white/[0.02]' : ''
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <Cell key={cell.id} className="px-3 py-2.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Cell>
                ))}
              </Row>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Side panel */}
      {selectedDeal && (
        <StageAdvancePanel
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onMoveDeal={() => {
            setSelectedDeal(null)
          }}
        />
      )}
    </div>
  )
}
