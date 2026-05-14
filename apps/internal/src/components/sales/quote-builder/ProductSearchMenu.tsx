import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { normalizeIntegerInput } from '../../../lib/inputs'
import { getProductCatalog } from '../../../lib/server/sales-quotes'
import {
	EmployeeActionButton,
	EmployeeStatusPill,
} from '../../shared/EmployeeControls'
import { SearchMenu } from './SearchMenu'

export interface CatalogProduct {
	id: string
	slug: string
	name: string
	specification: string
	unit: string
	category: string
	supplierCost: number
	freshness: 'fresh' | 'aging' | 'stale' | 'missing'
	priceStatus: 'updated' | 'outdated'
	recentlyOrdered: boolean
	supplierName: string
}

export interface ProductCatalogSelection {
	productId: string
	quantity: number
	product?: CatalogProduct
}

interface ProductSearchMenuProps {
	isOpen: boolean
	onClose: () => void
	initialSelections?: {
		productId: string
		quantity: number
		productName?: string
	}[]
	onFinishSelection: (selection: ProductCatalogSelection[]) => void
}

export function ProductSearchMenu({
	isOpen,
	onClose,
	initialSelections = [],
	onFinishSelection,
}: ProductSearchMenuProps) {
	const { data, isLoading } = useQuery({
		queryKey: ['product-catalog'],
		queryFn: () => getProductCatalog({ data: {} }),
		staleTime: 300_000,
		enabled: isOpen,
	})

	const products: CatalogProduct[] = data?.products ?? []
	const [activeCategory, setActiveCategory] = useState<string | null>(null)
	const [selectedQtyMap, setSelectedQtyMap] = useState<Record<string, number>>(
		{},
	)
	const [editingProductId, setEditingProductId] = useState<string | null>(null)
	const [draftQty, setDraftQty] = useState('0')
	const wasOpenRef = useRef(false)
	const seededWithProductsRef = useRef(false)

	const categoryCounts = useMemo(() => {
		const counts = new Map<string, number>()
		for (const product of products) {
			counts.set(product.category, (counts.get(product.category) ?? 0) + 1)
		}
		return counts
	}, [products])

	const categories = useMemo(
		() => Array.from(categoryCounts.keys()).sort(),
		[categoryCounts],
	)

	const productById = useMemo(
		() => new Map(products.map((product) => [product.slug, product])),
		[products],
	)
	const selectedEntries = useMemo(
		() =>
			Object.entries(selectedQtyMap)
				.filter(
					(entry): entry is [string, number] =>
						Number.isFinite(entry[1]) && entry[1] > 0,
				)
				.map(([productId, quantity]) => ({
					productId,
					product: productById.get(productId),
					quantity,
				})),
		[selectedQtyMap, productById],
	)
	const selectedCount = selectedEntries.length
	const selectedUnits = selectedEntries.reduce(
		(total, entry) => total + entry.quantity,
		0,
	)

	useEffect(() => {
		if (!isOpen) {
			wasOpenRef.current = false
			seededWithProductsRef.current = false
			setEditingProductId(null)
			setDraftQty('0')
			setActiveCategory(null)
			return
		}
		const shouldSeed =
			!wasOpenRef.current ||
			(!seededWithProductsRef.current && products.length > 0)
		if (!shouldSeed) return
		wasOpenRef.current = true
		seededWithProductsRef.current = products.length > 0
		const nextSelection: Record<string, number> = {}
		for (const selection of initialSelections) {
			if (selection.quantity > 0) {
				const product = products.find(
					(p) =>
						p.slug === selection.productId ||
						p.id === selection.productId ||
						p.name === selection.productName,
				)
				nextSelection[product?.slug ?? selection.productId] = Math.round(
					selection.quantity,
				)
			}
		}
		setSelectedQtyMap(nextSelection)
		setEditingProductId(null)
		setDraftQty('0')
		setActiveCategory(null)
	}, [isOpen, initialSelections, products])

	function beginQuantityEdit(product: CatalogProduct) {
		const selectedQuantity = selectedQtyMap[product.slug] ?? 0
		if (product.supplierCost <= 0 && !selectedQuantity) return
		const nextQuantity = selectedQuantity > 0 ? selectedQuantity : 0
		setEditingProductId(product.slug)
		setDraftQty(String(nextQuantity))
	}

	function updateDraftQuantity(product: CatalogProduct, value: string) {
		setDraftQty(value)
		const parsed = Number(value)
		if (!Number.isFinite(parsed)) return
		const nextQty = Math.max(0, Math.round(parsed))
		setSelectedQtyMap((prev) => {
			if (nextQty <= 0) {
				const next = { ...prev }
				delete next[product.slug]
				return next
			}
			return { ...prev, [product.slug]: nextQty }
		})
	}

	function closeQuantityEdit() {
		setEditingProductId(null)
	}

	function clearQuantity(productId: string) {
		setSelectedQtyMap((prev) => {
			const next = { ...prev }
			delete next[productId]
			return next
		})
		setEditingProductId(null)
		setDraftQty('0')
	}

	function handleApply() {
		onFinishSelection(selectedEntries)
		onClose()
	}

	return (
		<SearchMenu
			isOpen={isOpen}
			onClose={onClose}
			placeholder="search catalog..."
			searchTools={
				<CategoryFilter
					categories={categories}
					counts={categoryCounts}
					activeCategory={activeCategory}
					totalCount={products.length}
					onSelect={setActiveCategory}
				/>
			}
			resultStatus={
				selectedCount > 0
					? `${selectedCount} selected`
					: `${products.length} product${products.length === 1 ? '' : 's'}`
			}
		>
			{(search) => {
				const query = search.toLowerCase().trim()
				const filtered = products.filter((product) => {
					if (activeCategory && product.category !== activeCategory)
						return false
					if (!query) return true
					return (
						product.name.toLowerCase().includes(query) ||
						product.specification.toLowerCase().includes(query) ||
						product.supplierName.toLowerCase().includes(query) ||
						product.category.toLowerCase().includes(query)
					)
				})

				return (
					<div className="flex min-h-full flex-col">
						<div className="flex-1">
							{isLoading ? (
								<LoadingRows />
							) : filtered.length === 0 ? (
								<EmptyState
									label={
										query
											? `No item matches "${search}"`
											: activeCategory
												? `No ${formatCategory(activeCategory)} items`
												: 'No catalog items'
									}
								/>
							) : (
								<div className="divide-y divide-[var(--color-border)]">
									{filtered.map((product) => (
										<ProductPickerRow
											key={product.id}
											product={product}
											selectedQuantity={selectedQtyMap[product.slug] ?? 0}
											isEditing={editingProductId === product.slug}
											draftQty={draftQty}
											onBeginEdit={() => beginQuantityEdit(product)}
											onDraftQtyChange={(value) =>
												updateDraftQuantity(product, value)
											}
											onCloseEdit={closeQuantityEdit}
											onClear={() => clearQuantity(product.slug)}
										/>
									))}
								</div>
							)}
						</div>

						<PickerFooter
							selectedCount={selectedCount}
							selectedUnits={selectedUnits}
							onApply={handleApply}
						/>
					</div>
				)
			}}
		</SearchMenu>
	)
}

function ProductPickerRow({
	product,
	selectedQuantity,
	isEditing,
	draftQty,
	onBeginEdit,
	onDraftQtyChange,
	onCloseEdit,
	onClear,
}: {
	product: CatalogProduct
	selectedQuantity: number
	isEditing: boolean
	draftQty: string
	onBeginEdit: () => void
	onDraftQtyChange: (value: string) => void
	onCloseEdit: () => void
	onClear: () => void
}) {
	const hasPrice = product.supplierCost > 0
	const canPick = hasPrice || selectedQuantity > 0
	const statusLabel = hasPrice ? null : 'missing price'
	const inputId = `catalog-qty-${product.id}`
	const inputRef = useRef<HTMLInputElement | null>(null)

	useEffect(() => {
		if (!isEditing) return
		inputRef.current?.focus()
		inputRef.current?.select()
	}, [isEditing])

	return (
		<div
			className={`border-x border-x-transparent px-4 py-3 transition-colors hover:border-x-black/[0.16] dark:hover:border-x-white/[0.16] lg:px-5 ${
				selectedQuantity > 0 ? 'bg-emerald-500/[0.045]' : ''
			}`}
		>
			<div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
				<button
					type="button"
					data-searchmenu-row="true"
					onClick={onBeginEdit}
					disabled={!canPick}
					className="min-w-0 text-start outline-none disabled:cursor-not-allowed disabled:opacity-55 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
					aria-label={
						canPick
							? `Set quantity for ${product.name}`
							: `${product.name}, ${statusLabel ?? 'not available'}`
					}
				>
					<div className="flex min-w-0 items-start gap-2">
						<h3
							className="min-w-0 break-words font-[family-name:var(--font-archivo)] text-[var(--color-text)]"
							style={{
								fontSize: '15px',
								fontWeight: 600,
								letterSpacing: '0',
								lineHeight: 1.25,
							}}
						>
							{product.name}
						</h3>
						{product.priceStatus === 'outdated' && <OutdatedPriceIcon />}
					</div>
					<p
						className="mt-1 break-words font-[family-name:var(--font-archivo)] text-[var(--color-text-subtle)]"
						style={{
							fontSize: '12px',
							lineHeight: 1.4,
							letterSpacing: '0',
						}}
					>
						<span className="font-[family-name:var(--font-plex-mono)] tabular-nums">
							{hasPrice
								? `${product.supplierCost.toLocaleString('en-EG', {
										minimumFractionDigits: 2,
									})}LE`
								: 'price missing'}
						</span>
					</p>
					{statusLabel && (
						<p
							className="mt-1 font-[family-name:var(--font-archivo)] text-[11px] font-semibold"
							style={{ color: 'var(--color-text-subtle)' }}
						>
							{statusLabel}
						</p>
					)}
				</button>
				<div className="shrink-0">
					{isEditing && canPick ? (
						<label className="block" htmlFor={inputId}>
							<span className="sr-only">Quantity for {product.name}</span>
							<input
								ref={inputRef}
								id={inputId}
								type="text"
								inputMode="numeric"
								pattern="[0-9]*"
								min={0}
								value={draftQty}
								onChange={(event) =>
									onDraftQtyChange(normalizeIntegerInput(event.target.value))
								}
								onFocus={(event) => event.currentTarget.select()}
								onBlur={onCloseEdit}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault()
										onCloseEdit()
									}
									if (event.key === 'Escape') {
										event.preventDefault()
										onCloseEdit()
									}
								}}
								className="h-10 w-20 rounded-md border border-[var(--color-primary)]/40 bg-[var(--color-surface)] px-2 text-center font-[family-name:var(--font-plex-mono)] text-[15px] font-semibold tabular-nums text-[var(--color-text)] outline-none transition-colors [appearance:textfield] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/18 dark:border-[var(--color-primary)]/45 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
							/>
						</label>
					) : (
						<button
							type="button"
							onClick={onBeginEdit}
							onDoubleClick={
								selectedQuantity > 0
									? (event) => {
											event.preventDefault()
											onClear()
										}
									: undefined
							}
							disabled={!canPick}
							className={`inline-flex min-h-10 min-w-12 items-center justify-center rounded-md border px-3 font-[family-name:var(--font-plex-mono)] text-[14px] font-semibold tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 disabled:cursor-not-allowed disabled:opacity-55 ${
								selectedQuantity > 0
									? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
									: 'border-black/[0.1] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] dark:border-white/[0.12]'
							}`}
							aria-label={
								selectedQuantity > 0
									? `Edit ${selectedQuantity} units for ${product.name}`
									: `Add ${product.name}`
							}
						>
							{selectedQuantity > 0 ? selectedQuantity : '+'}
						</button>
					)}
				</div>
			</div>
		</div>
	)
}

function PickerFooter({
	selectedCount,
	selectedUnits,
	onApply,
}: {
	selectedCount: number
	selectedUnits: number
	onApply: () => void
}) {
	return (
		<div className="sticky bottom-0 flex flex-col gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[0_-14px_30px_-26px_rgba(0,0,0,0.55)] sm:flex-row sm:items-center sm:justify-between lg:px-5">
			{selectedCount > 0 ? (
				<EmployeeStatusPill
					tone="success"
					leading={<Check size={14} strokeWidth={2.4} aria-hidden="true" />}
				>
					{selectedCount} line{selectedCount === 1 ? '' : 's'} · {selectedUnits}{' '}
					unit{selectedUnits === 1 ? '' : 's'}
				</EmployeeStatusPill>
			) : (
				<EmployeeStatusPill tone="neutral">
					No items selected
				</EmployeeStatusPill>
			)}
			<EmployeeActionButton
				type="button"
				onClick={onApply}
				tone={selectedCount > 0 ? 'success' : 'neutral'}
				fullWidthOnMobile
			>
				Apply
			</EmployeeActionButton>
		</div>
	)
}

function OutdatedPriceIcon() {
	return (
		<svg
			role="img"
			aria-label="Outdated price"
			viewBox="0 0 16 16"
			fill="none"
			className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-signal-amber)]"
		>
			<path
				d="M8 2.25 14.25 13.25H1.75L8 2.25Z"
				fill="currentColor"
				opacity="0.13"
			/>
			<path
				d="M8 2.25 14.25 13.25H1.75L8 2.25Z"
				stroke="currentColor"
				strokeWidth="1.45"
				strokeLinejoin="round"
			/>
			<path
				d="M8 5.75V9"
				stroke="currentColor"
				strokeWidth="1.45"
				strokeLinecap="round"
			/>
			<path
				d="M8 11.35H8.01"
				stroke="currentColor"
				strokeWidth="1.9"
				strokeLinecap="round"
			/>
		</svg>
	)
}

function CategoryFilter({
	categories,
	counts,
	activeCategory,
	totalCount,
	onSelect,
}: {
	categories: string[]
	counts: Map<string, number>
	activeCategory: string | null
	totalCount: number
	onSelect: (category: string | null) => void
}) {
	const menuId = useId()
	const [isMenuOpen, setMenuOpen] = useState(false)
	const activeLabel = activeCategory ? formatCategory(activeCategory) : 'all'
	const activeCount = activeCategory
		? (counts.get(activeCategory) ?? 0)
		: totalCount

	function selectCategory(category: string | null) {
		onSelect(category)
		setMenuOpen(false)
	}

	return (
		<div className="contents">
			<button
				type="button"
				aria-expanded={isMenuOpen}
				aria-controls={menuId}
				aria-label={`Filter category: ${activeLabel}`}
				onClick={() => setMenuOpen((open) => !open)}
				className="inline-flex h-9 max-w-[176px] shrink-0 items-center gap-2 rounded-md border border-black/[0.1] bg-black/[0.015] px-3 font-[family-name:var(--font-archivo)] text-[12px] font-semibold text-[var(--color-text)] outline-none transition-colors hover:border-[var(--color-primary)]/35 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 dark:border-white/[0.12] dark:bg-white/[0.025] lg:h-8"
			>
				<SlidersHorizontal
					size={14}
					strokeWidth={1.9}
					className="shrink-0 text-[var(--color-text-subtle)]"
					aria-hidden="true"
				/>
				<span className="min-w-0 truncate">{activeLabel}</span>
				<span className="shrink-0 font-[family-name:var(--font-plex-mono)] text-[10px] font-medium tabular-nums text-[var(--color-text-subtle)]">
					{activeCount}
				</span>
				<ChevronDown
					size={14}
					strokeWidth={1.8}
					className={`shrink-0 text-[var(--color-text-subtle)] transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
					aria-hidden="true"
				/>
			</button>

			{isMenuOpen && (
				<fieldset
					id={menuId}
					className="order-last m-0 flex w-full min-w-0 gap-2 overflow-x-auto border-0 p-0 pt-1"
				>
					<legend className="sr-only">Product category filters</legend>
					<CategoryOption
						label="all"
						count={totalCount}
						isActive={activeCategory === null}
						onClick={() => selectCategory(null)}
					/>
					{categories.map((category) => (
						<CategoryOption
							key={category}
							label={formatCategory(category)}
							count={counts.get(category) ?? 0}
							isActive={activeCategory === category}
							onClick={() => selectCategory(category)}
						/>
					))}
				</fieldset>
			)}
		</div>
	)
}

function CategoryOption({
	label,
	count,
	isActive,
	onClick,
}: {
	label: string
	count: number
	isActive: boolean
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-current={isActive ? 'true' : undefined}
			className={`inline-flex h-8 shrink-0 items-center justify-between gap-2 rounded-md border px-3 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 ${
				isActive
					? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/[0.08] text-[var(--color-text)]'
					: 'border-black/[0.1] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/35 hover:bg-black/[0.035] dark:border-white/[0.12] dark:hover:bg-white/[0.04]'
			}`}
		>
			<span className="min-w-0 whitespace-nowrap font-[family-name:var(--font-archivo)] text-[12px] font-medium">
				{label}
			</span>
			<span className="shrink-0 font-[family-name:var(--font-plex-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
				{count}
			</span>
		</button>
	)
}

function LoadingRows() {
	return (
		<div className="flex flex-col gap-2 p-4 lg:p-5">
			{[1, 2, 3, 4, 5].map((row) => (
				<div
					key={row}
					className="h-[74px] rounded-md"
					style={{
						backgroundColor: 'var(--color-border)',
						opacity: 0.36,
					}}
				/>
			))}
		</div>
	)
}

function EmptyState({ label }: { label: string }) {
	return (
		<div className="flex min-h-[220px] items-center justify-center px-6 py-16">
			<p
				className="font-[family-name:var(--font-archivo)] text-[14px] font-medium text-[var(--color-text-subtle)]"
				style={{ textAlign: 'center' }}
			>
				{label}
			</p>
		</div>
	)
}

function formatCategory(category: string): string {
	return category.replace(/_/g, ' ').toLowerCase()
}
