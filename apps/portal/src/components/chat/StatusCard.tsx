/**
 * StatusCard — inline order/quote status, rendered as a ledger entry.
 *
 * No rounded box, no badge pill. A tabular inset:
 *   [label in mono small caps] · [ENTITY NO.] — status in serif italic
 *   ────────────────────────────────────────────────────────────
 *   confirmed                                          28 MAR 2026
 *   dispatched                                         30 MAR 2026
 *   · · · · · — progress ticks at the bottom
 *
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ExternalLink, Send, SquarePen, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	PORTAL_CHAT_OPEN_DRAFT_EVENT,
	type StatusCardData,
} from '../../lib/chat-types'
import { toArabicIndic } from '../../lib/localized-digits'
import { submitQuoteRequest } from '../../lib/server/quote-requests'
import { toast } from '../../lib/toast'

const STATUS_COLOR: Record<'green' | 'yellow' | 'red', string> = {
	green: 'var(--p-success)',
	yellow: 'var(--p-warning)',
	red: 'var(--p-error)',
}

interface StatusCardProps {
	data: StatusCardData
}

export function StatusCard({ data }: StatusCardProps) {
	const { i18n, t } = useTranslation('portal')
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const isArabic = i18n.language === 'ar'
	const [confirmingSubmit, setConfirmingSubmit] = useState(false)

	const displayNumber = isArabic
		? toArabicIndic(data.displayNumber)
		: data.displayNumber
	const items = data.items ?? []
	const quoteRequestId = data.quoteRequestId ?? data.entityId

	const kindLabel =
		data.entityType === 'order'
			? t('chat.status.order')
			: t('chat.status.quote')

	const shownSteps = data.timeline.filter((s) => s.done).slice(-3)
	const statusColor = STATUS_COLOR[data.statusColor]
	const isDraft = data.type === 'draft' || data.status === 'draft'
	const recordId = isDraft ? quoteRequestId : data.entityId
	const canSubmitDraft =
		isDraft && items.length > 0 && items.every((item) => item.productId)
	const visibleItems = items.slice(0, 5)
	const hiddenItemCount = Math.max(0, items.length - visibleItems.length)
	const amountLabel =
		data.amount == null
			? t('orders.amountNotSet', 'Amount not set yet')
			: `EGP ${new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-EG', {
					maximumFractionDigits: 0,
				}).format(data.amount)}`

	const submitMutation = useMutation({
		mutationFn: () =>
			submitQuoteRequest({
				data: {
					draftId: quoteRequestId,
					idempotencyKey: crypto.randomUUID(),
					items: items.map((item, index) => ({
						customerDescription: item.name,
						isUnmatched: !item.productId,
						notes: item.notes,
						productId: item.productId,
						quantity: item.qty,
						sortOrder: index,
						unitOfMeasure: item.unit,
						unitOfMeasureAr: item.unitAr ?? item.unit,
					})),
					name: data.displayNumber,
				},
			}),
		onSuccess: (result) => {
			setConfirmingSubmit(false)
			queryClient.invalidateQueries({ queryKey: ['customer-orders-all'] })
			toast.success(t('market.submitSuccessToast', { ref: result.reference }))
		},
		onError: () => {
			setConfirmingSubmit(false)
			toast.error(t('orders.submitFailed'))
		},
	})

	function openRecord() {
		if (isDraft) {
			navigate({
				to: '/orders/edit/$orderId',
				params: { orderId: quoteRequestId },
			})
			return
		}
		navigate({
			to: '/orders/$orderId',
			params: { orderId: recordId },
		})
	}

	function editInChat() {
		window.dispatchEvent(
			new CustomEvent(PORTAL_CHAT_OPEN_DRAFT_EVENT, {
				detail: { draftId: quoteRequestId },
			}),
		)
	}

	function requestSubmit() {
		if (!canSubmitDraft || submitMutation.isPending) return
		if (!confirmingSubmit) {
			setConfirmingSubmit(true)
			return
		}
		submitMutation.mutate()
	}

	return (
		<section
			className="mt-3 w-full max-w-[560px] min-w-0 border border-[var(--p-rule)] bg-[var(--p-surface-subtle)] px-3 py-3"
			aria-label={`${kindLabel} ${displayNumber}`}
		>
			{/* Heading row: small-caps label + mono id + italic status */}
			<div className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
				<div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
					<span className="voice-mono text-[10px] uppercase tracking-[0.28em] text-[var(--p-text-faint)]">
						{kindLabel}
					</span>
					<span className="voice-mono break-all text-[12px] tracking-[0.14em] text-[var(--p-text)]">
						{t('chat.status.numberPrefix')}&nbsp;{displayNumber}
					</span>
				</div>
				<div className="flex shrink-0 items-center gap-2 sm:justify-end">
					<span
						className="voice-serif text-[14px] italic leading-none"
						style={{ color: statusColor }}
					>
						{data.status}
					</span>
					<span className="voice-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-text-faint)]">
						{items.length}{' '}
						{items.length === 1
							? t('orders.item', 'item')
							: t('orders.itemsShort', 'items')}
					</span>
				</div>
			</div>

			{/* Top rule */}
			<div className="h-px bg-[var(--p-rule-strong)]" />

			<div className="py-2">
				<p className="voice-mono text-[11px] uppercase tracking-[0.18em] text-[var(--p-text-muted)]">
					{t('orders.itemsTitle', isArabic ? 'الأصناف' : 'Items')}
				</p>
				{visibleItems.length > 0 ? (
					<ul className="mt-2 space-y-1.5">
						{visibleItems.map((item) => {
							const name = isArabic ? (item.nameAr ?? item.name) : item.name
							const unit = isArabic ? (item.unitAr ?? item.unit) : item.unit
							const quantity = isArabic
								? toArabicIndic(String(item.qty))
								: String(item.qty)
							return (
								<li
									key={`${quoteRequestId}:${item.productId ?? item.name}:${item.qty}:${item.unit}:${item.notes ?? ''}`}
									className="flex min-w-0 items-baseline justify-between gap-3 text-[13px] text-[var(--p-text)]"
								>
									<span className="min-w-0 break-words font-medium">
										{name}
									</span>
									<span className="voice-mono shrink-0 text-[12px] text-[var(--p-text-muted)]">
										{quantity} {unit}
									</span>
								</li>
							)
						})}
						{hiddenItemCount > 0 && (
							<li className="text-[12px] font-medium text-[var(--p-text-muted)]">
								{t('orders.moreItems', {
									count: hiddenItemCount,
									defaultValue: '+{{count}} more',
								})}
							</li>
						)}
					</ul>
				) : (
					<p className="mt-2 text-[13px] text-[var(--p-text-muted)]">
						{t('orders.emptyOrder')}
					</p>
				)}
				<p className="mt-2 text-[12px] font-medium text-[var(--p-text-muted)]">
					{amountLabel}
				</p>
			</div>

			{/* Timeline rows */}
			{shownSteps.length > 0 && (
				<div className="flex flex-col">
					{shownSteps.map((step, idx) => (
						<div
							key={step.label}
							className={`flex flex-col gap-1 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3 ${
								idx < shownSteps.length - 1
									? 'border-b border-[var(--p-rule)]'
									: ''
							}`}
						>
							<span className="voice-mono text-[11px] uppercase tracking-[0.18em] text-[var(--p-text-muted)]">
								{step.label}
							</span>
							<span className="voice-mono tabular-nums text-[12px] text-[var(--p-text)]">
								{isArabic ? toArabicIndic(step.date) : step.date}
							</span>
						</div>
					))}
				</div>
			)}

			{/* Bottom rule + progress ticks */}
			{data.timeline.length > 0 && (
				<>
					<div className="mt-1 h-px bg-[var(--p-rule-strong)]" />
					<ol
						className="mt-3 flex list-none items-center gap-2 p-0"
						aria-label={t('chat.status.progressLabel')}
					>
						{data.timeline.map((step) => (
							<li
								key={step.label}
								title={step.label}
								aria-label={step.label}
								className="block h-1.5 w-1.5 rounded-full"
								style={{
									background: step.done
										? 'var(--p-text)'
										: 'var(--p-rule-strong)',
								}}
							/>
						))}
					</ol>
				</>
			)}

			<div
				className={`mt-3 grid grid-cols-1 gap-2 border-t border-[var(--p-rule)] pt-3 ${
					isDraft ? 'sm:grid-cols-3' : 'sm:grid-cols-1'
				}`}
			>
				<button
					type="button"
					onClick={openRecord}
					className="inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-lg bg-[var(--p-accent)] px-3 text-[12px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90"
				>
					<ExternalLink size={14} strokeWidth={1.8} />
					<span className="truncate">
						{isDraft ? t('orders.openDraft', 'Open draft') : t('orders.view')}
					</span>
				</button>
				{isDraft ? (
					<button
						type="button"
						onClick={editInChat}
						className="inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-lg border border-[var(--p-border)] px-3 text-[12px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)]"
					>
						<SquarePen size={14} strokeWidth={1.8} />
						<span className="truncate">
							{t('orders.editInChat', 'Edit in chat')}
						</span>
					</button>
				) : null}
				{isDraft ? (
					<button
						type="button"
						onClick={requestSubmit}
						disabled={!canSubmitDraft || submitMutation.isPending}
						className="inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-lg border border-[var(--p-border)] px-3 text-[12px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)] disabled:pointer-events-none disabled:opacity-45"
					>
						<Send size={14} strokeWidth={1.8} />
						<span className="truncate">
							{submitMutation.isPending
								? t('quoteBuilder.submitting')
								: confirmingSubmit
									? t('market.confirmSubmitAction')
									: t('orders.submit')}
						</span>
					</button>
				) : null}
			</div>
			{confirmingSubmit && (
				<div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-[var(--p-border)] bg-[var(--p-card)] px-2 py-2">
					<p className="min-w-0 text-[11px] leading-4 text-[var(--p-text-muted)]">
						{t('market.confirmSubmitBody')}
					</p>
					<button
						type="button"
						onClick={() => setConfirmingSubmit(false)}
						className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--p-text-muted)] hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
						aria-label={t('orders.cancel')}
					>
						<X size={14} strokeWidth={1.8} />
					</button>
				</div>
			)}
		</section>
	)
}
