import type { ParseKeys } from 'i18next'
import { ChevronDown } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { Button as AriaButton } from 'react-aria-components/Button'
import { Dialog, Heading } from 'react-aria-components/Dialog'
import { Label } from 'react-aria-components/Label'
import { ListBox, ListBoxItem } from 'react-aria-components/ListBox'
import { Modal, ModalOverlay } from 'react-aria-components/Modal'
import { Popover } from 'react-aria-components/Popover'
import { Select, SelectValue } from 'react-aria-components/Select'
import { TextArea } from 'react-aria-components/TextArea'
import { TextField } from 'react-aria-components/TextField'
import { useTranslation } from 'react-i18next'
import type { DeclineReason } from '../../types/quote'

interface DeclineModalProps {
	isOpen: boolean
	onClose: () => void
	onConfirm: (reason?: DeclineReason, notes?: string) => void
	isPending: boolean
}

const DECLINE_REASONS: DeclineReason[] = [
	'price_too_high',
	'found_alternative',
	'project_cancelled',
	'other',
]

const REASON_KEYS: Record<DeclineReason, ParseKeys<'portal'>> = {
	price_too_high: 'quoteDetail.declineReasonPriceTooHigh',
	found_alternative: 'quoteDetail.declineReasonFoundAlternative',
	project_cancelled: 'quoteDetail.declineReasonProjectCancelled',
	other: 'quoteDetail.declineReasonOther',
}

export function DeclineModal({
	isOpen,
	onClose,
	onConfirm,
	isPending,
}: DeclineModalProps) {
	const { t } = useTranslation('portal')
	const [reason, setReason] = useState<DeclineReason | undefined>(undefined)
	const [notes, setNotes] = useState('')

	const handleClose = () => {
		setReason(undefined)
		setNotes('')
		onClose()
	}

	return (
		<ModalOverlay
			isOpen={isOpen}
			onOpenChange={(open) => {
				if (!open) handleClose()
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
						className="backdrop-blur-2xl bg-[rgba(255,255,255,0.90)] dark:bg-[var(--p-card)] rounded-2xl p-6 shadow-2xl"
					>
						<Heading
							slot="title"
							className="text-lg font-semibold text-[var(--color-text)]"
						>
							{t('quoteDetail.declineConfirmHeading')}
						</Heading>

						<div className="mt-4 flex flex-col gap-4">
							{/* Reason Select */}
							<Select
								selectedKey={reason ?? null}
								onSelectionChange={(key) => setReason(key as DeclineReason)}
								className="flex flex-col gap-1"
							>
								<Label className="text-sm text-[var(--color-text-muted)]">
									{t('quoteDetail.declineReason')}
								</Label>
								<AriaButton className="flex items-center justify-between border border-[var(--color-border)] rounded-lg h-10 px-3 text-sm text-[var(--color-text)] bg-[var(--color-card)] cursor-pointer">
									<SelectValue className="truncate" />
									<ChevronDown
										size={16}
										className="text-[var(--color-text-muted)]"
									/>
								</AriaButton>
								<Popover className="w-[var(--trigger-width)] bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg shadow-lg overflow-hidden">
									<ListBox className="outline-none p-1">
										{DECLINE_REASONS.map((r) => (
											<ListBoxItem
												key={r}
												id={r}
												className="px-3 py-2 text-sm cursor-pointer rounded-md text-[var(--color-text)] hover:bg-[var(--color-surface)] focus:bg-[var(--color-surface)] outline-none"
											>
												{t(REASON_KEYS[r])}
											</ListBoxItem>
										))}
									</ListBox>
								</Popover>
							</Select>

							{/* Notes */}
							<TextField
								value={notes}
								onChange={setNotes}
								className="flex flex-col gap-1"
							>
								<Label className="text-sm text-[var(--color-text-muted)]">
									{t('quoteDetail.declineNotes')}
								</Label>
								<TextArea
									className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] bg-[var(--color-card)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 min-h-[80px] resize-none"
									placeholder={t('quoteDetail.counterNotesPlaceholder')}
								/>
							</TextField>
						</div>

						<div className="mt-6 flex flex-row gap-3 justify-end">
							<button
								type="button"
								onClick={handleClose}
								className="border border-[var(--color-border)] text-[var(--color-text)] h-11 px-6 rounded-lg cursor-pointer text-sm font-medium"
							>
								{t('quoteDetail.keepQuote')}
							</button>
							<button
								type="button"
								onClick={() => onConfirm(reason, notes || undefined)}
								disabled={isPending}
								className="bg-[var(--color-error)] text-white h-11 px-6 rounded-lg cursor-pointer font-semibold text-sm disabled:opacity-50"
							>
								{t('quoteDetail.declineQuote')}
							</button>
						</div>
					</motion.div>
				</Dialog>
			</Modal>
		</ModalOverlay>
	)
}
