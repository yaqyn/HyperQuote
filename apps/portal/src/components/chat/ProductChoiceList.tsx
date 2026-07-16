import {
	ArrowRight,
	Check,
	CirclePlus,
	PackageSearch,
	Store,
	X,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	type ActionButtonData,
	PORTAL_CHAT_RUN_COMMAND_EVENT,
	type PortalConfirmedActionPayload,
	type ProductChoiceListData,
} from '../../lib/chat-types'
import { toArabicIndic } from '../../lib/localized-digits'

interface ProductChoiceListProps {
	data: ProductChoiceListData
}

export function ProductChoiceList({ data }: ProductChoiceListProps) {
	const { t, i18n } = useTranslation('portal')
	const isArabic = i18n.language === 'ar'
	const shouldReduceMotion = useReducedMotion()
	const [isLeaving, setIsLeaving] = useState(false)
	const total = data.groups.length
	const multipleChoices = total > 1
	const firstGroupKind = data.groups[0]?.choiceKind
	const stepLabel = multipleChoices
		? isArabic
			? `اختيار ${toArabicIndic('1')} من ${toArabicIndic(String(total))}`
			: `Choice 1 of ${total}`
		: firstGroupKind === 'hierarchy'
			? isArabic
				? 'اختار المجموعة'
				: 'Choose the group'
			: isArabic
				? 'اختار المنتج المناسب'
				: 'Choose the right product'
	const itemTransition = shouldReduceMotion
		? { duration: 0 }
		: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const }
	const springTransition = shouldReduceMotion
		? { duration: 0 }
		: { damping: 24, stiffness: 260, type: 'spring' as const }
	const dispatchChoiceAction = (
		action: PortalConfirmedActionPayload,
		message: string,
	) => {
		setIsLeaving(true)
		window.setTimeout(
			() => {
				window.dispatchEvent(
					new CustomEvent(PORTAL_CHAT_RUN_COMMAND_EVENT, {
						detail: {
							action,
							message,
							run: true,
						},
					}),
				)
			},
			shouldReduceMotion ? 0 : 150,
		)
	}

	return (
		<AnimatePresence>
			{isLeaving ? null : (
				<motion.div
					data-product-choice-overlay
					className="fixed inset-0 z-[140] flex items-center justify-center bg-[var(--p-bg)]/40 px-3 py-5 backdrop-blur-[2px] sm:px-5"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={itemTransition}
				>
					<motion.section
						data-product-choice-list
						layout
						className="max-h-[min(82svh,720px)] w-full max-w-[700px] overflow-y-auto rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] px-3 py-3 shadow-[0_28px_90px_rgba(15,23,42,0.22)] sm:px-4 sm:py-4"
						initial={
							shouldReduceMotion
								? { opacity: 1 }
								: { opacity: 0, scale: 0.96, y: 18 }
						}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={
							shouldReduceMotion
								? { opacity: 0 }
								: { opacity: 0, scale: 0.98, y: 10 }
						}
						transition={springTransition}
					>
						<motion.div
							className="mx-auto max-w-[540px] border-b border-[var(--p-rule)] pb-3 text-center"
							initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={itemTransition}
						>
							<motion.span
								className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--p-brand-blue)] text-[var(--p-brand-blue-contrast)] shadow-[0_10px_28px_var(--p-brand-blue-shadow)]"
								initial={shouldReduceMotion ? false : { scale: 0.82 }}
								animate={{ scale: 1 }}
								transition={springTransition}
							>
								<PackageSearch size={15} strokeWidth={1.8} />
							</motion.span>
							<p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--p-text-muted)]">
								{stepLabel}
							</p>
							<h3 className="mt-1 text-[16px] font-semibold text-[var(--p-text)]">
								{data.title}
							</h3>
							<p className="mx-auto mt-1 max-w-[440px] text-[12px] leading-5 text-[var(--p-text-muted)]">
								{data.description}
							</p>
						</motion.div>

						<div className="mt-3 grid gap-3">
							{data.groups.map((group, groupIndex) => (
								<motion.div
									key={group.pendingChoiceId}
									layout
									className="rounded-xl border border-[var(--p-rule)] bg-[var(--p-surface-subtle)] px-2.5 py-2.5 sm:px-3 sm:py-3"
									initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{
										...itemTransition,
										delay: shouldReduceMotion ? 0 : 0.04 * groupIndex,
									}}
								>
									<div className="min-w-0 text-center sm:text-start">
										<div className="min-w-0">
											<p className="text-[12px] font-semibold text-[var(--p-text)]">
												{group.choiceKind === 'hierarchy'
													? isArabic
														? `نبدأ منين في ${group.query}؟`
														: `Where should we start under ${group.query}?`
													: isArabic
														? `أي نوع ${group.query} تحب؟`
														: `Which ${group.query} should I add?`}
											</p>
											<p className="mt-1 text-[11px] leading-4 text-[var(--p-text-muted)]">
												{group.choiceKind === 'hierarchy'
													? isArabic
														? 'اختار مجموعة، وبعدها هاعرض المنتجات النهائية.'
														: 'Pick a group, then I will show the final products.'
													: group.quantityRequired
														? isArabic
															? 'اضغط إضافة على المنتج المناسب، ثم اكتب الكمية.'
															: 'Tap Add on the right product, then enter the quantity.'
														: isArabic
															? `سأستخدم الكمية التي كتبتها: ${toArabicIndic(String(group.quantity))}.`
															: `I will use the quantity you gave: ${group.quantity}.`}
											</p>
										</div>
									</div>
									<div className="mt-3 grid gap-2">
										{group.options.map((option, optionIndex) => {
											const name = isArabic
												? (option.nameAr ?? option.name)
												: option.name
											const unit = isArabic
												? (option.unitAr ?? option.unit)
												: option.unit
											const subtitle = [
												option.category,
												option.subcategory,
												unit,
												option.priceRange,
											]
												.filter(Boolean)
												.join(' · ')
											return (
												<motion.div
													key={option.productId}
													layout
													className="grid min-w-0 grid-cols-1 gap-3 border border-[var(--p-rule)] bg-[var(--p-card)] px-3 py-3 transition-colors hover:border-[var(--p-border-strong)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
													initial={
														shouldReduceMotion ? false : { opacity: 0, y: 8 }
													}
													animate={{ opacity: 1, y: 0 }}
													transition={{
														...itemTransition,
														delay: shouldReduceMotion
															? 0
															: 0.06 + 0.04 * optionIndex,
													}}
													whileHover={
														shouldReduceMotion ? undefined : { y: -1 }
													}
												>
													<div className="min-w-0">
														{group.choiceKind !== 'hierarchy' ? (
															<ProductEffectLabel
																currentQuantity={option.currentQuantity}
																effect={option.effect}
																isArabic={isArabic}
															/>
														) : null}
														<p className="break-words text-[13px] font-semibold text-[var(--p-text)]">
															{name}
														</p>
														<p className="mt-1 break-words text-[11px] leading-4 text-[var(--p-text-muted)]">
															{subtitle}
														</p>
													</div>
													<ProductChoiceButton
														action={option.action}
														defaultQuantity={group.quantity}
														effect={option.effect}
														groupId={group.pendingChoiceId}
														label={
															group.choiceKind === 'hierarchy'
																? isArabic
																	? `افتح ${name}`
																	: `Open ${name}`
																: multipleChoices
																	? isArabic
																		? `التالي: ${name}`
																		: `Next: ${name}`
																	: option.effect === 'increase'
																		? isArabic
																			? `زوّد ${name}`
																			: `Add more ${name}`
																		: isArabic
																			? `أضف ${name}`
																			: `Add ${name}`
														}
														quantityRequired={Boolean(group.quantityRequired)}
														quantityText={String(group.quantity)}
														quantityLabel={t('quoteBuilder.quantityFor', {
															name: group.query,
														})}
														onConfirm={dispatchChoiceAction}
														shouldReduceMotion={shouldReduceMotion}
													/>
												</motion.div>
											)
										})}
									</div>
								</motion.div>
							))}
						</div>
					</motion.section>
				</motion.div>
			)}
		</AnimatePresence>
	)
}

function ProductEffectLabel({
	currentQuantity,
	effect,
	isArabic,
}: {
	currentQuantity: number | undefined
	effect: 'increase' | 'new_line' | undefined
	isArabic: boolean
}) {
	if (effect === 'increase') {
		return (
			<span className="mb-1.5 inline-flex items-center gap-1 rounded-md bg-emerald-500/12 px-1.5 py-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-emerald-700 dark:text-emerald-200">
				<CirclePlus size={11} />
				{isArabic
					? `زيادة على الموجود${currentQuantity ? ` · ${currentQuantity}` : ''}`
					: `Add to existing${currentQuantity ? ` · ${currentQuantity}` : ''}`}
			</span>
		)
	}
	return (
		<span className="mb-1.5 inline-flex items-center gap-1 rounded-md bg-blue-500/12 px-1.5 py-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-blue-700 dark:text-blue-200">
			<Store size={11} />
			{isArabic ? 'بند جديد من السوق' : 'New market item'}
		</span>
	)
}

function ProductChoiceButton({
	action,
	defaultQuantity,
	effect,
	groupId,
	label,
	quantityLabel,
	quantityRequired,
	quantityText,
	onConfirm,
	shouldReduceMotion,
}: {
	action: ActionButtonData
	defaultQuantity: number
	effect: 'increase' | 'new_line' | undefined
	groupId: string
	label: string
	quantityLabel: string
	quantityRequired: boolean
	quantityText: string
	onConfirm: (action: PortalConfirmedActionPayload, message: string) => void
	shouldReduceMotion: boolean | null
}) {
	const [isEditingQuantity, setIsEditingQuantity] = useState(false)
	const [draftQuantity, setDraftQuantity] = useState(
		defaultQuantity > 0 ? String(defaultQuantity) : '',
	)
	const [quantityError, setQuantityError] = useState(false)
	const inputRef = useRef<HTMLInputElement | null>(null)
	const buttonQuantity = Number.parseFloat(quantityText)
	const validButtonQuantity =
		Number.isFinite(buttonQuantity) && buttonQuantity > 0
	const editableQuantity = Number.parseFloat(draftQuantity)
	const validEditableQuantity =
		Number.isFinite(editableQuantity) && editableQuantity > 0

	const focusQuantityInput = useCallback(() => {
		inputRef.current?.focus()
		inputRef.current?.select()
	}, [])
	const setQuantityInputRef = useCallback(
		(node: HTMLInputElement | null) => {
			inputRef.current = node
			if (!node) return
			focusQuantityInput()
			window.requestAnimationFrame(focusQuantityInput)
			window.setTimeout(focusQuantityInput, 80)
			window.setTimeout(focusQuantityInput, 180)
		},
		[focusQuantityInput],
	)

	useLayoutEffect(() => {
		if (!isEditingQuantity) return
		const handle = window.requestAnimationFrame(focusQuantityInput)
		const timeout = window.setTimeout(focusQuantityInput, 80)
		const lateTimeout = window.setTimeout(focusQuantityInput, 180)
		return () => {
			window.cancelAnimationFrame(handle)
			window.clearTimeout(timeout)
			window.clearTimeout(lateTimeout)
		}
	}, [focusQuantityInput, isEditingQuantity])

	const dispatchConfirmedAction = (quantity: number) => {
		const confirmedAction = actionWithQuantity(action.action, groupId, quantity)
		if (!confirmedAction) return
		onConfirm(confirmedAction, label)
	}

	const cancelQuantityEditor = () => {
		setIsEditingQuantity(false)
		setDraftQuantity(defaultQuantity > 0 ? String(defaultQuantity) : '')
		setQuantityError(false)
	}

	const commitQuantity = () => {
		if (draftQuantity.trim() === '0') {
			cancelQuantityEditor()
			return
		}
		if (!validEditableQuantity) {
			setQuantityError(true)
			return
		}
		dispatchConfirmedAction(editableQuantity)
	}

	if (quantityRequired && isEditingQuantity) {
		return (
			<AnimatePresence mode="wait" initial={false}>
				<motion.form
					key="quantity-editor"
					layout
					onSubmit={(event) => {
						event.preventDefault()
						commitQuantity()
					}}
					className={[
						'grid min-h-11 grid-cols-[minmax(0,1fr)_44px] overflow-hidden rounded-xl border bg-[var(--p-card)] sm:w-[176px]',
						quantityError
							? 'border-[var(--color-danger)]'
							: effect === 'increase'
								? 'border-emerald-500'
								: 'border-[var(--p-brand-blue)]',
					].join(' ')}
					initial={
						shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.92 }
					}
					animate={{ opacity: 1, scale: 1 }}
					exit={
						shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }
					}
					transition={
						shouldReduceMotion
							? { duration: 0 }
							: { damping: 22, stiffness: 280, type: 'spring' }
					}
				>
					<input
						ref={setQuantityInputRef}
						type="text"
						inputMode="decimal"
						value={draftQuantity}
						onChange={(event) => {
							const value = event.currentTarget.value
							if (value.trim() === '0') {
								cancelQuantityEditor()
								return
							}
							setDraftQuantity(value.replace(/[^\d.,]/g, '').replace(',', '.'))
							setQuantityError(false)
						}}
						onFocus={(event) => event.currentTarget.select()}
						onKeyDown={(event) => {
							if (event.key === 'Escape') {
								event.preventDefault()
								cancelQuantityEditor()
							}
						}}
						className="h-11 min-w-0 bg-transparent px-3 text-center font-mono text-[15px] font-semibold text-[var(--p-text)] outline-none [appearance:textfield] placeholder:text-[var(--p-text-faint)]"
						aria-label={quantityLabel}
					/>
					<motion.button
						type="submit"
						className={[
							'flex h-11 items-center justify-center text-white transition-colors',
							effect === 'increase'
								? 'bg-emerald-600 hover:bg-emerald-700'
								: 'bg-[var(--p-brand-blue)] hover:bg-[var(--p-brand-blue-hover)]',
						].join(' ')}
						aria-label={validEditableQuantity ? label : 'Cancel'}
						whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
					>
						<AnimatePresence mode="wait" initial={false}>
							<motion.span
								key={validEditableQuantity ? 'check' : 'cancel'}
								initial={
									shouldReduceMotion ? false : { opacity: 0, scale: 0.7 }
								}
								animate={{ opacity: 1, scale: 1 }}
								exit={
									shouldReduceMotion ? undefined : { opacity: 0, scale: 0.7 }
								}
								transition={{ duration: shouldReduceMotion ? 0 : 0.12 }}
							>
								{validEditableQuantity ? (
									<Check size={15} strokeWidth={2} />
								) : (
									<X size={15} strokeWidth={2} />
								)}
							</motion.span>
						</AnimatePresence>
					</motion.button>
				</motion.form>
			</AnimatePresence>
		)
	}

	const confirmedAction = validButtonQuantity
		? actionWithQuantity(action.action, groupId, buttonQuantity)
		: null

	return (
		<AnimatePresence mode="wait" initial={false}>
			<motion.button
				key="choice-button"
				type="button"
				disabled={!quantityRequired && !confirmedAction}
				onClick={() => {
					if (quantityRequired) {
						setDraftQuantity(String(defaultQuantity))
						setQuantityError(false)
						setIsEditingQuantity(true)
						return
					}
					if (!confirmedAction) return
					dispatchConfirmedAction(buttonQuantity)
				}}
				className={[
					'inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl px-3 text-[12px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[132px]',
					effect === 'increase'
						? 'bg-emerald-600 hover:bg-emerald-700'
						: 'bg-[var(--p-brand-blue)] hover:bg-[var(--p-brand-blue-hover)]',
				].join(' ')}
				layout
				initial={
					shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.92 }
				}
				animate={{ opacity: 1, scale: 1 }}
				exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { damping: 22, stiffness: 280, type: 'spring' }
				}
				whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
				whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
			>
				{effect === 'increase' ? (
					<CirclePlus size={14} strokeWidth={2} />
				) : (
					<Store size={14} strokeWidth={2} />
				)}
				<span className="truncate">{label}</span>
				<ArrowRight size={13} strokeWidth={2} />
			</motion.button>
		</AnimatePresence>
	)
}

function actionWithQuantity(
	action: ActionButtonData['action'],
	groupId: string,
	quantity: number,
): PortalConfirmedActionPayload | null {
	if (!action) return null
	return {
		...action,
		draftLines: action.draftLines?.map((line) =>
			line.pendingChoiceId === groupId ? { ...line, quantity } : line,
		),
	}
}
