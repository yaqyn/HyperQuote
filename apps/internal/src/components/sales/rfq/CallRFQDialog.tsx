import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { recordSalesCallOutcome } from '../../../lib/server/sales-quotes'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchFooter,
	DispatchInputClass,
} from '../../shared/DispatchDialog'

type SalesCallOutcome =
	| 'provider_not_configured'
	| 'reached_customer'
	| 'no_answer'
	| 'requested_changes'
	| 'customer_canceled'

const OUTCOMES: { value: SalesCallOutcome; label: string }[] = [
	{ value: 'provider_not_configured', label: 'Provider not configured' },
	{ value: 'reached_customer', label: 'Reached customer' },
	{ value: 'no_answer', label: 'No answer' },
	{ value: 'requested_changes', label: 'Requested changes' },
	{ value: 'customer_canceled', label: 'Customer canceled' },
]

interface CallRFQDialogProps {
	rfqId: string
	isOpen: boolean
	onClose: () => void
	onRecorded?: (message: string) => void
}

export function CallRFQDialog({
	rfqId,
	isOpen,
	onClose,
	onRecorded,
}: CallRFQDialogProps) {
	const queryClient = useQueryClient()
	const [outcome, setOutcome] = useState<SalesCallOutcome>(
		'provider_not_configured',
	)
	const [notes, setNotes] = useState('')

	const mutation = useMutation({
		mutationFn: () =>
			recordSalesCallOutcome({
				data: {
					rfqId,
					outcome,
					notes: notes.trim() || undefined,
				},
			}),
		onSuccess: (result) => {
			queryClient.invalidateQueries({ queryKey: ['rfq-detail', rfqId] })
			queryClient.invalidateQueries({ queryKey: ['sales-rfq-list'] })
			reset()
			onClose()
			onRecorded?.(result.message)
		},
	})

	function reset() {
		setOutcome('provider_not_configured')
		setNotes('')
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
			title="Record call"
			caption="Store the customer call result before continuing the quote."
			dismissDisabled={mutation.isPending}
		>
			<DispatchBody>
				<div className="space-y-5">
					<label className="block">
						<span className="block font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
							Outcome
						</span>
						<select
							value={outcome}
							onChange={(event) =>
								setOutcome(event.target.value as SalesCallOutcome)
							}
							className={`${DispatchInputClass()} mt-1.5`}
						>
							{OUTCOMES.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</label>

					<label className="block">
						<span className="block font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
							Notes (optional)
						</span>
						<textarea
							value={notes}
							onChange={(event) => setNotes(event.target.value)}
							placeholder="What happened on the call..."
							rows={3}
							className={`${DispatchInputClass()} mt-1.5 resize-none`}
						/>
					</label>
				</div>
				{mutation.isError && (
					<p className="mt-4 rounded-md border border-[#B3261E]/30 bg-[#B3261E]/10 px-3 py-2 font-[family-name:var(--font-archivo)] text-[12px] text-[#B3261E]">
						{mutation.error instanceof Error
							? mutation.error.message
							: 'Call note failed.'}
					</p>
				)}
			</DispatchBody>

			<DispatchFooter>
				<DispatchAction tone="ghost" onPress={handleClose}>
					Cancel
				</DispatchAction>
				<DispatchAction
					tone="primary"
					onPress={() => mutation.mutate()}
					isDisabled={mutation.isPending}
				>
					{mutation.isPending ? 'Recording...' : 'Record outcome'}
				</DispatchAction>
			</DispatchFooter>
		</DispatchDialog>
	)
}
