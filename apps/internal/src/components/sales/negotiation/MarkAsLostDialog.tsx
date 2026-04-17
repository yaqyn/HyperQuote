import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { markAsLost } from '../../../lib/server/sales-pipeline'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchField,
	DispatchFooter,
	DispatchInputClass,
} from '../../shared/DispatchDialog'

const LOSS_REASONS = [
	'lost_to_competitor',
	'price_too_high',
	'project_cancelled',
	'no_response',
	'other',
] as const

type LossReason = (typeof LOSS_REASONS)[number]

interface MarkAsLostDialogProps {
	quoteId: string
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	onSuccess?: () => void
}

export function MarkAsLostDialog({
	quoteId,
	isOpen,
	onOpenChange,
	onSuccess,
}: MarkAsLostDialogProps) {
	const { t } = useTranslation('internal')
	const [reason, setReason] = useState<LossReason>('lost_to_competitor')
	const [competitorName, setCompetitorName] = useState('')
	const [notes, setNotes] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)

	async function handleSubmit() {
		setIsSubmitting(true)
		try {
			await markAsLost({
				data: {
					quoteId,
					lossReason: reason,
					competitorName: competitorName || undefined,
				},
			})
			onOpenChange(false)
			onSuccess?.()
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<DispatchDialog
			isOpen={isOpen}
			onClose={() => onOpenChange(false)}
			size="sm"
			eyebrow={`Quote · ${quoteId.toUpperCase()}`}
			title={t('sales.negotiation.markAsLost', 'Mark as lost')}
			caption="Tell us what happened so the next quote does better."
			dismissDisabled={isSubmitting}
		>
			<DispatchBody>
				<div className="space-y-5">
					<DispatchField
						label={t('sales.negotiation.lossReason', 'Reason')}
						required
					>
						<select
							value={reason}
							onChange={(e) => setReason(e.target.value as LossReason)}
							className={DispatchInputClass()}
						>
							{LOSS_REASONS.map((r) => (
								<option key={r} value={r}>
									{t(
										`sales.negotiation.lossReasons.${r}`,
										r.replace(/_/g, ' '),
									)}
								</option>
							))}
						</select>
					</DispatchField>

					{reason === 'lost_to_competitor' && (
						<DispatchField
							label={t('sales.negotiation.competitorName', 'Competitor')}
						>
							<input
								type="text"
								value={competitorName}
								onChange={(e) => setCompetitorName(e.target.value)}
								className={DispatchInputClass()}
								placeholder={t(
									'sales.negotiation.competitorPlaceholder',
									'e.g., Egyptian Steel Distribution',
								)}
							/>
						</DispatchField>
					)}

					<DispatchField
						label={`${t('sales.negotiation.notes', 'Notes')} (optional)`}
					>
						<textarea
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={3}
							className={`${DispatchInputClass()} resize-none`}
						/>
					</DispatchField>
				</div>
			</DispatchBody>

			<DispatchFooter>
				<DispatchAction
					tone="ghost"
					onPress={() => onOpenChange(false)}
					isDisabled={isSubmitting}
				>
					{t('common.cancel', 'Cancel')}
				</DispatchAction>
				<DispatchAction
					tone="danger"
					onPress={handleSubmit}
					isDisabled={isSubmitting}
				>
					{isSubmitting
						? t('common.submitting', 'Submitting…')
						: t('sales.negotiation.confirmLost', 'Confirm lost')}
				</DispatchAction>
			</DispatchFooter>
		</DispatchDialog>
	)
}
