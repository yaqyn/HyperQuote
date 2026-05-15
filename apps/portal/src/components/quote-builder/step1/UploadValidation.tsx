/**
 * Upload validation error table for quote builder.
 * Shows ALL errors at once (never fail-on-first).
 * Allows inline editing of error values and revalidation.
 * Unmatched items get yellow badge with manual product ComboBox.
 */

import { AlertTriangle } from 'lucide-react'
import { animate } from 'motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
	Button,
	ComboBox,
	Input,
	ListBox,
	ListBoxItem,
	Popover,
	Text,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useProductSearch } from '../../../hooks/useProductSearch'
import type {
	ParsedRow,
	ParseError,
	ParseResult,
} from '../../../lib/file-parser'

// ============================================================================
// Types
// ============================================================================

interface UploadValidationProps {
	result: ParseResult
	onFixAndContinue: (
		fixedErrors: ParseError[],
		updatedResult: ParseResult,
	) => void
	onReupload: () => void
}

// ============================================================================
// Unmatched badge with spring animation
// ============================================================================

function UnmatchedBadge() {
	const { t } = useTranslation('portal')
	const badgeRef = useRef<HTMLSpanElement>(null)

	useEffect(() => {
		if (badgeRef.current) {
			animate(
				badgeRef.current,
				{ opacity: [0, 1], scale: [0.9, 1] },
				{ type: 'spring', stiffness: 200, damping: 20 },
			)
		}
	}, [])

	return (
		<span
			ref={badgeRef}
			className="inline-block rounded-full bg-[var(--color-warning-bg)] px-2 py-0.5 text-[13px] text-[var(--color-warning)]"
		>
			{t('quoteBuilder.unmatched', 'Unmatched -- please verify')}
		</span>
	)
}

// ============================================================================
// Product selector for unmatched items
// ============================================================================

function ProductSelector({
	onSelect,
}: {
	onSelect: (productId: string, name: string) => void
}) {
	const [query, setQuery] = useState('')
	const { results, isLoading } = useProductSearch(query)

	return (
		<ComboBox
			inputValue={query}
			onInputChange={setQuery}
			onSelectionChange={(key) => {
				if (key) {
					const product = results.find((r) => r.id === key)
					if (product) {
						onSelect(product.id, product.name)
					}
				}
			}}
			className="w-full"
		>
			<Input
				placeholder="Search product..."
				className="h-9 w-full rounded-lg border border-[var(--color-border)] px-sm text-[13px] outline-none focus:border-[var(--color-primary)]"
			/>
			<Popover className="w-[var(--trigger-width)] rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] shadow-lg">
				<ListBox className="max-h-48 overflow-auto p-xs">
					{isLoading ? (
						<ListBoxItem
							id="loading"
							className="px-sm py-xs text-[13px] text-[var(--color-text-subtle)]"
						>
							Loading...
						</ListBoxItem>
					) : results.length === 0 ? (
						<ListBoxItem
							id="empty"
							className="px-sm py-xs text-[13px] text-[var(--color-text-subtle)]"
						>
							No products found
						</ListBoxItem>
					) : (
						results.map((product) => (
							<ListBoxItem
								key={product.id}
								id={product.id}
								className="cursor-pointer rounded-lg px-sm py-xs text-[13px] hover:bg-[var(--color-surface)] focus:bg-[var(--color-surface)]"
							>
								{product.name} {product.sku ? `(${product.sku})` : ''}
							</ListBoxItem>
						))
					)}
				</ListBox>
			</Popover>
		</ComboBox>
	)
}

// ============================================================================
// Component
// ============================================================================

export function UploadValidation({
	result,
	onFixAndContinue,
	onReupload,
}: UploadValidationProps) {
	const { t } = useTranslation('portal')
	const [editableErrors, setEditableErrors] = useState<ParseError[]>([
		...result.errors,
	])
	const [editedItems, setEditedItems] = useState<ParsedRow[]>([...result.items])

	const validCount = result.totalRows - result.errors.length
	const errorCount = result.errors.length

	const handleErrorValueChange = useCallback(
		(errorIndex: number, newValue: string) => {
			setEditableErrors((prev) => {
				const updated = [...prev]
				updated[errorIndex] = { ...updated[errorIndex], value: newValue }
				return updated
			})
		},
		[],
	)

	const handleFixAndContinue = useCallback(() => {
		// Apply fixes to items
		const updatedItems = [...editedItems]

		for (const error of editableErrors) {
			const itemIndex = updatedItems.findIndex(
				(item) => item.rowNumber === error.rowNumber,
			)
			if (itemIndex === -1) continue

			const item = { ...updatedItems[itemIndex] }

			if (error.field === 'Product') {
				item.productName = error.value
			} else if (error.field === 'Quantity') {
				const qty = parseFloat(error.value.replace(/,/g, ''))
				if (!Number.isNaN(qty) && qty > 0) {
					item.quantity = qty
				}
			}

			updatedItems[itemIndex] = item
		}

		// Re-validate
		const remainingErrors: ParseError[] = []
		for (const error of editableErrors) {
			if (error.field === 'Product' && !error.value) {
				remainingErrors.push(error)
			} else if (error.field === 'Quantity') {
				const qty = parseFloat(error.value.replace(/,/g, ''))
				if (Number.isNaN(qty) || qty <= 0) {
					remainingErrors.push(error)
				}
			}
		}

		const updatedResult: ParseResult = {
			items: updatedItems,
			errors: remainingErrors,
			totalRows: result.totalRows,
		}

		onFixAndContinue(remainingErrors, updatedResult)
	}, [editableErrors, editedItems, result.totalRows, onFixAndContinue])

	const handleProductSelect = useCallback(
		(rowNumber: number, productId: string, productName: string) => {
			setEditedItems((prev) =>
				prev.map((item) =>
					item.rowNumber === rowNumber
						? { ...item, productName, sku: productId }
						: item,
				),
			)
		},
		[],
	)

	// Identify unmatched items (items without SKU that parsed successfully)
	const unmatchedItems = editedItems.filter(
		(item) =>
			!item.sku && !editableErrors.some((e) => e.rowNumber === item.rowNumber),
	)

	return (
		<div className="flex flex-col gap-md">
			{/* Progress text */}
			<div className="flex items-center gap-sm">
				<AlertTriangle size={16} className="text-[var(--color-warning)]" />
				<Text className="text-sm">
					<span className="font-[family-name:var(--font-geist-mono)]">
						{validCount}
					</span>{' '}
					of{' '}
					<span className="font-[family-name:var(--font-geist-mono)]">
						{result.totalRows}
					</span>{' '}
					items validated successfully.{' '}
					<span className="font-[family-name:var(--font-geist-mono)]">
						{errorCount}
					</span>{' '}
					need attention.
				</Text>
			</div>

			{/* Error table */}
			<div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
				<table className="w-full text-[13px]">
					<thead>
						<tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
							<th className="px-sm py-xs text-start font-semibold">Row</th>
							<th className="px-sm py-xs text-start font-semibold">Field</th>
							<th className="px-sm py-xs text-start font-semibold">Value</th>
							<th className="px-sm py-xs text-start font-semibold">Expected</th>
						</tr>
					</thead>
					<tbody>
						{editableErrors.map((error, idx) => (
							<tr
								key={`${error.rowNumber}-${error.field}-${error.value}`}
								className="border-b border-[var(--color-border)] bg-[var(--color-error-bg)]"
							>
								<td className="px-sm py-xs font-[family-name:var(--font-geist-mono)]">
									{error.rowNumber}
								</td>
								<td className="px-sm py-xs">{error.field}</td>
								<td className="px-sm py-xs">
									<input
										type="text"
										value={error.value}
										onChange={(e) =>
											handleErrorValueChange(idx, e.target.value)
										}
										className="h-7 w-full rounded border border-[var(--color-border)] bg-[var(--color-base)] px-xs text-[13px] outline-none focus:border-[var(--color-primary)]"
									/>
								</td>
								<td className="px-sm py-xs text-[var(--color-text-subtle)]">
									{error.expected}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Unmatched items section */}
			{unmatchedItems.length > 0 && (
				<div className="flex flex-col gap-sm">
					<Text className="text-[13px] font-semibold text-[var(--color-text-subtle)]">
						{t('quoteBuilder.unmatchedItems', 'Unmatched Items')}
					</Text>
					{unmatchedItems.map((item) => (
						<div
							key={item.rowNumber}
							className="flex items-center gap-sm rounded-lg border border-[var(--color-border)] p-sm"
						>
							<span className="font-[family-name:var(--font-geist-mono)] text-[13px] text-[var(--color-text-subtle)]">
								#{item.rowNumber}
							</span>
							<span className="text-[13px]">{item.productName}</span>
							<UnmatchedBadge />
							<div className="ms-auto w-48">
								<ProductSelector
									onSelect={(productId, name) =>
										handleProductSelect(item.rowNumber, productId, name)
									}
								/>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Actions */}
			<div className="flex items-center gap-sm">
				<Button
					onPress={handleFixAndContinue}
					className="h-9 rounded-xl border border-[var(--color-primary)] px-md text-[13px] font-semibold text-[var(--color-primary)] outline-none hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-contrast)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
				>
					{t('quoteBuilder.fixAndContinue', 'Fix & Continue')}
				</Button>
				<Button
					onPress={onReupload}
					className="h-9 rounded-xl border border-[var(--color-border)] px-md text-[13px] font-semibold text-[var(--color-text)] outline-none hover:bg-[var(--color-surface)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
				>
					{t('quoteBuilder.reupload', 'Re-upload')}
				</Button>
			</div>
		</div>
	)
}
