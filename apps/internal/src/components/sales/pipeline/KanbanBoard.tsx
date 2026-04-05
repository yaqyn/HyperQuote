import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { PipelineDeal, PipelineStageId } from '../../../types/sales'
import { getSalesPipeline } from '../../../lib/server/sales-pipeline'
import { useSalesStore } from '../../../stores/sales'
import { KanbanColumn } from './KanbanColumn'
import { StageAdvancePanel } from './StageAdvancePanel'

export function KanbanBoard() {
  const { t } = useTranslation('internal')
  const pipelineFilters = useSalesStore((s) => s.pipelineFilters)
  const queryClient = useQueryClient()
  const [selectedDeal, setSelectedDeal] = useState<PipelineDeal | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['sales-pipeline', pipelineFilters],
    queryFn: () => getSalesPipeline({ data: { filters: pipelineFilters } }),
    staleTime: 30_000,
  })

  const handleMoveDeal = (dealId: string, toStage: PipelineStageId) => {
    // Optimistic update: move the deal in the local cache
    queryClient.setQueryData(
      ['sales-pipeline', pipelineFilters],
      (old: typeof data) => {
        if (!old) return old
        const deal = old.deals.find((d) => d.id === dealId)
        if (!deal) return old

        const updatedDeals = old.deals.map((d) =>
          d.id === dealId ? { ...d, stage: toStage, daysInStage: 0 } : d,
        )

        // Recalculate stage counts
        const stageIds: PipelineStageId[] = [
          'rfq_received', 'reviewing', 'sourcing', 'quoting',
          'sent', 'negotiating', 'closing', 'won', 'lost_expired',
        ]
        const updatedStages = stageIds.map((id) => {
          const stageDeals = updatedDeals.filter((d) => d.stage === id)
          const existing = old.stages.find((s) => s.id === id)
          return {
            id,
            name: existing?.name ?? id,
            dealCount: stageDeals.length,
            totalValue: stageDeals.reduce((sum, d) => sum + d.dealValue, 0),
          }
        })

        return { stages: updatedStages, deals: updatedDeals }
      },
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-black/40 dark:text-white/40">
          {t('common.loading', 'Loading...')}
        </p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-red-500">
          {t('common.error', 'Error loading pipeline data')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Kanban columns - horizontal scroll */}
      <div className="flex flex-1 gap-3 overflow-x-auto px-4 py-3">
        {data.stages.map((stage) => {
          const stageDeals = data.deals.filter((d) => d.stage === stage.id)
          return (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              deals={stageDeals}
              onSelectDeal={setSelectedDeal}
              onMoveDeal={handleMoveDeal}
            />
          )
        })}
      </div>

      {/* Side panel for selected deal */}
      {selectedDeal && (
        <StageAdvancePanel
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onMoveDeal={(dealId, toStage) => {
            handleMoveDeal(dealId, toStage)
            setSelectedDeal(null)
          }}
        />
      )}
    </div>
  )
}
