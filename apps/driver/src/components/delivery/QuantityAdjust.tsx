import { useState } from 'react'
import {
	Button as AriaButton,
	Dialog,
	Group,
	Heading,
	Input,
	Label,
	Modal,
	ModalOverlay,
	NumberField,
	Radio,
	RadioGroup,
	TextArea,
	TextField,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import {
	type PartialDeliveryReason,
	useDeliveryStore,
} from '../../stores/delivery'
import { DriverButton } from '../shared/DriverButton'

interface QuantityAdjustProps {
	itemId: string
	maxQuantity: number
	isOpen: boolean
	onClose: () => void
}

const REASON_CODES: PartialDeliveryReason[] = [
	'damaged_at_warehouse',
	'not_loaded',
	'customer_request',
	'other',
]

export function QuantityAdjust({
	itemId,
	maxQuantity,
	isOpen,
	onClose,
}: QuantityAdjustProps) {
	const { t } = useTranslation('driver')
	const adjustQuantity = useDeliveryStore((s) => s.adjustQuantity)

	const [quantity, setQuantity] = useState(0)
	const [reason, setReason] = useState<PartialDeliveryReason | ''>('')
	const [customReason, setCustomReason] = useState('')

	const canConfirm =
		quantity >= 0 &&
		quantity <= maxQuantity &&
		reason !== '' &&
		(reason !== 'other' || customReason.trim().length > 0)

	async function handleConfirm() {
		if (!canConfirm) return
		const finalReason =
			reason === 'other' ? ('other' as PartialDeliveryReason) : reason
		await adjustQuantity(itemId, quantity, finalReason)
		onClose()
	}

	function handleClose() {
		setQuantity(0)
		setReason('')
		setCustomReason('')
		onClose()
	}

	const reasonLabels: Record<PartialDeliveryReason, string> = {
		damaged_at_warehouse: t('delivery.damagedAtWarehouse'),
		not_loaded: t('delivery.notLoaded'),
		customer_request: t('delivery.customerRequest'),
		other: t('delivery.other'),
	}

	if (!isOpen) return null

	return (
		<ModalOverlay
			isDismissable
			isOpen={isOpen}
			onOpenChange={(open) => {
				if (!open) handleClose()
			}}
			className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
		>
			<Modal className="w-full max-w-lg rounded-t-2xl bg-[var(--bg-primary)] p-6 shadow-xl">
				<Dialog className="outline-none">
					<Heading
						slot="title"
						className="text-lg font-semibold text-[var(--text-primary)] mb-4"
					>
						{t('delivery.adjustQuantity')}
					</Heading>

					<NumberField
						value={quantity}
						onChange={(v) => setQuantity(v)}
						minValue={0}
						maxValue={maxQuantity}
						className="mb-4"
					>
						<Label className="block text-sm text-[var(--text-secondary)] mb-1">
							{t('delivery.adjustQuantity')}
						</Label>
						<Group className="flex items-center rounded-xl border border-[var(--border-color)] overflow-hidden">
							<AriaButton
								slot="decrement"
								className="px-4 py-3 text-lg font-mono text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
							>
								-
							</AriaButton>
							<Input className="flex-1 text-center font-mono text-2xl py-3 outline-none bg-transparent text-[var(--text-primary)]" />
							<AriaButton
								slot="increment"
								className="px-4 py-3 text-lg font-mono text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
							>
								+
							</AriaButton>
						</Group>
					</NumberField>

					<RadioGroup
						value={reason}
						onChange={(v) => setReason(v as PartialDeliveryReason)}
						className="mb-4"
					>
						<Label className="block text-sm text-[var(--text-secondary)] mb-2">
							{t('delivery.reasonCode')}
						</Label>
						<div className="space-y-2">
							{REASON_CODES.map((code) => (
								<Radio
									key={code}
									value={code}
									className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] p-3 cursor-pointer data-[selected]:border-[var(--color-blue)] data-[selected]:bg-blue-50"
								>
									<div className="h-5 w-5 rounded-full border-2 border-[var(--border-color)] flex items-center justify-center data-[selected]:border-[var(--color-blue)]">
										{reason === code && (
											<div className="h-2.5 w-2.5 rounded-full bg-[var(--color-blue)]" />
										)}
									</div>
									<span className="text-sm text-[var(--text-primary)]">
										{reasonLabels[code]}
									</span>
								</Radio>
							))}
						</div>
					</RadioGroup>

					{reason === 'other' && (
						<TextField
							value={customReason}
							onChange={setCustomReason}
							className="mb-4"
						>
							<Label className="block text-sm text-[var(--text-secondary)] mb-1">
								{t('delivery.damageNotes')}
							</Label>
							<TextArea
								className="w-full rounded-xl border border-[var(--border-color)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-blue)] bg-transparent resize-none"
								rows={3}
							/>
						</TextField>
					)}

					<div className="flex gap-3 mt-6">
						<DriverButton
							variant="secondary"
							onPress={handleClose}
							className="flex-1"
						>
							{t('common.cancel')}
						</DriverButton>
						<DriverButton
							variant="primary"
							onPress={handleConfirm}
							isDisabled={!canConfirm}
							className="flex-1"
						>
							{t('common.confirm')}
						</DriverButton>
					</div>
				</Dialog>
			</Modal>
		</ModalOverlay>
	)
}
