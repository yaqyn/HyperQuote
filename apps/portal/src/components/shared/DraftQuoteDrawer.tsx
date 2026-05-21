import { useInfiniteQuery, useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
	Check,
	FilePenLine,
	Minus,
	Package,
	PanelRightClose,
	Plus,
	Search,
	Trash2,
	X,
} from 'lucide-react'
import {
	AnimatePresence,
	cubicBezier,
	motion,
	useReducedMotion,
} from 'motion/react'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
	type DraftCartItem,
	toDraftQuoteRequestItemPayloads,
} from '../../lib/draft-quote-cart'
import { getMarketProducts, type MarketProduct } from '../../lib/server/market'
import { saveDraft, submitQuoteRequest } from '../../lib/server/quote-requests'
import { toast } from '../../lib/toast'
import { unavailableItemNamesFromError } from '../../lib/unavailable-quote-items'
import { useDraftQuoteStore } from '../../stores/draft-quote'
import { ProductQuantitySearchRow } from './ProductQuantitySearchRow'

type DraftQuoteDrawerProps = {
	open: boolean
	onClose: () => void
}

const DRAWER_EASE = cubicBezier(0.22, 1, 0.36, 1)
const SNAP_EASE = cubicBezier(0.16, 1, 0.3, 1)

function getDraftFingerprint(items: DraftCartItem[], globalNote: string) {
	return JSON.stringify({
		globalNote: globalNote.trim(),
		items: items.map((item, index) => ({
			category: item.category,
			categoryName: item.categoryName,
			categoryNameAr: item.categoryNameAr,
			imageUrl: item.imageUrl,
			name: item.name,
			nameAr: item.nameAr,
			note: item.note.trim(),
			productId: item.productId,
			quantity: item.quantity,
			sortOrder: index,
			unitOfMeasure: item.unitOfMeasure,
			unitOfMeasureAr: item.unitOfMeasureAr,
		})),
	})
}

function drawerContentMotion(shouldReduceMotion: boolean | null) {
	return {
		animate: { opacity: 1, y: 0 },
		exit: { opacity: 0, y: shouldReduceMotion ? 0 : -8 },
		initial: { opacity: 0, y: shouldReduceMotion ? 0 : 8 },
		transition: {
			duration: shouldReduceMotion ? 0.01 : 0.18,
			ease: SNAP_EASE,
		},
	}
}

export function DraftQuoteDrawer({ open, onClose }: DraftQuoteDrawerProps) {
	const { t, i18n } = useTranslation('portal')
	const shouldReduceMotion = useReducedMotion()
	const isAr = i18n.language === 'ar'
	const items = useDraftQuoteStore((s) => s.items)
	const globalNote = useDraftQuoteStore((s) => s.globalNote)
	const updateQuantity = useDraftQuoteStore((s) => s.updateQuantity)
	const setGlobalNote = useDraftQuoteStore((s) => s.setGlobalNote)
	const remove = useDraftQuoteStore((s) => s.remove)
	const clear = useDraftQuoteStore((s) => s.clear)
	const [submittedReference, setSubmittedReference] = useState<string | null>(
		null,
	)
	const [savedDraftFingerprint, setSavedDraftFingerprint] = useState<
		string | null
	>(null)
	const [savedDraftId, setSavedDraftId] = useState<string | null>(null)
	const defaultDraftName = t('market.defaultDraftName')
	const [draftName, setDraftName] = useState(defaultDraftName)
	const [persistedDraftName, setPersistedDraftName] = useState(defaultDraftName)
	const [searchOpen, setSearchOpen] = useState(false)
	const formattedItemCount = items.length.toLocaleString(
		isAr ? 'ar-EG' : 'en-EG',
	)
	const contentMotion = useMemo(
		() => drawerContentMotion(shouldReduceMotion),
		[shouldReduceMotion],
	)
	const quoteRequestItems = useMemo(
		() => toDraftQuoteRequestItemPayloads(items, { isArabic: isAr }),
		[isAr, items],
	)
	const draftFingerprint = useMemo(
		() => getDraftFingerprint(items, globalNote),
		[globalNote, items],
	)
	const isDraftSaved =
		items.length > 0 && savedDraftFingerprint === draftFingerprint

	const submitMutation = useMutation({
		mutationFn: () =>
			submitQuoteRequest({
				data: {
					draftId: savedDraftId ?? undefined,
					items: quoteRequestItems,
					name: draftName,
					notes: globalNote || undefined,
					idempotencyKey: crypto.randomUUID(),
				},
			}),
		onSuccess: (result) => {
			clear()
			setSubmittedReference(result.reference)
			setSavedDraftFingerprint(null)
			setSavedDraftId(null)
			toast.success(t('market.submitSuccessToast', { ref: result.reference }))
		},
	})

	const saveMutation = useMutation({
		mutationFn: () =>
			saveDraft({
				data: {
					draftId: savedDraftId ?? undefined,
					items: quoteRequestItems,
					name: draftName,
					notes: globalNote || undefined,
				},
			}),
		onSuccess: (result) => {
			const nextName = draftName.trim() || defaultDraftName
			setDraftName(nextName)
			setPersistedDraftName(nextName)
			setSavedDraftId(result.draftId)
			setSavedDraftFingerprint(draftFingerprint)
			toast.success(t('market.draftSavedToast', { ref: result.reference }))
		},
	})

	const renameMutation = useMutation({
		mutationFn: (name: string) =>
			saveDraft({
				data: {
					draftId: savedDraftId ?? undefined,
					items: quoteRequestItems,
					name,
					notes: globalNote || undefined,
				},
			}),
		onSuccess: (_result, name) => {
			setPersistedDraftName(name.trim() || defaultDraftName)
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

	function handleDrawerExitComplete() {
		setSubmittedReference(null)
		setSearchOpen(false)
		submitMutation.reset()
		saveMutation.reset()
	}

	useEffect(() => {
		if (items.length > 0 && submittedReference) {
			setSubmittedReference(null)
		}
	}, [items.length, submittedReference])

	useEffect(() => {
		if (!open || !submittedReference) return
		const timer = window.setTimeout(onClose, 3000)
		return () => window.clearTimeout(timer)
	}, [onClose, open, submittedReference])

	useEffect(() => {
		if (!open || !savedDraftId || !isDraftSaved) return
		const nextName = draftName.trim() || defaultDraftName
		if (nextName === persistedDraftName || renameMutation.isPending) return
		const timer = window.setTimeout(() => {
			renameMutation.mutate(nextName)
		}, 650)
		return () => window.clearTimeout(timer)
	}, [
		defaultDraftName,
		draftName,
		isDraftSaved,
		open,
		persistedDraftName,
		renameMutation.isPending,
		renameMutation.mutate,
		savedDraftId,
	])

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (
			quoteRequestItems.length === 0 ||
			submitMutation.isPending ||
			saveMutation.isPending
		) {
			return
		}
		submitMutation.mutate()
	}

	function handleSaveDraft() {
		if (
			quoteRequestItems.length === 0 ||
			submitMutation.isPending ||
			saveMutation.isPending ||
			isDraftSaved
		) {
			return
		}
		saveMutation.mutate()
	}

	const unavailableItems = unavailableItemNamesFromError(submitMutation.error)
	const submitErrorText =
		unavailableItems.length > 0
			? t('market.unavailableItems', {
					items: unavailableItems.join(', '),
				})
			: t('market.submitError')

	if (typeof document === 'undefined') return null

	return createPortal(
		<AnimatePresence onExitComplete={handleDrawerExitComplete}>
			{open && (
				<>
					<motion.button
						key="draft-quote-backdrop"
						type="button"
						aria-label={t('market.closeCart')}
						className="fixed inset-0 z-[78] bg-black/25"
						onClick={onClose}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: shouldReduceMotion ? 0.01 : 0.18 }}
					/>
					<motion.aside
						key="draft-quote-drawer"
						role="dialog"
						aria-modal="true"
						aria-labelledby="draft-quote-title"
						className="fixed inset-y-0 right-0 z-[79] flex h-[100dvh] w-[min(100vw,480px)] flex-col overflow-hidden border-s border-[var(--p-border)] bg-[var(--p-bg)] shadow-[0_24px_80px_rgba(0,0,0,0.18)] will-change-transform md:top-4 md:right-4 md:bottom-4 md:h-auto md:w-[460px] md:rounded-2xl lg:w-[480px]"
						initial={{
							opacity: shouldReduceMotion ? 1 : 0,
							x: shouldReduceMotion ? 0 : '100%',
						}}
						animate={{ opacity: 1, x: 0 }}
						exit={{
							opacity: shouldReduceMotion ? 1 : 0,
							x: shouldReduceMotion ? 0 : '100%',
						}}
						transition={{
							duration: shouldReduceMotion ? 0.01 : 0.26,
							ease: DRAWER_EASE,
						}}
					>
						{submittedReference ? (
							<DraftQuoteSuccessMessage
								reference={submittedReference}
								shouldReduceMotion={shouldReduceMotion}
							/>
						) : (
							<>
								<header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--p-border)] px-4 py-3.5 md:px-5">
									<div className="min-w-0">
										<h2
											id="draft-quote-title"
											className="text-[15px] font-semibold text-[var(--p-text)]"
										>
											{t('market.draftQuote')}
										</h2>
										<p className="mt-1 text-[12px] text-[var(--p-text-muted)]">
											{t('market.cartItemCount', {
												count: formattedItemCount,
											})}
										</p>
									</div>
									<div className="flex shrink-0 items-center gap-1">
										<motion.button
											type="button"
											onClick={() => setSearchOpen(true)}
											className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
											aria-label={t('market.addToQuote')}
											whileTap={
												shouldReduceMotion ? undefined : { scale: 0.94 }
											}
										>
											<Plus size={17} strokeWidth={1.8} />
										</motion.button>
										<motion.button
											type="button"
											onClick={onClose}
											className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
											aria-label={t('market.closeCart')}
											whileTap={
												shouldReduceMotion ? undefined : { scale: 0.94 }
											}
										>
											<PanelRightClose size={17} strokeWidth={1.8} />
										</motion.button>
									</div>
								</header>

								<AnimatePresence mode="wait" initial={false}>
									{items.length === 0 ? (
										<motion.div
											key="empty"
											{...contentMotion}
											className="flex flex-1 flex-col items-center justify-center px-8 text-center"
										>
											<FilePenLine
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
											key="items"
											onSubmit={handleSubmit}
											{...contentMotion}
											className="flex min-h-0 flex-1 flex-col"
										>
											<div className="flex-1 overflow-y-auto">
												<AnimatePresence initial={false} mode="popLayout">
													{items.map((item, index) => {
														const itemName =
															isAr && item.nameAr ? item.nameAr : item.name
														const categoryLabel =
															isAr && item.categoryNameAr
																? item.categoryNameAr
																: item.categoryName
														const unitLabel =
															isAr && item.unitOfMeasureAr
																? item.unitOfMeasureAr
																: item.unitOfMeasure
														return (
															<motion.div
																layout
																key={item.productId}
																initial={{
																	opacity: 0,
																	y: shouldReduceMotion ? 0 : 8,
																}}
																animate={{ opacity: 1, y: 0 }}
																exit={{
																	opacity: 0,
																	x: shouldReduceMotion ? 0 : -16,
																	height: 0,
																}}
																transition={{
																	duration: shouldReduceMotion ? 0.01 : 0.18,
																	ease: SNAP_EASE,
																}}
																className={[
																	'overflow-hidden px-4 py-3 md:px-5',
																	index > 0
																		? 'border-t border-[var(--p-border)]'
																		: '',
																].join(' ')}
															>
																<div className="flex items-start gap-3">
																	{item.imageUrl ? (
																		<img
																			src={item.imageUrl}
																			alt=""
																			loading="lazy"
																			decoding="async"
																			className="h-10 w-10 shrink-0 rounded-lg bg-[var(--p-surface)] object-cover ring-1 ring-inset ring-[var(--p-border)]"
																		/>
																	) : (
																		<div
																			aria-hidden="true"
																			className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--p-surface)] text-[var(--p-text-faint)] ring-1 ring-inset ring-[var(--p-border)]"
																		>
																			<Package size={15} />
																		</div>
																	)}
																	<div className="min-w-0 flex-1">
																		<p className="line-clamp-2 text-[13px] font-medium leading-snug text-[var(--p-text)]">
																			{itemName}
																		</p>
																		<p className="mt-1 text-[12px] text-[var(--p-text-muted)]">
																			{categoryLabel} · {unitLabel}
																		</p>
																	</div>
																	<motion.button
																		type="button"
																		onClick={() => remove(item.productId)}
																		className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-error)]"
																		aria-label={t('market.removeItem')}
																		whileTap={
																			shouldReduceMotion
																				? undefined
																				: { scale: 0.92 }
																		}
																	>
																		<Trash2 size={15} strokeWidth={1.7} />
																	</motion.button>
																</div>

																<div className="mt-2.5 flex h-10 items-center overflow-hidden rounded-xl border border-[var(--p-border)] bg-[var(--p-card)]">
																	<motion.button
																		type="button"
																		onClick={() =>
																			updateQuantity(
																				item.productId,
																				item.quantity - 1,
																			)
																		}
																		className="flex h-full w-11 shrink-0 items-center justify-center border-e border-[var(--p-border)] text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
																		aria-label={t('market.decreaseQuantity')}
																		whileTap={
																			shouldReduceMotion
																				? undefined
																				: { scale: 0.94 }
																		}
																	>
																		<Minus size={14} strokeWidth={1.8} />
																	</motion.button>
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
																			style={{
																				fontVariantNumeric: 'tabular-nums',
																			}}
																			aria-label={t('market.quantity')}
																		/>
																		<span className="min-w-0 truncate text-[12px] text-[var(--p-text-muted)]">
																			{unitLabel}
																		</span>
																	</div>
																	<motion.button
																		type="button"
																		onClick={() =>
																			updateQuantity(
																				item.productId,
																				item.quantity + 1,
																			)
																		}
																		className="flex h-full w-11 shrink-0 items-center justify-center border-s border-[var(--p-border)] text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
																		aria-label={t('market.increaseQuantity')}
																		whileTap={
																			shouldReduceMotion
																				? undefined
																				: { scale: 0.94 }
																		}
																	>
																		<Plus size={14} strokeWidth={1.8} />
																	</motion.button>
																</div>
															</motion.div>
														)
													})}
												</AnimatePresence>
											</div>

											<div className="shrink-0 border-t border-[var(--p-border)] px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 md:px-5 md:pb-4">
												<label className="block text-[12px] font-medium text-[var(--p-text-muted)]">
													<span className="mb-1.5 block">
														{t('market.cartNotesLabel')}
													</span>
													<textarea
														value={globalNote}
														onChange={(event) =>
															setGlobalNote(event.currentTarget.value)
														}
														rows={2}
														placeholder={t('market.cartNotesPlaceholder')}
														className="block w-full resize-none rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-3 py-2 text-[13px] leading-5 text-[var(--p-text)] outline-none transition-colors placeholder:text-[var(--p-text-faint)] focus:border-[var(--p-border-strong)]"
													/>
												</label>

												{(submitMutation.isError || saveMutation.isError) && (
													<p className="mt-3 text-[12px] text-[var(--p-error)]">
														{submitMutation.isError
															? submitErrorText
															: t('market.submitError')}
													</p>
												)}

												{isDraftSaved ? (
													<label className="mt-3 block">
														<span className="mb-1.5 block text-[11px] font-medium text-[var(--p-text-muted)]">
															{t('market.draftNameLabel')}
														</span>
														<input
															type="text"
															value={draftName}
															onChange={(event) =>
																setDraftName(event.currentTarget.value)
															}
															onBlur={() => {
																const nextName =
																	draftName.trim() || defaultDraftName
																setDraftName(nextName)
																if (
																	savedDraftId &&
																	nextName !== persistedDraftName
																) {
																	renameMutation.mutate(nextName)
																}
															}}
															maxLength={120}
															aria-label={t('market.draftNameLabel')}
															placeholder={defaultDraftName}
															className="h-11 w-full rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-3 text-center text-[14px] font-semibold text-[var(--p-text)] outline-none transition-colors placeholder:text-[var(--p-text-faint)] focus:border-[var(--p-border-strong)]"
														/>
														<p className="mt-1.5 text-center text-[11px] text-[var(--p-text-faint)]">
															{renameMutation.isPending
																? t('market.draftNameSaving')
																: t('market.draftNameSaved')}
														</p>
													</label>
												) : (
													<motion.button
														type="button"
														onClick={handleSaveDraft}
														disabled={
															submitMutation.isPending || saveMutation.isPending
														}
														className="mt-3 flex h-11 w-full items-center justify-center rounded-xl border border-[var(--p-border)] px-5 text-[14px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)] disabled:pointer-events-none disabled:opacity-70"
														whileTap={
															shouldReduceMotion ||
															submitMutation.isPending ||
															saveMutation.isPending
																? undefined
																: { scale: 0.985 }
														}
													>
														{saveMutation.isPending
															? t('quoteBuilder.savingDraft')
															: t('market.saveDraft')}
													</motion.button>
												)}
												<Link
													to="/orders"
													onClick={onClose}
													className="mt-2 flex h-10 w-full items-center justify-center rounded-xl text-[13px] font-semibold text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
												>
													{t('market.viewSavedOrders')}
												</Link>
												<motion.button
													type="submit"
													disabled={
														submitMutation.isPending || saveMutation.isPending
													}
													className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-[var(--p-accent)] px-5 text-[14px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-70"
													whileTap={
														shouldReduceMotion ||
														submitMutation.isPending ||
														saveMutation.isPending
															? undefined
															: { scale: 0.985 }
													}
												>
													{submitMutation.isPending
														? t('quoteBuilder.submitting')
														: t('market.submitQuote')}
												</motion.button>
											</div>
										</motion.form>
									)}
								</AnimatePresence>
								<DraftProductSearch
									open={searchOpen && open}
									onClose={() => setSearchOpen(false)}
								/>
							</>
						)}
					</motion.aside>
				</>
			)}
		</AnimatePresence>,
		document.body,
	)
}

function DraftQuoteSuccessMessage({
	reference,
	shouldReduceMotion,
}: {
	reference: string
	shouldReduceMotion: boolean | null
}) {
	const { t } = useTranslation('portal')

	return (
		<motion.div
			key="draft-quote-submit-success"
			role="status"
			aria-live="assertive"
			className="flex flex-1 flex-col items-center justify-center px-8 text-center"
			initial={{
				opacity: 0,
				y: shouldReduceMotion ? 0 : 10,
				scale: shouldReduceMotion ? 1 : 0.98,
			}}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -8 }}
			transition={{
				duration: shouldReduceMotion ? 0.01 : 0.22,
				ease: DRAWER_EASE,
			}}
		>
			<motion.div
				className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--p-accent)] text-[var(--p-accent-contrast)]"
				initial={{ scale: shouldReduceMotion ? 1 : 0.82 }}
				animate={{ scale: 1 }}
				transition={{
					duration: shouldReduceMotion ? 0.01 : 0.28,
					ease: DRAWER_EASE,
				}}
			>
				<Check size={30} strokeWidth={1.8} aria-hidden="true" />
			</motion.div>
			<h3
				id="draft-quote-title"
				className="text-[19px] font-semibold text-[var(--p-text)]"
			>
				{t('market.submitSuccessTitle')}
			</h3>
			<p className="mt-3 max-w-[320px] text-[13px] leading-6 text-[var(--p-text-muted)]">
				{t('market.submitSuccessBody', { ref: reference })}
			</p>
			<p className="mt-4 font-mono text-[12px] text-[var(--p-text-muted)]">
				{reference}
			</p>
			<p className="mt-5 text-[11px] text-[var(--p-text-faint)]">
				{t('market.autoClose')}
			</p>
		</motion.div>
	)
}

function DraftProductSearch({
	open,
	onClose,
}: {
	open: boolean
	onClose: () => void
}) {
	const { t, i18n } = useTranslation('portal')
	const shouldReduceMotion = useReducedMotion()
	const isAr = i18n.language === 'ar'
	const add = useDraftQuoteStore((s) => s.add)
	const updateQuantity = useDraftQuoteStore((s) => s.updateQuantity)
	const items = useDraftQuoteStore((s) => s.items)
	const [query, setQuery] = useState('')
	const [debouncedQuery, setDebouncedQuery] = useState('')
	const [editingProductId, setEditingProductId] = useState<string | null>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const sentinelRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!open) return
		const timer = setTimeout(() => setDebouncedQuery(query), 250)
		return () => clearTimeout(timer)
	}, [query, open])

	useEffect(() => {
		if (!open) return
		inputRef.current?.focus()
	}, [open])

	useEffect(() => {
		if (open) return
		setQuery('')
		setDebouncedQuery('')
		setEditingProductId(null)
	}, [open])

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useInfiniteQuery({
			queryKey: ['draft-product-search', debouncedQuery],
			queryFn: async ({ pageParam = 1 }) =>
				getMarketProducts({
					data: {
						search: debouncedQuery || undefined,
						page: pageParam,
						limit: 30,
					},
				}),
			initialPageParam: 1,
			getNextPageParam: (lastPage) => lastPage.nextPage,
			staleTime: 60_000,
			enabled: open,
		})

	const products = useMemo(
		() => data?.pages.flatMap((page) => page.products) ?? [],
		[data],
	)
	const existingQuantities = useMemo(
		() => new Map(items.map((item) => [item.productId, item.quantity])),
		[items],
	)

	useEffect(() => {
		if (!open) return
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
			{ rootMargin: '420px' },
		)
		observer.observe(el)
		return () => observer.disconnect()
	}, [fetchNextPage, hasNextPage, isFetchingNextPage, open])

	function setProductQuantity(product: MarketProduct, quantity: number) {
		if (quantity < 1) return
		if (existingQuantities.has(product.id)) {
			updateQuantity(product.id, quantity)
			setEditingProductId(null)
			return
		}
		add(
			{
				productId: product.id,
				slug: product.slug,
				name: product.name,
				nameAr: product.nameAr,
				category: product.category,
				categoryName: product.categoryName,
				categoryNameAr: product.categoryNameAr,
				unitOfMeasure: product.unitOfMeasure,
				unitOfMeasureAr: product.unitOfMeasureAr,
				imageUrl: product.imageUrl,
			},
			quantity,
		)
		setEditingProductId(null)
	}

	if (typeof document === 'undefined') return null

	return (
		<AnimatePresence>
			{open && (
				<motion.div
					key="draft-product-search"
					role="region"
					aria-label={t('market.addToQuote')}
					className="absolute inset-0 z-10 flex flex-col bg-[var(--p-bg)] will-change-transform"
					initial={{
						opacity: 0,
						x: shouldReduceMotion ? 0 : 24,
					}}
					animate={{ opacity: 1, x: 0 }}
					exit={{
						opacity: 0,
						x: shouldReduceMotion ? 0 : 16,
					}}
					transition={{
						duration: shouldReduceMotion ? 0.01 : 0.22,
						ease: SNAP_EASE,
					}}
				>
					<header className="shrink-0 border-b border-[var(--p-border)] px-4 py-3 md:px-5">
						<div className="flex items-center gap-2">
							<motion.div
								layout
								className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-3 transition-colors focus-within:border-[var(--p-border-strong)]"
							>
								<Search
									size={16}
									strokeWidth={1.8}
									className="shrink-0 text-[var(--p-text-muted)]"
								/>
								<input
									ref={inputRef}
									value={query}
									onChange={(event) => setQuery(event.currentTarget.value)}
									type="search"
									autoComplete="off"
									placeholder={t('market.searchPlaceholder')}
									className="min-w-0 flex-1 bg-transparent text-[16px] text-[var(--p-text)] outline-none placeholder:text-[var(--p-text-faint)]"
								/>
							</motion.div>
							<motion.button
								type="button"
								onClick={onClose}
								className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
								aria-label={t('market.closeCart')}
								whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
							>
								<X size={17} strokeWidth={1.8} />
							</motion.button>
						</div>
					</header>
					<div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
						<AnimatePresence mode="wait" initial={false}>
							{isLoading ? (
								<motion.div
									key="loading"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									className="space-y-2"
								>
									{['a', 'b', 'c', 'd'].map((key) => (
										<div
											key={key}
											className="h-16 animate-pulse rounded-xl bg-[var(--p-border)]"
										/>
									))}
								</motion.div>
							) : products.length === 0 ? (
								<motion.div
									key="empty"
									initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 6 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0 }}
									className="flex min-h-48 items-center justify-center text-center text-[13px] text-[var(--p-text-muted)]"
								>
									{t('empty.market.body')}
								</motion.div>
							) : (
								<motion.div
									key="products"
									initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 6 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0 }}
									className="space-y-2"
								>
									<AnimatePresence initial={false} mode="popLayout">
										{products.map((product) => (
											<ProductQuantitySearchRow
												key={product.id}
												product={product}
												isAr={isAr}
												quantity={existingQuantities.get(product.id) ?? 0}
												editing={editingProductId === product.id}
												onOpenEditor={() => setEditingProductId(product.id)}
												onCancelEditor={() =>
													setEditingProductId((current) =>
														current === product.id ? null : current,
													)
												}
												onSetQuantity={(quantity) =>
													setProductQuantity(product, quantity)
												}
											/>
										))}
									</AnimatePresence>
									<div ref={sentinelRef} aria-hidden="true" className="h-1" />
									{isFetchingNextPage && (
										<motion.p
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											className="py-4 text-center text-[12px] text-[var(--p-text-muted)]"
										>
											{t('market.loadingMore')}
										</motion.p>
									)}
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
