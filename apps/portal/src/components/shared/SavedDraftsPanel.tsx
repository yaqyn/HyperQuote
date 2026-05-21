import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	AlertTriangle,
	Copy,
	Eye,
	FilePenLine,
	Package,
	Plus,
	Send,
} from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getAllCustomerOrders } from '../../lib/server/orders'
import { submitQuoteRequest } from '../../lib/server/quote-requests'
import { toast } from '../../lib/toast'
import { unavailableItemNamesFromError } from '../../lib/unavailable-quote-items'
import { useDraftQuoteStore } from '../../stores/draft-quote'
import type { Order, OrderItem } from '../../types/order'

interface SavedDraftsPanelProps {
	actionMode?: 'submit' | 'add'
	className?: string
	headerAction?: ReactNode
	onAdded?: () => void
	onSubmitted?: (reference: string) => void
}

function toQuoteRequestItems(items: OrderItem[]) {
	return items.map((item, index) => ({
		productId: item.category === 'unmatched' ? undefined : item.productId,
		customerDescription: item.productName,
		quantity: item.quantity,
		unitOfMeasure: item.unitOfMeasure,
		unitOfMeasureAr: item.unitOfMeasureAr,
		notes: item.notes?.trim() || undefined,
		sortOrder: index,
		isUnmatched: item.category === 'unmatched',
	}))
}

function formatDraftDate(value: string, isAr: boolean) {
	return new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-GB', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	}).format(new Date(value))
}

export function SavedDraftsPanel({
	actionMode = 'submit',
	className = '',
	headerAction,
	onAdded,
	onSubmitted,
}: SavedDraftsPanelProps) {
	const { t, i18n } = useTranslation('portal')
	const queryClient = useQueryClient()
	const isAr = i18n.language === 'ar'
	const addCartItem = useDraftQuoteStore((s) => s.add)
	const updateCartItemNote = useDraftQuoteStore((s) => s.updateNote)
	const globalNote = useDraftQuoteStore((s) => s.globalNote)
	const setGlobalNote = useDraftQuoteStore((s) => s.setGlobalNote)
	const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null)
	const [confirmAddDraftId, setConfirmAddDraftId] = useState<string | null>(
		null,
	)
	const [submitError, setSubmitError] = useState<string | null>(null)

	const { data, isError, isLoading, refetch } = useQuery({
		queryKey: ['customer-orders-all'],
		queryFn: () => getAllCustomerOrders(),
		staleTime: 30_000,
	})

	const savedDrafts = useMemo(
		() => data?.orders.filter((order) => order.type === 'saved') ?? [],
		[data?.orders],
	)
	const selectedDraft = savedDrafts.find(
		(draft) => draft.id === selectedDraftId,
	)

	const submitMutation = useMutation({
		mutationFn: (draft: Order) =>
			submitQuoteRequest({
				data: {
					draftId: draft.id,
					items: toQuoteRequestItems(draft.items),
					idempotencyKey: crypto.randomUUID(),
					name: draft.name ?? draft.reference,
					notes: draft.notes ?? undefined,
				},
			}),
		onMutate: () => {
			setSubmitError(null)
		},
		onSuccess: (result, draft) => {
			if (selectedDraftId === draft.id) {
				setSelectedDraftId(null)
			}
			queryClient.invalidateQueries({ queryKey: ['customer-orders-all'] })
			toast.success(t('market.submitSuccessToast', { ref: result.reference }))
			onSubmitted?.(result.reference)
		},
		onError: (error) => {
			const unavailableItems = unavailableItemNamesFromError(error)
			setSubmitError(
				unavailableItems.length > 0
					? t('orders.unavailableItems', {
							items: unavailableItems.join(', '),
						})
					: t('orders.submitFailed'),
			)
		},
	})

	function handleAddDraft(draft: Order) {
		for (const item of draft.items) {
			const productId =
				item.category === 'unmatched'
					? `${draft.id}:${item.productName}:${item.unitOfMeasure}`
					: item.productId
			addCartItem(
				{
					productId,
					slug: productId,
					name: item.productName,
					nameAr: item.productNameAr,
					category: item.category,
					categoryName: item.category,
					categoryNameAr: item.category,
					unitOfMeasure: item.unitOfMeasure,
					unitOfMeasureAr: item.unitOfMeasureAr,
					imageUrl: item.imageUrl,
				},
				item.quantity,
			)
			if (item.notes?.trim()) {
				updateCartItemNote(productId, item.notes.trim())
			}
		}
		if (draft.notes?.trim()) {
			const nextNote = draft.notes.trim()
			setGlobalNote(
				globalNote.trim() ? `${globalNote.trim()}\n${nextNote}` : nextNote,
			)
		}
		setConfirmAddDraftId(null)
		toast.success(t('orders.draftAddedToCart'))
		onAdded?.()
	}

	return (
		<section
			className={`flex min-h-0 flex-col bg-[var(--p-bg)] text-[var(--p-text)] ${className}`}
		>
			<header className="shrink-0 border-b border-[var(--p-border)] px-4 py-3 md:px-5">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<p className="text-[15px] font-semibold text-[var(--p-text)]">
							{t('orders.savedDraftsTitle')}
						</p>
						<p className="mt-1 text-[12px] leading-5 text-[var(--p-text-muted)]">
							{t('orders.savedDraftsHelp')}
						</p>
					</div>
					{headerAction && <div className="shrink-0">{headerAction}</div>}
				</div>
			</header>

			<div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-5">
				{isLoading ? (
					<div className="space-y-2">
						{['a', 'b', 'c'].map((key) => (
							<div
								key={key}
								className="h-20 animate-pulse rounded-xl bg-[var(--p-border)]"
							/>
						))}
					</div>
				) : isError ? (
					<div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
						<AlertTriangle
							size={24}
							strokeWidth={1.7}
							className="text-[var(--p-text-faint)]"
						/>
						<p className="text-[13px] text-[var(--p-text-muted)]">
							{t('orders.error')}
						</p>
						<button
							type="button"
							onClick={() => refetch()}
							className="h-9 rounded-xl border border-[var(--p-border)] px-3 text-[12px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)]"
						>
							{t('orders.retry')}
						</button>
					</div>
				) : savedDrafts.length === 0 ? (
					<div className="flex min-h-48 flex-col items-center justify-center text-center">
						<FilePenLine
							size={28}
							strokeWidth={1.5}
							className="mb-3 text-[var(--p-text-faint)]"
						/>
						<p className="text-[14px] font-semibold text-[var(--p-text)]">
							{t('quoteBuilder.emptyDraftsTitle')}
						</p>
						<p className="mt-1 text-[12px] text-[var(--p-text-muted)]">
							{t('quoteBuilder.emptyDraftsBody')}
						</p>
					</div>
				) : (
					<div className="space-y-2">
						{savedDrafts.map((draft) => {
							const title =
								draft.name ?? draft.reference ?? t('market.defaultDraftName')
							const dateLabel = formatDraftDate(draft.date, isAr)
							const isSelected = selectedDraftId === draft.id
							const isSubmitting = submitMutation.variables?.id === draft.id
							return (
								<article
									key={draft.id}
									className="overflow-hidden rounded-xl border border-[var(--p-border)] bg-[var(--p-card)]"
								>
									<div className="p-3">
										<div className="flex min-w-0 items-start gap-3">
											<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--p-accent-dim)] text-[var(--p-accent)]">
												<FilePenLine size={15} strokeWidth={1.7} />
											</span>
											<div className="min-w-0 flex-1">
												<p className="truncate text-[13px] font-semibold text-[var(--p-text)]">
													{title}
												</p>
												<p className="mt-1 text-[11px] text-[var(--p-text-muted)]">
													{t('orders.lastEdited', { date: dateLabel })}
												</p>
											</div>
											<span className="voice-mono shrink-0 rounded-full border border-[var(--p-border)] px-2 py-1 text-[10px] tabular-nums text-[var(--p-text-muted)]">
												{draft.itemCount}
											</span>
										</div>
										<div className="mt-3 grid grid-cols-2 gap-2">
											<button
												type="button"
												onClick={() => {
													setConfirmAddDraftId(null)
													setSelectedDraftId(isSelected ? null : draft.id)
												}}
												className="flex h-9 min-w-0 items-center justify-center gap-2 rounded-xl border border-[var(--p-border)] px-3 text-[12px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)]"
											>
												<Eye size={14} strokeWidth={1.7} />
												<span className="truncate">{t('orders.view')}</span>
											</button>
											{actionMode === 'add' ? (
												<button
													type="button"
													onClick={() => {
														setSelectedDraftId(draft.id)
														setConfirmAddDraftId(draft.id)
													}}
													disabled={draft.items.length === 0}
													className="flex h-9 min-w-0 items-center justify-center gap-2 rounded-xl bg-[var(--p-accent)] px-3 text-[12px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
												>
													<Plus size={14} strokeWidth={1.7} />
													<span className="truncate">{t('orders.add')}</span>
												</button>
											) : (
												<button
													type="button"
													onClick={() => submitMutation.mutate(draft)}
													disabled={
														draft.items.length === 0 || submitMutation.isPending
													}
													className="flex h-9 min-w-0 items-center justify-center gap-2 rounded-xl bg-[var(--p-accent)] px-3 text-[12px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
												>
													<Send size={14} strokeWidth={1.7} />
													<span className="truncate">
														{isSubmitting
															? t('quoteBuilder.submitting')
															: t('orders.submit')}
													</span>
												</button>
											)}
										</div>
									</div>
									{isSelected && selectedDraft && (
										<DraftPreview draft={selectedDraft} isAr={isAr} />
									)}
									{actionMode === 'add' && confirmAddDraftId === draft.id && (
										<div className="border-t border-[var(--p-border)] bg-[var(--p-bg)] p-3">
											<p className="text-[12px] font-semibold text-[var(--p-text)]">
												{t('orders.confirmAddToCart')}
											</p>
											<p className="mt-1 text-[11px] leading-4 text-[var(--p-text-muted)]">
												{t('orders.confirmAddToCartBody', {
													count: draft.items.length,
												})}
											</p>
											<div className="mt-2 grid grid-cols-2 gap-2">
												<button
													type="button"
													onClick={() => setConfirmAddDraftId(null)}
													className="flex h-8 items-center justify-center rounded-lg border border-[var(--p-border)] text-[12px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)]"
												>
													{t('orders.cancel')}
												</button>
												<button
													type="button"
													onClick={() => handleAddDraft(draft)}
													className="flex h-8 items-center justify-center rounded-lg bg-[var(--p-accent)] text-[12px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90"
												>
													{t('market.confirm')}
												</button>
											</div>
										</div>
									)}
								</article>
							)
						})}
					</div>
				)}
			</div>

			{submitError && (
				<p className="shrink-0 border-t border-[var(--p-border)] px-4 py-3 text-[12px] font-medium text-[var(--p-error)] md:px-5">
					{submitError}
				</p>
			)}
		</section>
	)
}

function DraftPreview({ draft, isAr }: { draft: Order; isAr: boolean }) {
	const { t } = useTranslation('portal')

	return (
		<div className="border-t border-[var(--p-border)] bg-[var(--p-bg)] px-3 py-2">
			{draft.notes?.trim() && (
				<DraftNotes
					label={t('market.cartNotesLabel')}
					notes={draft.notes.trim()}
					className="mb-2"
				/>
			)}
			{draft.items.length === 0 ? (
				<p className="py-3 text-center text-[12px] text-[var(--p-text-muted)]">
					{t('orders.emptyOrder')}
				</p>
			) : (
				<div className="divide-y divide-[var(--p-border)]">
					{draft.items.map((item) => {
						const itemName = isAr ? item.productNameAr : item.productName
						const unitLabel =
							isAr && item.unitOfMeasureAr
								? item.unitOfMeasureAr
								: item.unitOfMeasure
						const itemKey =
							item.productId ??
							`${item.productName}:${item.quantity}:${item.unitOfMeasure}`
						const itemNotes = item.notes?.trim()
						return (
							<div key={`${draft.id}-${itemKey}`} className="py-2">
								<div className="flex min-w-0 items-center gap-2">
									<OrderItemImage imageUrl={item.imageUrl} />
									<div className="min-w-0 flex-1">
										<p className="truncate text-[12px] font-medium text-[var(--p-text)]">
											{itemName}
										</p>
										<p className="mt-0.5 text-[11px] text-[var(--p-text-muted)]">
											{item.quantity.toLocaleString(isAr ? 'ar-EG' : 'en-EG')}{' '}
											{unitLabel}
										</p>
									</div>
								</div>
								{itemNotes && (
									<DraftNotes
										label={t('orders.itemNotes')}
										notes={itemNotes}
										className="mt-2 ms-11"
									/>
								)}
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}

function DraftNotes({
	label,
	notes,
	className = '',
}: {
	label: string
	notes: string
	className?: string
}) {
	const { t } = useTranslation('portal')

	async function copyNotes() {
		await navigator.clipboard.writeText(notes)
		toast.success(t('orders.notesCopied'))
	}

	return (
		<div
			className={`rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-2.5 ${className}`}
		>
			<div className="mb-1.5 flex items-center justify-between gap-2">
				<p className="text-[11px] font-semibold text-[var(--p-text-muted)]">
					{label}
				</p>
				<button
					type="button"
					onClick={copyNotes}
					className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
					aria-label={t('orders.copyNotes')}
				>
					<Copy size={13} strokeWidth={1.7} />
				</button>
			</div>
			<p className="whitespace-pre-wrap text-[12px] leading-5 text-[var(--p-text)]">
				{notes}
			</p>
		</div>
	)
}

function OrderItemImage({ imageUrl }: { imageUrl: string }) {
	if (imageUrl) {
		return (
			<img
				src={imageUrl}
				alt=""
				loading="lazy"
				decoding="async"
				className="h-9 w-9 shrink-0 rounded-lg bg-[var(--p-surface)] object-cover ring-1 ring-inset ring-[var(--p-border)]"
			/>
		)
	}

	return (
		<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--p-surface)] text-[var(--p-text-faint)] ring-1 ring-inset ring-[var(--p-border)]">
			<Package size={14} strokeWidth={1.7} />
		</span>
	)
}
