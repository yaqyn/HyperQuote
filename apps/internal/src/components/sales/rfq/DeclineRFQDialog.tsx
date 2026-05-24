import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from 'react-aria-components/Button'
import { Label } from 'react-aria-components/Label'
import { ListBox, ListBoxItem } from 'react-aria-components/ListBox'
import { Popover } from 'react-aria-components/Popover'
import { Select, SelectValue } from 'react-aria-components/Select'
import type { UploadedProofDocument } from '../../../lib/server/proofs'
import { declineRFQ } from '../../../lib/server/sales-rfq'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchFooter,
	DispatchInputClass,
} from '../../shared/DispatchDialog'
import { ProofUploadField } from '../../shared/ProofUploadField'

type DeclineReason =
	| 'outside_service_area'
	| 'cannot_source'
	| 'customer_blacklisted'

const DECLINE_REASONS: { value: DeclineReason; label: string }[] = [
	{ value: 'outside_service_area', label: 'Outside service area' },
	{ value: 'cannot_source', label: 'Cannot source requested materials' },
	{ value: 'customer_blacklisted', label: 'Customer blacklisted' },
]

interface DeclineRFQDialogProps {
	rfqId: string
	isOpen: boolean
	onClose: () => void
	onDeclined?: () => void
}

export function DeclineRFQDialog({
	rfqId,
	isOpen,
	onClose,
	onDeclined,
}: DeclineRFQDialogProps) {
	const queryClient = useQueryClient()
	const [reason, setReason] = useState<DeclineReason | null>(null)
	const [note, setNote] = useState('')
	const [proofDocument, setProofDocument] =
		useState<UploadedProofDocument | null>(null)
	const [showConfirm, setShowConfirm] = useState(false)

	const mutation = useMutation({
		mutationFn: () => {
			if (!reason) throw new Error('Reason required')
			if (!proofDocument) throw new Error('Proof required')
			return declineRFQ({
				data: {
					rfqId,
					reason,
					note: note.trim() || undefined,
					proof: {
						fileName: proofDocument.fileName,
						proofPath: proofDocument.proofPath,
					},
				},
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['rfq-queue'] })
			queryClient.invalidateQueries({ queryKey: ['sales-rfq-list'] })
			queryClient.invalidateQueries({ queryKey: ['rfq-detail', rfqId] })
			reset()
			onClose()
			onDeclined?.()
		},
	})

	function reset() {
		setReason(null)
		setNote('')
		setProofDocument(null)
		setShowConfirm(false)
	}

	function handleClose() {
		if (mutation.isPending) return
		reset()
		onClose()
	}

	const eyebrow = `RFQ · ${rfqId.toUpperCase()}`

	return (
		<DispatchDialog
			isOpen={isOpen}
			onClose={handleClose}
			size="sm"
			eyebrow={eyebrow}
			title={showConfirm ? 'Confirm decline' : 'Decline RFQ'}
			caption={
				showConfirm
					? 'This action cannot be undone.'
					: 'Select a reason for turning this RFQ away.'
			}
			dismissDisabled={mutation.isPending}
		>
			<DispatchBody>
				{!showConfirm ? (
					<div className="space-y-5">
						<div>
							<Label className="block font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
								Reason <span className="text-[#B3261E]">required</span>
							</Label>
							<Select
								aria-label="Decline reason"
								selectedKey={reason}
								onSelectionChange={(k) => setReason(k as DeclineReason)}
								className="w-full mt-1.5"
							>
								<Button
									className={`${DispatchInputClass()} flex items-center justify-between outline-none`}
								>
									<SelectValue className="truncate">
										{reason
											? DECLINE_REASONS.find((r) => r.value === reason)?.label
											: 'Select a reason…'}
									</SelectValue>
									<span className="text-[var(--color-text-subtle)] ms-2">
										▾
									</span>
								</Button>
								<Popover
									aria-label="Decline reason"
									className="w-[calc(100vw-32px)] max-w-[var(--trigger-width)] border border-black/80 bg-[var(--color-surface)] shadow-lg dark:border-white/85 lg:w-[var(--trigger-width)]"
								>
									<ListBox
										aria-label="Decline reasons"
										className="p-1 outline-none"
									>
										{DECLINE_REASONS.map((r) => (
											<ListBoxItem
												key={r.value}
												id={r.value}
												className="cursor-pointer px-3 py-2 font-[family-name:var(--font-archivo)] text-[13px] leading-snug outline-none data-[hovered]:bg-black/[0.06] data-[focused]:bg-[var(--color-primary)]/[0.08] data-[selected]:font-semibold dark:data-[hovered]:bg-white/[0.06]"
											>
												{r.label}
											</ListBoxItem>
										))}
									</ListBox>
								</Popover>
							</Select>
						</div>

						<div>
							<Label className="block font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
								Note (optional)
							</Label>
							<textarea
								value={note}
								onChange={(e) => setNote(e.target.value)}
								placeholder="Additional context…"
								rows={3}
								className={`${DispatchInputClass()} mt-1.5 resize-none`}
							/>
						</div>

						<ProofUploadField
							label="Decline proof"
							note="Upload supplier reply, customer evidence, or internal approval under 1 MB."
							value={proofDocument}
							onChange={setProofDocument}
							panel="sales"
							proofType="rejection"
							relatedEntityId={rfqId}
							relatedEntityType="sales_decline"
							title={`Sales decline proof · ${rfqId.toUpperCase()}`}
						/>
					</div>
				) : (
					<div className="space-y-3 font-[family-name:var(--font-archivo)] text-[13.5px] text-[var(--color-text-muted)]">
						<p>
							<span className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-subtle)] block mb-0.5">
								Reason
							</span>
							<span className="text-[var(--color-text)] font-medium">
								{DECLINE_REASONS.find((r) => r.value === reason)?.label}
							</span>
						</p>
						{note.trim() && (
							<p>
								<span className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-subtle)] block mb-0.5">
									Note
								</span>
								<span className="italic">{note.trim()}</span>
							</p>
						)}
						<p>
							<span className="mb-0.5 block font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
								Proof
							</span>
							<span className="font-medium text-[var(--color-text)]">
								{proofDocument?.fileName ?? 'Missing proof'}
							</span>
						</p>
					</div>
				)}
				{mutation.isError && (
					<p className="mt-4 rounded-md border border-[#B3261E]/30 bg-[#B3261E]/10 px-3 py-2 font-[family-name:var(--font-archivo)] text-[12px] text-[#B3261E]">
						{mutation.error instanceof Error
							? mutation.error.message
							: 'Decline failed.'}
					</p>
				)}
			</DispatchBody>

			<DispatchFooter>
				{!showConfirm ? (
					<>
						<DispatchAction tone="ghost" onPress={handleClose}>
							Cancel
						</DispatchAction>
						<DispatchAction
							tone="danger"
							onPress={() => reason && proofDocument && setShowConfirm(true)}
							isDisabled={!reason || !proofDocument}
						>
							Decline
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
							{mutation.isPending ? 'Declining…' : 'Confirm decline'}
						</DispatchAction>
					</>
				)}
			</DispatchFooter>
		</DispatchDialog>
	)
}
