/**
 * POD (Proof of Delivery) confirmation/dispute flow.
 * Shows when delivery has pending POD -- 72h deadline countdown.
 * Confirm transitions to delivered, dispute opens modal.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
	Button,
	Dialog,
	DialogTrigger,
	Heading,
	Label,
	Modal,
	ModalOverlay,
	TextArea,
	TextField,
} from 'react-aria-components'
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
			<div className="flex items-center gap-2 px-4 py-3 bg-[var(--color-surface)] rounded-xl">
				<span className="px-2 py-1 text-[13px] font-medium rounded-sm bg-[var(--color-success)]/10 text-[var(--color-success)]">
					{t('tracking.autoConfirmed')}
				</span>
			</div>
		)
	}

	// Already confirmed
	if (pod.status === 'confirmed') {
		return (
			<div className="flex items-center gap-2 px-4 py-3 bg-[var(--color-surface)] rounded-xl">
				<span className="px-2 py-1 text-[13px] font-medium rounded-sm bg-[var(--color-success)]/10 text-[var(--color-success)]">
					{t('tracking.delivered')}
				</span>
			</div>
		)
	}

	// Already disputed
	if (pod.status === 'disputed') {
		return (
			<div className="flex items-center gap-2 px-4 py-3 bg-[var(--color-surface)] rounded-xl">
				<AlertTriangle size={16} className="text-[var(--color-warning)]" />
				<span className="text-sm text-[var(--color-text-muted)]">
					{t('tracking.disputeSubmitted')}
				</span>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			{/* Banner with countdown */}
			<div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-warning)]/10 rounded-xl border border-[var(--color-warning)]/20">
				<AlertTriangle
					size={20}
					className="text-[var(--color-warning)] shrink-0"
				/>
				<div className="flex-1">
					<p className="text-sm font-medium text-[var(--color-text)]">
						{t('tracking.podBanner')}
					</p>
					<p className="font-mono text-[13px] text-[var(--color-text-muted)] mt-0.5">
						{hoursRemaining}h {t('tracking.remaining')}
					</p>
				</div>
			</div>

			{/* POD photos grid */}
			{pod.photos.length > 0 && (
				<div className="grid grid-cols-3 gap-2">
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
			<div className="flex gap-3">
				<Button
					onPress={() => confirmMutation.mutate()}
					isDisabled={confirmMutation.isPending}
					className="flex-1 h-12 rounded-xl bg-[var(--color-success)] text-white font-medium text-sm cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
				>
					{t('tracking.confirmDelivery')}
				</Button>

				<DialogTrigger isOpen={isDisputeOpen} onOpenChange={setIsDisputeOpen}>
					<Button className="flex-1 h-12 rounded-xl border-2 border-[var(--color-error)] text-[var(--color-error)] font-medium text-sm cursor-pointer hover:bg-[var(--color-error)]/5 transition-colors">
						{t('tracking.dispute')}
					</Button>

					<ModalOverlay
						isDismissable={false}
						isKeyboardDismissDisabled
						className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
					>
						<Modal className="w-[95vw] max-w-md">
							<Dialog
								className="backdrop-blur-2xl bg-[rgba(255,255,255,0.90)] dark:bg-[rgba(0,0,0,0.90)] rounded-2xl p-6 shadow-2xl outline-none"
								aria-label={t('tracking.disputeHeading')}
							>
								{({ close }) => (
									<div className="space-y-4">
										<Heading
											slot="title"
											className="text-lg font-semibold text-[var(--color-text)]"
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
												className="w-full min-h-[100px] px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-sm text-[var(--color-text)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
												placeholder={t('tracking.disputeReasonLabel')}
											/>
										</TextField>

										<p className="text-[13px] text-[var(--color-text-muted)]">
											{t('tracking.disputePhotoLabel')}
										</p>

										<div className="flex gap-3 pt-2">
											<Button
												onPress={close}
												className="flex-1 h-12 rounded-xl border border-[var(--color-border)] text-[var(--color-text)] font-medium text-sm cursor-pointer hover:bg-[var(--color-surface)] transition-colors"
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
												className="flex-1 h-12 rounded-xl bg-[var(--color-error)] text-white font-medium text-sm cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
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
