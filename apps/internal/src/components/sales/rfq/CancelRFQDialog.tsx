import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { cancelRFQ } from '../../../lib/server/sales-rfq'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchFooter,
	DispatchInputClass,
} from '../../shared/DispatchDialog'

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
	const [showConfirm, setShowConfirm] = useState(false)

	const reasonOk = reason.trim().length >= 3
	const mutation = useMutation({
		mutationFn: () =>
			cancelRFQ({
				data: {
					rfqId,
					reason: reason.trim(),
					note: note.trim() || undefined,
				},
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['rfq-queue'] })
			queryClient.invalidateQueries({ queryKey: ['sales-rfq-list'] })
			queryClient.invalidateQueries({ queryKey: ['rfq-detail', rfqId] })
			reset()
			onClose()
			onCanceled?.()
		},
	})

	function reset() {
		setReason('')
		setNote('')
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
					</div>
				) : (
					<div className="space-y-3 font-[family-name:var(--font-archivo)] text-[13.5px] text-[var(--color-text-muted)]">
						<p>
							<span className="mb-0.5 block font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
								Reason
							</span>
							<span className="font-medium text-[var(--color-text)]">
								{reason.trim()}
							</span>
						</p>
						{note.trim() && (
							<p>
								<span className="mb-0.5 block font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
									Note
								</span>
								<span className="italic">{note.trim()}</span>
							</p>
						)}
					</div>
				)}
				{mutation.isError && (
					<p className="mt-4 rounded-md border border-[#B3261E]/30 bg-[#B3261E]/10 px-3 py-2 font-[family-name:var(--font-archivo)] text-[12px] text-[#B3261E]">
						{mutation.error instanceof Error
							? mutation.error.message
							: 'Cancel failed.'}
					</p>
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
							onPress={() => reasonOk && setShowConfirm(true)}
							isDisabled={!reasonOk}
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
