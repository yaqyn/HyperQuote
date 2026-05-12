import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { GridList, GridListItem, useDragAndDrop } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { markAsLost, markAsWon } from '../../../lib/server/sales-pipeline'
import type {
	PipelineDeal,
	PipelineStage,
	PipelineStageId,
} from '../../../types/sales'
import { Button } from '../../ui'
import { KanbanCard } from './KanbanCard'

interface KanbanColumnProps {
	stage: PipelineStage
	deals: PipelineDeal[]
	onSelectDeal: (deal: PipelineDeal) => void
	onMoveDeal: (dealId: string, toStage: PipelineStageId) => void
}

const CRITICAL_STAGES: PipelineStageId[] = ['won', 'lost_expired']

const formatValue = (value: number) => {
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
	if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
	return String(value)
}

function getColumnAccent(stageId: PipelineStageId): string {
	// Won = green tint, lost = red tint, active pipeline stages = blue, others = muted
	switch (stageId) {
		case 'won':
			return 'border-t-green-500/60'
		case 'lost_expired':
			return 'border-t-red-500/40'
		case 'negotiating':
		case 'closing':
		case 'quoting':
		case 'sent':
			return 'border-t-[#2563EB]'
		default:
			return 'border-t-black/10 dark:border-t-white/10'
	}
}

function getColumnBg(stageId: PipelineStageId): string {
	switch (stageId) {
		case 'won':
			return 'bg-green-500/[0.02] dark:bg-green-500/[0.03]'
		case 'lost_expired':
			return 'bg-red-500/[0.02] dark:bg-red-500/[0.03]'
		default:
			return ''
	}
}

export function KanbanColumn({
	stage,
	deals,
	onSelectDeal,
	onMoveDeal,
}: KanbanColumnProps) {
	const { t } = useTranslation('internal')
	const queryClient = useQueryClient()
	const [confirmDeal, setConfirmDeal] = useState<{
		dealId: string
		toStage: PipelineStageId
	} | null>(null)
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
			lostMutation.mutate({
				quoteId: confirmDeal.dealId,
				reason: lossReason || 'Not specified',
			})
		}
	}

	const { dragAndDropHooks } = useDragAndDrop({
		acceptedDragTypes: ['deal'],
		getItems(keys) {
			return [...keys].map((key) => ({
				deal: String(key),
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
		<div
			className={`flex w-full shrink-0 flex-col border-t-2 lg:w-52 ${getColumnAccent(stage.id)} ${getColumnBg(stage.id)}`}
		>
			{/* Column header: stage name (11px uppercase) + deal count (24px mono) + value below */}
			<div className="px-3 pt-3 pb-2">
				<span className="text-[11px] uppercase tracking-wider font-medium text-black/35 dark:text-white/35">
					{stage.name}
				</span>
				<div className="mt-1 flex items-baseline gap-2">
					<span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[24px] font-semibold leading-none text-black dark:text-white">
						{stage.dealCount}
					</span>
					<span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-black/25 dark:text-white/25">
						{formatValue(stage.totalValue)}
					</span>
				</div>
			</div>

			{/* Droppable card list */}
			<GridList
				aria-label={stage.name}
				items={deals.map((d) => ({ ...d, key: d.id }))}
				dragAndDropHooks={dragAndDropHooks}
				renderEmptyState={() => (
					<div className="px-3 py-8 text-center text-[11px] text-black/12 dark:text-white/12">
						{t('sales.pipeline.noDeals', 'No deals')}
					</div>
				)}
				className="flex-1 space-y-0 overflow-y-auto px-1"
			>
				{(item) => (
					<GridListItem
						key={item.id}
						id={item.id}
						textValue={item.customerName}
						className="outline-none focus-visible:ring-1 focus-visible:ring-[#2563EB] focus-visible:ring-offset-1"
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
						className="w-full max-w-sm rounded-xl bg-white/95 p-5 shadow-2xl dark:bg-black/95"
						onKeyDown={(e) => {
							// isKeyboardDismissDisabled -- do NOT close on Escape
							if (e.key === 'Escape') e.stopPropagation()
						}}
					>
						<h3 className="mb-3 text-[15px] font-semibold text-black dark:text-white">
							{confirmDeal.toStage === 'won'
								? t('sales.pipeline.markAsWon', 'Mark as Won?')
								: t('sales.pipeline.markAsLost', 'Mark as Lost?')}
						</h3>

						<p className="mb-4 text-[13px] text-black/45 dark:text-white/45">
							{confirmDeal.toStage === 'won'
								? t(
										'sales.pipeline.wonDescription',
										'This will convert the quote to an order and trigger downstream creation.',
									)
								: t(
										'sales.pipeline.lostDescription',
										'This will close the deal. Please provide a reason.',
									)}
						</p>

						{confirmDeal.toStage === 'lost_expired' && (
							<div className="mb-4">
								<span className="mb-1 block text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">
									{t('sales.pipeline.lossReason', 'Loss Reason')}
								</span>
								<input
									type="text"
									value={lossReason}
									onChange={(e) => setLossReason(e.target.value)}
									className="w-full rounded-lg bg-black/[0.04] px-3 py-2 text-[13px] text-black outline-none focus:ring-1 focus:ring-[#2563EB] dark:bg-white/[0.04] dark:text-white"
									placeholder={t(
										'sales.pipeline.lossReasonPlaceholder',
										'e.g., Lost to competitor',
									)}
								/>
							</div>
						)}

						<div className="flex justify-end gap-2">
							<Button
								variant="ghost"
								onPress={() => {
									setConfirmDeal(null)
									setLossReason('')
								}}
							>
								{t('common.cancel', 'Cancel')}
							</Button>
							<button
								type="button"
								onClick={confirmTransition}
								disabled={wonMutation.isPending || lostMutation.isPending}
								className="rounded-full bg-black px-4 py-1.5 text-[13px] font-medium text-white hover:bg-black/80 disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-white/80"
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
