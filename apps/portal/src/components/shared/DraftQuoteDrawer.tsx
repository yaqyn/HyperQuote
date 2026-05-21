import { useInfiniteQuery, useMutation } from '@tanstack/react-query'
import {
	Check,
	FilePenLine,
	FileText,
	Package,
	PanelRightClose,
	Plus,
	Save,
	Search,
	StickyNote,
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
import { SavedDraftsPanel } from './SavedDraftsPanel'

type DraftQuoteDrawerProps = {
	open: boolean
	onClose: () => void
}

const DRAWER_EASE = cubicBezier(0.22, 1, 0.36, 1)
const SNAP_EASE = cubicBezier(0.16, 1, 0.3, 1)

function getDraftFingerprint(items: DraftCartItem[], globalNote: string) {
	return JSON.stringify({
		globalNote: globalNote.trim(),
		items: items
			.filter((item) => item.quantity > 0)
			.map((item, index) => ({
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

function drawerRevealMotion(shouldReduceMotion: boolean | null) {
	return {
		animate: { opacity: 1, y: 0 },
		exit: { opacity: 0, y: shouldReduceMotion ? 0 : -4 },
		initial: { opacity: 0, y: shouldReduceMotion ? 0 : 4 },
		transition: {
			duration: shouldReduceMotion ? 0.01 : 0.14,
			ease: SNAP_EASE,
		},
	}
}

function drawerNotesMotion(shouldReduceMotion: boolean | null) {
	return {
		animate: { maxHeight: 112 },
		exit: { maxHeight: 0 },
		initial: { maxHeight: 0 },
		transition: {
			duration: shouldReduceMotion ? 0.01 : 0.2,
			ease: SNAP_EASE,
		},
	}
}

function useDelayedVisibility(visible: boolean, delayMs = 160) {
	const [ready, setReady] = useState(false)

	useEffect(() => {
		if (!visible) {
			setReady(false)
			return
		}
		const timeout = window.setTimeout(() => setReady(true), delayMs)
		return () => window.clearTimeout(timeout)
	}, [delayMs, visible])

	return visible && ready
}

function getDefaultDraftName(baseName: string, isArabic: boolean) {
	const date = new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-GB', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	}).format(new Date())
	return `${baseName} ${date}`
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
	const defaultDraftName = getDefaultDraftName(
		t('market.defaultDraftName'),
		isAr,
	)
	const [draftName, setDraftName] = useState('')
	const [persistedDraftName, setPersistedDraftName] = useState(defaultDraftName)
	const [draftNameEntryOpen, setDraftNameEntryOpen] = useState(false)
	const [notesOpen, setNotesOpen] = useState(false)
	const [savedOrdersOpen, setSavedOrdersOpen] = useState(false)
	const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false)
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
		quoteRequestItems.length > 0 && savedDraftFingerprint === draftFingerprint

	const submitMutation = useMutation({
		mutationFn: () =>
			submitQuoteRequest({
				data: {
					draftId: savedDraftId ?? undefined,
					items: quoteRequestItems,
					name: draftName.trim() || persistedDraftName || defaultDraftName,
					notes: globalNote.trim() || undefined,
					idempotencyKey: crypto.randomUUID(),
				},
			}),
		onSuccess: (result) => {
			clear()
			setSubmitConfirmOpen(false)
			setSubmittedReference(result.reference)
			setSavedDraftFingerprint(null)
			setSavedDraftId(null)
			toast.success(t('market.submitSuccessToast', { ref: result.reference }))
		},
	})

	const saveMutation = useMutation({
		mutationFn: (name: string) =>
			saveDraft({
				data: {
					draftId: savedDraftId ?? undefined,
					items: quoteRequestItems,
					name,
					notes: globalNote.trim() || undefined,
				},
			}),
		onSuccess: (result, nextName) => {
			setDraftName(nextName)
			setPersistedDraftName(nextName)
			setDraftNameEntryOpen(false)
			setSavedDraftId(result.draftId)
			setSavedDraftFingerprint(draftFingerprint)
			toast.success(t('market.draftSavedToast', { ref: result.reference }))
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
		setSavedOrdersOpen(false)
		setDraftNameEntryOpen(false)
		setNotesOpen(false)
		setSubmitConfirmOpen(false)
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

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (
			quoteRequestItems.length === 0 ||
			submitMutation.isPending ||
			saveMutation.isPending
		) {
			return
		}
		setSubmitConfirmOpen(true)
	}

	function handleConfirmSubmit() {
		if (
			quoteRequestItems.length === 0 ||
			submitMutation.isPending ||
			saveMutation.isPending
		) {
			return
		}
		setSubmitConfirmOpen(false)
		submitMutation.mutate()
	}

	function handleConfirmSaveDraft() {
		if (
			quoteRequestItems.length === 0 ||
			submitMutation.isPending ||
			saveMutation.isPending ||
			isDraftSaved
		) {
			return
		}
		setSubmitConfirmOpen(false)
		saveMutation.mutate(draftName.trim() || defaultDraftName)
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
											<button
												type="button"
												onClick={() => setSavedOrdersOpen(true)}
												className="mt-5 flex h-10 min-w-40 items-center justify-center rounded-xl border border-[var(--p-border)] px-4 text-[13px] font-semibold text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
											>
												{t('market.viewSavedOrders')}
											</button>
										</motion.div>
									) : (
										<motion.form
											key="items"
											onSubmit={handleSubmit}
											{...contentMotion}
											className="flex min-h-0 flex-1 flex-col"
										>
											<div className="flex-1 overflow-y-auto">
												<AnimatePresence initial={false}>
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
																key={item.productId}
																initial={{
																	opacity: 0,
																	y: shouldReduceMotion ? 0 : 4,
																}}
																animate={{ opacity: 1, y: 0 }}
																exit={{
																	opacity: 0,
																	x: shouldReduceMotion ? 0 : -8,
																}}
																transition={{
																	duration: shouldReduceMotion ? 0.01 : 0.14,
																	ease: SNAP_EASE,
																}}
																className={[
																	'overflow-hidden px-4 py-3 md:px-5',
																	index > 0
																		? 'border-t border-[var(--p-border)]'
																		: '',
																].join(' ')}
															>
																<div className="flex min-w-0 items-center gap-3">
																	{item.imageUrl ? (
																		<img
																			src={item.imageUrl}
																			alt=""
																			loading="lazy"
																			decoding="async"
																			className="h-11 w-11 shrink-0 rounded-lg bg-[var(--p-surface)] object-cover ring-1 ring-inset ring-[var(--p-border)]"
																		/>
																	) : (
																		<div
																			aria-hidden="true"
																			className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--p-surface)] text-[var(--p-text-faint)] ring-1 ring-inset ring-[var(--p-border)]"
																		>
																			<Package size={15} />
																		</div>
																	)}
																	<div className="min-w-0 flex-1">
																		<p className="truncate text-[13px] font-medium leading-snug text-[var(--p-text)]">
																			{itemName}
																		</p>
																		<p className="mt-1 truncate text-[11px] text-[var(--p-text-muted)]">
																			{categoryLabel}
																		</p>
																	</div>
																	<label className="flex h-10 w-[144px] shrink-0 items-center justify-end gap-2 px-1">
																		<span className="sr-only">
																			{t('market.quantity')}
																		</span>
																		<input
																			type="number"
																			inputMode="numeric"
																			min={0}
																			value={item.quantity}
																			onKeyDown={(event) => {
																				if (
																					item.quantity !== 0 ||
																					!/^\d$/.test(event.key)
																				) {
																					return
																				}
																				event.preventDefault()
																				updateQuantity(
																					item.productId,
																					Number(event.key),
																				)
																			}}
																			onPaste={(event) => {
																				if (item.quantity !== 0) return
																				const pastedValue = event.clipboardData
																					.getData('text')
																					.trim()
																				if (!/^\d+$/.test(pastedValue)) return
																				event.preventDefault()
																				updateQuantity(
																					item.productId,
																					Number.parseInt(pastedValue, 10),
																				)
																			}}
																			onChange={(event) => {
																				const rawValue =
																					event.currentTarget.value.trim()
																				if (rawValue === '') {
																					updateQuantity(item.productId, 0)
																					return
																				}
																				const next = Number.parseInt(
																					rawValue,
																					10,
																				)
																				if (
																					Number.isFinite(next) &&
																					next >= 0
																				) {
																					updateQuantity(item.productId, next)
																				}
																			}}
																			className="h-full min-w-0 flex-1 bg-transparent text-end font-mono text-[15px] font-semibold text-[var(--p-text)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
																			style={{
																				fontVariantNumeric: 'tabular-nums',
																			}}
																		/>
																		<span className="min-w-0 truncate text-[12px] text-[var(--p-text-muted)]">
																			{unitLabel}
																		</span>
																	</label>
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
																		<X size={15} strokeWidth={1.8} />
																	</motion.button>
																</div>
															</motion.div>
														)
													})}
												</AnimatePresence>
											</div>

											<div className="relative shrink-0 border-t border-[var(--p-border)] px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-5 md:px-5 md:pb-4">
												<motion.button
													type="button"
													onClick={() => setNotesOpen((value) => !value)}
													className={`absolute -top-5 end-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border bg-[var(--p-card)] shadow-sm transition-colors md:end-5 ${
														notesOpen
															? 'border-[var(--p-accent)] text-[var(--p-accent)]'
															: 'border-[var(--p-border)] text-[var(--p-text-muted)] hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]'
													}`}
													aria-label={t('market.cartNotesLabel')}
													aria-expanded={notesOpen}
													aria-pressed={notesOpen}
													whileTap={
														shouldReduceMotion ? undefined : { scale: 0.94 }
													}
												>
													<StickyNote size={17} strokeWidth={1.8} />
												</motion.button>
												<AnimatePresence initial={false}>
													{notesOpen && (
														<motion.div
															key="cart-notes"
															className="overflow-hidden"
															{...drawerNotesMotion(shouldReduceMotion)}
														>
															<div className="overflow-hidden">
																<label className="block pb-2">
																	<span className="sr-only">
																		{t('market.cartNotesLabel')}
																	</span>
																	<textarea
																		value={globalNote}
																		onChange={(event) =>
																			setGlobalNote(event.currentTarget.value)
																		}
																		rows={3}
																		placeholder={t(
																			'market.cartNotesPlaceholder',
																		)}
																		className="block max-h-32 min-h-20 w-full resize-none rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-3 py-2 text-[13px] leading-5 text-[var(--p-text)] outline-none transition-colors placeholder:text-[var(--p-text-faint)] focus:border-[var(--p-border-strong)]"
																	/>
																</label>
															</div>
														</motion.div>
													)}
												</AnimatePresence>

												{(submitMutation.isError || saveMutation.isError) && (
													<p className="mt-3 text-[12px] text-[var(--p-error)]">
														{submitMutation.isError
															? submitErrorText
															: t('market.submitError')}
													</p>
												)}

												<AnimatePresence initial={false}>
													{submitConfirmOpen && (
														<motion.div
															key="submit-confirm"
															className="mt-3 overflow-hidden rounded-xl border border-[var(--p-border-strong)] bg-[var(--p-card)] p-3"
															{...drawerRevealMotion(shouldReduceMotion)}
														>
															<p className="text-[13px] font-semibold text-[var(--p-text)]">
																{t('market.confirmSubmitTitle')}
															</p>
															<p className="mt-1 text-[12px] leading-5 text-[var(--p-text-muted)]">
																{t('market.confirmSubmitBody')}
															</p>
															<div className="mt-3 grid grid-cols-2 gap-2">
																<motion.button
																	type="button"
																	onClick={() => setSubmitConfirmOpen(false)}
																	className="flex h-9 items-center justify-center rounded-lg border border-[var(--p-border)] text-[12px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)]"
																	whileTap={
																		shouldReduceMotion
																			? undefined
																			: { scale: 0.98 }
																	}
																>
																	{t('orders.cancel')}
																</motion.button>
																<motion.button
																	type="button"
																	onClick={handleConfirmSubmit}
																	className="flex h-9 items-center justify-center rounded-lg bg-[var(--p-accent)] text-[12px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90"
																	whileTap={
																		shouldReduceMotion
																			? undefined
																			: { scale: 0.98 }
																	}
																>
																	{t('market.confirmSubmitAction')}
																</motion.button>
															</div>
														</motion.div>
													)}
												</AnimatePresence>

												<AnimatePresence initial={false}>
													{draftNameEntryOpen && !isDraftSaved && (
														<motion.div
															key="draft-name-entry"
															className="mt-2 flex items-center gap-2 overflow-hidden"
															{...drawerRevealMotion(shouldReduceMotion)}
														>
															<input
																type="text"
																value={draftName}
																onChange={(event) =>
																	setDraftName(event.currentTarget.value)
																}
																onKeyDown={(event) => {
																	if (event.key === 'Enter') {
																		event.preventDefault()
																		handleConfirmSaveDraft()
																	}
																}}
																maxLength={120}
																aria-label={t('market.draftNameLabel')}
																placeholder={defaultDraftName}
																className="h-10 min-w-0 flex-1 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-3 text-[13px] font-semibold text-[var(--p-text)] outline-none transition-colors placeholder:text-[var(--p-text-faint)] focus:border-[var(--p-border-strong)]"
															/>
														</motion.div>
													)}
												</AnimatePresence>

												<div className="mt-3 grid grid-cols-[minmax(0,1fr)_2.75rem_2.75rem] gap-2">
													<motion.button
														type="submit"
														disabled={
															quoteRequestItems.length === 0 ||
															submitMutation.isPending ||
															saveMutation.isPending
														}
														className="flex h-11 min-w-0 items-center justify-center rounded-xl bg-[var(--p-accent)] px-4 text-[14px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-70"
														whileTap={
															shouldReduceMotion ||
															submitMutation.isPending ||
															saveMutation.isPending
																? undefined
																: { scale: 0.985 }
														}
													>
														<span className="truncate">
															{submitMutation.isPending
																? t('quoteBuilder.submitting')
																: t('market.submitQuote')}
														</span>
													</motion.button>
													<motion.button
														type="button"
														onClick={() => setSavedOrdersOpen(true)}
														className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--p-border)] text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
														aria-label={t('market.viewSavedOrders')}
														whileTap={
															shouldReduceMotion ? undefined : { scale: 0.94 }
														}
													>
														<FileText size={17} strokeWidth={1.8} />
													</motion.button>
													<motion.button
														type="button"
														onClick={() => {
															if (isDraftSaved) return
															if (draftNameEntryOpen) {
																handleConfirmSaveDraft()
																return
															}
															setDraftName(
																savedDraftId ? persistedDraftName : '',
															)
															setDraftNameEntryOpen(true)
														}}
														disabled={
															submitMutation.isPending ||
															saveMutation.isPending ||
															quoteRequestItems.length === 0 ||
															isDraftSaved
														}
														title={
															isDraftSaved ? persistedDraftName : undefined
														}
														className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors disabled:pointer-events-none ${
															draftNameEntryOpen && !isDraftSaved
																? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500'
																: 'border-[var(--p-border)] text-[var(--p-text-muted)] hover:bg-[var(--p-hover)] hover:text-[var(--p-text)] disabled:bg-[var(--p-surface)] disabled:text-[var(--p-text-faint)] disabled:opacity-60'
														}`}
														aria-label={
															isDraftSaved
																? persistedDraftName
																: t('market.saveDraft')
														}
														whileTap={
															shouldReduceMotion ||
															submitMutation.isPending ||
															saveMutation.isPending ||
															isDraftSaved
																? undefined
																: { scale: 0.94 }
														}
													>
														{saveMutation.isPending ? (
															<span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
														) : (
															<Save size={17} strokeWidth={1.8} />
														)}
													</motion.button>
												</div>
											</div>
										</motion.form>
									)}
								</AnimatePresence>
								<DraftProductSearch
									open={searchOpen && open}
									onClose={() => setSearchOpen(false)}
								/>
								<AnimatePresence>
									{savedOrdersOpen && (
										<motion.div
											key="saved-drafts-panel"
											className="absolute inset-0 z-20 flex min-h-0 bg-[var(--p-bg)]"
											initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 18 }}
											animate={{ opacity: 1, x: 0 }}
											exit={{ opacity: 0, x: shouldReduceMotion ? 0 : 12 }}
											transition={{
												duration: shouldReduceMotion ? 0.01 : 0.2,
												ease: SNAP_EASE,
											}}
										>
											<SavedDraftsPanel
												actionMode="add"
												className="w-full"
												onAdded={() => setSavedOrdersOpen(false)}
												headerAction={
													<motion.button
														type="button"
														onClick={() => setSavedOrdersOpen(false)}
														className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
														aria-label={t('market.closeCart')}
														whileTap={
															shouldReduceMotion ? undefined : { scale: 0.94 }
														}
													>
														<X size={17} strokeWidth={1.8} />
													</motion.button>
												}
											/>
										</motion.div>
									)}
								</AnimatePresence>
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
	const showProductLoading = useDelayedVisibility(isLoading)
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
							<motion.div className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-3 transition-colors focus-within:border-[var(--p-border-strong)]">
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
									className="flex min-h-48 items-center justify-center"
								>
									{showProductLoading && (
										<div className="flex items-center gap-2 text-[12px] font-medium text-[var(--p-text-muted)]">
											<span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--p-border)] border-t-[var(--p-accent)]" />
											<span>{t('common.loading', 'Loading...')}</span>
										</div>
									)}
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
									<AnimatePresence initial={false}>
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
