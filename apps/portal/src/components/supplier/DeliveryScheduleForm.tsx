/**
 * Delivery scheduling form for PO confirmation.
 * Fields: ship date (DatePicker), method (Select), tracking (TextField), notes (TextArea).
 */

import { getLocalTimeZone, parseDate, today } from '@internationalized/date'
import { Button } from 'react-aria-components/Button'
import { DateInput, DateSegment } from 'react-aria-components/DateField'
import { DatePicker } from 'react-aria-components/DatePicker'
import { Group } from 'react-aria-components/Group'
import { Input } from 'react-aria-components/Input'
import { Label } from 'react-aria-components/Label'
import { ListBox, ListBoxItem } from 'react-aria-components/ListBox'
import { Popover } from 'react-aria-components/Popover'
import { Select, SelectValue } from 'react-aria-components/Select'
import { TextArea } from 'react-aria-components/TextArea'
import { TextField } from 'react-aria-components/TextField'
import { useTranslation } from 'react-i18next'
import type { DeliverySchedule } from '../../types/supplier'

interface DeliveryScheduleFormProps {
	schedule: DeliverySchedule
	onChange: (schedule: DeliverySchedule) => void
}

export function DeliveryScheduleForm({
	schedule,
	onChange,
}: DeliveryScheduleFormProps) {
	const { t } = useTranslation('portal')
	const tz = getLocalTimeZone()

	const dateValue = schedule.estimatedShipDate
		? parseDate(schedule.estimatedShipDate.slice(0, 10))
		: today(tz)

	const methods = [
		{
			id: 'supplier_delivers' as const,
			label: t('supplier.supplierDelivers'),
		},
		{
			id: 'hyperquote_pickup' as const,
			label: t('supplier.hyperquotePickup'),
		},
	]

	return (
		<div className="flex flex-col gap-4 p-4 rounded-xl bg-[var(--color-surface)]">
			<h3 className="text-sm font-semibold text-[var(--color-text)]">
				{t('supplier.estimatedShipDate')}
			</h3>

			<div className="flex flex-wrap gap-4">
				{/* Ship date */}
				<DatePicker
					value={dateValue}
					onChange={(v) => {
						if (v) {
							onChange({ ...schedule, estimatedShipDate: v.toString() })
						}
					}}
					className="flex flex-col gap-1"
				>
					<Label className="text-[13px] text-[var(--color-text-muted)]">
						{t('supplier.estimatedShipDate')}
					</Label>
					<Group className="flex items-center h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)]">
						<DateInput className="flex font-mono text-sm">
							{(segment) => (
								<DateSegment
									segment={segment}
									className="px-0.5 outline-none focus:bg-[var(--color-primary)]/10 rounded"
								/>
							)}
						</DateInput>
					</Group>
				</DatePicker>

				{/* Delivery method */}
				<Select
					selectedKey={schedule.deliveryMethod}
					onSelectionChange={(key) =>
						onChange({
							...schedule,
							deliveryMethod: key as DeliverySchedule['deliveryMethod'],
						})
					}
					className="flex flex-col gap-1"
				>
					<Label className="text-[13px] text-[var(--color-text-muted)]">
						{t('supplier.deliveryMethod')}
					</Label>
					<Button className="flex items-center justify-between h-9 px-3 min-w-[180px] rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-sm text-[var(--color-text)] cursor-pointer">
						<SelectValue />
					</Button>
					<Popover className="w-[--trigger-width] rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] shadow-lg overflow-hidden">
						<ListBox className="outline-none p-1">
							{methods.map((m) => (
								<ListBoxItem
									key={m.id}
									id={m.id}
									className="px-3 py-2 text-sm text-[var(--color-text)] cursor-pointer rounded hover:bg-[var(--color-surface)] outline-none"
								>
									{m.label}
								</ListBoxItem>
							))}
						</ListBox>
					</Popover>
				</Select>
			</div>

			{/* Tracking number */}
			<TextField
				value={schedule.trackingNumber ?? ''}
				onChange={(v) =>
					onChange({ ...schedule, trackingNumber: v || undefined })
				}
				className="flex flex-col gap-1"
			>
				<Label className="text-[13px] text-[var(--color-text-muted)]">
					{t('supplier.trackingNumber')}
				</Label>
				<Input className="h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-sm text-[var(--color-text)] font-mono outline-none focus:border-[var(--color-primary)]" />
			</TextField>

			{/* Notes */}
			<TextField
				value={schedule.notes ?? ''}
				onChange={(v) => onChange({ ...schedule, notes: v || undefined })}
				className="flex flex-col gap-1"
			>
				<Label className="text-[13px] text-[var(--color-text-muted)]">
					{t('supplier.notes')}
				</Label>
				<TextArea className="min-h-[80px] px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] resize-y" />
			</TextField>
		</div>
	)
}
