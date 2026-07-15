import { getQuoteCartFingerprint } from '@hyperquote/quote-cart'
import {
	type SavedDraftsPanelLabels,
	SavedDraftsPanelView,
	type SavedQuoteDraftItemView,
	type SavedQuoteDraftView,
} from '@hyperquote/ui/quote-cart/SavedDraftsPanelView'
import { X } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuoteCart } from '../../hooks/useQuoteCart'
import { useQuoteRequestFlow } from '../../hooks/useQuoteRequestFlow'
import { getWebsiteQuoteWorkspace } from '../../lib/customer-projects'
import {
	getWebsiteSavedQuoteDrafts,
	type WebsiteSavedQuoteDraft,
	type WebsiteSavedQuoteDraftItem,
} from '../../lib/quote-requests'

interface WebsiteSavedDraftsPanelProps {
	className?: string
	onAdded: () => void
	onAuthRequired: () => void
	onBack: () => void
}

type WebsiteSavedDraft = SavedQuoteDraftView & {
	draft: WebsiteSavedQuoteDraft
}

function toSavedDraftView(
	draft: WebsiteSavedQuoteDraft,
	projectName: string | null,
): WebsiteSavedDraft {
	return {
		id: draft.id,
		name: draft.name,
		reference: draft.reference,
		date: draft.date,
		itemCount: draft.itemCount,
		notes: draft.notes,
		items: draft.items.map(toSavedDraftItemView),
		projectId: draft.projectId,
		projectName,
		draft,
	}
}

function toSavedDraftItemView(
	item: WebsiteSavedQuoteDraftItem,
): SavedQuoteDraftItemView {
	return {
		productId: item.productId,
		name: item.name,
		nameAr: item.nameAr,
		quantity: item.quantity,
		unitOfMeasure: item.unitOfMeasure,
		unitOfMeasureAr: item.unitOfMeasureAr,
		imageUrl: item.imageUrl,
		notes: item.note,
		isUnavailable: item.isUnavailable,
		unavailableReason: item.availabilityStatus,
	}
}

export function WebsiteSavedDraftsPanel({
	className = 'h-[min(46dvh,360px)] max-h-[min(72dvh,560px)] min-h-[280px] border-t border-[var(--color-border)]',
	onAdded,
	onAuthRequired,
	onBack,
}: WebsiteSavedDraftsPanelProps) {
	const { t, i18n } = useTranslation('website')
	const shouldReduceMotion = useReducedMotion()
	const isArabic = i18n.language === 'ar'
	const addCartItem = useQuoteCart((state) => state.add)
	const recordSavedDraft = useQuoteRequestFlow(
		(state) => state.recordSavedDraft,
	)
	const [drafts, setDrafts] = useState<WebsiteSavedDraft[]>([])
	const [state, setState] = useState<'loading' | 'ready' | 'auth' | 'error'>(
		'loading',
	)

	const loadDrafts = useCallback(
		async (isActive: () => boolean = () => true) => {
			setState('loading')
			try {
				const result = await getWebsiteSavedQuoteDrafts()
				if (!isActive()) return
				if (result.success) {
					const workspace = await getWebsiteQuoteWorkspace()
					if (!isActive()) return
					setDrafts(
						result.drafts.map((draft) =>
							toSavedDraftView(
								draft,
								workspace.projects.find(
									(project) => project.id === draft.projectId,
								)?.name ?? null,
							),
						),
					)
					setState('ready')
					return
				}
				setState(
					result.error === 'not_authenticated' ||
						result.error === 'customer_required'
						? 'auth'
						: 'error',
				)
			} catch {
				if (isActive()) setState('error')
			}
		},
		[],
	)

	useEffect(() => {
		let active = true
		void loadDrafts(() => active)
		return () => {
			active = false
		}
	}, [loadDrafts])

	const labels = useMemo<SavedDraftsPanelLabels>(
		() => ({
			title: t('cart.savedOrdersTitle'),
			help: t('cart.savedOrdersBody'),
			loading: t('cart.savedOrdersLoading', 'Loading saved drafts...'),
			error: t('cart.savedOrdersLoadFailed'),
			retry: t('cart.retry', 'Retry'),
			authTitle: t('cart.savedOrdersSignIn'),
			authAction: t('login.whatsappCTA'),
			emptyTitle: t('cart.savedOrdersEmpty'),
			emptyBody: t('cart.browseCta'),
			view: t('cart.view'),
			add: t('cart.add'),
			submit: t('cart.submit'),
			submitting: t('cart.submitting'),
			confirmAddTitle: t('cart.confirmAddToCart'),
			confirmAddBody: (count) => t('cart.confirmAddToCartBody', { count }),
			cancel: t('cart.cancel'),
			confirm: t('cart.confirm'),
			notes: t('cart.notes'),
			itemNotes: t('cart.itemNotes'),
			copyNotes: t('cart.copyNotes'),
			emptyOrder: t('cart.savedOrdersEmpty'),
			lastEdited: (date) => date,
			defaultDraftName: t('cart.defaultDraftName'),
			unavailableItem: t('market.outOfStock'),
			blockedDraft: t(
				'cart.unavailableDraftBlocked',
				'Remove unavailable items before using this draft.',
			),
			independentProject: t('quoteFlow.project.independent'),
		}),
		[t],
	)

	function handleAddDraft(draft: WebsiteSavedDraft) {
		if (
			draft.draft.items.some((item) => item.isUnavailable || !item.productId)
		) {
			return
		}
		for (const item of draft.draft.items) {
			const productId = item.productId
			if (!productId) continue
			addCartItem(
				{
					productId,
					slug: productId,
					name: item.name,
					nameAr: item.nameAr,
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
		const cart = useQuoteCart.getState()
		recordSavedDraft({
			draftId: draft.draft.id,
			fingerprint: getQuoteCartFingerprint(cart.items, cart.globalNote),
			name: draft.draft.name ?? draft.draft.reference,
			projectId: draft.draft.projectId,
			reference: draft.draft.reference,
		})
		onAdded()
	}

	return (
		<SavedDraftsPanelView
			actionMode="add"
			className={className}
			drafts={drafts}
			headerAction={
				<motion.button
					type="button"
					onClick={onBack}
					className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
					aria-label={t('a11y.close')}
					whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
				>
					<X size={17} strokeWidth={1.8} />
				</motion.button>
			}
			isArabic={isArabic}
			labels={labels}
			onAddDraft={handleAddDraft}
			onAuthRequired={onAuthRequired}
			onRetry={() => void loadDrafts()}
			state={state}
			theme="website"
		/>
	)
}
