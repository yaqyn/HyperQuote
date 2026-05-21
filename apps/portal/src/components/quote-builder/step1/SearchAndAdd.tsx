/**
 * Search & Add input method for quote builder.
 * Controlled product search with debounced Supabase-backed results.
 * On select: adds item to Zustand store, clears input, focuses quantity field.
 */

import { Search } from 'lucide-react'
import { type KeyboardEvent, useCallback, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProductSearch } from '../../../hooks/useProductSearch'
import type { ProductSearchResult } from '../../../lib/server/products-search'
import { useQuoteBuilderStore } from '../../../stores/quote-builder'

export function SearchAndAdd() {
	const { t, i18n } = useTranslation('portal')
	const isAr = i18n.language === 'ar'
	const listboxId = useId()
	const [inputValue, setInputValue] = useState('')
	const [isOpen, setIsOpen] = useState(false)
	const [activeIndex, setActiveIndex] = useState(0)
	const addItem = useQuoteBuilderStore((s) => s.addItem)
	const items = useQuoteBuilderStore((s) => s.items)
	const inputRef = useRef<HTMLInputElement>(null)

	const { results, isLoading } = useProductSearch(inputValue)
	const hasSearch = inputValue.trim().length >= 2
	const visibleResults = hasSearch ? results : []

	const selectProduct = useCallback(
		(product: ProductSearchResult) => {
			// Check if product already in list
			const exists = items.some(
				(i: { productId?: string }) => i.productId === product.id,
			)
			if (exists) {
				setInputValue('')
				setIsOpen(false)
				return
			}

			addItem({
				id: crypto.randomUUID(),
				productId: product.id,
				customerDescription:
					isAr && product.nameAr ? product.nameAr : product.name,
				quantity: 1,
				unitOfMeasure: product.unitOfMeasure,
				unitOfMeasureAr: product.unitOfMeasureAr,
				sortOrder: items.length,
				isUnmatched: false,
			})

			setInputValue('')
			setIsOpen(false)
			setActiveIndex(0)

			// Focus the quantity field of the newly added item after React renders
			requestAnimationFrame(() => {
				const qtyInputs = document.querySelectorAll<HTMLInputElement>(
					'[data-quantity-input]',
				)
				const lastInput = qtyInputs[qtyInputs.length - 1]
				lastInput?.focus()
				lastInput?.select()
			})
		},
		[items, addItem, isAr],
	)

	const handleInputChange = useCallback((value: string) => {
		setInputValue(value)
		setActiveIndex(0)
		setIsOpen(value.trim().length >= 2)
	}, [])

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLInputElement>) => {
			if (!isOpen) return

			if (event.key === 'Escape') {
				event.preventDefault()
				setIsOpen(false)
				return
			}

			if (visibleResults.length === 0) return

			if (event.key === 'ArrowDown') {
				event.preventDefault()
				setActiveIndex((index) => (index + 1) % visibleResults.length)
				return
			}

			if (event.key === 'ArrowUp') {
				event.preventDefault()
				setActiveIndex(
					(index) =>
						(index - 1 + visibleResults.length) % visibleResults.length,
				)
				return
			}

			if (event.key === 'Enter') {
				event.preventDefault()
				selectProduct(visibleResults[activeIndex] ?? visibleResults[0])
			}
		},
		[activeIndex, isOpen, selectProduct, visibleResults],
	)

	return (
		<div className="relative">
			<div className="relative">
				<Search
					size={16}
					className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
				/>
				<input
					ref={inputRef}
					type="search"
					role="combobox"
					aria-autocomplete="list"
					aria-controls={listboxId}
					aria-expanded={isOpen}
					aria-label={t('quoteBuilder.searchPlaceholder')}
					aria-activedescendant={
						isOpen && visibleResults[activeIndex]
							? `${listboxId}-${visibleResults[activeIndex].id}`
							: undefined
					}
					value={inputValue}
					onBlur={() => {
						window.setTimeout(() => setIsOpen(false), 120)
					}}
					onChange={(event) => handleInputChange(event.currentTarget.value)}
					onFocus={() => {
						if (hasSearch) setIsOpen(true)
					}}
					onKeyDown={handleKeyDown}
					placeholder={t('quoteBuilder.searchPlaceholder')}
					className="w-full h-11 ps-10 pe-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-colors"
				/>
			</div>

			{isOpen && (
				<div
					id={listboxId}
					role="listbox"
					className="absolute z-50 mt-1 w-full max-h-[320px] overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg outline-none"
				>
					{isLoading && (
						<div
							role="status"
							className="px-3 py-2 text-sm text-[var(--color-text-muted)]"
						>
							{t('common.loading', 'Loading...')}
						</div>
					)}

					{!isLoading && visibleResults.length === 0 && (
						<div className="px-3 py-2 text-sm text-[var(--color-text-muted)]">
							{t('quoteBuilder.emptyTable')}
						</div>
					)}

					{!isLoading &&
						visibleResults.map((product, index) => (
							<ProductSearchOption
								key={product.id}
								product={product}
								index={index}
								activeIndex={activeIndex}
								listboxId={listboxId}
								isAr={isAr}
								onMouseEnter={() => setActiveIndex(index)}
								onSelect={() => selectProduct(product)}
							/>
						))}
				</div>
			)}
		</div>
	)
}

function ProductSearchOption({
	product,
	index,
	activeIndex,
	listboxId,
	isAr,
	onMouseEnter,
	onSelect,
}: {
	product: ProductSearchResult
	index: number
	activeIndex: number
	listboxId: string
	isAr: boolean
	onMouseEnter: () => void
	onSelect: () => void
}) {
	const name = isAr && product.nameAr ? product.nameAr : product.name
	const categoryLabel =
		isAr && product.categoryNameAr
			? product.categoryNameAr
			: product.categoryName

	return (
		<button
			type="button"
			role="option"
			aria-selected={index === activeIndex}
			id={`${listboxId}-${product.id}`}
			onMouseDown={(event) => event.preventDefault()}
			onMouseEnter={onMouseEnter}
			onClick={onSelect}
			className={[
				'flex w-full items-center gap-2 px-3 py-2 text-start text-sm cursor-pointer outline-none transition-colors',
				index === activeIndex
					? 'bg-[var(--color-surface)]'
					: 'hover:bg-[var(--color-surface)]',
			].join(' ')}
		>
			<div className="flex-1 min-w-0">
				<div className="text-sm text-[var(--color-text)] truncate">{name}</div>
				<div className="flex items-center gap-2 mt-0.5">
					<span className="text-[13px] bg-[var(--color-surface)] text-[var(--color-text-muted)] rounded-full px-2 py-0.5">
						{categoryLabel}
					</span>
					<span
						className={[
							'w-1.5 h-1.5 rounded-full shrink-0',
							product.availabilityStatus === 'available'
								? 'bg-[var(--color-success)]'
								: 'bg-[var(--color-error)]',
						].join(' ')}
					/>
				</div>
			</div>
		</button>
	)
}
