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
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchField,
	DispatchFooter,
	DispatchInputClass,
} from '../../shared/DispatchDialog'
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
				<DispatchDialog
					isOpen={!!confirmDeal}
					onClose={() => {
						setConfirmDeal(null)
						setLossReason('')
					}}
					size="sm"
					eyebrow={stage.name}
					title={
						confirmDeal.toStage === 'won'
							? t('sales.pipeline.markAsWon', 'Mark as Won?')
							: t('sales.pipeline.markAsLost', 'Mark as Lost?')
					}
					caption={
						confirmDeal.toStage === 'won'
							? t(
									'sales.pipeline.wonDescription',
									'This will convert the quote to an order and trigger downstream creation.',
								)
							: t(
									'sales.pipeline.lostDescription',
									'This will close the deal. Please provide a reason.',
								)
					}
					dismissDisabled={wonMutation.isPending || lostMutation.isPending}
				>
					<DispatchBody>
						{confirmDeal.toStage === 'lost_expired' && (
							<DispatchField
								label={t('sales.pipeline.lossReason', 'Loss Reason')}
							>
								<input
									type="text"
									value={lossReason}
									onChange={(e) => setLossReason(e.target.value)}
									className={DispatchInputClass()}
									placeholder={t(
										'sales.pipeline.lossReasonPlaceholder',
										'e.g., Lost to competitor',
									)}
								/>
							</DispatchField>
						)}
					</DispatchBody>

					<DispatchFooter>
						<DispatchAction
							tone="ghost"
							onPress={() => {
								setConfirmDeal(null)
								setLossReason('')
							}}
							isDisabled={wonMutation.isPending || lostMutation.isPending}
						>
							{t('common.cancel', 'Cancel')}
						</DispatchAction>
						<DispatchAction
							tone={
								confirmDeal.toStage === 'lost_expired' ? 'danger' : 'primary'
							}
							onPress={confirmTransition}
							isDisabled={wonMutation.isPending || lostMutation.isPending}
						>
							{t('common.confirm', 'Confirm')}
						</DispatchAction>
					</DispatchFooter>
				</DispatchDialog>
			)}
		</div>
	)
}
