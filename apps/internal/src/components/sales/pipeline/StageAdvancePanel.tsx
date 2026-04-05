import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { PipelineDeal, PipelineStageId } from '../../../types/sales'
import { markAsWon, markAsLost, convertQuoteToOrder } from '../../../lib/server/sales-pipeline'
import { TierBadge } from '../shared/TierBadge'

interface StageAdvancePanelProps {
  deal: PipelineDeal
  onClose: () => void
  onMoveDeal: (dealId: string, toStage: PipelineStageId) => void
}

const STAGE_ORDER: PipelineStageId[] = [
  'rfq_received',
  'reviewing',
  'sourcing',
  'quoting',
  'sent',
  'negotiating',
  'closing',
  'won',
  'lost_expired',
]

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

// Stage-specific validations
const STAGE_VALIDATIONS: Partial<Record<PipelineStageId, { field: string; message: string }[]>> = {
  sent: [{ field: 'sendMethod', message: 'Confirm send method before advancing' }],
  won: [{ field: 'conversion', message: 'Convert to order required' }],
  lost_expired: [{ field: 'lossReason', message: 'Provide loss reason' }],
}

function getNextStage(current: PipelineStageId): PipelineStageId | null {
  const idx = STAGE_ORDER.indexOf(current)
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null
  // Skip lost_expired when advancing linearly
  const next = STAGE_ORDER[idx + 1]
  return next === 'lost_expired' ? null : next
}

const formatValue = (value: number) =>
  new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export function StageAdvancePanel({ deal, onClose, onMoveDeal }: StageAdvancePanelProps) {
  const { t } = useTranslation('internal')
  const queryClient = useQueryClient()
  const [showConvertDialog, setShowConvertDialog] = useState(false)
  const [showLossDialog, setShowLossDialog] = useState(false)
  const [lossReason, setLossReason] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const nextStage = getNextStage(deal.stage)

  const wonMutation = useMutation({
    mutationFn: () => convertQuoteToOrder({ data: { quoteId: deal.id, poNumber: poNumber || undefined } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] })
      setShowConvertDialog(false)
      onClose()
    },
  })

  const lostMutation = useMutation({
    mutationFn: () => markAsLost({ data: { quoteId: deal.id, lossReason } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] })
      setShowLossDialog(false)
      onClose()
    },
  })

  const handleAdvance = () => {
    if (!nextStage) return

    // Check validations for the target stage
    const validations = STAGE_VALIDATIONS[nextStage]
    if (validations && validations.length > 0) {
      // For Won stage, open conversion dialog
      if (nextStage === 'won') {
        setShowConvertDialog(true)
        return
      }
      // For other validations, show messages
      setValidationErrors(validations.map((v) => v.message))
      return
    }

    onMoveDeal(deal.id, nextStage)
    onClose()
  }

  const handleMarkAsLost = () => {
    setShowLossDialog(true)
  }

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-s border-black/10 bg-white/95 backdrop-blur-xl dark:border-white/10 dark:bg-black/95">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
        <h3 className="text-sm font-semibold">
          {t('sales.pipeline.dealDetails', 'Deal Details')}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-black/40 hover:bg-black/5 hover:text-black/70 dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white/70"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Deal info */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-base font-semibold">{deal.customerName}</span>
            <TierBadge tier={deal.customerTier} />
          </div>
          <div className="font-[family-name:var(--font-geist-mono)] text-lg font-bold">
            {formatValue(deal.dealValue)}
          </div>
        </div>

        {/* Current stage */}
        <div className="mb-4 rounded-lg bg-black/3 p-3 dark:bg-white/3">
          <div className="mb-1 text-xs text-black/50 dark:text-white/50">
            {t('sales.pipeline.currentStage', 'Current Stage')}
          </div>
          <div className="text-sm font-medium">{STAGE_LABELS[deal.stage]}</div>
        </div>

        {/* Metrics */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-black/3 p-3 dark:bg-white/3">
            <div className="text-xs text-black/50 dark:text-white/50">
              {t('sales.pipeline.daysInStage', 'Days in Stage')}
            </div>
            <div className="font-[family-name:var(--font-geist-mono)] text-sm font-semibold">
              {deal.daysInStage}
            </div>
          </div>
          <div className="rounded-lg bg-black/3 p-3 dark:bg-white/3">
            <div className="text-xs text-black/50 dark:text-white/50">
              {t('sales.pipeline.winProbability', 'Win Probability')}
            </div>
            <div className="font-[family-name:var(--font-geist-mono)] text-sm font-semibold">
              {deal.winProbability}%
            </div>
          </div>
        </div>

        {/* Status text */}
        <div className="mb-4">
          <div className="text-xs text-black/50 dark:text-white/50">
            {t('sales.pipeline.status', 'Status')}
          </div>
          <div className="text-sm">{deal.statusText}</div>
        </div>

        {/* Assigned rep */}
        <div className="mb-4">
          <div className="text-xs text-black/50 dark:text-white/50">
            {t('sales.pipeline.assignedRep', 'Assigned Rep')}
          </div>
          <div className="text-sm">{deal.assignedRep}</div>
        </div>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
            {validationErrors.map((err) => (
              <p key={err} className="text-xs text-red-600 dark:text-red-400">
                {err}
              </p>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div className="space-y-2 border-t border-black/10 pt-4 dark:border-white/10">
          <button
            type="button"
            className="block w-full text-start text-xs text-[#2563EB] hover:underline"
          >
            {t('sales.pipeline.editDeal', 'Edit Deal')}
          </button>
          <button
            type="button"
            className="block w-full text-start text-xs text-[#2563EB] hover:underline"
          >
            {t('sales.pipeline.addNote', 'Add Note')}
          </button>
          <button
            type="button"
            className="block w-full text-start text-xs text-[#2563EB] hover:underline"
          >
            {t('sales.pipeline.viewCustomer360', 'View Customer 360')}
          </button>
        </div>
      </div>

      {/* Footer actions */}
      <div className="border-t border-black/10 px-4 py-3 dark:border-white/10">
        {nextStage && (
          <button
            type="button"
            onClick={handleAdvance}
            className="mb-2 w-full rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB]/90"
          >
            {t('sales.pipeline.advanceTo', 'Advance to {{stage}}', {
              stage: STAGE_LABELS[nextStage],
            })}
          </button>
        )}

        {deal.stage !== 'won' && deal.stage !== 'lost_expired' && (
          <button
            type="button"
            onClick={handleMarkAsLost}
            className="w-full rounded-lg border border-black/10 px-4 py-2 text-sm text-black/60 hover:bg-black/5 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5"
          >
            {t('sales.pipeline.markAsLost', 'Mark as Lost')}
          </button>
        )}
      </div>

      {/* Convert to Order Dialog (Won) */}
      {showConvertDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('sales.pipeline.convertToOrder', 'Convert to Order')}
            className="w-full max-w-md rounded-2xl border border-black/10 bg-white/90 p-6 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-black/90"
            onKeyDown={(e) => {
              if (e.key === 'Escape') e.stopPropagation()
            }}
          >
            <h3 className="mb-2 text-lg font-semibold">
              {t('sales.pipeline.convertToOrder', 'Convert to Order')}
            </h3>
            <p className="mb-4 text-sm text-black/60 dark:text-white/60">
              {t(
                'sales.pipeline.convertDescription',
                'This will create a Sales Order, auto-generate POs to suppliers, create delivery schedule, and generate proforma invoice.',
              )}
            </p>

            <div className="mb-4">
              <label className="mb-1 block text-xs text-black/50 dark:text-white/50">
                {t('sales.pipeline.customerPO', 'Customer PO Number (optional)')}
              </label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#2563EB] dark:border-white/10"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConvertDialog(false)}
                className="rounded-lg px-4 py-2 text-sm text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/5"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => wonMutation.mutate()}
                disabled={wonMutation.isPending}
                className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]/90 disabled:opacity-50"
              >
                {t('sales.pipeline.convertNow', 'Convert Now')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loss Reason Dialog */}
      {showLossDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('sales.pipeline.markAsLostTitle', 'Mark as Lost')}
            className="w-full max-w-md rounded-2xl border border-black/10 bg-white/90 p-6 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-black/90"
            onKeyDown={(e) => {
              if (e.key === 'Escape') e.stopPropagation()
            }}
          >
            <h3 className="mb-2 text-lg font-semibold">
              {t('sales.pipeline.markAsLostTitle', 'Mark as Lost')}
            </h3>
            <p className="mb-4 text-sm text-black/60 dark:text-white/60">
              {t('sales.pipeline.lostDescription', 'This will close the deal. Please provide a reason.')}
            </p>

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

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowLossDialog(false)
                  setLossReason('')
                }}
                className="rounded-lg px-4 py-2 text-sm text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/5"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => lostMutation.mutate()}
                disabled={lostMutation.isPending || !lossReason.trim()}
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
