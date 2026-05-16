/**
 * Product list table with drag-and-drop reorder.
 * Uses React Aria GridList with useDragAndDrop for keyboard-accessible reordering.
 * Each row: drag handle, row number, product name+SKU, quantity (NumberField),
 * UOM label, notes (TextField), delete button.
 * Mobile: card layout with stacked fields.
 */

import { GripVertical, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback } from 'react'
import {
	NumberField as AriaNumberField,
	TextField as AriaTextField,
	Button,
	GridList,
	GridListItem,
	Group,
	Input,
	useDragAndDrop,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import {
	type QuoteItem,
	useQuoteBuilderStore,
} from '../../../stores/quote-builder'

// UOM step sizes by unit type
const UOM_STEPS: Record<string, number> = {
	piece: 1,
	bag: 1,
	bundle: 1,
	box: 1,
	carton: 1,
	set: 1,
	pair: 1,
	pallet: 1,
	roll: 1,
	sheet: 1,
	ton: 0.5,
	metric_ton: 0.5,
	kg: 1,
	lb: 1,
	cubic_meter: 0.5,
	sqm: 0.5,
	liter: 1,
	meter: 0.5,
	foot: 1,
}

const quantityInputClass =
	'w-20 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 font-mono text-sm text-[var(--color-text)] text-center outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-colors'

const notesInputClass =
	'h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-colors'

export function ProductListTable() {
	const { t } = useTranslation('portal')
	const items = useQuoteBuilderStore((s) => s.items)
	const removeItem = useQuoteBuilderStore((s) => s.removeItem)
	const updateItem = useQuoteBuilderStore((s) => s.updateItem)
	const reorderItems = useQuoteBuilderStore((s) => s.reorderItems)

	const { dragAndDropHooks } = useDragAndDrop({
		getItems: (keys) =>
			[...keys].map((key) => ({
				'text/plain': String(key),
			})),
		onReorder(e) {
			const draggedKey = [...e.keys][0]
			const targetKey = e.target.key

			const fromIndex = items.findIndex((i) => i.id === String(draggedKey))
			let toIndex = items.findIndex((i) => i.id === String(targetKey))

			if (fromIndex === -1 || toIndex === -1) return

			if (e.target.dropPosition === 'after') {
				toIndex = Math.min(toIndex + 1, items.length - 1)
			}

			if (fromIndex !== toIndex) {
				reorderItems(fromIndex, toIndex)
			}
		},
	})

	const handleQuantityChange = useCallback(
		(id: string, value: number) => {
			if (value >= 1) {
				updateItem(id, { quantity: value })
			}
		},
		[updateItem],
	)

	const handleNotesChange = useCallback(
		(id: string, value: string) => {
			updateItem(id, { notes: value })
		},
		[updateItem],
	)

	if (items.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12 gap-2">
				<p className="text-sm text-[var(--color-text-muted)]">
					{t('quoteBuilder.emptyTable')}
				</p>
			</div>
		)
	}

	function QuantityField({
		item,
		label,
		onChange,
	}: {
		item: QuoteItem
		label: string
		onChange: (id: string, value: number) => void
	}) {
		return (
			<AriaNumberField
				value={item.quantity}
				onChange={(val) => onChange(item.id, val)}
				minValue={1}
				step={UOM_STEPS[item.unitOfMeasure] ?? 1}
				aria-label={label}
			>
				<Group>
					<Input data-quantity-input className={quantityInputClass} />
				</Group>
			</AriaNumberField>
		)
	}

	function NotesField({
		item,
		label,
		placeholder,
		onChange,
		className,
	}: {
		item: QuoteItem
		label: string
		placeholder: string
		onChange: (id: string, value: string) => void
		className: string
	}) {
		return (
			<AriaTextField
				value={item.notes ?? ''}
				onChange={(val) => onChange(item.id, val)}
				aria-label={label}
				className={className}
			>
				<Input
					placeholder={placeholder}
					className={`${notesInputClass} w-full`}
				/>
			</AriaTextField>
		)
	}

	function RemoveItemButton({
		label,
		onPress,
		className = '',
	}: {
		label: string
		onPress: () => void
		className?: string
	}) {
		return (
			<Button
				onPress={onPress}
				aria-label={label}
				className={`flex items-center justify-center w-8 h-8 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors cursor-pointer outline-none ${className}`}
			>
				<Trash2 size={16} />
			</Button>
		)
	}

	return (
		<section aria-label={t('quoteBuilder.materialListLabel')}>
			{/* Desktop header -- hidden on mobile */}
			<div className="hidden md:grid md:grid-cols-[32px_40px_1fr_80px_60px_160px_40px] gap-2 px-2 py-2 text-[13px] text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
				<div />
				<div>#</div>
				<div>{t('quoteBuilder.product')}</div>
				<div>{t('quoteBuilder.quantity')}</div>
				<div>{t('quoteBuilder.uom')}</div>
				<div>{t('quoteBuilder.notes')}</div>
				<div />
			</div>

			{/* GridList for drag-and-drop */}
			<GridList
				aria-label={t('quoteBuilder.materialListLabel')}
				items={items}
				dragAndDropHooks={dragAndDropHooks}
				className="outline-none"
			>
				{(item: QuoteItem) => (
					<GridListItem
						key={item.id}
						id={item.id}
						textValue={item.customerDescription}
						className="outline-none"
					>
						<AnimatePresence>
							<motion.div
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0 }}
								transition={{
									type: 'spring',
									stiffness: 300,
									damping: 25,
								}}
							>
								{/* Desktop row */}
								<div className="hidden md:grid md:grid-cols-[32px_40px_1fr_80px_60px_160px_40px] gap-2 items-center px-2 h-13 border-b border-[var(--color-border)]">
									{/* Drag handle */}
									<Button
										slot="drag"
										aria-label={t('quoteBuilder.reorderItem', {
											name: item.customerDescription,
										})}
										className="flex items-center justify-center w-8 h-8 cursor-grab active:cursor-grabbing outline-none"
									>
										<GripVertical
											size={16}
											className="text-[var(--color-text-subtle)]"
										/>
									</Button>

									{/* Row number */}
									<span className="font-mono text-[13px] text-[var(--color-text-muted)]">
										{item.sortOrder + 1}
									</span>

									{/* Product name */}
									<div className="min-w-0">
										<div className="text-sm text-[var(--color-text)] truncate">
											{item.customerDescription}
										</div>
									</div>

									{/* Quantity */}
									<QuantityField
										item={item}
										label={t('quoteBuilder.quantityFor', {
											name: item.customerDescription,
										})}
										onChange={handleQuantityChange}
									/>

									{/* UOM */}
									<span className="text-[13px] text-[var(--color-text-muted)]">
										{item.unitOfMeasure}
									</span>

									{/* Notes */}
									<NotesField
										item={item}
										label={t('quoteBuilder.notesPlaceholder')}
										placeholder={t('quoteBuilder.notesPlaceholder')}
										onChange={handleNotesChange}
										className="w-40"
									/>

									{/* Delete */}
									<RemoveItemButton
										label={t('quoteBuilder.removeItem', {
											name: item.customerDescription,
										})}
										onPress={() => removeItem(item.id)}
									/>
								</div>

								{/* Mobile card layout */}
								<div className="md:hidden border border-[var(--color-border)] rounded-xl p-4 mb-3">
									<div className="flex items-start justify-between mb-3">
										<div className="min-w-0 flex-1">
											<div className="text-sm font-medium text-[var(--color-text)] truncate">
												{item.customerDescription}
											</div>
											<span className="text-[13px] text-[var(--color-text-muted)]">
												#{item.sortOrder + 1}
											</span>
										</div>
										<RemoveItemButton
											label={t('quoteBuilder.removeItem', {
												name: item.customerDescription,
											})}
											onPress={() => removeItem(item.id)}
											className="shrink-0"
										/>
									</div>

									<div className="flex gap-3">
										{/* Quantity */}
										<QuantityField
											item={item}
											label={t('quoteBuilder.quantityFor', {
												name: item.customerDescription,
											})}
											onChange={handleQuantityChange}
										/>

										{/* UOM */}
										<span className="text-[13px] text-[var(--color-text-muted)] self-center">
											{item.unitOfMeasure}
										</span>
									</div>

									{/* Notes */}
									<NotesField
										item={item}
										label={t('quoteBuilder.notesPlaceholder')}
										placeholder={t('quoteBuilder.notesPlaceholder')}
										onChange={handleNotesChange}
										className="mt-3 w-full"
									/>
								</div>
							</motion.div>
						</AnimatePresence>
					</GridListItem>
				)}
			</GridList>
		</section>
	)
}
