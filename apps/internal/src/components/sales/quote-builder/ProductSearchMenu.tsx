import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, Flame } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { getProductCatalog } from '../../../lib/server/sales-quotes'
import { getPriceUrgency } from '../../../types/sales'
import {
	EmployeeActionButton,
	EmployeeStatusPill,
} from '../../shared/EmployeeControls'
import { SearchMenu } from './SearchMenu'

interface CatalogProduct {
	id: string
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

interface ProductSearchMenuProps {
	isOpen: boolean
	onClose: () => void
	onAddProduct: (product: CatalogProduct, quantity: number) => void
	mode?: 'append' | 'replace'
	existingIds?: string[]
}

export function ProductSearchMenu({
	isOpen,
	onClose,
	onAddProduct,
	mode = 'append',
	existingIds = [],
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
	const [draftQty, setDraftQty] = useState('1')

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

	const existingSet = useMemo(() => new Set(existingIds), [existingIds])
	const productById = useMemo(
		() => new Map(products.map((product) => [product.id, product])),
		[products],
	)
	const selectedEntries = useMemo(
		() =>
			Object.entries(selectedQtyMap)
				.map(([id, quantity]) => {
					const product = productById.get(id)
					return product ? { product, quantity } : null
				})
				.filter(
					(entry): entry is { product: CatalogProduct; quantity: number } =>
						entry !== null,
				),
		[selectedQtyMap, productById],
	)
	const selectedCount = selectedEntries.length
	const selectedUnits = selectedEntries.reduce(
		(total, entry) => total + entry.quantity,
		0,
	)

	useEffect(() => {
		if (!isOpen) {
			setSelectedQtyMap({})
			setEditingProductId(null)
			setDraftQty('1')
			setActiveCategory(null)
		}
	}, [isOpen])

	function beginQuantityEdit(product: CatalogProduct) {
		if (mode === 'append' && existingSet.has(product.id)) return
		if (product.supplierCost <= 0) return
		setEditingProductId(product.id)
		setDraftQty(String(selectedQtyMap[product.id] ?? 1))
	}

	function applyQuantity(product: CatalogProduct) {
		const parsed = Number(draftQty)
		const nextQty = Number.isFinite(parsed)
			? Math.max(0, Math.round(parsed))
			: 1

		setSelectedQtyMap((prev) => {
			if (nextQty <= 0) {
				const next = { ...prev }
				delete next[product.id]
				return next
			}
			if (mode === 'replace') return { [product.id]: nextQty }
			return { ...prev, [product.id]: nextQty }
		})
		setEditingProductId(null)
	}

	function clearQuantity(productId: string) {
		setSelectedQtyMap((prev) => {
			const next = { ...prev }
			delete next[productId]
			return next
		})
		setEditingProductId(null)
		setDraftQty('1')
	}

	function handleFinish() {
		for (const { product, quantity } of selectedEntries) {
			onAddProduct(product, quantity)
		}
		onClose()
	}

	return (
		<SearchMenu
			isOpen={isOpen}
			onClose={onClose}
			placeholder="search catalog..."
			sidebar={
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
											selectedQuantity={selectedQtyMap[product.id] ?? 0}
											isEditing={editingProductId === product.id}
											draftQty={draftQty}
											alreadyAdded={
												mode === 'append' && existingSet.has(product.id)
											}
											onBeginEdit={() => beginQuantityEdit(product)}
											onDraftQtyChange={setDraftQty}
											onApply={() => applyQuantity(product)}
											onClear={() => clearQuantity(product.id)}
										/>
									))}
								</div>
							)}
						</div>

						<PickerFooter
							mode={mode}
							selectedCount={selectedCount}
							selectedUnits={selectedUnits}
							onFinish={handleFinish}
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
	alreadyAdded,
	onBeginEdit,
	onDraftQtyChange,
	onApply,
	onClear,
}: {
	product: CatalogProduct
	selectedQuantity: number
	isEditing: boolean
	draftQty: string
	alreadyAdded: boolean
	onBeginEdit: () => void
	onDraftQtyChange: (value: string) => void
	onApply: () => void
	onClear: () => void
}) {
	const hasPrice = product.supplierCost > 0
	const canPick = hasPrice && !alreadyAdded
	const urgency = getPriceUrgency(product.priceStatus, product.recentlyOrdered)
	const urgencyTone =
		urgency === 'urgent'
			? 'var(--color-signal-red)'
			: urgency === 'stale'
				? 'var(--color-signal-amber)'
				: null
	const statusLabel = alreadyAdded
		? 'in quote'
		: !hasPrice
			? 'missing price'
			: selectedQuantity > 0
				? `${selectedQuantity} selected`
				: null
	const inputId = `catalog-qty-${product.id}`
	const inputRef = useRef<HTMLInputElement | null>(null)

	useEffect(() => {
		if (!isEditing) return
		inputRef.current?.focus()
		inputRef.current?.select()
	}, [isEditing])

	return (
		<div
			className={`px-4 py-3 transition-colors lg:px-5 ${
				selectedQuantity > 0
					? 'bg-emerald-500/[0.045]'
					: 'hover:bg-black/[0.015] dark:hover:bg-white/[0.02]'
			}`}
		>
			<button
				type="button"
				data-searchmenu-row="true"
				onClick={onBeginEdit}
				disabled={!canPick}
				className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-4 text-start outline-none disabled:cursor-not-allowed disabled:opacity-55"
				aria-label={
					canPick
						? `Set quantity for ${product.name}`
						: `${product.name}, ${statusLabel ?? 'not available'}`
				}
			>
				<div className="min-w-0">
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
						{product.recentlyOrdered && (
							<Flame
								size={13}
								strokeWidth={1.8}
								className="mt-0.5 shrink-0"
								style={{
									color: urgencyTone ?? 'var(--color-text-subtle)',
								}}
								aria-label="recently ordered"
							/>
						)}
					</div>
					<p
						className="mt-1 break-words font-[family-name:var(--font-archivo)] text-[var(--color-text-subtle)]"
						style={{
							fontSize: '12px',
							lineHeight: 1.4,
							letterSpacing: '0',
						}}
					>
						{product.specification}
						<span aria-hidden="true"> · </span>
						{product.supplierName}
						<span aria-hidden="true"> · </span>
						<span className="font-[family-name:var(--font-plex-mono)] tabular-nums">
							{hasPrice
								? `${product.supplierCost.toLocaleString('en-EG', {
										minimumFractionDigits: 2,
									})}/${product.unit}`
								: 'price missing'}
						</span>
					</p>
					{statusLabel && (
						<p
							className="mt-1 font-[family-name:var(--font-archivo)] text-[11px] font-semibold"
							style={{
								color:
									selectedQuantity > 0
										? 'var(--color-primary)'
										: 'var(--color-text-subtle)',
							}}
						>
							{statusLabel}
						</p>
					)}
				</div>
				<span
					className={`inline-flex min-h-10 min-w-12 items-center justify-center rounded-md border px-3 font-[family-name:var(--font-plex-mono)] text-[14px] font-semibold tabular-nums ${
						selectedQuantity > 0
							? 'border-emerald-600 bg-emerald-600 text-white'
							: 'border-black/[0.1] text-[var(--color-text-muted)] dark:border-white/[0.12]'
					}`}
				>
					{alreadyAdded ? 'in' : selectedQuantity > 0 ? selectedQuantity : '+'}
				</span>
			</button>

			{isEditing && canPick && (
				<div className="mt-3 rounded-md border border-black/[0.08] bg-black/[0.015] p-3 dark:border-white/[0.1] dark:bg-white/[0.025]">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
						<label className="min-w-0 flex-1" htmlFor={inputId}>
							<span className="mb-1 block font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.11em] text-[var(--color-text-subtle)]">
								Quantity
							</span>
							<input
								ref={inputRef}
								id={inputId}
								type="number"
								min={0}
								step={1}
								value={draftQty}
								onChange={(event) => onDraftQtyChange(event.target.value)}
								onFocus={(event) => event.currentTarget.select()}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault()
										onApply()
									}
									if (event.key === 'Escape') {
										event.preventDefault()
										onClear()
									}
								}}
								className="h-11 w-full rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 text-center font-[family-name:var(--font-plex-mono)] text-[16px] font-semibold tabular-nums text-[var(--color-text)] outline-none transition-colors [appearance:textfield] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/18 dark:border-white/[0.12] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
							/>
						</label>
						<div className="flex gap-2">
							<EmployeeActionButton
								type="button"
								onClick={onApply}
								tone="primary"
								size="sm"
							>
								Apply
							</EmployeeActionButton>
							{selectedQuantity > 0 && (
								<EmployeeActionButton
									type="button"
									onClick={onClear}
									tone="neutral"
									size="sm"
								>
									Clear
								</EmployeeActionButton>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

function PickerFooter({
	mode,
	selectedCount,
	selectedUnits,
	onFinish,
}: {
	mode: 'append' | 'replace'
	selectedCount: number
	selectedUnits: number
	onFinish: () => void
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
				onClick={onFinish}
				disabled={selectedCount === 0}
				tone={selectedCount > 0 ? 'success' : 'neutral'}
				fullWidthOnMobile
			>
				{mode === 'replace' ? 'Replace item' : 'Finish selection'}
			</EmployeeActionButton>
		</div>
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
		<nav aria-label="Product categories" className="px-4 py-3 lg:px-3">
			<div className="lg:hidden">
				<button
					type="button"
					aria-expanded={isMenuOpen}
					aria-controls={menuId}
					onClick={() => setMenuOpen((open) => !open)}
					className="flex w-full items-center gap-3 rounded-md border border-black/[0.1] bg-black/[0.015] px-3 py-2.5 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 dark:border-white/[0.12] dark:bg-white/[0.025]"
				>
					<span className="min-w-0 flex-1">
						<span className="block font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.11em] text-[var(--color-text-subtle)]">
							Category
						</span>
						<span className="mt-0.5 block break-words font-[family-name:var(--font-archivo)] text-[14px] font-semibold text-[var(--color-text)]">
							{activeLabel}
						</span>
					</span>
					<span className="font-[family-name:var(--font-plex-mono)] text-[11px] tabular-nums text-[var(--color-text-muted)]">
						{activeCount}
					</span>
					<ChevronDown
						size={16}
						strokeWidth={1.8}
						className={`shrink-0 text-[var(--color-text-subtle)] transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
						aria-hidden="true"
					/>
				</button>

				{isMenuOpen && (
					<div
						id={menuId}
						className="mt-2 max-h-[38dvh] overflow-y-auto rounded-md border border-black/[0.08] bg-[var(--color-surface)] p-1 dark:border-white/[0.1]"
					>
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
					</div>
				)}
			</div>

			<div className="hidden lg:flex lg:flex-col lg:gap-1">
				<CategoryOption
					label="all"
					count={totalCount}
					isActive={activeCategory === null}
					onClick={() => onSelect(null)}
				/>
				{categories.map((category) => (
					<CategoryOption
						key={category}
						label={formatCategory(category)}
						count={counts.get(category) ?? 0}
						isActive={activeCategory === category}
						onClick={() => onSelect(category)}
					/>
				))}
			</div>
		</nav>
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
			className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 ${
				isActive
					? 'bg-[var(--color-primary)]/[0.08] text-[var(--color-text)]'
					: 'text-[var(--color-text-muted)] hover:bg-black/[0.035] dark:hover:bg-white/[0.04]'
			}`}
		>
			<span className="min-w-0 break-words font-[family-name:var(--font-archivo)] text-[12px] font-medium">
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
