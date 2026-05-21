import {
	type SavedDraftsPanelLabels,
	SavedDraftsPanelView,
	type SavedQuoteDraftItemView,
	type SavedQuoteDraftView,
} from '@hyperquote/ui/quote-cart/SavedDraftsPanelView'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

type PortalSavedDraft = SavedQuoteDraftView & {
	order: Order
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

function toSavedDraftView(order: Order): PortalSavedDraft {
	return {
		id: order.id,
		name: order.name,
		reference: order.reference,
		date: order.date,
		itemCount: order.itemCount,
		notes: order.notes,
		items: order.items.map(toSavedDraftItemView),
		order,
	}
}

function toSavedDraftItemView(item: OrderItem): SavedQuoteDraftItemView {
	return {
		productId: item.productId,
		name: item.productName,
		nameAr: item.productNameAr,
		quantity: item.quantity,
		unitOfMeasure: item.unitOfMeasure,
		unitOfMeasureAr: item.unitOfMeasureAr,
		imageUrl: item.imageUrl,
		notes: item.notes,
	}
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
	const isArabic = i18n.language === 'ar'
	const addCartItem = useDraftQuoteStore((state) => state.add)
	const [submitError, setSubmitError] = useState<string | null>(null)

	const { data, isError, isLoading, refetch } = useQuery({
		queryKey: ['customer-orders-all'],
		queryFn: () => getAllCustomerOrders(),
		staleTime: 30_000,
	})

	const drafts = useMemo(
		() =>
			(data?.orders.filter((order) => order.type === 'saved') ?? []).map(
				toSavedDraftView,
			),
		[data?.orders],
	)

	const labels = useMemo<SavedDraftsPanelLabels>(
		() => ({
			title: t('orders.savedDraftsTitle'),
			help: t('orders.savedDraftsHelp'),
			loading: t('common.loading', 'Loading...'),
			error: t('orders.error'),
			retry: t('orders.retry'),
			authTitle: t('orders.noOrders'),
			authAction: t('chat.addToQuote'),
			emptyTitle: t('quoteBuilder.emptyDraftsTitle'),
			emptyBody: t('quoteBuilder.emptyDraftsBody'),
			view: t('orders.view'),
			add: t('orders.add'),
			submit: t('orders.submit'),
			submitting: t('quoteBuilder.submitting'),
			confirmAddTitle: t('orders.confirmAddToCart'),
			confirmAddBody: (count) => t('orders.confirmAddToCartBody', { count }),
			cancel: t('orders.cancel'),
			confirm: t('market.confirm'),
			notes: t('market.cartNotesLabel'),
			itemNotes: t('orders.itemNotes'),
			copyNotes: t('orders.copyNotes'),
			emptyOrder: t('orders.emptyOrder'),
			lastEdited: (date) => t('orders.lastEdited', { date }),
			defaultDraftName: t('market.defaultDraftName'),
		}),
		[t],
	)

	const submitMutation = useMutation({
		mutationFn: (draft: PortalSavedDraft) =>
			submitQuoteRequest({
				data: {
					draftId: draft.order.id,
					items: toQuoteRequestItems(draft.order.items),
					idempotencyKey: crypto.randomUUID(),
					name: draft.order.name ?? draft.order.reference,
					notes: draft.order.notes ?? undefined,
				},
			}),
		onMutate: () => {
			setSubmitError(null)
		},
		onSuccess: (result) => {
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

	function handleAddDraft(draft: PortalSavedDraft) {
		for (const item of draft.order.items) {
			const productId =
				item.category === 'unmatched'
					? `${draft.order.id}:${item.productName}:${item.unitOfMeasure}`
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
		}
		toast.success(t('orders.draftAddedToCart'))
		onAdded?.()
	}

	return (
		<SavedDraftsPanelView
			actionMode={actionMode}
			className={className}
			drafts={drafts}
			footerError={submitError}
			headerAction={headerAction}
			isArabic={isArabic}
			labels={labels}
			onAddDraft={handleAddDraft}
			onNotesCopied={() => toast.success(t('orders.notesCopied'))}
			onRetry={() => refetch()}
			onSubmitDraft={(draft) => submitMutation.mutate(draft)}
			state={isLoading ? 'loading' : isError ? 'error' : 'ready'}
			submittingDraftId={submitMutation.variables?.id ?? null}
			theme="portal"
		/>
	)
}
