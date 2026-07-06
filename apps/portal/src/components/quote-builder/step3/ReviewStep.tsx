/**
 * Step 3: Review & Submit.
 * Shows item summary, delivery details, and submit button.
 * Non-approver buyers see "Submit for Approval" instead of "Submit Quote Request".
 * Confirmation modal adapts text based on approval workflow.
 */

import { Pencil } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Button } from 'react-aria-components/Button'
import { Dialog, DialogTrigger, Heading } from 'react-aria-components/Dialog'
import { Modal, ModalOverlay } from 'react-aria-components/Modal'
import { useTranslation } from 'react-i18next'
import { useNeedsApproval } from '../../../hooks/useApproval'
import { useQuoteBuilderOrderability } from '../../../hooks/useQuoteBuilderOrderability'
import { useQuoteSubmit } from '../../../hooks/useQuoteSubmit'
import { clearLocalDraft } from '../../../lib/quote-draft'
import { toQuoteSubmissionPayload } from '../../../lib/quote-request-payload'
import { submitForApproval } from '../../../lib/server/approvals'
import {
	DEFAULT_QUOTE_LOCATION_CLIENT_ID,
	type QuoteLocation,
	useQuoteBuilderStore,
} from '../../../stores/quote-builder'
import { SubmitConfirmation } from './SubmitConfirmation'

interface SubmitResult {
	requestId: string
	reference: string
	isApproval?: boolean
}

export function ReviewStep() {
	const { t, i18n } = useTranslation('portal')
	const isAr = i18n.language === 'ar'
	const items = useQuoteBuilderStore((s) => s.items)
	const locations = useQuoteBuilderStore((s) => s.locations)
	const notes = useQuoteBuilderStore((s) => s.notes)
	const { submit, isSubmitting } = useQuoteSubmit()
	const { needsApproval } = useNeedsApproval()

	const [showConfirm, setShowConfirm] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const [result, setResult] = useState<SubmitResult | null>(null)
	const [error, setError] = useState<string | null>(null)
	const {
		isBlocked: isOrderabilityBlocked,
		isValidationFailed,
		unavailableItems,
	} = useQuoteBuilderOrderability(items)

	const handleSubmit = useCallback(async () => {
		if (isOrderabilityBlocked) return
		setSubmitting(true)
		setError(null)

		try {
			if (needsApproval) {
				const state = useQuoteBuilderStore.getState()
				const res = await submitForApproval({
					data: {
						...toQuoteSubmissionPayload(state),
						idempotencyKey: crypto.randomUUID(),
					},
				})
				clearLocalDraft()
				useQuoteBuilderStore.getState().reset()
				setResult({
					requestId: res.requestId,
					reference: res.reference,
					isApproval: true,
				})
			} else {
				submit(undefined, {
					onSuccess: (data) => {
						setResult({
							requestId: data.requestId,
							reference: data.reference,
							isApproval: false,
						})
					},
					onError: (err) => {
						setError(err.message)
					},
				})
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : t('quoteBuilder.errorToast'),
			)
		} finally {
			setSubmitting(false)
		}
	}, [isOrderabilityBlocked, needsApproval, submit, t])

	if (result) {
		return (
			<SubmitConfirmation
				reference={result.reference}
				requestId={result.requestId}
				isApproval={result.isApproval}
			/>
		)
	}

	const isPending = submitting || isSubmitting
	const normalizedLocations =
		locations.length > 0
			? locations
			: [
					{
						clientId: DEFAULT_QUOTE_LOCATION_CLIENT_ID,
						addressId: null,
						deliveryDate: null,
						deliveryHour: null,
						deliveryPeriod: null,
					},
				]
	const fallbackLocationClientId =
		normalizedLocations[0]?.clientId ?? DEFAULT_QUOTE_LOCATION_CLIENT_ID
	const groupedLocations = normalizedLocations
		.map((location, index) => ({
			location,
			index,
			items: items.filter(
				(item) =>
					(item.locationClientId ?? fallbackLocationClientId) ===
					location.clientId,
			),
		}))
		.filter((group) => group.items.length > 0)

	return (
		<div className="flex flex-col gap-6 px-6 py-4">
			{/* Info banner */}
			<div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
				<p className="text-sm text-[var(--color-text-muted)]">
					{t('quoteBuilder.infoBanner')}
				</p>
			</div>

			{/* Item summary */}
			<div className="flex flex-col gap-3">
				<div className="flex items-center justify-between">
					<h3 className="text-sm font-semibold text-[var(--color-text)]">
						{t('quoteBuilder.step1')} ({' '}
						<span className="font-mono">{items.length}</span>{' '}
						{t('quoteBuilder.itemCount', { count: items.length }).replace(
							String(items.length),
							'',
						)}
						)
					</h3>
					<Button
						onPress={() => useQuoteBuilderStore.getState().setStep(1)}
						className="flex items-center gap-1 text-[13px] text-[var(--color-primary)] hover:underline outline-none"
					>
						<Pencil size={12} />
						{t('quoteBuilder.edit')}
					</Button>
				</div>
				<div className="flex flex-col gap-3">
					{groupedLocations.map((group) => (
						<div
							key={group.location.clientId}
							className="rounded-xl border border-[var(--color-border)]"
						>
							<div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
								<div>
									<h4 className="text-sm font-semibold text-[var(--color-text)]">
										{t('quoteBuilder.locationNumber', {
											defaultValue: 'Location {{number}}',
											number: group.index + 1,
										})}
									</h4>
									<p className="font-mono text-[13px] text-[var(--color-text-muted)]">
										{formatDeliveryWindow(group.location)}
									</p>
								</div>
								<Button
									onPress={() => useQuoteBuilderStore.getState().setStep(2)}
									className="flex items-center gap-1 text-[13px] text-[var(--color-primary)] hover:underline outline-none"
								>
									<Pencil size={12} />
									{t('quoteBuilder.edit')}
								</Button>
							</div>
							<div className="flex flex-col">
								{group.items.map((item) => (
									<div
										key={item.id}
										className="flex items-center justify-between gap-3 px-4 py-3 not-last:border-b not-last:border-[var(--color-border)]"
									>
										<span className="text-sm text-[var(--color-text)]">
											{item.customerDescription}
										</span>
										<span className="shrink-0 text-sm font-mono text-[var(--color-text-muted)]">
											{item.quantity}{' '}
											{isAr && item.unitOfMeasureAr
												? item.unitOfMeasureAr
												: item.unitOfMeasure}
										</span>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Notes */}
			{notes && (
				<div className="flex flex-col gap-1">
					<span className="text-[13px] text-[var(--color-text-muted)]">
						{t('quoteBuilder.notesLabel')}
					</span>
					<p className="text-sm text-[var(--color-text)]">{notes}</p>
				</div>
			)}

			{/* Error message */}
			{error && (
				<div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-3">
					<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
				</div>
			)}
			{(unavailableItems.length > 0 || isValidationFailed) && (
				<div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/20">
					<p className="text-sm text-red-600 dark:text-red-400">
						{isValidationFailed
							? t(
									'orders.validationFailed',
									'Could not confirm catalog availability. Try again.',
								)
							: t('orders.unavailableItems', {
									items: unavailableItems.join(', '),
								})}
					</p>
				</div>
			)}

			{/* Submit / Submit for Approval */}
			<div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
				<DialogTrigger>
					<Button
						isDisabled={
							items.length === 0 || isOrderabilityBlocked || isPending
						}
						onPress={() => setShowConfirm(true)}
						className="h-11 px-6 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] text-sm font-semibold transition-opacity cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
					>
						{isPending
							? t('quoteBuilder.submitting')
							: needsApproval
								? t('quoteBuilder.submitForApproval')
								: t('quoteBuilder.submitCTA')}
					</Button>

					{showConfirm && (
						<ModalOverlay
							isDismissable
							isKeyboardDismissDisabled={false}
							className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
						>
							<Modal className="w-full max-w-md mx-4">
								<Dialog className="rounded-2xl bg-white dark:bg-[var(--color-surface)] p-6 shadow-xl outline-none">
									<Heading
										slot="title"
										className="text-lg font-semibold text-[var(--color-text)] mb-2"
									>
										{needsApproval
											? t('quoteBuilder.confirmApproval')
											: t('quoteBuilder.confirmHeading', {
													count: items.length,
												})}
									</Heading>
									{!needsApproval && (
										<p className="text-sm text-[var(--color-text-muted)] mb-6">
											{t('quoteBuilder.confirmBody')}
										</p>
									)}
									<div className="flex items-center justify-end gap-3">
										<Button
											onPress={() => setShowConfirm(false)}
											className="h-10 px-4 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
										>
											{t('quoteBuilder.confirmDismiss')}
										</Button>
										<Button
											onPress={() => {
												setShowConfirm(false)
												handleSubmit()
											}}
											isDisabled={isOrderabilityBlocked || isPending}
											className="h-11 px-6 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] text-sm font-semibold transition-opacity cursor-pointer disabled:opacity-50"
										>
											{needsApproval
												? t('quoteBuilder.submitForApproval')
												: t('quoteBuilder.confirmConfirm')}
										</Button>
									</div>
								</Dialog>
							</Modal>
						</ModalOverlay>
					)}
				</DialogTrigger>
			</div>
		</div>
	)
}

function formatDeliveryWindow(location: QuoteLocation): string {
	const date = location.deliveryDate ?? 'Date not set'
	const time =
		location.deliveryHour && location.deliveryPeriod
			? `${location.deliveryHour} ${location.deliveryPeriod}`
			: 'Time not set'
	return `${date} · ${time}`
}
