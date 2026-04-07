import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import type { PipelineDeal, PipelineStageId } from '../../../types/sales'
import { getSalesPipeline } from '../../../lib/server/sales-pipeline'
import { useSalesStore } from '../../../stores/sales'
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

function getStagePillStyle(stage: PipelineStageId): string {
  switch (stage) {
    case 'won':
      return 'bg-green-500/10 text-green-600 dark:text-green-400'
    case 'lost_expired':
      return 'bg-red-500/10 text-red-500'
    case 'negotiating':
    case 'closing':
      return 'bg-[#2563EB]/10 text-[#2563EB]'
    default:
      return 'bg-black/[0.05] text-black/50 dark:bg-white/[0.05] dark:text-white/50'
  }
}

function getDaysColor(days: number): string {
  if (days < 5) return 'text-green-600 dark:text-green-400'
  if (days <= 15) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

function getStatusDotColor(color: PipelineDeal['color']): string {
  switch (color) {
    case 'green':
      return 'bg-green-500'
    case 'yellow':
      return 'bg-yellow-500'
    case 'red':
      return 'bg-red-500'
    default:
      return 'bg-black/15 dark:bg-white/15'
  }
}

const formatValue = (value: number) =>
  new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export function PipelineListView() {
  const { t } = useTranslation('internal')
  const pipelineFilters = useSalesStore((s) => s.pipelineFilters)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [selectedDeal, setSelectedDeal] = useState<PipelineDeal | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['sales-pipeline', pipelineFilters],
    queryFn: () => getSalesPipeline({ data: { filters: pipelineFilters } }),
    staleTime: 30_000,
  })

  const table = useReactTable({
    data: data?.deals ?? [],
    columns: [
      { accessorKey: 'customerName' },
      { accessorKey: 'stage' },
      { accessorKey: 'dealValue' },
      { accessorKey: 'daysInStage' },
      { accessorKey: 'assignedRep' },
    ],
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[13px] text-black/25 dark:text-white/25">
          {t('common.loading', 'Loading...')}
        </p>
      </div>
    )
  }

  const deals = table.getRowModel().rows.map((r) => r.original)

  return (
    <div className="flex h-full">
      <div
        className="flex-1 overflow-auto px-6 py-3"
        role="list"
        aria-label={t('sales.pipeline.pipelineList', 'Pipeline List')}
      >
        {/* Dense feed -- no table headers, no borders, no zebra */}
        {deals.map((deal, index) => (
          <motion.div
            key={deal.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12, delay: index * 0.03, ease: 'easeOut' }}
            role="listitem"
            tabIndex={0}
            onClick={() => {
              setSelectedDeal(deal)
              setSelectedId(deal.id)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setSelectedDeal(deal)
                setSelectedId(deal.id)
              }
            }}
            className={`group/row flex cursor-pointer items-center gap-4 rounded px-3 py-2 transition-colors ${
              selectedId === deal.id
                ? 'border-s-2 border-s-[#2563EB] bg-[#2563EB]/[0.03]'
                : 'border-s-2 border-s-transparent hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
            }`}
          >
            {/* Priority dot */}
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${getStatusDotColor(deal.color)}`} />

            {/* Customer name -- bold */}
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-black dark:text-white">
              {deal.customerName}
            </span>

            {/* Stage pill -- tiny, filled */}
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wider ${getStagePillStyle(deal.stage)}`}
            >
              {STAGE_LABELS[deal.stage]}
            </span>

            {/* Value -- mono */}
            <span className="w-28 shrink-0 text-end font-[family-name:var(--font-geist-mono)] tabular-nums text-[13px] text-black dark:text-white">
              {formatValue(deal.dealValue)}
            </span>

            {/* Days */}
            <span
              className={`w-10 shrink-0 text-end font-[family-name:var(--font-geist-mono)] tabular-nums text-[12px] ${getDaysColor(deal.daysInStage)}`}
            >
              {deal.daysInStage}d
            </span>

            {/* Assigned rep */}
            <span className="w-24 shrink-0 truncate text-end text-[12px] text-black/35 dark:text-white/35">
              {deal.assignedRep}
            </span>

            {/* Hover actions */}
            <div className="flex w-16 shrink-0 items-center justify-end gap-2 opacity-0 transition-opacity group-hover/row:opacity-100">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedDeal(deal)
                  setSelectedId(deal.id)
                }}
                className="text-[11px] font-medium text-[#2563EB]"
              >
                {t('sales.pipeline.advance', 'Advance')}
              </button>
            </div>
          </motion.div>
        ))}

        {deals.length === 0 && (
          <div className="py-20 text-center text-[13px] text-black/20 dark:text-white/20">
            {t('sales.pipeline.noDeals', 'No deals')}
          </div>
        )}
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
