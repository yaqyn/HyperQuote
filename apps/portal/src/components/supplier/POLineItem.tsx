/**
 * Per-line PO item with confirm toggle and conditional fields.
 * When unchecked: shows reason Select with 4 options.
 * "Partial Only" -> NumberField for available qty.
 * "Price Changed" -> NumberField for new price + warning text.
 */
import { useState } from 'react'
import {
	Button,
	Checkbox,
	Input,
	Label,
	ListBox,
	ListBoxItem,
	NumberField,
	Popover,
	Select,
	SelectValue,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { SupplierPOLine } from '../../types/supplier'

type ReasonKey = NonNullable<SupplierPOLine['reason']>

interface POLineItemProps {
	line: SupplierPOLine
	index: number
	onChange: (updates: Partial<SupplierPOLine>) => void
	locale: 'ar' | 'en'
}

export function POLineItem({ line, index, onChange, locale }: POLineItemProps) {
	const { t } = useTranslation('portal')
	const [isConfirmed, setIsConfirmed] = useState(line.confirmed)
	const [reason, setReason] = useState<ReasonKey | undefined>(line.reason)
	const [partialQty, setPartialQty] = useState(line.partialQuantity ?? 0)
	const [newPrice, setNewPrice] = useState(line.newPrice ?? line.unitPrice)

	const handleConfirmChange = (checked: boolean) => {
		setIsConfirmed(checked)
		if (checked) {
			setReason(undefined)
			onChange({
				confirmed: true,
				reason: undefined,
				partialQuantity: undefined,
				newPrice: undefined,
			})
		} else {
			onChange({ confirmed: false })
		}
	}

	const handleReasonChange = (key: ReasonKey) => {
		setReason(key)
		onChange({ reason: key })
	}

	const handlePartialChange = (val: number) => {
		setPartialQty(val)
		onChange({ partialQuantity: val })
	}

	const handleNewPriceChange = (val: number) => {
		setNewPrice(val)
		onChange({ newPrice: val })
	}

	const reasons: { id: ReasonKey; label: string }[] = [
		{ id: 'out_of_stock', label: t('supplier.reasonOutOfStock') },
		{ id: 'partial_only', label: t('supplier.reasonPartialOnly') },
		{ id: 'price_changed', label: t('supplier.reasonPriceChanged') },
		{ id: 'lead_time_needed', label: t('supplier.reasonLeadTimeNeeded') },
	]

	const formatNum = (n: number) =>
		new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG').format(n)

	return (
		<div className="border-b border-[var(--color-border)] last:border-b-0">
			{/* Main row */}
			<div className="grid grid-cols-[40px_1fr_100px_100px_100px_60px] items-center gap-2 px-4 py-3 max-md:grid-cols-[40px_1fr_80px_60px] max-md:gap-1">
				{/* Line # */}
				<span className="font-mono text-sm text-[var(--color-text-muted)]">
					{index + 1}
				</span>

				{/* Product name */}
				<span className="text-sm text-[var(--color-text)] truncate">
					{locale === 'ar' ? line.productNameAr : line.productName}
				</span>

				{/* Qty requested */}
				<span className="font-mono text-sm text-[var(--color-text)] text-end max-md:hidden">
					{formatNum(line.quantityRequested)}
				</span>

				{/* Unit price */}
				<span className="font-mono text-sm text-[var(--color-text)] text-end max-md:hidden">
					{formatNum(line.unitPrice)}
				</span>

				{/* Line total */}
				<span className="font-mono text-sm text-[var(--color-text)] text-end">
					{formatNum(line.lineTotal)}
				</span>

				{/* Confirm checkbox */}
				<div className="flex justify-center">
					<Checkbox
						isSelected={isConfirmed}
						onChange={handleConfirmChange}
						className="flex items-center justify-center w-5 h-5 rounded border border-[var(--color-border)] cursor-pointer data-[selected]:bg-[var(--color-success)] data-[selected]:border-[var(--color-success)]"
					>
						<div className="w-3 h-3 flex items-center justify-center text-white">
							{isConfirmed && (
								<svg
									aria-hidden="true"
									viewBox="0 0 12 12"
									fill="none"
									className="w-3 h-3"
								>
									<path
										d="M2 6l3 3 5-5"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							)}
						</div>
					</Checkbox>
				</div>
			</div>

			{/* Conditional fields when unchecked */}
			{!isConfirmed && (
				<div className="px-4 pb-3 ps-10 flex flex-wrap items-start gap-3">
					{/* Reason select */}
					<Select
						selectedKey={reason ?? null}
						onSelectionChange={(key) => handleReasonChange(key as ReasonKey)}
						className="flex flex-col gap-1"
					>
						<Label className="text-[13px] text-[var(--color-text-muted)]">
							{t('supplier.reason')}
						</Label>
						<Button className="flex items-center justify-between h-9 px-3 min-w-[180px] rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-sm text-[var(--color-text)] cursor-pointer">
							<SelectValue />
						</Button>
						<Popover className="w-[--trigger-width] rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] shadow-lg overflow-hidden">
							<ListBox className="outline-none p-1">
								{reasons.map((r) => (
									<ListBoxItem
										key={r.id}
										id={r.id}
										className="px-3 py-2 text-sm text-[var(--color-text)] cursor-pointer rounded hover:bg-[var(--color-surface)] outline-none"
									>
										{r.label}
									</ListBoxItem>
								))}
							</ListBox>
						</Popover>
					</Select>

					{/* Partial qty field */}
					{reason === 'partial_only' && (
						<NumberField
							value={partialQty}
							onChange={(v) => handlePartialChange(v)}
							maxValue={line.quantityRequested}
							minValue={1}
							className="flex flex-col gap-1"
						>
							<Label className="text-[13px] text-[var(--color-text-muted)]">
								{t('supplier.qtyRequested')}
							</Label>
							<Input className="h-9 w-28 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] font-mono text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]" />
						</NumberField>
					)}

					{/* New price field */}
					{reason === 'price_changed' && (
						<div className="flex flex-col gap-1">
							<NumberField
								value={newPrice}
								onChange={(v) => handleNewPriceChange(v)}
								minValue={0}
								className="flex flex-col gap-1"
							>
								<Label className="text-[13px] text-[var(--color-text-muted)]">
									{t('supplier.newPrice')}
								</Label>
								<Input className="h-9 w-28 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] font-mono text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]" />
							</NumberField>
							<p className="text-[13px] text-[var(--color-warning)]">
								{t('supplier.requiresReview')}
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
