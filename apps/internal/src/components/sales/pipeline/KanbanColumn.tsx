import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GridList, GridListItem, useDragAndDrop } from 'react-aria-components'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { PipelineDeal, PipelineStage, PipelineStageId } from '../../../types/sales'
import { markAsWon, markAsLost } from '../../../lib/server/sales-pipeline'
import { KanbanCard } from './KanbanCard'

interface KanbanColumnProps {
  stage: PipelineStage
  deals: PipelineDeal[]
  onSelectDeal: (deal: PipelineDeal) => void
  onMoveDeal: (dealId: string, toStage: PipelineStageId) => void
}

const CRITICAL_STAGES: PipelineStageId[] = ['won', 'lost_expired']

const formatValue = (value: number) =>
  new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export function KanbanColumn({ stage, deals, onSelectDeal, onMoveDeal }: KanbanColumnProps) {
  const { t } = useTranslation('internal')
  const queryClient = useQueryClient()
  const [confirmDeal, setConfirmDeal] = useState<{ dealId: string; toStage: PipelineStageId } | null>(null)
  const [lossReason, setLossReason] = useState('')

  const wonMutation = useMutation({
    mutationFn: (quoteId: string) => markAsWon({ data: { quoteId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] })
      setConfirmDeal(null)
    },
  })

  const lostMutation = useMutation({
    mutationFn: ({ quoteId, reason }: { quoteId: string; reason: string }) =>
      markAsLost({ data: { quoteId, lossReason: reason } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] })
      setConfirmDeal(null)
      setLossReason('')
    },
  })

  const handleDrop = (dealId: string) => {
    if (CRITICAL_STAGES.includes(stage.id)) {
      setConfirmDeal({ dealId, toStage: stage.id })
    } else {
      onMoveDeal(dealId, stage.id)
    }
  }

  const confirmTransition = () => {
    if (!confirmDeal) return
    if (confirmDeal.toStage === 'won') {
      wonMutation.mutate(confirmDeal.dealId)
    } else if (confirmDeal.toStage === 'lost_expired') {
      lostMutation.mutate({ quoteId: confirmDeal.dealId, reason: lossReason || 'Not specified' })
    }
  }

  const { dragAndDropHooks } = useDragAndDrop({
    acceptedDragTypes: ['deal'],
    getItems(keys) {
      return [...keys].map((key) => ({
        'deal': String(key),
        'text/plain': String(key),
      }))
    },
    onReorder() {
      // Reorder within column -- no-op for now
    },
    onInsert(e) {
      for (const item of e.items) {
        if (item.kind === 'text') {
          item.getText('deal').then((dealId) => handleDrop(dealId))
        }
      }
    },
    onRootDrop(e) {
      for (const item of e.items) {
        if (item.kind === 'text') {
          item.getText('deal').then((dealId) => handleDrop(dealId))
        }
      }
    },
  })

  return (
    <div className="flex w-64 shrink-0 flex-col rounded-lg bg-black/3 dark:bg-white/3">
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div>
          <h3 className="text-xs font-semibold">{stage.name}</h3>
          <div className="flex items-center gap-2 text-[10px] text-black/50 dark:text-white/50">
            <span className="font-[family-name:var(--font-geist-mono)]">{stage.dealCount}</span>
            <span>&middot;</span>
            <span className="font-[family-name:var(--font-geist-mono)]">{formatValue(stage.totalValue)}</span>
          </div>
        </div>
      </div>

      {/* Droppable card list */}
      <GridList
        aria-label={stage.name}
        items={deals.map((d) => ({ ...d, key: d.id }))}
        dragAndDropHooks={dragAndDropHooks}
        renderEmptyState={() => (
          <div className="px-3 py-4 text-center text-xs text-black/30 dark:text-white/30">
            {t('sales.pipeline.noDeals', 'No deals')}
          </div>
        )}
        className="flex-1 space-y-2 overflow-y-auto px-2 pb-2"
      >
        {(item) => (
          <GridListItem
            key={item.id}
            id={item.id}
            textValue={item.customerName}
            className="outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-lg"
          >
            <KanbanCard deal={item} onSelect={onSelectDeal} />
          </GridListItem>
        )}
      </GridList>

      {/* Confirmation dialog for critical transitions */}
      {confirmDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={
              confirmDeal.toStage === 'won'
                ? t('sales.pipeline.confirmWon', 'Confirm Won')
                : t('sales.pipeline.confirmLost', 'Confirm Lost')
            }
            className="w-full max-w-md rounded-2xl border border-black/10 bg-white/90 p-6 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-black/90"
            onKeyDown={(e) => {
              // isKeyboardDismissDisabled -- do NOT close on Escape
              if (e.key === 'Escape') e.stopPropagation()
            }}
          >
            <h3 className="mb-4 text-lg font-semibold">
              {confirmDeal.toStage === 'won'
                ? t('sales.pipeline.markAsWon', 'Mark as Won?')
                : t('sales.pipeline.markAsLost', 'Mark as Lost?')}
            </h3>

            <p className="mb-4 text-sm text-black/60 dark:text-white/60">
              {confirmDeal.toStage === 'won'
                ? t('sales.pipeline.wonDescription', 'This will convert the quote to an order and trigger downstream creation.')
                : t('sales.pipeline.lostDescription', 'This will close the deal. Please provide a reason.')}
            </p>

            {confirmDeal.toStage === 'lost_expired' && (
              <div className="mb-4">
                <label className="mb-1 block text-xs text-black/50 dark:text-white/50">
                  {t('sales.pipeline.lossReason', 'Loss Reason')}
                </label>
                <input
                  type="text"
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value)}
                  className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#2563EB] dark:border-white/10"
                  placeholder={t('sales.pipeline.lossReasonPlaceholder', 'e.g., Lost to competitor')}
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmDeal(null)
                  setLossReason('')
                }}
                className="rounded-lg px-4 py-2 text-sm text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/5"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={confirmTransition}
                disabled={wonMutation.isPending || lostMutation.isPending}
                className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]/90 disabled:opacity-50"
              >
                {t('common.confirm', 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
