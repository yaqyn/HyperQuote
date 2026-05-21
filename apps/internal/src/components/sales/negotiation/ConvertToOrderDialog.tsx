import { useState } from 'react'
import { Checkbox } from 'react-aria-components/Checkbox'
import { useTranslation } from 'react-i18next'
import { convertQuoteToOrder } from '../../../lib/server/sales-pipeline'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchField,
	DispatchFooter,
	DispatchInputClass,
	DispatchSection,
} from '../../shared/DispatchDialog'

type ConversionPath = 'standard' | 'phone_confirmed'

interface ConvertToOrderDialogProps {
	quoteId: string
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	onSuccess?: (orderNumber: string) => void
}

export function ConvertToOrderDialog({
	quoteId,
	isOpen,
	onOpenChange,
	onSuccess,
}: ConvertToOrderDialogProps) {
	const { t } = useTranslation('internal')
	const [customerPoNumber, setCustomerPoNumber] = useState('')
	const [requestAdvancePayment, setRequestAdvancePayment] = useState(false)
	const [conversionPath, setConversionPath] =
		useState<ConversionPath>('standard')
	const [isConverting, setIsConverting] = useState(false)
	const [successResult, setSuccessResult] = useState<{
		orderNumber: string
		orderId: string
	} | null>(null)

	async function handleConvert() {
		setIsConverting(true)
		try {
			const result = await convertQuoteToOrder({
				data: { quoteId, poNumber: customerPoNumber || undefined },
			})
			setSuccessResult({
				orderNumber: result.orderNumber,
				orderId: result.orderId,
			})
		} finally {
			setIsConverting(false)
		}
	}

	function handleClose() {
		if (successResult) onSuccess?.(successResult.orderNumber)
		setSuccessResult(null)
		onOpenChange(false)
	}

	const steps = [
		t('sales.negotiation.convert.createSO', 'Creates Sales Order (SO-XXXX)'),
		t(
			'sales.negotiation.convert.createPOs',
			'Auto-generates Purchase Orders to suppliers',
		),
		t(
			'sales.negotiation.convert.delivery',
			'Creates delivery schedule based on lead times',
		),
		t('sales.negotiation.convert.notify', 'Notifies operations team'),
		t('sales.negotiation.convert.proforma', 'Generates proforma invoice'),
	]

	return (
		<DispatchDialog
			isOpen={isOpen}
			onClose={handleClose}
			size="md"
			eyebrow={`Quote · ${quoteId.toUpperCase()}`}
			title={
				successResult
					? 'Order issued'
					: t('sales.negotiation.convert.title', 'Convert to order')
			}
			caption={
				successResult ? 'The quote has become a working order.' : undefined
			}
			dismissDisabled={isConverting}
		>
			{successResult ? (
				<>
					<DispatchBody>
						<div className="flex flex-col items-center justify-center py-6 gap-5">
							<div className="border-2 border-dashed border-[var(--color-primary)]/50 px-10 py-6 text-center">
								<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
									Order number
								</p>
								<p className="mt-2 font-[family-name:var(--font-archivo-black)] text-[28px] leading-none uppercase tabular-nums text-[var(--color-text)]">
									{successResult.orderNumber}
								</p>
							</div>
						</div>
					</DispatchBody>
					<DispatchFooter>
						<DispatchAction onPress={handleClose}>
							{t('common.done', 'Done')}
						</DispatchAction>
					</DispatchFooter>
				</>
			) : (
				<>
					<DispatchBody>
						<DispatchSection
							label={t('sales.negotiation.convert.whatHappens', 'This will')}
						/>
						<ol className="space-y-2">
							{steps.map((step, i) => (
								<li key={step} className="flex items-start gap-3">
									<span className="font-[family-name:var(--font-plex-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)] mt-0.5">
										{String(i + 1).padStart(2, '0')}
									</span>
									<span className="font-[family-name:var(--font-archivo)] text-[13.5px] text-[var(--color-text)]">
										{step}
									</span>
								</li>
							))}
						</ol>

						<DispatchSection label="Order form" />
						<div className="space-y-5">
							<DispatchField
								label={t(
									'sales.negotiation.convert.poNumber',
									'Customer PO number',
								)}
							>
								<input
									value={customerPoNumber}
									onChange={(e) => setCustomerPoNumber(e.target.value)}
									className={`${DispatchInputClass()} font-[family-name:var(--font-plex-mono)]`}
								/>
							</DispatchField>

							<Checkbox
								isSelected={requestAdvancePayment}
								onChange={setRequestAdvancePayment}
								className="flex cursor-pointer items-start gap-3 lg:items-center"
							>
								<span
									aria-hidden
									className={`inline-flex w-4 h-4 items-center justify-center border ${
										requestAdvancePayment
											? 'bg-[var(--color-text)] border-[var(--color-text)] text-[var(--color-surface)]'
											: 'border-black/60 dark:border-white/60'
									}`}
								>
									{requestAdvancePayment && (
										<svg
											aria-hidden="true"
											width="10"
											height="10"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="3"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<path d="M20 6L9 17l-5-5" />
										</svg>
									)}
								</span>
								<span className="font-[family-name:var(--font-archivo)] text-[13.5px] text-[var(--color-text)]">
									{t(
										'sales.negotiation.convert.requestAdvance',
										'Request advance payment',
									)}
									<span className="ms-1 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
										· new or credit-limited customers
									</span>
								</span>
							</Checkbox>

							<div className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
								<PathChoice
									active={conversionPath === 'standard'}
									label={t('sales.negotiation.convert.standard', 'Standard')}
									caption={t(
										'sales.negotiation.convert.standardDesc',
										'Customer accepted via portal',
									)}
									onPress={() => setConversionPath('standard')}
								/>
								<PathChoice
									active={conversionPath === 'phone_confirmed'}
									label={t(
										'sales.negotiation.convert.phoneConfirmed',
										'Phone confirmed',
									)}
									caption={t(
										'sales.negotiation.convert.phoneDesc',
										'Rep confirms order directly',
									)}
									onPress={() => setConversionPath('phone_confirmed')}
								/>
							</div>
						</div>
					</DispatchBody>

					<DispatchFooter>
						<DispatchAction
							tone="ghost"
							onPress={() => onOpenChange(false)}
							isDisabled={isConverting}
						>
							{t('common.cancel', 'Cancel')}
						</DispatchAction>
						<DispatchAction onPress={handleConvert} isDisabled={isConverting}>
							{isConverting
								? t('common.submitting', 'Submitting…')
								: conversionPath === 'standard'
									? t('sales.negotiation.convert.convertNow', 'Convert now')
									: t(
											'sales.negotiation.convert.confirmOrder',
											'Confirm order',
										)}
						</DispatchAction>
					</DispatchFooter>
				</>
			)}
		</DispatchDialog>
	)
}

function PathChoice({
	active,
	label,
	caption,
	onPress,
}: {
	active: boolean
	label: string
	caption: string
	onPress: () => void
}) {
	return (
		<button
			type="button"
			onClick={onPress}
			className={`text-start px-4 py-3 border transition-colors ${
				active
					? 'border-[var(--color-text)] bg-[var(--color-text)]/[0.04]'
					: 'border-black/[0.14] dark:border-white/[0.16] hover:border-[var(--color-text)]/60'
			}`}
		>
			<p className="font-[family-name:var(--font-archivo)] text-[13px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text)]">
				{label}
			</p>
			<p className="mt-1 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
				{caption}
			</p>
		</button>
	)
}
