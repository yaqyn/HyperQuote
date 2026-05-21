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
import { useQuoteSubmit } from '../../../hooks/useQuoteSubmit'
import { clearLocalDraft } from '../../../lib/quote-draft'
import { toQuoteSubmissionPayload } from '../../../lib/quote-request-payload'
import { submitForApproval } from '../../../lib/server/approvals'
import { useQuoteBuilderStore } from '../../../stores/quote-builder'
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
	const notes = useQuoteBuilderStore((s) => s.notes)
	const deliveryDate = useQuoteBuilderStore((s) => s.deliveryDate)
	const { submit, isSubmitting } = useQuoteSubmit()
	const { needsApproval } = useNeedsApproval()

	const [showConfirm, setShowConfirm] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const [result, setResult] = useState<SubmitResult | null>(null)
	const [error, setError] = useState<string | null>(null)

	const handleSubmit = useCallback(async () => {
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
	}, [needsApproval, submit, t])

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
				<div className="flex flex-col gap-2">
					{items.map((item) => (
						<div
							key={item.id}
							className="flex items-center justify-between px-4 py-3 rounded-lg border border-[var(--color-border)]"
						>
							<span className="text-sm text-[var(--color-text)]">
								{item.customerDescription}
							</span>
							<span className="text-sm font-mono text-[var(--color-text-muted)]">
								{item.quantity}{' '}
								{isAr && item.unitOfMeasureAr
									? item.unitOfMeasureAr
									: item.unitOfMeasure}
							</span>
						</div>
					))}
				</div>
			</div>

			{/* Delivery details */}
			{deliveryDate && (
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<span className="text-[13px] text-[var(--color-text-muted)]">
							{t('quoteBuilder.deliveryDateLabel')}
						</span>
						<Button
							onPress={() => useQuoteBuilderStore.getState().setStep(2)}
							className="flex items-center gap-1 text-[13px] text-[var(--color-primary)] hover:underline outline-none"
						>
							<Pencil size={12} />
							{t('quoteBuilder.edit')}
						</Button>
					</div>
					<span className="text-sm font-mono text-[var(--color-text)]">
						{deliveryDate}
					</span>
				</div>
			)}

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

			{/* Submit / Submit for Approval */}
			<div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
				<DialogTrigger>
					<Button
						isDisabled={items.length === 0 || isPending}
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
											isDisabled={isPending}
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
