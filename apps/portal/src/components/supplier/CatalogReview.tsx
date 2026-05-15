/**
 * CatalogReview -- Side-by-side catalog review with confidence badges.
 * Left: original document text. Right: extracted editable fields.
 * Items sorted by confidence ascending (lowest first = needs most attention).
 */
import { useState } from 'react'
import { Input, Label, NumberField, TextField } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { CatalogParsedItem } from '../../types/supplier'
import { ConfidenceBadge } from './ConfidenceBadge'

interface CatalogReviewProps {
	items: CatalogParsedItem[]
	onSubmit: () => void
	locale: 'ar' | 'en'
}

export function CatalogReview({ items, onSubmit, locale }: CatalogReviewProps) {
	const { t } = useTranslation('portal')
	const [editedItems, setEditedItems] = useState<CatalogParsedItem[]>(() =>
		[...items].sort((a, b) => a.confidence - b.confidence),
	)

	const updateItem = (
		id: string,
		field: keyof CatalogParsedItem,
		value: string | number,
	) => {
		setEditedItems((prev) =>
			prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
		)
	}

	return (
		<div className="flex flex-col h-full">
			{/* Two-column layout */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-auto p-6">
				{/* Left: Original Document */}
				<div className="flex flex-col gap-2">
					<h3 className="font-semibold text-sm text-[var(--color-text)]">
						{t('supplier.originalDocument')}
					</h3>
					<div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-auto flex-1">
						{editedItems.map((item) => (
							<div
								key={item.id}
								className="px-4 py-3 border-b border-[var(--color-border)] last:border-b-0"
							>
								<pre className="text-[13px] font-mono whitespace-pre-wrap text-[var(--color-text-muted)]">
									{item.originalText}
								</pre>
							</div>
						))}
					</div>
				</div>

				{/* Right: Extracted Data */}
				<div className="flex flex-col gap-2">
					<h3 className="font-semibold text-sm text-[var(--color-text)]">
						{t('supplier.extractedData')}
					</h3>
					<div className="flex flex-col gap-3 overflow-auto flex-1">
						{editedItems.map((item) => (
							<div
								key={item.id}
								className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3"
							>
								{/* Header: name + confidence */}
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium text-[var(--color-text)]">
										{locale === 'ar' ? item.productNameAr : item.productName}
									</span>
									<ConfidenceBadge confidence={item.confidence} />
								</div>

								{/* Editable fields */}
								<div className="grid grid-cols-2 gap-3">
									<TextField
										value={item.productName}
										onChange={(v) => updateItem(item.id, 'productName', v)}
									>
										<Label className="text-[13px] text-[var(--color-text-muted)]">
											{t('supplier.productName')}
										</Label>
										<Input className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10" />
									</TextField>

									<TextField
										value={item.sku}
										onChange={(v) => updateItem(item.id, 'sku', v)}
									>
										<Label className="text-[13px] text-[var(--color-text-muted)]">
											{t('supplier.sku')}
										</Label>
										<Input className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-sm font-mono text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10" />
									</TextField>

									<NumberField
										value={item.price}
										onChange={(v) => updateItem(item.id, 'price', v)}
										formatOptions={{
											style: 'decimal',
											minimumFractionDigits: 2,
										}}
									>
										<Label className="text-[13px] text-[var(--color-text-muted)]">
											{t('supplier.price')}
										</Label>
										<Input className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-sm font-mono text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10" />
									</NumberField>

									<NumberField
										value={item.quantity}
										onChange={(v) => updateItem(item.id, 'quantity', v)}
									>
										<Label className="text-[13px] text-[var(--color-text-muted)]">
											{t('supplier.stockQty')}
										</Label>
										<Input className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-sm font-mono text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10" />
									</NumberField>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Bottom: Submit button */}
			<div className="p-6 pt-4 border-t border-[var(--color-border)]">
				<button
					type="button"
					onClick={onSubmit}
					className="w-full h-[44px] rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer"
				>
					{t('supplier.submitForReview')}
				</button>
			</div>
		</div>
	)
}
