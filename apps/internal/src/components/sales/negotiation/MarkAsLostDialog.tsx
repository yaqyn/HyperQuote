import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { UploadedProofDocument } from '../../../lib/server/proofs'
import { markAsLost } from '../../../lib/server/sales-pipeline'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchField,
	DispatchFooter,
	DispatchInputClass,
} from '../../shared/DispatchDialog'
import { ProofUploadField } from '../../shared/ProofUploadField'

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
	const [proofDocument, setProofDocument] =
		useState<UploadedProofDocument | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)

	useEffect(() => {
		if (isOpen) return
		setReason('lost_to_competitor')
		setCompetitorName('')
		setNotes('')
		setProofDocument(null)
		setError(null)
		setIsSubmitting(false)
	}, [isOpen])

	function handleClose() {
		if (isSubmitting) return
		onOpenChange(false)
	}

	async function handleSubmit() {
		if (!proofDocument) {
			setError('Proof is required before marking a quote lost.')
			return
		}
		setIsSubmitting(true)
		setError(null)
		try {
			await markAsLost({
				data: {
					quoteId,
					lossReason: reason,
					competitorName: competitorName || undefined,
					notes: notes.trim() || undefined,
					proof: {
						fileName: proofDocument.fileName,
						proofPath: proofDocument.proofPath,
					},
				},
			})
			onOpenChange(false)
			onSuccess?.()
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Could not mark quote lost.',
			)
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<DispatchDialog
			isOpen={isOpen}
			onClose={handleClose}
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
					<ProofUploadField
						label="Loss proof"
						note="Upload customer message, competitor evidence, or approval under 1 MB."
						value={proofDocument}
						onChange={setProofDocument}
						panel="sales"
						proofType="sales_evaluation"
						relatedEntityType="sales_lost"
						title={`Sales lost proof · ${quoteId.toUpperCase()}`}
					/>
					{error && (
						<p className="rounded-md border border-[#B3261E]/30 bg-[#B3261E]/10 px-3 py-2 font-[family-name:var(--font-archivo)] text-[12px] text-[#B3261E]">
							{error}
						</p>
					)}
				</div>
			</DispatchBody>

			<DispatchFooter>
				<DispatchAction
					tone="ghost"
					onPress={handleClose}
					isDisabled={isSubmitting}
				>
					{t('common.cancel', 'Cancel')}
				</DispatchAction>
				<DispatchAction
					tone="danger"
					onPress={handleSubmit}
					isDisabled={isSubmitting || !proofDocument}
				>
					{isSubmitting
						? t('common.submitting', 'Submitting…')
						: t('sales.negotiation.confirmLost', 'Confirm lost')}
				</DispatchAction>
			</DispatchFooter>
		</DispatchDialog>
	)
}
