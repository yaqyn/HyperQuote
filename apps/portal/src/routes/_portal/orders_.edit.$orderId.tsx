/**
 * Edit Saved Order — premium product editor.
 * Shows order items with images, editable quantities, remove/add.
 * Save changes or submit the order.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
	AlertTriangle,
	ArrowLeft,
	FilePenLine,
	Minus,
	Plus,
	Save,
	Search,
	Send,
	Trash2,
	X,
} from 'lucide-react'
import {
	AnimatePresence,
	cubicBezier,
	motion,
	useReducedMotion,
} from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import {
	ProductQuantitySearchRow,
	type ProductQuantitySearchRowProduct,
} from '../../components/shared/ProductQuantitySearchRow'
import { getMarketProducts } from '../../lib/server/market'
import {
	deleteOrder,
	getAllCustomerOrders,
	submitOrder,
} from '../../lib/server/orders'
import type { Order, OrderItem } from '../../types/order'

const EDIT_EASE = cubicBezier(0.22, 1, 0.36, 1)

function normalizeProductIdentity(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '')
}

function getOrderItemCatalogKey(item: OrderItem): string {
	return `${item.category}:${normalizeProductIdentity(item.productName)}`
}

function getProductCatalogKey(
	product: ProductQuantitySearchRowProduct,
): string {
	return `${product.category}:${normalizeProductIdentity(product.name)}`
}

function dedupeOrderItems(items: OrderItem[]): OrderItem[] {
	const byCatalogKey = new Map<string, OrderItem>()
	for (const item of items) {
		byCatalogKey.set(getOrderItemCatalogKey(item), item)
	}
	return Array.from(byCatalogKey.values())
}

function upsertOrderItemByProduct(
	items: OrderItem[],
	product: ProductQuantitySearchRowProduct,
	quantity: number,
): OrderItem[] {
	const productKey = getProductCatalogKey(product)
	let replaced = false
	const nextItems: OrderItem[] = []

	for (const item of items) {
		const matchesProduct =
			item.productId === product.id ||
			getOrderItemCatalogKey(item) === productKey
		if (!matchesProduct) {
			nextItems.push(item)
			continue
		}
		if (replaced) continue
		nextItems.push({
			...item,
			productId: product.id,
			productName: product.name,
			productNameAr: product.nameAr,
			quantity,
			unitOfMeasure: product.unitOfMeasure,
			imageUrl: product.imageUrl,
			category: product.category,
		})
		replaced = true
	}

	if (!replaced) {
		nextItems.push({
			productId: product.id,
			productName: product.name,
			productNameAr: product.nameAr,
			quantity,
			unitOfMeasure: product.unitOfMeasure,
			imageUrl: product.imageUrl,
			category: product.category,
		})
	}

	return nextItems
}

export const Route = createFileRoute('/_portal/orders_/edit/$orderId')({
	component: EditSavedOrder,
})

function EditSavedOrder() {
	const { orderId } = Route.useParams()
	const { t, i18n } = useTranslation('portal')
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const isAr = i18n.language === 'ar'
	const shouldReduceMotion = useReducedMotion()

	const { data, isLoading, isError } = useQuery({
		queryKey: ['customer-orders-all'],
		queryFn: () => getAllCustomerOrders(),
		staleTime: 30_000,
	})

	const order = data?.orders?.find((o) => o.id === orderId)

	// Local editable items state
	const [items, setItems] = useState<OrderItem[]>([])
	const [orderName, setOrderName] = useState('')
	const [hasChanges, setHasChanges] = useState(false)
	const [pickerOpen, setPickerOpen] = useState(false)
	const scrollRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (order) {
			setItems(dedupeOrderItems(order.items.map((i) => ({ ...i }))))
			setOrderName(order.name ?? '')
		}
	}, [order])

	useEffect(() => {
		const dedupedItems = dedupeOrderItems(items)
		if (dedupedItems.length === items.length) return
		setItems(dedupedItems)
		setHasChanges(true)
	}, [items])

	const updateQty = (productId: string, qty: number) => {
		if (qty < 1) return
		setItems((prev) =>
			prev.map((i) =>
				i.productId === productId ? { ...i, quantity: qty } : i,
			),
		)
		setHasChanges(true)
	}

	const removeItem = (productId: string) => {
		setItems((prev) => prev.filter((i) => i.productId !== productId))
		setHasChanges(true)
	}

	const setPickerProductQuantity = (
		product: ProductQuantitySearchRowProduct,
		quantity: number,
	) => {
		if (quantity < 1) return
		setItems((prev) => upsertOrderItemByProduct(prev, product, quantity))
		setHasChanges(true)
	}

	function buildDraftOrder(nextType: Order['type'] = 'saved'): Order | null {
		if (!order) return null
		const nextName = orderName.trim()
		const nextItems = dedupeOrderItems(items.map((item) => ({ ...item })))
		return {
			...order,
			type: nextType,
			draftSource: nextType === 'saved' ? order.draftSource : undefined,
			status: nextType === 'saved' ? 'draft' : 'submitted',
			name: nextName || order.name,
			items: nextItems,
			itemCount: nextItems.length,
			description: nextItems
				.map((item) => (isAr ? item.productNameAr : item.productName))
				.join(', '),
			date: new Date().toISOString(),
		}
	}

	function writeOrderToCache(nextOrder: Order) {
		queryClient.setQueryData<{ orders: Order[] }>(
			['customer-orders-all'],
			(current) =>
				current
					? {
							orders: current.orders.map((candidate) =>
								candidate.id === orderId ? nextOrder : candidate,
							),
						}
					: current,
		)
	}

	function saveDraft() {
		const nextOrder = buildDraftOrder()
		if (!nextOrder) return
		writeOrderToCache(nextOrder)
		setHasChanges(false)
	}

	const deleteMutation = useMutation({
		mutationFn: () => deleteOrder({ data: { orderId } }),
		onSuccess: () => {
			queryClient.setQueryData<{ orders: Order[] }>(
				['customer-orders-all'],
				(current) =>
					current
						? {
								orders: current.orders.filter(
									(candidate) => candidate.id !== orderId,
								),
							}
						: current,
			)
			navigate({ to: '/orders' })
		},
	})

	const submitMutation = useMutation({
		mutationFn: () => submitOrder({ data: { orderId } }),
		onSuccess: (result) => {
			const nextOrder = buildDraftOrder('submitted')
			if (nextOrder) {
				writeOrderToCache({
					...nextOrder,
					reference: result.reference,
				})
			}
			navigate({ to: '/orders' })
		},
	})

	function submitDraft() {
		if (items.length === 0 || submitMutation.isPending) return
		submitMutation.mutate()
	}

	if (isLoading) {
		return (
			<div className="flex-1 flex flex-col h-full min-h-0 overflow-auto">
				<div className="w-full max-w-[800px] mx-auto px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-8 sm:px-6 sm:pt-5">
					<EditSkeleton />
				</div>
			</div>
		)
	}

	if (isError || !order) {
		return (
			<div className="flex-1 flex flex-col h-full min-h-0 overflow-auto">
				<div className="w-full max-w-[800px] mx-auto px-4 sm:px-6 flex flex-col items-center justify-center gap-4 py-20">
					<AlertTriangle size={36} className="text-[var(--p-text-muted)]" />
					<p className="text-sm text-[var(--p-text-muted)]">
						{t('orders.error')}
					</p>
					<Button
						onPress={() => navigate({ to: '/orders' })}
						className="px-4 h-9 rounded-lg bg-[var(--p-accent)] text-[var(--p-accent-contrast)] text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity"
					>
						{t('tracking.backToOrders')}
					</Button>
				</div>
			</div>
		)
	}

	const sourceLabel =
		order.draftSource === 'lyon'
			? t('orders.lyonDraft')
			: t('orders.manualDraft')
	const dateLabel = formatDate(order.date, isAr)
	const transition = {
		duration: shouldReduceMotion ? 0.01 : 0.24,
		ease: EDIT_EASE,
	}

	return (
		<div
			ref={scrollRef}
			className="flex-1 flex flex-col h-full min-h-0 overflow-auto"
		>
			<div className="w-full max-w-[980px] mx-auto px-4 pb-8 sm:px-6">
				<motion.div
					initial={{ opacity: 0, x: -8 }}
					animate={{ opacity: 1, x: 0 }}
					transition={transition}
					className="sticky top-0 z-30 -mx-4 mb-3 border-b border-[var(--p-border)] bg-[var(--p-bg)] px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:-mx-6 sm:px-6 sm:pt-5"
				>
					<Button
						onPress={() => navigate({ to: '/orders' })}
						className="flex min-h-10 items-center gap-2 text-sm text-[var(--p-text-muted)] transition-colors hover:text-[var(--p-text)] sm:min-h-0"
					>
						<ArrowLeft size={14} className="rtl:rotate-180" />
						{t('tracking.backToOrders')}
					</Button>
				</motion.div>

				<motion.header
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={transition}
					className="-mx-4 mb-4 border-y border-[var(--p-border)] bg-[var(--p-bg)] px-4 py-3 sm:mx-0 sm:rounded-2xl sm:border sm:bg-[var(--p-card)] sm:p-4"
				>
					<div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="min-w-0">
							<div className="flex min-w-0 flex-wrap items-center gap-2">
								<span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-[var(--p-border)] bg-[var(--p-input)] px-2.5 py-1 text-[11px] font-medium text-[var(--p-text-muted)]">
									<FilePenLine size={12} strokeWidth={1.7} />
									<span className="truncate">{sourceLabel}</span>
								</span>
								<span className="font-mono text-[11px] text-[var(--p-text-faint)]">
									{t('orders.lastEdited', { date: dateLabel })}
								</span>
							</div>
							<div className="mt-2 max-w-[560px]">
								<label className="sr-only" htmlFor="saved-order-name">
									{t('orders.orderName')}
								</label>
								<input
									id="saved-order-name"
									type="text"
									value={orderName}
									aria-label={t('orders.orderName')}
									onChange={(e) => {
										setOrderName(e.target.value)
										setHasChanges(true)
									}}
									placeholder={t('orders.orderName')}
									className="w-full min-w-0 bg-transparent font-sans text-[22px] font-semibold leading-tight tracking-tight text-[var(--p-text)] outline-none placeholder:text-[var(--p-text-muted)] sm:text-[24px]"
								/>
							</div>
							<p className="mt-1 text-[13px] text-[var(--p-text-muted)]">
								{t('orders.items', { count: items.length })}
							</p>
						</div>

						<div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center">
							<Button
								onPress={saveDraft}
								isDisabled={!hasChanges || items.length === 0}
								className="flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-3 text-[13px] font-semibold text-[var(--p-text-secondary)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)] disabled:cursor-default disabled:opacity-35 sm:min-w-[112px]"
							>
								<Save size={14} strokeWidth={1.6} />
								<span className="truncate">{t('orders.save')}</span>
							</Button>
							<Button
								onPress={submitDraft}
								isDisabled={items.length === 0 || submitMutation.isPending}
								className="flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl bg-[var(--p-accent)] px-3 text-[13px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-40 sm:min-w-[132px]"
							>
								{submitMutation.isPending ? (
									<Spinner />
								) : (
									<Send size={14} strokeWidth={1.6} />
								)}
								<span className="truncate">{t('orders.submit')}</span>
							</Button>
						</div>
					</div>
				</motion.header>

				<motion.section
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						...transition,
						delay: shouldReduceMotion ? 0 : 0.05,
					}}
					className="overflow-hidden rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)]"
				>
					<div className="divide-y divide-[var(--p-border)]">
						<AnimatePresence initial={false}>
							{items.map((item) => (
								<motion.div
									key={item.productId}
									layout
									animate={{ opacity: 1, y: 0 }}
									exit={{
										opacity: 0,
										x: shouldReduceMotion ? 0 : -16,
										height: 0,
									}}
									transition={transition}
									className="grid min-w-0 grid-cols-[48px_minmax(0,1fr)_36px] items-center gap-3 px-3 py-3 transition-colors hover:bg-[var(--p-hover)] sm:grid-cols-[48px_minmax(0,1fr)_240px_36px] sm:px-4"
								>
									<img
										src={item.imageUrl}
										alt=""
										className="col-start-1 row-start-1 h-12 w-12 rounded-lg bg-[var(--p-elevated)] object-cover ring-1 ring-inset ring-[var(--p-border)] sm:col-auto sm:row-auto"
										loading="lazy"
										decoding="async"
									/>

									<div className="col-start-2 row-start-1 min-w-0 sm:col-auto sm:row-auto">
										<p className="truncate text-[13px] font-medium text-[var(--p-text)]">
											{isAr ? item.productNameAr : item.productName}
										</p>
										<p className="mt-1 truncate text-[12px] text-[var(--p-text-muted)]">
											{item.unitOfMeasure}
										</p>
									</div>

									<div className="col-span-3 col-start-1 row-start-2 flex h-10 min-w-0 items-center overflow-hidden rounded-xl border border-[var(--p-border)] bg-[var(--p-input)] sm:col-auto sm:row-auto">
										<button
											type="button"
											onClick={() =>
												updateQty(item.productId, item.quantity - 1)
											}
											className="flex h-full w-10 shrink-0 items-center justify-center border-e border-[var(--p-border)] text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
											aria-label={t('market.decreaseQuantity')}
										>
											<Minus size={14} strokeWidth={1.8} />
										</button>
										<div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-2">
											<QtyInput
												productId={item.productId}
												quantity={item.quantity}
												onChange={(v) => updateQty(item.productId, v)}
											/>
											<span className="min-w-0 truncate text-[12px] text-[var(--p-text-muted)]">
												{item.unitOfMeasure}
											</span>
										</div>
										<button
											type="button"
											onClick={() =>
												updateQty(item.productId, item.quantity + 1)
											}
											className="flex h-full w-10 shrink-0 items-center justify-center border-s border-[var(--p-border)] text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
											aria-label={t('market.increaseQuantity')}
										>
											<Plus size={14} strokeWidth={1.8} />
										</button>
									</div>

									<button
										type="button"
										onClick={() => removeItem(item.productId)}
										className="col-start-3 row-start-1 flex h-9 w-9 items-center justify-center rounded-lg text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-error)] sm:col-auto sm:row-auto"
										aria-label={t('orders.delete')}
									>
										<Trash2 size={15} strokeWidth={1.6} />
									</button>
								</motion.div>
							))}
						</AnimatePresence>

						{items.length === 0 && (
							<div className="flex min-h-36 flex-col items-center justify-center px-4 py-8 text-center">
								<FilePenLine
									size={24}
									strokeWidth={1.5}
									className="mb-3 text-[var(--p-text-faint)]"
								/>
								<p className="text-sm text-[var(--p-text-muted)]">
									{t('orders.emptyOrder')}
								</p>
							</div>
						)}

						{!pickerOpen && (
							<button
								type="button"
								onClick={() => setPickerOpen(true)}
								className="flex w-full items-center gap-3 px-4 py-3 text-start text-[13px] font-semibold text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
							>
								<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-dashed border-[var(--p-border-strong)] text-[var(--p-accent)]">
									<Plus size={16} strokeWidth={1.8} />
								</span>
								<span>{t('orders.addItem')}</span>
							</button>
						)}
					</div>

					<AnimatePresence>
						{pickerOpen && (
							<div
								ref={(el) => {
									const scroll = scrollRef.current
									if (el && scroll) {
										setTimeout(() => {
											scroll.scrollTo({
												top: scroll.scrollHeight,
												behavior: shouldReduceMotion ? 'auto' : 'smooth',
											})
										}, 160)
									}
								}}
							>
								<ProductPicker
									items={items}
									onSetQuantity={setPickerProductQuantity}
									onClose={() => setPickerOpen(false)}
									isAr={isAr}
								/>
							</div>
						)}
					</AnimatePresence>
				</motion.section>

				<motion.div
					initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						...transition,
						delay: shouldReduceMotion ? 0 : 0.08,
					}}
					className="mt-4 flex justify-end"
				>
					<Button
						onPress={() => deleteMutation.mutate()}
						isDisabled={deleteMutation.isPending}
						className="flex h-10 w-full items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-medium text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-error)] disabled:cursor-default disabled:opacity-35 sm:w-auto"
					>
						<Trash2 size={14} strokeWidth={1.5} />
						{t('orders.deleteOrder')}
					</Button>
				</motion.div>
			</div>
		</div>
	)
}

// ============================================================================
// Qty Input
// ============================================================================

function QtyInput({
	productId,
	quantity,
	onChange,
}: {
	productId: string
	quantity: number
	onChange: (v: number) => void
}) {
	const [local, setLocal] = useState(String(quantity))

	useEffect(() => {
		setLocal(String(quantity))
	}, [quantity])

	return (
		<input
			type="text"
			inputMode="numeric"
			value={local}
			onChange={(e) => {
				const raw = e.target.value.replace(/[^0-9]/g, '')
				setLocal(raw)
				const v = parseInt(raw, 10)
				if (!Number.isNaN(v) && v > 0) onChange(v)
			}}
			onBlur={() => {
				const v = parseInt(local, 10)
				if (Number.isNaN(v) || v < 1) {
					setLocal('1')
					onChange(1)
				}
			}}
			data-qty-input={productId}
			className="h-full w-16 bg-transparent text-center font-mono text-[15px] font-semibold text-[var(--p-text)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
			style={{ fontVariantNumeric: 'tabular-nums' }}
		/>
	)
}

// ============================================================================
// Product Picker
// ============================================================================

function ProductPicker({
	items,
	onSetQuantity,
	onClose,
	isAr,
}: {
	items: OrderItem[]
	onSetQuantity: (
		product: ProductQuantitySearchRowProduct,
		quantity: number,
	) => void
	onClose: () => void
	isAr: boolean
}) {
	const { t } = useTranslation('portal')
	const [search, setSearch] = useState('')
	const [debouncedSearch, setDebouncedSearch] = useState('')
	const [editingProductId, setEditingProductId] = useState<string | null>(null)
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(search), 300)
		return () => clearTimeout(timer)
	}, [search])

	useEffect(() => {
		inputRef.current?.focus()
	}, [])

	const { data, isLoading } = useQuery({
		queryKey: ['market-products-picker', debouncedSearch],
		queryFn: () =>
			getMarketProducts({
				data: { search: debouncedSearch || undefined, page: 1, limit: 20 },
			}),
		staleTime: 60_000,
	})

	const products = data?.products ?? []
	const existingQuantities = useMemo(() => {
		const quantities = new Map<string, number>()
		for (const item of items) {
			quantities.set(item.productId, item.quantity)
			quantities.set(getOrderItemCatalogKey(item), item.quantity)
		}
		return quantities
	}, [items])

	return (
		<motion.div
			initial={{ opacity: 0, height: 0 }}
			animate={{ opacity: 1, height: 'auto' }}
			exit={{ opacity: 0, height: 0 }}
			transition={{ duration: 0.2 }}
			className="overflow-hidden border-t border-[var(--p-border)] bg-[var(--p-bg)]"
		>
			<div className="flex items-center gap-3 border-b border-[var(--p-border)] px-3 py-3 sm:px-4">
				<Search
					size={14}
					strokeWidth={1.5}
					className="text-[var(--p-text-muted)] shrink-0"
				/>
				<input
					ref={inputRef}
					type="text"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder={t('orders.searchProducts')}
					aria-label={t('orders.searchProducts')}
					className="min-h-11 min-w-0 flex-1 bg-transparent text-[16px] text-[var(--p-text)] outline-none placeholder:text-[var(--p-text-muted)] sm:min-h-0 sm:text-sm"
				/>
				<button
					type="button"
					onClick={onClose}
					className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)] sm:h-8 sm:w-8"
				>
					<X size={14} />
				</button>
			</div>

			<div className="max-h-[min(62vh,420px)] overflow-y-auto">
				{isLoading && (
					<div className="flex flex-col gap-1 p-2">
						{[1, 2, 3].map((i) => (
							<div
								key={i}
								className="flex min-h-16 animate-pulse items-center gap-3 px-3 py-2.5"
							>
								<div className="w-10 h-10 rounded-lg bg-[var(--p-elevated)]" />
								<div className="min-w-0 flex-1">
									<div className="h-3.5 w-32 bg-[var(--p-border)] rounded mb-1.5" />
									<div className="h-2.5 w-20 bg-[var(--p-border)] rounded" />
								</div>
							</div>
						))}
					</div>
				)}

				{!isLoading && products.length === 0 && (
					<div className="py-8 text-center">
						<p className="text-[13px] text-[var(--p-text-muted)]">
							{t('orders.noProducts')}
						</p>
					</div>
				)}

				{!isLoading && products.length > 0 && (
					<div className="flex flex-col gap-0.5 p-1.5">
						{products.map((product) => {
							const quantity =
								existingQuantities.get(product.id) ??
								existingQuantities.get(getProductCatalogKey(product)) ??
								0
							return (
								<ProductQuantitySearchRow
									key={product.id}
									product={product}
									isAr={isAr}
									quantity={quantity}
									editing={editingProductId === product.id}
									onOpenEditor={() => setEditingProductId(product.id)}
									onCancelEditor={() =>
										setEditingProductId((current) =>
											current === product.id ? null : current,
										)
									}
									onSetQuantity={(quantity) =>
										onSetQuantity(
											{
												id: product.id,
												name: product.name,
												nameAr: product.nameAr,
												unitOfMeasure: product.unitOfMeasure,
												imageUrl: product.imageUrl,
												category: product.category,
											},
											quantity,
										)
									}
									size="comfortable"
								/>
							)
						})}
					</div>
				)}
			</div>
		</motion.div>
	)
}

// ============================================================================
// Skeleton
// ============================================================================

function EditSkeleton() {
	return (
		<div className="animate-pulse space-y-8 pt-4 sm:pt-12">
			<div>
				<div className="h-7 w-56 bg-[var(--p-card)] rounded mb-2" />
				<div className="h-3 w-20 bg-[var(--p-card)] rounded" />
			</div>
			<div className="space-y-3">
				{[1, 2, 3].map((i) => (
					<div
						key={i}
						className="grid grid-cols-[56px_1fr] gap-3 rounded-xl bg-[var(--p-card)] border border-[var(--p-border)] p-3 sm:flex sm:items-center sm:gap-4 sm:p-4"
					>
						<div className="w-14 h-14 rounded-lg bg-[var(--p-elevated)]" />
						<div className="min-w-0 sm:flex-1">
							<div className="h-4 w-40 bg-[var(--p-border)] rounded mb-2" />
							<div className="h-3 w-16 bg-[var(--p-border)] rounded" />
						</div>
						<div className="col-span-2 h-11 w-full rounded bg-[var(--p-border)] sm:col-span-1 sm:h-8 sm:w-24" />
					</div>
				))}
			</div>
		</div>
	)
}

function formatDate(iso: string, isAr: boolean): string {
	return new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-EG', {
		month: 'short',
		day: 'numeric',
	}).format(new Date(iso))
}

// ============================================================================
// Spinner
// ============================================================================

function Spinner() {
	return (
		<span className="inline-block h-3 w-3 animate-spin rounded-full border-[1.5px] border-[var(--p-accent-contrast-soft)] border-t-[var(--p-accent-contrast)]" />
	)
}
