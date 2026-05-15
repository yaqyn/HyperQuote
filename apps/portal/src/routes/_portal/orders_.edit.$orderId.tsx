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
	Plus,
	Save,
	Search,
	Send,
	Trash2,
	X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { PortalTitleRow } from '../../components/shell/PortalTitleRow'
import { getMarketProducts } from '../../lib/server/market'
import {
	deleteOrder,
	getAllCustomerOrders,
	submitOrder,
} from '../../lib/server/orders'
import type { OrderItem } from '../../types/order'

export const Route = createFileRoute('/_portal/orders_/edit/$orderId')({
	component: EditSavedOrder,
})

function EditSavedOrder() {
	const { orderId } = Route.useParams()
	const { t, i18n } = useTranslation('portal')
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const isAr = i18n.language === 'ar'

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
			setItems(order.items.map((i) => ({ ...i })))
			setOrderName(order.name ?? '')
		}
	}, [order])

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

	const addItem = (product: {
		id: string
		name: string
		nameAr: string
		unitOfMeasure: string
		imageUrl: string
		category: string
	}) => {
		const existing = items.find((i) => i.productId === product.id)
		if (existing) {
			updateQty(product.id, existing.quantity + 1)
		} else {
			setItems((prev) => [
				...prev,
				{
					productId: product.id,
					productName: product.name,
					productNameAr: product.nameAr,
					quantity: 1,
					unitOfMeasure: product.unitOfMeasure,
					imageUrl: product.imageUrl,
					category: product.category,
				},
			])
		}
		setHasChanges(true)
		setPickerOpen(false)
		// Focus the qty input of the added item after render
		requestAnimationFrame(() => {
			const input = document.querySelector<HTMLInputElement>(
				`[data-qty-input="${product.id}"]`,
			)
			if (input) {
				input.focus()
				input.select()
				input.scrollIntoView({ behavior: 'smooth', block: 'center' })
			}
		})
	}

	const deleteMutation = useMutation({
		mutationFn: () => deleteOrder({ data: { orderId } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['customer-orders-all'] })
			navigate({ to: '/orders' })
		},
	})

	const submitMutation = useMutation({
		mutationFn: () => submitOrder({ data: { orderId } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['customer-orders-all'] })
			navigate({ to: '/orders' })
		},
	})

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

	return (
		<div
			ref={scrollRef}
			className="flex-1 flex flex-col h-full min-h-0 overflow-auto"
		>
			<div className="w-full max-w-[800px] mx-auto px-4 pb-8 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6 sm:pt-5">
				{/* Back */}
				<motion.div
					initial={{ opacity: 0, x: -8 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.2 }}
				>
					<Button
						onPress={() => navigate({ to: '/orders' })}
						className="mb-6 flex min-h-10 items-center gap-2 text-sm text-[var(--p-text-muted)] transition-colors hover:text-[var(--p-text)] sm:mb-8 sm:min-h-0"
					>
						<ArrowLeft size={14} className="rtl:rotate-180" />
						{t('tracking.backToOrders')}
					</Button>
				</motion.div>

				{/* Header — editable name */}
				<PortalTitleRow
					title={
						<input
							type="text"
							value={orderName}
							aria-label={t('orders.orderName')}
							onChange={(e) => {
								setOrderName(e.target.value)
								setHasChanges(true)
							}}
							placeholder={t('orders.orderName')}
							className="w-full min-w-0 bg-transparent font-sans text-[20px] font-semibold tracking-tight text-[var(--p-text)] outline-none placeholder:text-[var(--p-text-muted)] sm:text-[22px]"
						/>
					}
					subtitle={t('orders.items', { count: items.length })}
					fixed
					className="-mx-4 mb-10 px-4 sm:-mx-6 sm:px-6"
				/>

				{/* Items */}
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.3, delay: 0.1 }}
					className="mb-6"
				>
					<div className="flex flex-col gap-3">
						<AnimatePresence mode="popLayout">
							{items.map((item) => (
								<motion.div
									key={item.productId}
									layout
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
									transition={{ duration: 0.2 }}
									className="grid grid-cols-[56px_1fr] gap-3 rounded-xl bg-[var(--p-card)] border border-[var(--p-border)] p-3 transition-colors hover:border-[var(--p-border-strong)] group sm:flex sm:items-center sm:gap-4 sm:p-4"
								>
									{/* Product image */}
									<div className="w-14 h-14 rounded-lg overflow-hidden bg-[var(--p-elevated)] border border-[var(--p-border)] shrink-0">
										<img
											src={item.imageUrl}
											alt=""
											className="w-full h-full object-cover"
											loading="lazy"
											decoding="async"
										/>
									</div>

									{/* Product info */}
									<div className="min-w-0 sm:flex-1">
										<p className="break-words text-sm text-[var(--p-text)] sm:truncate">
											{isAr ? item.productNameAr : item.productName}
										</p>
										<p className="text-[13px] text-[var(--p-text-muted)] mt-0.5">
											{item.unitOfMeasure}
										</p>
									</div>

									{/* Quantity controls */}
									<div className="col-span-2 flex items-center gap-1 shrink-0 sm:col-span-1">
										<button
											type="button"
											onClick={() =>
												updateQty(item.productId, item.quantity - 1)
											}
											className="w-11 h-11 rounded-lg flex items-center justify-center text-[var(--p-text-muted)] hover:bg-[var(--p-hover)] transition-colors text-sm font-mono sm:h-8 sm:w-8"
										>
											−
										</button>
										<QtyInput
											productId={item.productId}
											quantity={item.quantity}
											onChange={(v) => updateQty(item.productId, v)}
										/>
										<button
											type="button"
											onClick={() =>
												updateQty(item.productId, item.quantity + 1)
											}
											className="w-11 h-11 rounded-lg flex items-center justify-center text-[var(--p-text-muted)] hover:bg-[var(--p-hover)] transition-colors text-sm font-mono sm:h-8 sm:w-8"
										>
											+
										</button>
									</div>

									{/* Remove */}
									<button
										type="button"
										onClick={() => removeItem(item.productId)}
										className="col-span-2 flex h-11 items-center justify-center rounded-lg text-[var(--p-text-muted)] hover:text-[var(--p-error)] hover:bg-[var(--p-hover)] transition-all shrink-0 sm:col-span-1 sm:h-auto sm:p-2 sm:opacity-0 sm:group-hover:opacity-100"
										aria-label={t('orders.delete')}
									>
										<Trash2 size={14} strokeWidth={1.5} />
									</button>
								</motion.div>
							))}
						</AnimatePresence>
					</div>

					{items.length === 0 && (
						<div className="py-12 text-center">
							<p className="text-sm text-[var(--p-text-muted)]">
								{t('orders.emptyOrder')}
							</p>
						</div>
					)}

					{/* Add item button */}
					{!pickerOpen && (
						<button
							type="button"
							onClick={() => setPickerOpen(true)}
							className="flex items-center gap-2 w-full mt-3 px-4 py-3.5 rounded-xl border border-dashed border-[var(--p-border)] text-[var(--p-text-muted)] hover:border-[var(--p-border-strong)] hover:text-[var(--p-text-secondary)] transition-colors"
						>
							<Plus size={16} strokeWidth={1.5} />
							<span className="text-[13px] font-medium">
								{t('orders.addItem')}
							</span>
						</button>
					)}

					{/* Product picker */}
					{pickerOpen && (
						<div
							ref={(el) => {
								const scroll = scrollRef.current
								if (el && scroll) {
									setTimeout(() => {
										scroll.scrollTo({
											top: scroll.scrollHeight,
											behavior: 'smooth',
										})
									}, 200)
								}
							}}
						>
							<ProductPicker
								existingIds={items.map((i) => i.productId)}
								onAdd={addItem}
								onClose={() => setPickerOpen(false)}
								isAr={isAr}
							/>
						</div>
					)}
				</motion.div>

				{/* Action bar */}
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.3, delay: 0.15 }}
					className="flex flex-col gap-3 pt-6 border-t border-[var(--p-border)] sm:flex-row sm:items-center"
				>
					<Button
						onPress={() => {
							/* save changes — future */
						}}
						isDisabled={!hasChanges || items.length === 0}
						className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--p-border)] px-5 text-[13px] font-medium text-[var(--p-text-secondary)] transition-colors hover:text-[var(--p-text)] hover:bg-[var(--p-hover)] cursor-pointer disabled:opacity-30 disabled:cursor-default sm:h-10 sm:w-auto"
					>
						<Save size={14} strokeWidth={1.5} />
						{t('orders.save')}
					</Button>

					<Button
						onPress={() => submitMutation.mutate()}
						isDisabled={items.length === 0 || submitMutation.isPending}
						className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--p-accent)] px-6 text-[13px] font-medium text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-30 disabled:cursor-default sm:h-10 sm:w-auto"
					>
						{submitMutation.isPending ? (
							<Spinner />
						) : (
							<Send size={14} strokeWidth={1.5} />
						)}
						{t('orders.submit')}
					</Button>

					<div className="hidden flex-1 sm:block" />

					<Button
						onPress={() => deleteMutation.mutate()}
						isDisabled={deleteMutation.isPending}
						className="flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-medium text-[var(--p-text-muted)] transition-colors hover:text-[var(--p-error)] hover:bg-[var(--p-hover)] cursor-pointer disabled:opacity-30 sm:h-10 sm:w-auto"
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
			className="h-11 w-full min-w-0 flex-1 rounded-lg border border-[var(--p-border)] bg-[var(--p-input)] text-center font-mono text-[16px] text-[var(--p-text)] outline-none transition-colors focus:border-[var(--p-border-strong)] sm:h-8 sm:w-16 sm:flex-none sm:text-sm"
		/>
	)
}

// ============================================================================
// Product Picker
// ============================================================================

function ProductPicker({
	existingIds,
	onAdd,
	onClose,
	isAr,
}: {
	existingIds: string[]
	onAdd: (product: {
		id: string
		name: string
		nameAr: string
		unitOfMeasure: string
		imageUrl: string
		category: string
	}) => void
	onClose: () => void
	isAr: boolean
}) {
	const { t } = useTranslation('portal')
	const [search, setSearch] = useState('')
	const [debouncedSearch, setDebouncedSearch] = useState('')
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

	return (
		<motion.div
			initial={{ opacity: 0, height: 0 }}
			animate={{ opacity: 1, height: 'auto' }}
			exit={{ opacity: 0, height: 0 }}
			transition={{ duration: 0.2 }}
			className="mt-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] overflow-hidden"
		>
			{/* Search header */}
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

			{/* Product list */}
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
							const alreadyAdded = existingIds.includes(product.id)
							return (
								<button
									key={product.id}
									type="button"
									onClick={() =>
										onAdd({
											id: product.id,
											name: product.name,
											nameAr: product.nameAr,
											unitOfMeasure: product.unitOfMeasure,
											imageUrl: product.imageUrl,
											category: product.category,
										})
									}
									className="group flex min-h-16 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start transition-colors hover:bg-[var(--p-hover)]"
								>
									<div className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--p-elevated)] border border-[var(--p-border)] shrink-0">
										<img
											src={product.imageUrl}
											alt=""
											className="w-full h-full object-cover"
											loading="lazy"
											decoding="async"
										/>
									</div>
									<div className="flex-1 min-w-0">
										<p className="break-words text-[13px] text-[var(--p-text)] sm:truncate">
											{isAr ? product.nameAr : product.name}
										</p>
										<p className="break-words text-[13px] text-[var(--p-text-muted)]">
											{product.unitOfMeasure}
										</p>
									</div>
									<span
										className={`text-[13px] font-medium shrink-0 ${
											alreadyAdded
												? 'text-[var(--p-success)]'
												: 'text-[var(--p-text-muted)] opacity-0 group-hover:opacity-100'
										} transition-opacity`}
									>
										{alreadyAdded ? '✓' : '+'}
									</span>
								</button>
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

// ============================================================================
// Spinner
// ============================================================================

function Spinner() {
	return (
		<span className="inline-block h-3 w-3 animate-spin rounded-full border-[1.5px] border-[var(--p-accent-contrast-soft)] border-t-[var(--p-accent-contrast)]" />
	)
}
