import { useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchFooter,
} from '../../shared/DispatchDialog'
import { Toggle } from '../../ui'
import type { QuoteFormValues } from './types'

interface QuotePreviewModalProps {
	quoteNumber: string
	version: number
	customerName: string
	validityDays: number
	isOpen: boolean
	onOpenChange: (open: boolean) => void
}

export function QuotePreviewModal({
	quoteNumber,
	version,
	customerName,
	validityDays,
	isOpen,
	onOpenChange,
}: QuotePreviewModalProps) {
	const { i18n } = useTranslation('internal')
	const { control } = useFormContext<QuoteFormValues>()
	const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'
	const fmt = new Intl.NumberFormat(locale, {
		style: 'currency',
		currency: 'EGP',
		minimumFractionDigits: 2,
	})
	const dateFmt = new Intl.DateTimeFormat(locale, {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	})

	const [showSpecDetails, setShowSpecDetails] = useState(false)

	const lineItems = useWatch({ control, name: 'lineItems' })
	const paymentTerms = useWatch({ control, name: 'paymentTerms' })
	const coverNote = useWatch({ control, name: 'coverNote' })

	const subtotal =
		lineItems?.reduce((sum, item) => sum + (item.lineTotal || 0), 0) ?? 0
	const vatAmount = Math.round(subtotal * 14) / 100
	const grandTotal = subtotal + vatAmount

	const todayDate = new Date()
	const expiryDate = new Date(todayDate)
	expiryDate.setDate(expiryDate.getDate() + validityDays)

	return (
		<DispatchDialog
			isOpen={isOpen}
			onClose={() => onOpenChange(false)}
			size="lg"
			eyebrow={
				<span className="inline-flex items-center gap-2">
					<span>Quote ·</span>
					<span className="font-[family-name:var(--font-plex-mono)]">
						{quoteNumber} v{version}
					</span>
					<span>· preview</span>
				</span>
			}
			title={`For ${customerName}`}
			caption="What the customer will see when this goes out."
		>
			<div className="flex items-center justify-between px-8 py-2 border-b border-dashed border-black/[0.1] dark:border-white/[0.12]">
				<span className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-subtle)]">
					render mode
				</span>
				<Toggle
					isSelected={showSpecDetails}
					onChange={setShowSpecDetails}
					label={showSpecDetails ? 'Detailed' : 'Summary'}
				/>
			</div>

			<DispatchBody className="bg-[var(--color-surface)]">
				<div className="mx-auto max-w-2xl space-y-6">
					{/* Seller */}
					<div className="flex items-start justify-between">
						<div>
							<p className="font-[family-name:var(--font-archivo)] text-[18px] font-bold text-[var(--color-text)]">
								HyperQuote Trading Co.
							</p>
							<p className="font-[family-name:var(--font-plex-mono)] text-[11px] tabular-nums text-[var(--color-text-muted)]">
								CR: 12345 · TRN: 100-234-567
							</p>
							<p className="font-[family-name:var(--font-archivo)] italic text-[11px] text-[var(--color-text-subtle)]">
								Cairo, Egypt
							</p>
						</div>
						<div className="flex h-14 w-14 items-center justify-center border border-black/80 dark:border-white/85 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
							Logo
						</div>
					</div>

					{/* Buyer */}
					<div className="border-t border-dashed border-black/[0.1] dark:border-white/[0.12] pt-4">
						<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
							Bill to
						</p>
						<p className="mt-1 font-[family-name:var(--font-archivo)] text-[15px] font-semibold text-[var(--color-text)]">
							{customerName}
						</p>
					</div>

					{/* Metadata */}
					<div className="grid grid-cols-3 gap-6">
						<MetaItem label="Reference" value={quoteNumber} mono />
						<MetaItem label="Date" value={dateFmt.format(todayDate)} mono />
						<MetaItem
							label="Valid until"
							value={dateFmt.format(expiryDate)}
							mono
						/>
					</div>

					{/* Cover note */}
					{coverNote && (
						<p className="font-[family-name:var(--font-archivo)] italic text-[13px] text-[var(--color-text-muted)]">
							{coverNote}
						</p>
					)}

					{/* Line items */}
					<div className="overflow-x-auto">
						<table className="w-full font-[family-name:var(--font-archivo)] text-[13px]">
							<thead>
								<tr className="border-b border-black/80 dark:border-white/85">
									{[
										'#',
										'Product',
										...(showSpecDetails ? ['Spec'] : []),
										'Qty',
										'Unit',
										'Total',
									].map((h) => (
										<th
											key={h}
											className="pb-2 pe-4 text-start font-[family-name:var(--font-plex-mono)] text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)] last:text-end data-[align=end]:text-end"
										>
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{(lineItems ?? []).map((item, idx) => (
									<tr
										key={item.id}
										className="h-10 border-b border-black/[0.06] dark:border-white/[0.08]"
									>
										<td className="pe-4 font-[family-name:var(--font-plex-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
											{String(idx + 1).padStart(2, '0')}
										</td>
										<td className="pe-4 text-[var(--color-text)]">
											{item.productName}
										</td>
										{showSpecDetails && (
											<td className="pe-4 text-[11px] text-[var(--color-text-muted)]">
												{item.specification}
											</td>
										)}
										<td className="pe-4 font-[family-name:var(--font-plex-mono)] tabular-nums">
											{item.quantity.toLocaleString(locale)} {item.unit}
										</td>
										<td className="pe-4 font-[family-name:var(--font-plex-mono)] tabular-nums">
											{fmt.format(item.sellPrice)}
										</td>
										<td className="text-end font-[family-name:var(--font-plex-mono)] font-medium tabular-nums">
											{fmt.format(item.lineTotal)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Totals */}
					<div className="ms-auto w-60 space-y-1.5">
						<TotalRow label="Subtotal" value={fmt.format(subtotal)} />
						<TotalRow label="VAT (14%)" value={fmt.format(vatAmount)} />
						<div className="flex justify-between border-t border-black/80 dark:border-white/85 pt-2 font-[family-name:var(--font-archivo-black)] text-[15px] uppercase tracking-[-0.01em] text-[var(--color-text)]">
							<span>Total</span>
							<span className="font-[family-name:var(--font-plex-mono)] tabular-nums">
								{fmt.format(grandTotal)}
							</span>
						</div>
					</div>

					{/* Payment terms */}
					{paymentTerms && (
						<div className="font-[family-name:var(--font-archivo)] text-[12.5px]">
							<span className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
								Payment:{' '}
							</span>
							<span className="font-medium">{paymentTerms}</span>
						</div>
					)}

					{/* Disclaimer */}
					<p className="font-[family-name:var(--font-archivo)] italic text-[11px] text-[var(--color-text-subtle)]">
						Prices valid for {validityDays} days. Subject to supplier cost
						changes for volatile materials.
					</p>

					{/* Signature */}
					<div className="flex items-end justify-between border-t border-dashed border-black/[0.1] dark:border-white/[0.12] pt-5">
						<div>
							<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-subtle)]">
								Authorized signature
							</p>
							<div className="mt-3 h-10 w-32 border-b border-black/80 dark:border-white/85" />
						</div>
						<div className="flex h-14 w-14 items-center justify-center border border-dashed border-black/60 dark:border-white/60 font-[family-name:var(--font-plex-mono)] text-[9px] uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
							Stamp
						</div>
					</div>
				</div>
			</DispatchBody>

			<DispatchFooter>
				<DispatchAction tone="ghost" onPress={() => onOpenChange(false)}>
					Close
				</DispatchAction>
				<DispatchAction onPress={() => console.log('Download PDF — Phase 28')}>
					Download PDF
				</DispatchAction>
			</DispatchFooter>
		</DispatchDialog>
	)
}

function MetaItem({
	label,
	value,
	mono,
}: {
	label: string
	value: string
	mono?: boolean
}) {
	return (
		<div>
			<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
				{label}
			</p>
			<p
				className={`mt-1 text-[13px] text-[var(--color-text)] ${
					mono
						? 'font-[family-name:var(--font-plex-mono)] tabular-nums'
						: 'font-[family-name:var(--font-archivo)]'
				}`}
			>
				{value}
			</p>
		</div>
	)
}

function TotalRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between font-[family-name:var(--font-archivo)] text-[12.5px]">
			<span className="text-[var(--color-text-muted)]">{label}</span>
			<span className="font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text)]">
				{value}
			</span>
		</div>
	)
}
