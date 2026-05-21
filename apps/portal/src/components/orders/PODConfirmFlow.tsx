/**
 * POD (Proof of Delivery) confirmation/dispute flow.
 * Shows when delivery has pending POD -- 72h deadline countdown.
 * Confirm transitions to delivered, dispute opens modal.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from 'react-aria-components/Button'
import { Dialog, DialogTrigger, Heading } from 'react-aria-components/Dialog'
import { Label } from 'react-aria-components/Label'
import { Modal, ModalOverlay } from 'react-aria-components/Modal'
import { TextArea } from 'react-aria-components/TextArea'
import { TextField } from 'react-aria-components/TextField'
import { useTranslation } from 'react-i18next'
import type { PODDetails } from '../../lib/server/deliveries'
import {
	confirmDropShipDelivery,
	disputeDropShipDelivery,
} from '../../lib/server/deliveries'
import { toast } from '../../lib/toast'

interface PODConfirmFlowProps {
	deliveryId: string
	pod: PODDetails
}

function useCountdown(deadline: string) {
	const hoursRemaining = useMemo(() => {
		const now = new Date()
		const dl = new Date(deadline)
		const diff = dl.getTime() - now.getTime()
		if (diff <= 0) return 0
		return Math.ceil(diff / (1000 * 60 * 60))
	}, [deadline])

	return hoursRemaining
}

export function PODConfirmFlow({ deliveryId, pod }: PODConfirmFlowProps) {
	const { t } = useTranslation('portal')
	const queryClient = useQueryClient()
	const hoursRemaining = useCountdown(pod.autoConfirmDeadline)
	const [isDisputeOpen, setIsDisputeOpen] = useState(false)
	const [disputeReason, setDisputeReason] = useState('')

	const confirmMutation = useMutation({
		mutationFn: () => confirmDropShipDelivery({ data: { deliveryId } }),
		onSuccess: () => {
			toast.success(t('tracking.confirmSuccess'))
			queryClient.invalidateQueries({ queryKey: ['order-detail'] })
		},
	})

	const disputeMutation = useMutation({
		mutationFn: (reason: string) =>
			disputeDropShipDelivery({ data: { deliveryId, reason } }),
		onSuccess: () => {
			toast.success(t('tracking.disputeSuccess'))
			setIsDisputeOpen(false)
			queryClient.invalidateQueries({ queryKey: ['order-detail'] })
		},
	})

	// Auto-confirmed state -- show badge instead of buttons
	if (pod.status === 'auto_confirmed') {
		return (
			<div className="flex min-h-12 items-center gap-2 rounded-xl bg-[var(--color-surface)] px-4 py-3">
				<span className="px-2 py-1 text-[13px] font-medium rounded-sm bg-[var(--color-success)]/10 text-[var(--color-success)]">
					{t('tracking.autoConfirmed')}
				</span>
			</div>
		)
	}

	// Already confirmed
	if (pod.status === 'confirmed') {
		return (
			<div className="flex min-h-12 items-center gap-2 rounded-xl bg-[var(--color-surface)] px-4 py-3">
				<span className="px-2 py-1 text-[13px] font-medium rounded-sm bg-[var(--color-success)]/10 text-[var(--color-success)]">
					{t('tracking.delivered')}
				</span>
			</div>
		)
	}

	// Already disputed
	if (pod.status === 'disputed') {
		return (
			<div className="flex min-h-12 items-start gap-2 rounded-xl bg-[var(--color-surface)] px-4 py-3 sm:items-center">
				<AlertTriangle size={16} className="text-[var(--color-warning)]" />
				<span className="break-words text-sm text-[var(--color-text-muted)]">
					{t('tracking.disputeSubmitted')}
				</span>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			{/* Banner with countdown */}
			<div className="flex items-start gap-3 rounded-xl border border-[var(--color-warning)]/20 bg-[var(--color-warning)]/10 px-4 py-3 sm:items-center">
				<AlertTriangle
					size={20}
					className="text-[var(--color-warning)] shrink-0"
				/>
				<div className="min-w-0 flex-1">
					<p className="break-words text-sm font-medium text-[var(--color-text)]">
						{t('tracking.podBanner')}
					</p>
					<p className="mt-0.5 break-words font-mono text-[13px] text-[var(--color-text-muted)]">
						{hoursRemaining}h {t('tracking.remaining')}
					</p>
				</div>
			</div>

			{/* POD photos grid */}
			{pod.photos.length > 0 && (
				<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
					{pod.photos.map((photo, i) => (
						<img
							key={photo}
							src={photo}
							alt={`Proof of delivery ${i + 1}`}
							className="w-full aspect-square object-cover rounded-lg border border-[var(--color-border)]"
						/>
					))}
				</div>
			)}

			{/* Action buttons */}
			<div className="flex flex-col gap-3 sm:flex-row">
				<Button
					onPress={() => confirmMutation.mutate()}
					isDisabled={confirmMutation.isPending}
					className="h-12 flex-1 cursor-pointer rounded-xl bg-[var(--color-success)] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
				>
					{t('tracking.confirmDelivery')}
				</Button>

				<DialogTrigger isOpen={isDisputeOpen} onOpenChange={setIsDisputeOpen}>
					<Button className="h-12 flex-1 cursor-pointer rounded-xl border-2 border-[var(--color-error)] text-sm font-medium text-[var(--color-error)] transition-colors hover:bg-[var(--color-error)]/5">
						{t('tracking.dispute')}
					</Button>

					<ModalOverlay
						isDismissable={false}
						isKeyboardDismissDisabled
						className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:items-center"
					>
						<Modal className="w-full max-w-md">
							<Dialog
								className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl bg-[rgba(255,255,255,0.94)] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl outline-none backdrop-blur-2xl sm:p-6"
								aria-label={t('tracking.disputeHeading')}
							>
								{({ close }) => (
									<div className="space-y-4">
										<Heading
											slot="title"
											className="break-words text-lg font-semibold text-[var(--color-text)]"
										>
											{t('tracking.disputeHeading')}
										</Heading>

										<TextField
											isRequired
											value={disputeReason}
											onChange={setDisputeReason}
											className="space-y-1.5"
										>
											<Label className="text-sm font-medium text-[var(--color-text)]">
												{t('tracking.disputeReasonLabel')}
											</Label>
											<TextArea
												className="min-h-32 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-[16px] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] sm:min-h-[100px] sm:text-sm"
												placeholder={t('tracking.disputeReasonLabel')}
											/>
										</TextField>

										<p className="text-[13px] text-[var(--color-text-muted)]">
											{t('tracking.disputePhotoLabel')}
										</p>

										<div className="flex flex-col gap-3 pt-2 sm:flex-row">
											<Button
												onPress={close}
												className="h-12 flex-1 cursor-pointer rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)]"
											>
												{t('tracking.goBack')}
											</Button>
											<Button
												onPress={() => {
													if (disputeReason.trim()) {
														disputeMutation.mutate(disputeReason)
													}
												}}
												isDisabled={
													!disputeReason.trim() || disputeMutation.isPending
												}
												className="h-12 flex-1 cursor-pointer rounded-xl bg-[var(--color-error)] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
											>
												{t('tracking.submitDispute')}
											</Button>
										</div>
									</div>
								)}
							</Dialog>
						</Modal>
					</ModalOverlay>
				</DialogTrigger>
			</div>
		</div>
	)
}
