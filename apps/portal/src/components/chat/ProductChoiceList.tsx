import { ArrowRight, Check, PackageSearch } from 'lucide-react'
import { useMemo, useState } from 'react'
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
	const initialQuantities = useMemo(
		() =>
			Object.fromEntries(
				data.groups.map((group) => [
					group.pendingChoiceId,
					String(group.quantity),
				]),
			),
		[data.groups],
	)
	const [quantities, setQuantities] =
		useState<Record<string, string>>(initialQuantities)
	const total = data.groups.length
	const multipleChoices = total > 1
	const stepLabel = multipleChoices
		? isArabic
			? `اختيار ${toArabicIndic('1')} من ${toArabicIndic(String(total))}`
			: `Choice 1 of ${total}`
		: isArabic
			? 'اختار المنتج والكمية'
			: 'Choose product and quantity'

	return (
		<section
			data-product-choice-list
			className="mx-auto mt-3 w-full max-w-[680px] border border-[var(--p-rule)] bg-[var(--p-card)] px-3 py-3 shadow-[0_18px_55px_rgba(15,23,42,0.10)] sm:px-4 sm:py-4"
		>
			<div className="mx-auto max-w-[540px] border-b border-[var(--p-rule)] pb-3 text-center">
				<span className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--p-border)] bg-[var(--p-surface-subtle)] text-[var(--p-text)]">
					<PackageSearch size={15} strokeWidth={1.8} />
				</span>
				<p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--p-text-muted)]">
					{stepLabel}
				</p>
				<h3 className="mt-1 text-[15px] font-semibold text-[var(--p-text)]">
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
						className="border border-[var(--p-rule)] bg-[var(--p-surface-subtle)] px-2.5 py-2.5 sm:px-3 sm:py-3"
					>
						<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px] sm:items-end">
							<div className="min-w-0">
								<p className="text-[12px] font-semibold text-[var(--p-text)]">
									{isArabic
										? `أي نوع ${group.query} تحب؟`
										: `Which ${group.query} should I add?`}
								</p>
								<p className="mt-1 text-[11px] leading-4 text-[var(--p-text-muted)]">
									{isArabic
										? 'عدّل الكمية ثم اختار المنتج المناسب.'
										: 'Adjust the quantity, then pick the matching product.'}
								</p>
							</div>
							<label className="grid gap-1 text-[11px] font-semibold text-[var(--p-text-muted)]">
								<span>{isArabic ? 'الكمية' : 'Quantity'}</span>
								<input
									type="number"
									min="1"
									step="1"
									inputMode="numeric"
									value={
										quantities[group.pendingChoiceId] ?? String(group.quantity)
									}
									onChange={(event) => {
										const value = event.currentTarget.value
										setQuantities((current) => ({
											...current,
											[group.pendingChoiceId]: value,
										}))
									}}
									className="h-10 w-full border border-[var(--p-border)] bg-[var(--p-card)] px-3 text-[14px] font-semibold text-[var(--p-text)] outline-none transition-colors focus:border-[var(--p-border-strong)]"
									aria-label={t('quoteBuilder.quantityFor', {
										name: group.query,
									})}
								/>
							</label>
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
											quantityText={
												quantities[group.pendingChoiceId] ??
												String(group.quantity)
											}
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
	groupId,
	label,
	quantityText,
}: {
	action: ActionButtonData
	groupId: string
	label: string
	quantityText: string
}) {
	const quantity = Number.parseFloat(quantityText)
	const validQuantity = Number.isFinite(quantity) && quantity > 0
	const confirmedAction = validQuantity
		? actionWithQuantity(action.action, groupId, quantity)
		: null

	return (
		<Button
			isDisabled={!confirmedAction}
			onPress={() => {
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
			}}
			className="inline-flex min-h-10 min-w-0 items-center justify-center gap-2 border border-[var(--p-border-strong)] bg-[var(--p-text)] px-3 text-[12px] font-semibold text-[var(--p-card)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
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
