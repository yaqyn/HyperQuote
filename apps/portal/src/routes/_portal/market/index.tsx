/**
 * Market — compact material catalog.
 *
 * Structure follows the public website market: title + search, rounded
 * category chips, dense image cards, with portal draft-quote actions retained.
 */

import { useInfiniteQuery, useMutation } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ParseKeys } from 'i18next'
import {
	Check,
	ChevronDown,
	Minus,
	Plus,
	Search,
	ShoppingCart,
	Trash2,
	Undo2,
	X,
} from 'lucide-react'
import {
	AnimatePresence,
	cubicBezier,
	motion,
	useReducedMotion,
} from 'motion/react'
import {
	type FormEvent,
	type RefObject,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
	getMarketProducts,
	type MarketProduct,
} from '../../../lib/server/market'
import { submitQuoteRequest } from '../../../lib/server/quote-requests'
import { toast } from '../../../lib/toast'
import { useDraftQuoteStore } from '../../../stores/draft-quote'

export const Route = createFileRoute('/_portal/market/')({
	component: MarketGridPage,
})

const CATEGORIES = [
	'cement',
	'steel',
	'aggregates',
	'bricks',
	'timber',
	'finishing',
] as const

const CATEGORY_MAP: Record<string, string[]> = {
	cement: ['cement', 'concrete'],
	steel: ['reinforcing_steel', 'structural_steel', 'plumbing', 'electrical'],
	aggregates: ['aggregates', 'sand'],
	bricks: ['bricks'],
	timber: ['wood', 'waterproofing', 'insulation'],
	finishing: ['paints', 'tiles', 'drywall', 'adhesives'],
}

const PLACEHOLDER_IMAGE =
	'https://websiteassets.hyperquote.net/Images/cairo.webp'
const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CART_EASE = cubicBezier(0.22, 1, 0.36, 1)

function MarketGridPage() {
	const { t, i18n } = useTranslation('portal')
	const navigate = useNavigate()
	const isAr = i18n.language === 'ar'
	const draftItemCount = useDraftQuoteStore((s) => s.items.length)
	const [cartOpen, setCartOpen] = useState(false)

	const [searchQuery, setSearchQuery] = useState('')
	const [debouncedSearch, setDebouncedSearch] = useState('')
	const [selectedCategories, setSelectedCategories] = useState<string[]>([])

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(searchQuery), 250)
		return () => clearTimeout(timer)
	}, [searchQuery])

	const categoryFilter =
		selectedCategories.length > 0
			? selectedCategories
					.flatMap((cat) => CATEGORY_MAP[cat] ?? [cat])
					.join(',')
			: undefined

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useInfiniteQuery({
			queryKey: ['market-products', debouncedSearch, categoryFilter],
			queryFn: async ({ pageParam = 1 }) =>
				getMarketProducts({
					data: {
						search: debouncedSearch || undefined,
						category: categoryFilter || undefined,
						page: pageParam,
						limit: 24,
					},
				}),
			initialPageParam: 1,
			getNextPageParam: (lastPage) => lastPage.nextPage,
			staleTime: 60_000,
		})

	const allProducts = useMemo(
		() => data?.pages.flatMap((page) => page.products) ?? [],
		[data],
	)
	const totalProducts = data?.pages[0]?.total ?? allProducts.length
	const formattedTotalProducts = isAr
		? totalProducts.toLocaleString('ar-EG')
		: totalProducts.toLocaleString('en-EG')
	const resultCountText = t('market.resultCount', {
		count: formattedTotalProducts,
	})
	const hasActiveFilters = !!(debouncedSearch || selectedCategories.length)

	const sentinelRef = useRef<HTMLDivElement>(null)
	useEffect(() => {
		const el = sentinelRef.current
		if (!el || !hasNextPage || isFetchingNextPage) return
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						fetchNextPage()
						break
					}
				}
			},
			{ rootMargin: '600px' },
		)
		observer.observe(el)
		return () => observer.disconnect()
	}, [fetchNextPage, hasNextPage, isFetchingNextPage])

	function toggleCategory(cat: string) {
		setSelectedCategories((prev) =>
			prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
		)
	}

	function clearFilters() {
		setSearchQuery('')
		setDebouncedSearch('')
		setSelectedCategories([])
	}

	return (
		<div className="flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto bg-[var(--p-bg)]">
			<MarketHeader
				value={searchQuery}
				onChange={setSearchQuery}
				placeholder={t('market.locateHint')}
				draftItemCount={draftItemCount}
				isAr={isAr}
				onOpenCart={() => setCartOpen(true)}
			/>
			<DraftCartDrawer
				open={cartOpen}
				onClose={() => setCartOpen(false)}
				isAr={isAr}
			/>

			<CategoryStrip
				selected={selectedCategories}
				onToggle={toggleCategory}
				onClearAll={clearFilters}
			/>

			<section className="px-4 py-6 sm:px-6 sm:py-8 lg:px-12">
				<div className="mx-auto w-full max-w-[1400px]">
					{isLoading ? (
						<GridSkeleton />
					) : allProducts.length === 0 ? (
						<EmptyState
							onClear={hasActiveFilters ? clearFilters : undefined}
							clearLabel={t('market.clearFilters')}
							title={t('empty.market.title')}
							body={t('empty.market.body')}
						/>
					) : (
						<>
							<div className="mb-6 flex items-center justify-between">
								<p
									className="text-[13px] text-[var(--p-text-muted)]"
									style={{ fontVariantNumeric: 'tabular-nums' }}
								>
									{resultCountText === 'market.resultCount'
										? formattedTotalProducts
										: resultCountText}
								</p>
							</div>

							<motion.div
								initial={false}
								animate={{ opacity: 1 }}
								transition={{ duration: 0.25, ease: 'easeOut' }}
								className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-8 lg:grid-cols-3 lg:gap-x-6 xl:grid-cols-4"
							>
								{allProducts.map((product) => (
									<ProductCard
										key={product.id}
										product={product}
										onOpen={() =>
											navigate({
												to: '/market/$productSlug',
												params: { productSlug: product.slug },
											})
										}
									/>
								))}
							</motion.div>

							<div ref={sentinelRef} aria-hidden="true" className="h-1" />
							{isFetchingNextPage && (
								<p className="mt-12 text-center text-[13px] text-[var(--p-text-muted)]">
									{t('market.loadingMore')}
								</p>
							)}
						</>
					)}
				</div>
			</section>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Header + search
// ---------------------------------------------------------------------------

function MarketHeader({
	value,
	onChange,
	placeholder,
	draftItemCount,
	isAr,
	onOpenCart,
}: {
	value: string
	onChange: (v: string) => void
	placeholder: string
	draftItemCount: number
	isAr: boolean
	onOpenCart: () => void
}) {
	const { t } = useTranslation('portal')
	const inputRef = useRef<HTMLInputElement>(null)
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
				e.preventDefault()
				inputRef.current?.focus()
			}
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [])

	return (
		<header className="shrink-0 px-4 pb-5 pt-[calc(env(safe-area-inset-top)+4.25rem)] sm:px-6 sm:pt-8 lg:px-12 lg:pb-6">
			<div className="mx-auto flex w-full max-w-[1400px] justify-center">
				<div className="flex w-full max-w-[620px] items-center justify-center gap-3">
					<div className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-4 transition-colors focus-within:border-[var(--p-border-strong)]">
						<Search
							size={17}
							strokeWidth={1.7}
							className="shrink-0 text-[var(--p-text-muted)]"
						/>
						<input
							ref={inputRef}
							value={value}
							onChange={(e) => onChange(e.target.value)}
							placeholder={placeholder}
							type="search"
							autoComplete="off"
							spellCheck={false}
							className="min-w-0 flex-1 bg-transparent text-[16px] text-[var(--p-text)] outline-none placeholder:text-[var(--p-text-faint)]"
						/>

						{value ? (
							<button
								type="button"
								onClick={() => onChange('')}
								className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--p-text-faint)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
								aria-label={t('market.clearSearch')}
							>
								<X size={15} strokeWidth={1.7} />
							</button>
						) : (
							<kbd className="hidden rounded border border-[var(--p-border)] px-1.5 py-0.5 font-mono text-[10px] tracking-[0.12em] text-[var(--p-text-faint)] sm:inline-block">
								/
							</kbd>
						)}
					</div>

					{draftItemCount > 0 && (
						<button
							type="button"
							onClick={onOpenCart}
							aria-label={t('market.openCart')}
							className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] text-[var(--p-text)] transition-colors hover:border-[var(--p-border-strong)] hover:bg-[var(--p-hover)]"
						>
							<ShoppingCart size={18} strokeWidth={1.8} />
							<span
								className="absolute -end-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--p-text)] px-1.5 text-[11px] font-semibold leading-none text-[var(--p-bg)]"
								style={{ fontVariantNumeric: 'tabular-nums' }}
							>
								{isAr ? draftItemCount.toLocaleString('ar-EG') : draftItemCount}
							</span>
						</button>
					)}
				</div>
			</div>
		</header>
	)
}

function DraftCartDrawer({
	open,
	onClose,
	isAr,
}: {
	open: boolean
	onClose: () => void
	isAr: boolean
}) {
	const { t } = useTranslation('portal')
	const shouldReduceMotion = useReducedMotion()
	const items = useDraftQuoteStore((s) => s.items)
	const globalNote = useDraftQuoteStore((s) => s.globalNote)
	const updateQuantity = useDraftQuoteStore((s) => s.updateQuantity)
	const setGlobalNote = useDraftQuoteStore((s) => s.setGlobalNote)
	const remove = useDraftQuoteStore((s) => s.remove)
	const clear = useDraftQuoteStore((s) => s.clear)
	const [submittedReference, setSubmittedReference] = useState<string | null>(
		null,
	)
	const formattedItemCount = isAr
		? items.length.toLocaleString('ar-EG')
		: items.length.toLocaleString('en-EG')

	const submitMutation = useMutation({
		mutationFn: () =>
			submitQuoteRequest({
				data: {
					items: items.map((item, index) => ({
						productId: UUID_RE.test(item.productId)
							? item.productId
							: undefined,
						customerDescription: isAr && item.nameAr ? item.nameAr : item.name,
						quantity: item.quantity,
						unitOfMeasure: item.unitOfMeasure,
						notes: item.note || undefined,
						sortOrder: index,
						matchConfidence: 1,
						isUnmatched: !UUID_RE.test(item.productId),
					})),
					notes: globalNote || undefined,
					idempotencyKey: crypto.randomUUID(),
				},
			}),
		onSuccess: (result) => {
			clear()
			setSubmittedReference(result.reference)
			toast.success(t('market.submitSuccessToast', { ref: result.reference }))
		},
	})

	useEffect(() => {
		if (!open) return
		const previousOverflow = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		return () => {
			document.body.style.overflow = previousOverflow
		}
	}, [open])

	useEffect(() => {
		if (open) submitMutation.reset()
		if (!open) setSubmittedReference(null)
	}, [open, submitMutation.reset])

	useEffect(() => {
		if (items.length > 0 && submittedReference) {
			setSubmittedReference(null)
		}
	}, [items.length, submittedReference])

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (items.length === 0 || submitMutation.isPending) return
		submitMutation.mutate()
	}

	if (typeof document === 'undefined') return null

	const drawerOffset = isAr ? -28 : 28
	const overlayMotion = shouldReduceMotion
		? {
				initial: { opacity: 1 },
				animate: { opacity: 1 },
				exit: { opacity: 1 },
				transition: { duration: 0 },
			}
		: {
				initial: { opacity: 0 },
				animate: { opacity: 1 },
				exit: { opacity: 0 },
				transition: { duration: 0.18, ease: 'easeOut' },
			}
	const drawerMotion = shouldReduceMotion
		? {
				initial: { opacity: 1 },
				animate: { opacity: 1 },
				exit: { opacity: 1 },
				transition: { duration: 0 },
			}
		: {
				initial: { opacity: 0, x: drawerOffset, y: 10, scale: 0.985 },
				animate: { opacity: 1, x: 0, y: 0, scale: 1 },
				exit: { opacity: 0, x: drawerOffset, y: 8, scale: 0.99 },
				transition: { duration: 0.24, ease: CART_EASE },
			}
	const panelMotion = shouldReduceMotion
		? {
				initial: { opacity: 1 },
				animate: { opacity: 1 },
				exit: { opacity: 1 },
				transition: { duration: 0 },
			}
		: {
				initial: { opacity: 0, y: 8 },
				animate: { opacity: 1, y: 0 },
				exit: { opacity: 0, y: -8 },
				transition: { duration: 0.2, ease: 'easeOut' },
			}

	const drawer = (
		<AnimatePresence initial={false}>
			{open && (
				<>
					<motion.button
						type="button"
						aria-label={t('market.closeCart')}
						className="fixed inset-0 z-[78] bg-black/25 backdrop-blur-[2px]"
						onClick={onClose}
						{...overlayMotion}
					/>
					<motion.aside
						role="dialog"
						aria-modal="true"
						aria-labelledby="market-cart-title"
						className="fixed inset-0 z-[79] flex h-dvh w-screen flex-col overflow-hidden border-[var(--p-border)] bg-[var(--p-bg)] shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:inset-y-4 md:end-4 md:start-auto md:h-auto md:w-[420px] md:rounded-2xl md:border"
						{...drawerMotion}
					>
						<motion.header
							className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--p-border)] px-5 pb-4 pt-[calc(env(safe-area-inset-top)+1.25rem)] md:pt-5"
							initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
							animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
							transition={{ duration: 0.18, delay: 0.05, ease: 'easeOut' }}
						>
							<div className="min-w-0">
								<h2
									id="market-cart-title"
									className="text-[15px] font-semibold text-[var(--p-text)]"
								>
									{t('market.draftQuote')}
								</h2>
								<p className="mt-1 text-[12px] text-[var(--p-text-muted)]">
									{t('market.cartItemCount', { count: formattedItemCount })}
								</p>
							</div>
							<div className="flex shrink-0 items-center gap-2">
								{items.length > 0 && (
									<button
										type="button"
										onClick={() => {
											clear()
											setSubmittedReference(null)
										}}
										className="h-9 rounded-lg px-2.5 text-[12px] font-medium text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-error)]"
									>
										{t('market.clearDraft')}
									</button>
								)}
								<button
									type="button"
									onClick={onClose}
									className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
									aria-label={t('market.closeCart')}
								>
									<X size={16} />
								</button>
							</div>
						</motion.header>

						<AnimatePresence mode="wait" initial={false}>
							{submittedReference ? (
								<motion.div
									key="success"
									className="flex flex-1 flex-col items-center justify-center px-6 text-center"
									{...panelMotion}
								>
									<motion.div
										className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--p-text)] text-[var(--p-bg)]"
										initial={
											shouldReduceMotion ? false : { scale: 0.75, opacity: 0 }
										}
										animate={
											shouldReduceMotion ? undefined : { scale: 1, opacity: 1 }
										}
										transition={{
											type: 'spring',
											stiffness: 360,
											damping: 22,
										}}
									>
										<Check size={24} strokeWidth={1.8} />
									</motion.div>
									<h3 className="text-[18px] font-semibold text-[var(--p-text)]">
										{t('market.submitSuccessTitle')}
									</h3>
									<p className="mt-3 max-w-[320px] text-[13px] leading-6 text-[var(--p-text-muted)]">
										{t('market.submitSuccessBody', {
											ref: submittedReference,
										})}
									</p>
									<button
										type="button"
										onClick={onClose}
										className="mt-7 h-11 rounded-xl bg-[var(--p-text)] px-5 text-[13px] font-semibold text-[var(--p-bg)] transition-opacity hover:opacity-90"
									>
										{t('market.continueBrowsing')}
									</button>
								</motion.div>
							) : items.length === 0 ? (
								<motion.div
									key="empty"
									className="flex flex-1 flex-col items-center justify-center px-8 text-center"
									{...panelMotion}
								>
									<ShoppingCart
										size={28}
										strokeWidth={1.5}
										className="mb-4 text-[var(--p-text-faint)]"
									/>
									<h3 className="text-[16px] font-semibold text-[var(--p-text)]">
										{t('market.cartEmptyTitle')}
									</h3>
									<p className="mt-2 max-w-[280px] text-[13px] leading-6 text-[var(--p-text-muted)]">
										{t('market.cartEmptyBody')}
									</p>
								</motion.div>
							) : (
								<motion.form
									key="cart-form"
									onSubmit={handleSubmit}
									className="flex min-h-0 flex-1 flex-col"
									{...panelMotion}
								>
									<motion.div
										className="flex-1 overflow-y-auto"
										initial={false}
										animate="show"
									>
										{items.map((item, index) => {
											const itemName =
												isAr && item.nameAr ? item.nameAr : item.name
											return (
												<motion.div
													key={item.productId}
													layout
													initial={
														shouldReduceMotion ? false : { opacity: 0, y: 10 }
													}
													animate={
														shouldReduceMotion
															? undefined
															: { opacity: 1, y: 0 }
													}
													exit={
														shouldReduceMotion
															? undefined
															: { opacity: 0, x: isAr ? -12 : 12 }
													}
													transition={{
														duration: 0.18,
														delay: shouldReduceMotion
															? 0
															: Math.min(index * 0.035, 0.18),
														ease: 'easeOut',
													}}
													className={[
														'px-5 py-4',
														index > 0
															? 'border-t border-[var(--p-border)]'
															: '',
													].join(' ')}
												>
													<div className="flex items-start gap-3">
														<img
															src={item.imageUrl || PLACEHOLDER_IMAGE}
															alt=""
															loading="lazy"
															decoding="async"
															className="h-12 w-12 shrink-0 rounded-lg bg-[var(--p-surface)] object-cover ring-1 ring-inset ring-[var(--p-border)]"
														/>
														<div className="min-w-0 flex-1">
															<p className="line-clamp-2 text-[13px] font-medium leading-snug text-[var(--p-text)]">
																{itemName}
															</p>
															<p className="mt-1 text-[12px] text-[var(--p-text-muted)]">
																{item.category.replace(/_/g, ' ')} ·{' '}
																{item.unitOfMeasure}
															</p>
														</div>
														<button
															type="button"
															onClick={() => remove(item.productId)}
															className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-error)]"
															aria-label={t('market.removeItem')}
														>
															<Trash2 size={15} strokeWidth={1.7} />
														</button>
													</div>

													<div className="mt-3 flex h-11 items-center overflow-hidden rounded-xl border border-[var(--p-border)] bg-[var(--p-card)]">
														<button
															type="button"
															onClick={() =>
																updateQuantity(
																	item.productId,
																	item.quantity - 1,
																)
															}
															className="flex h-full w-11 shrink-0 items-center justify-center border-e border-[var(--p-border)] text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
															aria-label={t('market.decreaseQuantity')}
														>
															<Minus size={14} strokeWidth={1.8} />
														</button>
														<div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-3">
															<input
																type="number"
																inputMode="numeric"
																min={1}
																value={item.quantity}
																onChange={(event) => {
																	const next = Number.parseInt(
																		event.currentTarget.value,
																		10,
																	)
																	if (!Number.isNaN(next)) {
																		updateQuantity(item.productId, next)
																	}
																}}
																className="h-full w-16 bg-transparent text-center font-mono text-[15px] font-semibold text-[var(--p-text)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
																style={{ fontVariantNumeric: 'tabular-nums' }}
																aria-label={t('market.quantity')}
															/>
															<span className="min-w-0 truncate text-[12px] text-[var(--p-text-muted)]">
																{item.unitOfMeasure}
															</span>
														</div>
														<button
															type="button"
															onClick={() =>
																updateQuantity(
																	item.productId,
																	item.quantity + 1,
																)
															}
															className="flex h-full w-11 shrink-0 items-center justify-center border-s border-[var(--p-border)] text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
															aria-label={t('market.increaseQuantity')}
														>
															<Plus size={14} strokeWidth={1.8} />
														</button>
													</div>
												</motion.div>
											)
										})}
									</motion.div>

									<motion.div
										className="shrink-0 border-t border-[var(--p-border)] px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 md:pb-4"
										initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
										animate={
											shouldReduceMotion ? undefined : { opacity: 1, y: 0 }
										}
										transition={{
											duration: 0.18,
											delay: shouldReduceMotion ? 0 : 0.08,
											ease: 'easeOut',
										}}
									>
										<label className="block text-[12px] font-medium text-[var(--p-text-muted)]">
											{t('market.cartNotesLabel')}
											<textarea
												value={globalNote}
												onChange={(event) =>
													setGlobalNote(event.currentTarget.value)
												}
												rows={3}
												placeholder={t('market.cartNotesPlaceholder')}
												className="mt-2 block w-full resize-none rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-3 py-2 text-[13px] leading-5 text-[var(--p-text)] outline-none transition-colors placeholder:text-[var(--p-text-faint)] focus:border-[var(--p-border-strong)]"
											/>
										</label>

										<AnimatePresence>
											{submitMutation.isError && (
												<motion.p
													initial={
														shouldReduceMotion ? false : { opacity: 0, y: -4 }
													}
													animate={
														shouldReduceMotion
															? undefined
															: { opacity: 1, y: 0 }
													}
													exit={
														shouldReduceMotion
															? undefined
															: { opacity: 0, y: -4 }
													}
													className="mt-3 text-[12px] text-[var(--p-error)]"
												>
													{t('market.submitError')}
												</motion.p>
											)}
										</AnimatePresence>

										<motion.button
											type="submit"
											disabled={submitMutation.isPending}
											className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-[var(--p-text)] px-5 text-[14px] font-semibold text-[var(--p-bg)] transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-70"
											whileTap={
												shouldReduceMotion ? undefined : { scale: 0.985 }
											}
										>
											<AnimatePresence mode="wait" initial={false}>
												{submitMutation.isPending ? (
													<motion.span
														key="submitting"
														initial={
															shouldReduceMotion ? false : { opacity: 0, y: 4 }
														}
														animate={
															shouldReduceMotion
																? undefined
																: { opacity: 1, y: 0 }
														}
														exit={
															shouldReduceMotion
																? undefined
																: { opacity: 0, y: -4 }
														}
														className="inline-flex items-center gap-2"
													>
														<span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--p-bg)]/30 border-t-[var(--p-bg)]" />
														{t('quoteBuilder.submitting')}
													</motion.span>
												) : (
													<motion.span
														key="submit"
														initial={
															shouldReduceMotion ? false : { opacity: 0, y: 4 }
														}
														animate={
															shouldReduceMotion
																? undefined
																: { opacity: 1, y: 0 }
														}
														exit={
															shouldReduceMotion
																? undefined
																: { opacity: 0, y: -4 }
														}
													>
														{t('market.submitQuote')}
													</motion.span>
												)}
											</AnimatePresence>
										</motion.button>
										<p className="mt-2 text-center text-[11px] leading-5 text-[var(--p-text-muted)]">
											{t('market.submitHint')}
										</p>
									</motion.div>
								</motion.form>
							)}
						</AnimatePresence>
					</motion.aside>
				</>
			)}
		</AnimatePresence>
	)

	return createPortal(drawer, document.body)
}

// ---------------------------------------------------------------------------
// Category strip
// ---------------------------------------------------------------------------

function CategoryStrip({
	selected,
	onToggle,
	onClearAll,
}: {
	selected: string[]
	onToggle: (c: string) => void
	onClearAll: () => void
}) {
	const { t } = useTranslation('portal')
	const isAllActive = selected.length === 0
	const [menuOpen, setMenuOpen] = useState(false)
	const menuRef = useRef<HTMLDivElement>(null)
	const categoryLabels = useMemo(
		() =>
			CATEGORIES.map((cat) => ({
				id: cat,
				label: t(`market.cat.${cat}` as ParseKeys<'portal'>),
			})),
		[t],
	)
	const selectedLabel = isAllActive
		? t('market.allEntries')
		: categoryLabels
				.filter((cat) => selected.includes(cat.id))
				.map((cat) => cat.label)
				.join(', ')

	useEffect(() => {
		if (!menuOpen) return

		function handlePointerDown(event: PointerEvent) {
			if (!menuRef.current?.contains(event.target as Node)) {
				setMenuOpen(false)
			}
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') setMenuOpen(false)
		}

		document.addEventListener('pointerdown', handlePointerDown)
		document.addEventListener('keydown', handleKeyDown)
		return () => {
			document.removeEventListener('pointerdown', handlePointerDown)
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [menuOpen])

	return (
		<section className="shrink-0 border-y border-[var(--p-border)] py-3">
			<div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-12">
				<div ref={menuRef} className="relative lg:hidden">
					<button
						type="button"
						onClick={() => setMenuOpen((open) => !open)}
						aria-expanded={menuOpen}
						aria-haspopup="menu"
						className="flex h-12 w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-4 text-start transition-colors hover:border-[var(--p-border-strong)]"
					>
						<span className="min-w-0 truncate text-[14px] font-medium text-[var(--p-text)]">
							{selectedLabel}
						</span>
						<ChevronDown
							size={17}
							className={`shrink-0 text-[var(--p-text-muted)] transition-transform ${
								menuOpen ? 'rotate-180' : ''
							}`}
						/>
					</button>

					<AnimatePresence>
						{menuOpen && (
							<motion.div
								initial={{ opacity: 0, y: -4 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -4 }}
								transition={{ duration: 0.16, ease: 'easeOut' }}
								role="menu"
								className="absolute inset-x-0 top-full z-30 mt-2 max-h-[min(60vh,360px)] overflow-y-auto rounded-xl border border-[var(--p-border-strong)] bg-[var(--p-elevated)] p-2 shadow-2xl"
							>
								<CategoryMenuItem
									active={isAllActive}
									onClick={() => {
										onClearAll()
										setMenuOpen(false)
									}}
									label={t('market.allEntries')}
								/>
								{categoryLabels.map((cat) => (
									<CategoryMenuItem
										key={cat.id}
										active={selected.includes(cat.id)}
										onClick={() => onToggle(cat.id)}
										label={cat.label}
									/>
								))}
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				<div className="hidden flex-wrap items-center gap-2 lg:flex">
					<CategoryChip
						active={isAllActive}
						onClick={onClearAll}
						label={t('market.allEntries')}
					/>
					{categoryLabels.map((cat) => (
						<CategoryChip
							key={cat.id}
							active={selected.includes(cat.id)}
							onClick={() => onToggle(cat.id)}
							label={cat.label}
						/>
					))}
				</div>
			</div>
		</section>
	)
}

function CategoryMenuItem({
	active,
	onClick,
	label,
}: {
	active: boolean
	onClick: () => void
	label: string
}) {
	return (
		<button
			type="button"
			role="menuitemcheckbox"
			aria-checked={active}
			onClick={onClick}
			className="flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-lg px-3 text-start text-[14px] font-medium text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)]"
		>
			<span className="min-w-0 truncate">{label}</span>
			{active && (
				<Check
					size={16}
					className="shrink-0 text-[var(--p-accent)]"
					aria-hidden="true"
				/>
			)}
		</button>
	)
}

function CategoryChip({
	active,
	onClick,
	label,
}: {
	active: boolean
	onClick: () => void
	label: string
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={active}
			className={[
				'shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors whitespace-nowrap',
				active
					? 'bg-[var(--p-text)] text-[var(--p-bg)]'
					: 'text-[var(--p-text-muted)] hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]',
			].join(' ')}
		>
			{label}
		</button>
	)
}

// ---------------------------------------------------------------------------
// Product card — compact catalog tile
// ---------------------------------------------------------------------------

function ProductCard({
	product,
	onOpen,
}: {
	product: MarketProduct
	onOpen: () => void
}) {
	const { t, i18n } = useTranslation('portal')
	const isAr = i18n.language === 'ar'
	const name = isAr ? product.nameAr : product.name
	const image = product.imageUrl || PLACEHOLDER_IMAGE
	const categoryLabel = t(
		`market.cat.${product.category}` as ParseKeys<'portal'>,
		{
			defaultValue: product.category.replace(/_/g, ' '),
		},
	)
	const draftItem = useDraftQuoteStore((s) =>
		s.items.find((i) => i.productId === product.id),
	)
	const inDraft = draftItem != null
	const [popoverOpen, setPopoverOpen] = useState(false)
	const tabRef = useRef<HTMLButtonElement>(null)

	const formattedPrice = useMemo(() => {
		const { priceRangeMin: min, priceRangeMax: max } = product
		if (min == null && max == null) return null
		const fmt = new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-EG', {
			maximumFractionDigits: 0,
		})
		if (min != null && max != null)
			return `${fmt.format(min)}–${fmt.format(max)}`
		if (min != null) return `${fmt.format(min)}+`
		if (max != null) return fmt.format(max)
		return null
	}, [product, isAr])

	return (
		<article className="group relative min-w-0">
			<div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--p-surface)] ring-1 ring-inset ring-[var(--p-border)]">
				<button
					type="button"
					onClick={onOpen}
					className="block h-full w-full text-start"
					aria-label={name}
				>
					<img
						src={image}
						alt={name}
						loading="lazy"
						decoding="async"
						className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
					/>
				</button>

				{inDraft && (
					<span
						className="absolute top-2 start-2 inline-flex items-center rounded-full bg-[var(--p-text)] px-2 py-0.5 text-[11px] font-medium text-[var(--p-bg)]"
						style={{ fontVariantNumeric: 'tabular-nums' }}
					>
						{draftItem?.quantity} {product.unitOfMeasure}
					</span>
				)}

				<button
					ref={tabRef}
					type="button"
					onClick={(e) => {
						e.preventDefault()
						e.stopPropagation()
						setPopoverOpen((v) => !v)
					}}
					className={[
						'absolute end-2 bottom-2 flex h-9 w-9 items-center justify-center rounded-full shadow-lg ring-1 transition-all duration-200 sm:end-3 sm:bottom-3 sm:h-10 sm:w-10',
						inDraft || popoverOpen
							? 'bg-[var(--p-text)] text-[var(--p-bg)] ring-[var(--p-text)]/30'
							: 'bg-black/30 text-white ring-white/15 opacity-100 backdrop-blur-xl hover:bg-black/40 lg:opacity-0 lg:group-hover:opacity-100',
					].join(' ')}
					aria-label={inDraft ? t('market.amend') : t('market.record')}
					aria-expanded={popoverOpen}
				>
					{inDraft ? (
						<span
							className={`font-mono font-semibold leading-none tabular-nums ${
								(draftItem?.quantity ?? 0) >= 100
									? 'text-[10px]'
									: 'text-[13px]'
							}`}
						>
							{draftItem?.quantity}
						</span>
					) : (
						<Plus size={16} />
					)}
				</button>

				<AnimatePresence>
					{popoverOpen && (
						<AddPopover
							product={product}
							productName={name}
							anchorRef={tabRef}
							onClose={() => setPopoverOpen(false)}
						/>
					)}
				</AnimatePresence>
			</div>

			<div className="mt-2.5 min-w-0 px-0.5 sm:mt-3">
				<button
					type="button"
					onClick={onOpen}
					className="block w-full text-start"
				>
					<h2 className="line-clamp-2 break-words text-[14px] font-medium leading-snug tracking-normal text-[var(--p-text)] sm:text-[15px]">
						{name}
					</h2>
				</button>
				<p className="mt-1 line-clamp-1 text-[12px] text-[var(--p-text-muted)] sm:text-[13px]">
					{categoryLabel} · {product.unitOfMeasure}
				</p>
				{formattedPrice && (
					<p
						className="mt-1 font-mono text-[12px] text-[var(--p-text-secondary)]"
						style={{ fontVariantNumeric: 'tabular-nums' }}
					>
						EGP {formattedPrice}
					</p>
				)}
			</div>
		</article>
	)
}

// ---------------------------------------------------------------------------
// Add popover — small floating editor anchored above the + tab.
// Mirrors the website's ProductCard pattern: portal-rendered, click-outside,
// Enter/Escape, primary action + optional undo.
// ---------------------------------------------------------------------------

function AddPopover({
	product,
	productName,
	anchorRef,
	onClose,
}: {
	product: MarketProduct
	productName: string
	anchorRef: RefObject<HTMLButtonElement | null>
	onClose: () => void
}) {
	const { t } = useTranslation('portal')
	const { add, remove, updateQuantity, items } = useDraftQuoteStore()
	const existing = items.find((i) => i.productId === product.id)
	const [qtyStr, setQtyStr] = useState(String(existing?.quantity ?? 1))
	const qty = parseInt(qtyStr, 10) || 0
	const inputRef = useRef<HTMLInputElement>(null)
	const popoverRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		inputRef.current?.select()
	}, [])

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (
				popoverRef.current &&
				!popoverRef.current.contains(e.target as Node) &&
				anchorRef.current &&
				!anchorRef.current.contains(e.target as Node)
			) {
				onClose()
			}
		}
		document.addEventListener('mousedown', handleClick)
		return () => document.removeEventListener('mousedown', handleClick)
	}, [onClose, anchorRef])

	const submit = () => {
		if (qty <= 0) {
			if (existing) remove(product.id)
			onClose()
			return
		}
		if (existing) {
			updateQuantity(product.id, qty)
		} else {
			add(
				{
					productId: product.id,
					slug: product.slug,
					name: product.name,
					nameAr: product.nameAr,
					category: product.category,
					unitOfMeasure: product.unitOfMeasure,
					imageUrl: product.imageUrl,
				},
				qty,
			)
		}
		onClose()
	}

	// Anchor near the + tab, clamped so it cannot overflow narrow screens.
	const [pos, setPos] = useState({ top: 0, left: 0 })
	useEffect(() => {
		if (!anchorRef.current) return

		function updatePosition() {
			if (!anchorRef.current) return

			const rect = anchorRef.current.getBoundingClientRect()
			const popoverWidth = Math.min(260, window.innerWidth - 24)
			const maxLeft = Math.max(12, window.innerWidth - popoverWidth - 12)
			const preferredLeft = rect.right - popoverWidth
			const preferredTop = rect.top - 140
			const maxTop = Math.max(12, window.innerHeight - 190)

			setPos({
				top: Math.min(Math.max(preferredTop, 12), maxTop),
				left: Math.min(Math.max(preferredLeft, 12), maxLeft),
			})
		}

		updatePosition()
		window.addEventListener('resize', updatePosition)
		return () => window.removeEventListener('resize', updatePosition)
	}, [anchorRef])

	return createPortal(
		<motion.div
			ref={popoverRef}
			initial={{ opacity: 0, scale: 0.94, y: 6 }}
			animate={{ opacity: 1, scale: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.94, y: 6 }}
			transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
			style={{
				position: 'fixed',
				top: pos.top,
				left: pos.left,
			}}
			className="z-[100] w-[min(260px,calc(100vw-1.5rem))] rounded-md border border-[var(--p-border-strong)] bg-[var(--p-elevated)]/95 p-3 shadow-2xl backdrop-blur-xl"
			onClick={(e) => {
				e.preventDefault()
				e.stopPropagation()
			}}
		>
			<p className="mb-2 line-clamp-1 text-[12px] font-medium text-[var(--p-text)]">
				{productName}
			</p>

			<div className="relative mb-2">
				<input
					ref={inputRef}
					type="text"
					inputMode="numeric"
					value={qtyStr}
					onChange={(e) => setQtyStr(e.target.value.replace(/[^0-9]/g, ''))}
					onKeyDown={(e) => {
						e.stopPropagation()
						if (e.key === 'Enter') {
							e.preventDefault()
							submit()
						}
						if (e.key === 'Escape') onClose()
					}}
					min={1}
					aria-label={t('market.quantity')}
					className="h-11 w-full rounded-sm border border-[var(--p-border)] bg-[var(--p-input)] ps-3 pe-14 text-center font-mono text-[16px] font-medium text-[var(--p-text)] outline-none transition-colors focus:border-[var(--p-text)]/50 sm:h-9 sm:text-[15px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
					style={{ fontVariantNumeric: 'tabular-nums' }}
				/>
				<span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-text-faint)]">
					{product.unitOfMeasure}
				</span>
			</div>

			<div className="flex items-center gap-2">
				{existing && (
					<button
						type="button"
						onClick={() => {
							remove(product.id)
							onClose()
						}}
						className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-[var(--p-border)] text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)] sm:h-9 sm:w-9"
						aria-label={t('market.removeItem')}
					>
						<Undo2 size={13} />
					</button>
				)}
				<button
					type="button"
					onClick={submit}
					className="h-11 flex-1 rounded-sm bg-[var(--p-text)] font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-bg)] transition-opacity hover:opacity-90 sm:h-9 sm:tracking-[0.22em]"
				>
					{existing ? t('market.confirm') : t('market.record')}
				</button>
			</div>
		</motion.div>,
		document.body,
	)
}

// ---------------------------------------------------------------------------
// Skeleton + empty
// ---------------------------------------------------------------------------

const SKELETON_TILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const

function GridSkeleton() {
	return (
		<div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-8 lg:grid-cols-3 lg:gap-x-6 xl:grid-cols-4">
			{SKELETON_TILES.map((slot) => (
				<div key={slot}>
					<div className="aspect-[4/3] animate-pulse rounded-xl bg-[var(--p-surface)]" />
					<div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-[var(--p-border)]" />
					<div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-[var(--p-border)]" />
				</div>
			))}
		</div>
	)
}

function EmptyState({
	title,
	body,
	onClear,
	clearLabel,
}: {
	title: string
	body: string
	onClear?: () => void
	clearLabel: string
}) {
	return (
		<div className="flex flex-col items-center gap-3 px-4 py-20 text-center sm:py-24">
			<p className="text-[16px] font-medium text-[var(--p-text)]">{title}</p>
			<p className="text-[13px] text-[var(--p-text-muted)]">{body}</p>
			{onClear && (
				<button
					type="button"
					onClick={onClear}
					className="mt-3 rounded-sm border border-[var(--p-border-strong)] px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-text)] hover:bg-[var(--p-hover)]"
				>
					{clearLabel}
				</button>
			)}
		</div>
	)
}
