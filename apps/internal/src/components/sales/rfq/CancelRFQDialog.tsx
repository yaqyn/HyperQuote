import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { UploadedProofDocument } from '../../../lib/server/proofs'
import { cancelRFQ } from '../../../lib/server/sales-rfq'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchFooter,
	DispatchInputClass,
} from '../../shared/DispatchDialog'
import { ProofUploadField } from '../../shared/ProofUploadField'
import {
	invalidateRfqDecisionQueries,
	RfqDecisionError,
	RfqDecisionSummary,
} from './rfqDialogHelpers'

interface CancelRFQDialogProps {
	rfqId: string
	isOpen: boolean
	onClose: () => void
	onCanceled?: () => void
}

export function CancelRFQDialog({
	rfqId,
	isOpen,
	onClose,
	onCanceled,
}: CancelRFQDialogProps) {
	const queryClient = useQueryClient()
	const [reason, setReason] = useState('')
	const [note, setNote] = useState('')
	const [proofDocument, setProofDocument] =
		useState<UploadedProofDocument | null>(null)
	const [showConfirm, setShowConfirm] = useState(false)

	const reasonOk = reason.trim().length >= 3
	const proofOk = proofDocument !== null
	const mutation = useMutation({
		mutationFn: () => {
			if (!proofDocument) throw new Error('Proof required')
			return cancelRFQ({
				data: {
					rfqId,
					reason: reason.trim(),
					note: note.trim() || undefined,
					proof: {
						fileName: proofDocument.fileName,
						proofPath: proofDocument.proofPath,
					},
				},
			})
		},
		onSuccess: () => {
			invalidateRfqDecisionQueries(queryClient, rfqId)
			reset()
			onClose()
			onCanceled?.()
		},
	})

	function reset() {
		setReason('')
		setNote('')
		setProofDocument(null)
		setShowConfirm(false)
	}

	function handleClose() {
		if (mutation.isPending) return
		reset()
		onClose()
	}

	return (
		<DispatchDialog
			isOpen={isOpen}
			onClose={handleClose}
			size="sm"
			eyebrow={`RFQ · ${rfqId.toUpperCase()}`}
			title={showConfirm ? 'Confirm cancel' : 'Cancel quote'}
			caption={
				showConfirm
					? 'This removes the quote from the active sales pipeline.'
					: 'Use cancel when work stops without a supplier rejection.'
			}
			dismissDisabled={mutation.isPending}
		>
			<DispatchBody>
				{!showConfirm ? (
					<div className="space-y-5">
						<label className="block">
							<span className="block font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
								Reason <span className="text-[#B3261E]">required</span>
							</span>
							<input
								value={reason}
								onChange={(event) => setReason(event.target.value)}
								placeholder="Customer canceled, duplicate request..."
								className={`${DispatchInputClass()} mt-1.5`}
							/>
						</label>

						<label className="block">
							<span className="block font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
								Note (optional)
							</span>
							<textarea
								value={note}
								onChange={(event) => setNote(event.target.value)}
								placeholder="Additional context..."
								rows={3}
								className={`${DispatchInputClass()} mt-1.5 resize-none`}
							/>
						</label>
						<ProofUploadField
							label="Cancel proof"
							note="Upload customer message, supplier evidence, or internal approval under 1 MB."
							value={proofDocument}
							onChange={setProofDocument}
							panel="sales"
							proofType="sales_evaluation"
							relatedEntityId={rfqId}
							relatedEntityType="sales_cancel"
							title={`Sales cancel proof · ${rfqId.toUpperCase()}`}
						/>
					</div>
				) : (
					<RfqDecisionSummary
						reason={reason.trim()}
						note={note}
						proofFileName={proofDocument?.fileName}
					/>
				)}
				{mutation.isError && (
					<RfqDecisionError error={mutation.error} fallback="Cancel failed." />
				)}
			</DispatchBody>

			<DispatchFooter>
				{!showConfirm ? (
					<>
						<DispatchAction tone="ghost" onPress={handleClose}>
							Keep quote
						</DispatchAction>
						<DispatchAction
							tone="danger"
							onPress={() => reasonOk && proofOk && setShowConfirm(true)}
							isDisabled={!reasonOk || !proofOk}
						>
							Cancel quote
						</DispatchAction>
					</>
				) : (
					<>
						<DispatchAction tone="ghost" onPress={() => setShowConfirm(false)}>
							Go back
						</DispatchAction>
						<DispatchAction
							tone="danger"
							onPress={() => mutation.mutate()}
							isDisabled={mutation.isPending}
						>
							{mutation.isPending ? 'Canceling...' : 'Confirm cancel'}
						</DispatchAction>
					</>
				)}
			</DispatchFooter>
		</DispatchDialog>
	)
}
