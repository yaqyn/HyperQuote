import {
	Checkbox,
	CheckboxGroup,
	Label,
	Radio,
	RadioGroup,
	TextArea,
	TextField,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useDeliveryStore } from '../../stores/delivery'
import { useExceptionStore } from '../../stores/exception'
import { DriverButton } from '../shared/DriverButton'
import { DriverCard } from '../shared/DriverCard'

export function PartialDelivery() {
	const { t, i18n } = useTranslation('driver')
	const details = useExceptionStore((s) => s.details)
	const setDetails = useExceptionStore((s) => s.setDetails)
	const nextStep = useExceptionStore((s) => s.nextStep)
	const items = useDeliveryStore((s) => s.items)

	const customerStatement = (details.customerStatement as string) ?? ''
	const wantedItemIds = (details.wantedItemIds as string[]) ?? []
	const dispatchContacted = details.dispatchContacted as boolean | undefined
	const dispatchApproved = details.dispatchApproved as string | undefined

	const formatNumber = (num: number) =>
		new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-EG' : 'en').format(num)

	const handleCallDispatch = () => {
		setDetails('dispatchContacted', true)
		window.open('tel:dispatch')
	}

	const handleConfirmPartial = () => {
		// Mark undelivered items with reason code
		const undeliveredIds = items
			.filter((item) => !wantedItemIds.includes(item.id))
			.map((item) => item.id)
		setDetails('undeliveredItemIds', undeliveredIds)
		setDetails('undeliveredReason', 'customer_request_not_ready')
		setDetails('resolution', 'partial')
		nextStep()
	}

	return (
		<div className="flex flex-col gap-4">
			{/* Customer statement */}
			<DriverCard>
				<TextField
					value={customerStatement}
					onChange={(val) => setDetails('customerStatement', val)}
				>
					<Label className="block text-sm font-medium mb-2">
						{t('exception.partialDelivery.customerSays')}
					</Label>
					<TextArea
						className="w-full rounded-xl border border-[var(--border-color)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-blue)] bg-transparent resize-none"
						rows={3}
						placeholder={t(
							'exception.partialDelivery.customerStatementPlaceholder',
						)}
					/>
				</TextField>
			</DriverCard>

			{/* Items customer wants now */}
			<DriverCard
				header={
					<span className="text-sm font-medium">
						{t('exception.partialDelivery.itemsWantedNow')}
					</span>
				}
			>
				<p className="text-xs text-[var(--text-tertiary)] mb-3">
					{t('exception.partialDelivery.selectDelivered')}
				</p>
				<CheckboxGroup
					value={wantedItemIds}
					onChange={(ids) => setDetails('wantedItemIds', ids)}
				>
					<div className="flex flex-col gap-1">
						{items.map((item) => (
							<Checkbox
								key={item.id}
								value={item.id}
								className="flex items-center gap-3 min-h-[56px] cursor-pointer"
							>
								<div className="flex flex-1 items-center justify-between">
									<span className="text-sm">{item.product_name}</span>
									<span
										className="text-sm text-[var(--text-secondary)]"
										style={{ fontFamily: 'var(--font-mono)' }}
									>
										{formatNumber(item.quantity_expected)} {item.unit}
									</span>
								</div>
							</Checkbox>
						))}
					</div>
				</CheckboxGroup>
			</DriverCard>

			{/* Contact dispatch */}
			<DriverCard>
				<div className="flex flex-col gap-3">
					<span className="text-sm font-medium">
						{t('exception.partialDelivery.contactedDispatch')}
					</span>
					<DriverButton
						variant="primary"
						onPress={handleCallDispatch}
						className="min-h-[56px]"
					>
						{dispatchContacted
							? t('exception.partialDelivery.dispatchCalled')
							: t('exception.partialDelivery.callDispatch')}
					</DriverButton>
				</div>
			</DriverCard>

			{/* Dispatch approved? */}
			{dispatchContacted && (
				<DriverCard>
					<RadioGroup
						value={dispatchApproved ?? ''}
						onChange={(val) => setDetails('dispatchApproved', val)}
					>
						<Label className="block text-sm font-medium mb-2">
							{t('exception.partialDelivery.dispatchApproved')}
						</Label>
						<div className="flex gap-4">
							<Radio
								value="yes"
								className="flex items-center gap-2 min-h-[56px] cursor-pointer text-sm"
							>
								{t('common.yes')}
							</Radio>
							<Radio
								value="waiting"
								className="flex items-center gap-2 min-h-[56px] cursor-pointer text-sm"
							>
								{t('exception.partialDelivery.waiting')}
							</Radio>
						</div>
					</RadioGroup>
				</DriverCard>
			)}

			{/* Confirm partial */}
			<DriverButton variant="primary" onPress={handleConfirmPartial}>
				{t('exception.partialDelivery.confirmPartial')}
			</DriverButton>
		</div>
	)
}
