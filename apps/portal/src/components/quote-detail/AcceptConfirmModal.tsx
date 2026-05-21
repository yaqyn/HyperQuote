import { CurrencyDisplay } from '@hyperquote/ui/display/CurrencyDisplay'
import { motion } from 'motion/react'
import { Dialog, Heading } from 'react-aria-components/Dialog'
import { Modal, ModalOverlay } from 'react-aria-components/Modal'
import { useTranslation } from 'react-i18next'

interface AcceptConfirmModalProps {
	isOpen: boolean
	onClose: () => void
	onConfirm: () => void
	total: number
	paymentTerms: string
	isPending: boolean
}

export function AcceptConfirmModal({
	isOpen,
	onClose,
	onConfirm,
	total,
	paymentTerms,
	isPending,
}: AcceptConfirmModalProps) {
	const { t } = useTranslation('portal')

	return (
		<ModalOverlay
			isOpen={isOpen}
			onOpenChange={(open) => {
				if (!open) onClose()
			}}
			isKeyboardDismissDisabled
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
		>
			<Modal className="max-w-md w-full mx-4">
				<Dialog className="outline-none">
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ type: 'spring', stiffness: 400, damping: 35 }}
						className="backdrop-blur-2xl bg-[rgba(255,255,255,0.90)] dark:bg-[rgba(0,0,0,0.90)] rounded-2xl p-6 shadow-2xl"
					>
						<Heading
							slot="title"
							className="text-lg font-semibold text-[var(--color-text)]"
						>
							{t('quoteDetail.acceptConfirmHeading')}
						</Heading>

						<p className="mt-3 text-sm text-[var(--color-text-muted)]">
							{t('quoteDetail.acceptConfirmBody', {
								amount: '',
								terms: paymentTerms,
							})}
						</p>

						<div className="mt-2 font-mono font-semibold text-lg text-[var(--color-text)]">
							<CurrencyDisplay value={total} />
						</div>

						<div className="mt-6 flex flex-row gap-3 justify-end">
							<button
								type="button"
								onClick={onClose}
								className="border border-[var(--color-border)] text-[var(--color-text)] h-11 px-6 rounded-lg cursor-pointer text-sm font-medium"
							>
								{t('quoteDetail.keepReviewing')}
							</button>
							<button
								type="button"
								onClick={onConfirm}
								disabled={isPending}
								className="bg-[var(--color-success)] text-white h-11 px-6 rounded-lg cursor-pointer font-semibold text-sm disabled:opacity-50"
							>
								{t('quoteDetail.acceptQuote')}
							</button>
						</div>
					</motion.div>
				</Dialog>
			</Modal>
		</ModalOverlay>
	)
}
