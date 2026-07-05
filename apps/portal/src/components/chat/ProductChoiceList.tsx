import { ArrowRight, Check, PackageSearch, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from 'react-aria-components/Button'
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
	const total = data.groups.length
	const multipleChoices = total > 1
	const stepLabel = multipleChoices
		? isArabic
			? `اختيار ${toArabicIndic('1')} من ${toArabicIndic(String(total))}`
			: `Choice 1 of ${total}`
		: isArabic
			? 'اختار المنتج المناسب'
			: 'Choose the right product'

	return (
		<section
			data-product-choice-list
			className="mx-auto mt-3 w-full max-w-[700px] rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] px-3 py-3 shadow-[0_18px_55px_rgba(15,23,42,0.10)] max-lg:fixed max-lg:inset-x-3 max-lg:bottom-3 max-lg:z-[120] max-lg:mt-0 max-lg:max-h-[56svh] max-lg:overflow-y-auto max-lg:px-3 max-lg:pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-4 sm:py-4 lg:rounded-2xl"
		>
			<div className="mx-auto max-w-[540px] border-b border-[var(--p-rule)] pb-3 text-center">
				<span className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--p-brand-blue)] text-[var(--p-brand-blue-contrast)] shadow-[0_10px_28px_var(--p-brand-blue-shadow)]">
					<PackageSearch size={15} strokeWidth={1.8} />
				</span>
				<p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--p-text-muted)]">
					{stepLabel}
				</p>
				<h3 className="mt-1 text-[16px] font-semibold text-[var(--p-text)]">
					{data.title}
				</h3>
				<p className="mx-auto mt-1 max-w-[440px] text-[12px] leading-5 text-[var(--p-text-muted)]">
					{data.description}
				</p>
			</div>

			<div className="mt-3 grid gap-3">
				{data.groups.map((group) => (
					<div
						key={group.pendingChoiceId}
						className="rounded-xl border border-[var(--p-rule)] bg-[var(--p-surface-subtle)] px-2.5 py-2.5 sm:px-3 sm:py-3"
					>
						<div className="min-w-0 text-center sm:text-start">
							<div className="min-w-0">
								<p className="text-[12px] font-semibold text-[var(--p-text)]">
									{isArabic
										? `أي نوع ${group.query} تحب؟`
										: `Which ${group.query} should I add?`}
								</p>
								<p className="mt-1 text-[11px] leading-4 text-[var(--p-text-muted)]">
									{group.quantityRequired
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
							{group.options.map((option) => {
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
									<div
										key={option.productId}
										className="grid min-w-0 grid-cols-1 gap-3 border border-[var(--p-rule)] bg-[var(--p-card)] px-3 py-3 transition-colors hover:border-[var(--p-border-strong)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
									>
										<div className="min-w-0">
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
											groupId={group.pendingChoiceId}
											label={
												multipleChoices
													? isArabic
														? `التالي: ${name}`
														: `Next: ${name}`
													: isArabic
														? `أضف ${name}`
														: `Add ${name}`
											}
											quantityRequired={Boolean(group.quantityRequired)}
											quantityText={String(group.quantity)}
											quantityLabel={t('quoteBuilder.quantityFor', {
												name: group.query,
											})}
										/>
									</div>
								)
							})}
						</div>
					</div>
				))}
			</div>
		</section>
	)
}

function ProductChoiceButton({
	action,
	defaultQuantity,
	groupId,
	label,
	quantityLabel,
	quantityRequired,
	quantityText,
}: {
	action: ActionButtonData
	defaultQuantity: number
	groupId: string
	label: string
	quantityLabel: string
	quantityRequired: boolean
	quantityText: string
}) {
	const [isEditingQuantity, setIsEditingQuantity] = useState(false)
	const [draftQuantity, setDraftQuantity] = useState(String(defaultQuantity))
	const [quantityError, setQuantityError] = useState(false)
	const inputRef = useRef<HTMLInputElement | null>(null)
	const buttonQuantity = Number.parseFloat(quantityText)
	const validButtonQuantity =
		Number.isFinite(buttonQuantity) && buttonQuantity > 0
	const editableQuantity = Number.parseFloat(draftQuantity)
	const validEditableQuantity =
		Number.isFinite(editableQuantity) && editableQuantity > 0

	useEffect(() => {
		if (!isEditingQuantity) return
		const handle = window.requestAnimationFrame(() => {
			inputRef.current?.focus()
			inputRef.current?.select()
		})
		return () => window.cancelAnimationFrame(handle)
	}, [isEditingQuantity])

	const dispatchConfirmedAction = (quantity: number) => {
		const confirmedAction = actionWithQuantity(action.action, groupId, quantity)
		if (!confirmedAction) return
		window.dispatchEvent(
			new CustomEvent(PORTAL_CHAT_RUN_COMMAND_EVENT, {
				detail: {
					action: confirmedAction,
					message: label,
					run: true,
				},
			}),
		)
	}

	const cancelQuantityEditor = () => {
		setIsEditingQuantity(false)
		setDraftQuantity(String(defaultQuantity))
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
			<form
				onSubmit={(event) => {
					event.preventDefault()
					commitQuantity()
				}}
				className={[
					'grid min-h-11 grid-cols-[minmax(0,1fr)_44px] overflow-hidden rounded-xl border bg-[var(--p-card)] sm:w-[176px]',
					quantityError
						? 'border-[var(--color-danger)]'
						: 'border-[var(--p-brand-blue)]',
				].join(' ')}
			>
				<input
					ref={inputRef}
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
				<Button
					type="submit"
					className="flex h-11 items-center justify-center bg-[var(--p-brand-blue)] text-[var(--p-brand-blue-contrast)] transition-opacity hover:bg-[var(--p-brand-blue-hover)]"
					aria-label={validEditableQuantity ? label : 'Cancel'}
				>
					{validEditableQuantity ? (
						<Check size={15} strokeWidth={2} />
					) : (
						<X size={15} strokeWidth={2} />
					)}
				</Button>
			</form>
		)
	}

	const confirmedAction = validButtonQuantity
		? actionWithQuantity(action.action, groupId, buttonQuantity)
		: null

	return (
		<Button
			isDisabled={!quantityRequired && !confirmedAction}
			onPress={() => {
				if (quantityRequired) {
					setDraftQuantity(String(defaultQuantity))
					setQuantityError(false)
					setIsEditingQuantity(true)
					return
				}
				if (!confirmedAction) return
				dispatchConfirmedAction(buttonQuantity)
			}}
			className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl bg-[var(--p-brand-blue)] px-3 text-[12px] font-semibold text-[var(--p-brand-blue-contrast)] transition-colors hover:bg-[var(--p-brand-blue-hover)] disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[132px]"
		>
			<Check size={14} strokeWidth={2} />
			<span className="truncate">{label}</span>
			<ArrowRight size={13} strokeWidth={2} />
		</Button>
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
