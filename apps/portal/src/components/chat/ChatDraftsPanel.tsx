import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	AlertTriangle,
	Check,
	ChevronDown,
	Copy,
	FilePenLine,
	MessageSquareText,
	MoreHorizontal,
	Package,
	PanelRightOpen,
	Plus,
	Save,
	Search,
	Send,
	ShoppingCart,
	Trash2,
	X,
} from 'lucide-react'
import {
	AnimatePresence,
	cubicBezier,
	motion,
	useReducedMotion,
} from 'motion/react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	type ActiveChatDraftContext,
	type ChatTempDraftData,
	PORTAL_CHAT_OPEN_DRAFT_EVENT,
	type PortalChatOpenDraftEventDetail,
} from '../../lib/chat-types'
import { getMarketProducts, type MarketProduct } from '../../lib/server/market'
import { deleteOrder, getAllCustomerOrders } from '../../lib/server/orders'
import {
	saveDraft,
	submitQuoteRequest,
	validateQuoteRequestItems,
} from '../../lib/server/quote-requests'
import { toast } from '../../lib/toast'
import { unavailableItemNamesFromError } from '../../lib/unavailable-quote-items'
import { useDraftQuoteStore } from '../../stores/draft-quote'
import { usePortalStore } from '../../stores/portal'
import type { Order, OrderItem } from '../../types/order'

interface ChatDraftsPanelProps {
	className?: string
	headerAction?: ReactNode
	onActiveDraftChange?: (draft: ActiveChatDraftContext | null) => void
	onInitialLoadChange?: (loading: boolean) => void
	onDraftPrompt?: (prompt: string) => void
	onDraftThreadClear?: (sessionKey: string) => void
	onSubmitted?: (reference: string) => void
	resetSelectionToken?: number
}

interface DraftEditorState {
	baseFingerprint: string
	date: string
	id: string | null
	items: OrderItem[]
	name: string
	notes: string
	reference: string | null
	sessionKey: string
}

const NEW_DRAFT_KEY = '__new_draft__'
const CHAT_DRAFT_EASE = cubicBezier(0.22, 1, 0.36, 1)
const SUBMITTED_RESET_DELAY_MS = 1800

function chatRevealMotion(shouldReduceMotion: boolean | null) {
	return {
		animate: { opacity: 1, y: 0 },
		exit: { opacity: 0, y: shouldReduceMotion ? 0 : -4 },
		initial: { opacity: 0, y: shouldReduceMotion ? 0 : 4 },
		transition: {
			duration: shouldReduceMotion ? 0.01 : 0.14,
			ease: CHAT_DRAFT_EASE,
		},
	}
}

function chatFadeMotion(shouldReduceMotion: boolean | null) {
	return {
		animate: { opacity: 1, y: 0 },
		exit: { opacity: 0, y: shouldReduceMotion ? 0 : -4 },
		initial: { opacity: 0, y: shouldReduceMotion ? 0 : 4 },
		transition: {
			duration: shouldReduceMotion ? 0.01 : 0.14,
			ease: CHAT_DRAFT_EASE,
		},
	}
}

function chatMenuMotion(
	shouldReduceMotion: boolean | null,
	transformOrigin: 'top' | 'bottom',
) {
	return {
		animate: { opacity: 1, scaleY: 1 },
		exit: { opacity: 0, scaleY: shouldReduceMotion ? 1 : 0.98 },
		initial: { opacity: 0, scaleY: shouldReduceMotion ? 1 : 0.98 },
		style: { transformOrigin },
		transition: {
			duration: shouldReduceMotion ? 0.01 : 0.12,
			ease: CHAT_DRAFT_EASE,
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

function formatDraftDate(value: string, isAr: boolean) {
	return new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-GB', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	}).format(new Date(value))
}

function getDefaultDraftName(baseName: string, isArabic: boolean) {
	const date = new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-GB', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	}).format(new Date())
	return `${baseName} ${date}`
}

function editorFingerprint(editor: Omit<DraftEditorState, 'baseFingerprint'>) {
	return JSON.stringify({
		items: editor.items.map((item) => ({
			category: item.category,
			imageUrl: item.imageUrl,
			productId: item.productId,
			productName: item.productName.trim(),
			productNameAr: item.productNameAr.trim(),
			quantity: item.quantity,
			unitOfMeasure: item.unitOfMeasure,
			unitOfMeasureAr: item.unitOfMeasureAr,
		})),
		name: editor.name.trim(),
		notes: editor.notes.trim(),
	})
}

function dirtyEditor(editor: DraftEditorState): boolean {
	return editorFingerprint(editor) !== editor.baseFingerprint
}

function itemWithoutNotes(item: OrderItem): OrderItem {
	return {
		availabilityStatus: item.availabilityStatus,
		catalogProductId: item.catalogProductId,
		category: item.category,
		imageUrl: item.imageUrl,
		isOrderable: item.isOrderable,
		isUnmatched: item.isUnmatched,
		productId: item.productId,
		productName: item.productName,
		productNameAr: item.productNameAr,
		quantity: item.quantity,
		unitOfMeasure: item.unitOfMeasure,
		unitOfMeasureAr: item.unitOfMeasureAr,
	}
}

function createEditorFromOrder(order: Order): DraftEditorState {
	const editor = {
		date: order.date,
		id: order.id,
		items: order.items.map(itemWithoutNotes),
		name: order.name ?? order.reference ?? '',
		notes: order.notes ?? '',
		reference: order.reference ?? null,
		sessionKey: `draft:${order.id}`,
	}
	return {
		...editor,
		baseFingerprint: editorFingerprint(editor),
	}
}

function createNewEditor(defaultName: string): DraftEditorState {
	const editor = {
		date: new Date().toISOString(),
		id: null,
		items: [],
		name: defaultName,
		notes: '',
		reference: null,
		sessionKey: `draft:temp:${crypto.randomUUID()}`,
	}
	return {
		...editor,
		baseFingerprint: editorFingerprint(editor),
	}
}

function createEditorFromTempDraft(draft: ChatTempDraftData): DraftEditorState {
	const editor = {
		date: new Date().toISOString(),
		id: null,
		items: draft.items.map((item) => ({
			availabilityStatus: item.availabilityStatus,
			catalogProductId: item.productId,
			category: item.category,
			imageUrl: item.imageUrl,
			isOrderable: true,
			isUnmatched: false,
			productId: item.productId,
			productName: item.productName,
			productNameAr: item.productNameAr,
			quantity: item.quantity,
			unitOfMeasure: item.unitOfMeasure,
			unitOfMeasureAr: item.unitOfMeasureAr,
		})),
		name: draft.name,
		notes: draft.notes,
		reference: null,
		sessionKey: draft.sessionKey,
	}
	return {
		...editor,
		baseFingerprint: editorFingerprint(editor),
	}
}

function productToOrderItem(product: MarketProduct): OrderItem {
	return {
		availabilityStatus: product.availabilityStatus,
		catalogProductId: product.id,
		category: product.category,
		imageUrl: product.imageUrl,
		isOrderable: true,
		isUnmatched: false,
		productId: product.id,
		productName: product.name,
		productNameAr: product.nameAr,
		quantity: 1,
		unitOfMeasure: product.unitOfMeasure,
		unitOfMeasureAr: product.unitOfMeasureAr,
	}
}

function toQuoteRequestItems(items: OrderItem[]) {
	return items.map((item, index) => ({
		customerDescription: item.productName,
		isUnmatched:
			item.category === 'unmatched' ||
			item.isUnmatched ||
			item.isOrderable === false,
		productId:
			item.category === 'unmatched' ||
			item.isUnmatched ||
			item.isOrderable === false
				? undefined
				: (item.catalogProductId ?? item.productId),
		quantity: item.quantity,
		sortOrder: index,
		unitOfMeasure: item.unitOfMeasure,
		unitOfMeasureAr: item.unitOfMeasureAr,
	}))
}

function invalidDraftItems(items: OrderItem[]) {
	return items.filter(
		(item) =>
			item.isOrderable === false || item.isUnmatched || !item.catalogProductId,
	)
}

function buildDraftPrompt(
	editor: DraftEditorState,
	intent: 'notes' | 'review',
) {
	const title = editor.name.trim() || editor.reference || 'Untitled draft'
	const items = editor.items
		.map(
			(item, index) =>
				`${index + 1}. ${item.quantity} ${item.unitOfMeasure} ${item.productName}`,
		)
		.join('\n')
	const draftNotes = editor.notes.trim() || 'No draft notes yet.'

	if (intent === 'notes') {
		return `Write concise order notes for this draft. Keep delivery/site assumptions separate from material assumptions.\n\nDraft: ${title}\nCurrent notes: ${draftNotes}\nItems:\n${items}`
	}

	return `Inspect this draft and suggest what to change before submitting it as a quote request. Check quantities, draft notes, and whether any items need clarification.\n\nDraft: ${title}\nNotes: ${draftNotes}\nItems:\n${items}`
}

function activeDraftContextFromEditor(
	editor: DraftEditorState,
): ActiveChatDraftContext {
	return {
		dirty: dirtyEditor(editor),
		id: editor.id,
		items: editor.items.slice(0, 40).map((item, index) => {
			const productId = item.catalogProductId ?? item.productId
			return {
				lineId: `${editor.id ?? editor.sessionKey}:${index}:${productId}`,
				orderable:
					item.isOrderable !== false && !item.isUnmatched && Boolean(productId),
				productId,
				productName: item.productName,
				productNameAr: item.productNameAr,
				quantity: item.quantity,
				unitOfMeasure: item.unitOfMeasure,
				unitOfMeasureAr: item.unitOfMeasureAr,
			}
		}),
		name: editor.name.trim() || null,
		notes: editor.notes.trim().slice(0, 600),
		reference: editor.reference,
		sessionKey: editor.sessionKey,
	}
}

export function ChatDraftsPanel({
	className = '',
	headerAction,
	onActiveDraftChange,
	onInitialLoadChange,
	onDraftPrompt,
	onDraftThreadClear,
	onSubmitted,
	resetSelectionToken = 0,
}: ChatDraftsPanelProps) {
	const { t, i18n } = useTranslation('portal')
	const queryClient = useQueryClient()
	const isAr = i18n.language === 'ar'
	const shouldReduceMotion = useReducedMotion()
	const addCartItem = useDraftQuoteStore((s) => s.add)
	const setDraftQuoteOpen = usePortalStore((s) => s.setDraftQuoteOpen)
	const defaultDraftName = getDefaultDraftName(
		t('market.defaultDraftName'),
		isAr,
	)
	const actionsMenuRef = useRef<HTMLDivElement>(null)
	const draftMenuRef = useRef<HTMLDivElement>(null)
	const knownSavedDraftIdsRef = useRef<Set<string>>(new Set())
	const productMenuRef = useRef<HTMLDivElement>(null)
	const reportedDraftRef = useRef(false)
	const resetSelectionTokenRef = useRef(resetSelectionToken)
	const [activeDraftKey, setActiveDraftKey] = useState<string | null>(null)
	const [actionsMenuOpen, setActionsMenuOpen] = useState(false)
	const [confirmCartAddOpen, setConfirmCartAddOpen] = useState(false)
	const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false)
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
	const [draftMenuOpen, setDraftMenuOpen] = useState(false)
	const [draftSearch, setDraftSearch] = useState('')
	const [editor, setEditor] = useState<DraftEditorState | null>(null)
	const [productMenuOpen, setProductMenuOpen] = useState(false)
	const [productSearch, setProductSearch] = useState('')
	const [requestedDraftId, setRequestedDraftId] = useState<string | null>(null)
	const [submittedReference, setSubmittedReference] = useState<string | null>(
		null,
	)
	const [submitError, setSubmitError] = useState<string | null>(null)

	const { data, isError, isLoading, refetch } = useQuery({
		queryKey: ['customer-orders-all'],
		queryFn: () => getAllCustomerOrders(),
		staleTime: 30_000,
	})
	const showDraftMenuLoading = useDelayedVisibility(isLoading)

	useEffect(() => {
		onInitialLoadChange?.(isLoading)
	}, [isLoading, onInitialLoadChange])

	useEffect(() => {
		if (resetSelectionTokenRef.current === resetSelectionToken) return
		resetSelectionTokenRef.current = resetSelectionToken
		if (resetSelectionToken < 0) return
		reportedDraftRef.current = false
		setActiveDraftKey(null)
		setActionsMenuOpen(false)
		setConfirmCartAddOpen(false)
		setConfirmSubmitOpen(false)
		setConfirmDeleteId(null)
		setDraftMenuOpen(false)
		setEditor(null)
		setProductMenuOpen(false)
		setProductSearch('')
		setSubmitError(null)
		onActiveDraftChange?.(null)
	}, [onActiveDraftChange, resetSelectionToken])

	const savedDrafts = useMemo(
		() => data?.orders.filter((order) => order.type === 'saved') ?? [],
		[data?.orders],
	)
	const visibleDrafts = useMemo(() => {
		const query = draftSearch.trim().toLowerCase()
		if (!query) return savedDrafts
		return savedDrafts.filter((draft) => {
			const haystack = [
				draft.name,
				draft.reference,
				draft.notes,
				...draft.items.map((item) => item.productName),
				...draft.items.map((item) => item.productNameAr),
			]
				.filter(Boolean)
				.join(' ')
				.toLowerCase()
			return haystack.includes(query)
		})
	}, [draftSearch, savedDrafts])

	const {
		data: productData,
		isFetching: isProductLoading,
		isError: productSearchFailed,
	} = useQuery({
		queryKey: ['chat-draft-product-search', productSearch.trim()],
		queryFn: () =>
			getMarketProducts({
				data: {
					limit: 8,
					page: 1,
					search: productSearch.trim() || undefined,
				},
			}),
		enabled: editor !== null,
		staleTime: 60_000,
	})
	const products =
		productData?.products.filter(
			(product) => product.availabilityStatus !== 'out_of_stock',
		) ?? []
	const showProductMenuLoading = useDelayedVisibility(isProductLoading)

	const dirty = editor ? dirtyEditor(editor) : false
	const editorQuoteRequestItems = useMemo(
		() => (editor ? toQuoteRequestItems(editor.items) : []),
		[editor],
	)
	const editorQuoteRequestFingerprint = useMemo(
		() => JSON.stringify(editorQuoteRequestItems),
		[editorQuoteRequestItems],
	)
	const orderabilityQuery = useQuery({
		queryKey: [
			'chat-draft-orderability',
			editor?.id ?? NEW_DRAFT_KEY,
			editorQuoteRequestFingerprint,
		],
		queryFn: () =>
			validateQuoteRequestItems({
				data: { items: editorQuoteRequestItems },
			}),
		enabled: editorQuoteRequestItems.length > 0,
		staleTime: 10_000,
	})
	const validationUnavailableItems =
		orderabilityQuery.data?.unavailableItems ?? []
	const invalidItems = editor ? invalidDraftItems(editor.items) : []
	const hasUnavailableValidatedItems = validationUnavailableItems.length > 0
	const isEditorValidationPending =
		editorQuoteRequestItems.length > 0 && orderabilityQuery.isFetching
	const isEditorValidationFailed =
		editorQuoteRequestItems.length > 0 && orderabilityQuery.isError
	const hasInvalidItems =
		invalidItems.length > 0 ||
		hasUnavailableValidatedItems ||
		isEditorValidationFailed
	const invalidItemsText = isEditorValidationFailed
		? t(
				'orders.validationFailed',
				'Could not confirm catalog availability. Try again.',
			)
		: hasInvalidItems
			? t('orders.unavailableItems', {
					items:
						validationUnavailableItems.length > 0
							? validationUnavailableItems.join(', ')
							: invalidItems
									.map((item) => (isAr ? item.productNameAr : item.productName))
									.join(', '),
				})
			: null
	const canPersist = Boolean(
		editor &&
			editor.items.length > 0 &&
			!hasInvalidItems &&
			!isEditorValidationPending,
	)
	const activeDraftTitle = editor
		? editor.name.trim() || editor.reference || t('market.defaultDraftName')
		: t('orders.selectDraft', 'Select draft')
	const activeDraftMeta = editor
		? `${t('orders.items', { count: editor.items.length })} · ${formatDraftDate(editor.date, isAr)}`
		: t('orders.noDraftSelected', 'No draft selected')
	const activeDraftContext = useMemo(
		() => (editor ? activeDraftContextFromEditor(editor) : null),
		[editor],
	)

	useEffect(() => {
		if (activeDraftContext) {
			reportedDraftRef.current = true
			onActiveDraftChange?.(activeDraftContext)
			return
		}
		if (!reportedDraftRef.current) return
		reportedDraftRef.current = false
		onActiveDraftChange?.(null)
	}, [activeDraftContext, onActiveDraftChange])

	useEffect(() => {
		if (
			!activeDraftKey ||
			activeDraftKey === NEW_DRAFT_KEY ||
			!editor ||
			editor.id !== activeDraftKey ||
			dirty
		) {
			return
		}

		const serverDraft = savedDrafts.find((draft) => draft.id === activeDraftKey)
		if (!serverDraft) {
			if (!knownSavedDraftIdsRef.current.has(activeDraftKey)) return
			setActiveDraftKey(null)
			setActionsMenuOpen(false)
			setConfirmCartAddOpen(false)
			setConfirmSubmitOpen(false)
			setConfirmDeleteId(null)
			setDraftMenuOpen(false)
			setEditor(null)
			setProductMenuOpen(false)
			setProductSearch('')
			setSubmitError(null)
			return
		}

		const serverEditor = createEditorFromOrder(serverDraft)
		if (serverEditor.baseFingerprint === editor.baseFingerprint) return
		setConfirmCartAddOpen(false)
		setConfirmSubmitOpen(false)
		setEditor(serverEditor)
	}, [activeDraftKey, dirty, editor, savedDrafts])

	useEffect(() => {
		knownSavedDraftIdsRef.current = new Set(
			savedDrafts.map((draft) => draft.id),
		)
	}, [savedDrafts])

	useEffect(() => {
		function handleOpenDraft(event: Event) {
			const detail = (event as CustomEvent<PortalChatOpenDraftEventDetail>)
				.detail
			if (detail?.tempDraft) {
				setActiveDraftKey(NEW_DRAFT_KEY)
				setConfirmCartAddOpen(false)
				setConfirmSubmitOpen(false)
				setConfirmDeleteId(null)
				setDraftMenuOpen(false)
				setEditor(createEditorFromTempDraft(detail.tempDraft))
				setProductSearch('')
				setSubmitError(null)
				return
			}
			const draftId = detail?.draftId
			if (!draftId) return
			void queryClient
				.refetchQueries({
					queryKey: ['customer-orders-all'],
					type: 'active',
				})
				.finally(() => {
					setRequestedDraftId(draftId)
				})
		}

		window.addEventListener(PORTAL_CHAT_OPEN_DRAFT_EVENT, handleOpenDraft)
		return () => {
			window.removeEventListener(PORTAL_CHAT_OPEN_DRAFT_EVENT, handleOpenDraft)
		}
	}, [queryClient])

	useEffect(() => {
		if (!requestedDraftId) return
		const draft = savedDrafts.find(
			(candidate) => candidate.id === requestedDraftId,
		)
		if (!draft) return
		setActiveDraftKey(draft.id)
		setConfirmCartAddOpen(false)
		setConfirmSubmitOpen(false)
		setConfirmDeleteId(null)
		setDraftMenuOpen(false)
		setEditor(createEditorFromOrder(draft))
		setProductSearch('')
		setSubmitError(null)
		setRequestedDraftId(null)
	}, [requestedDraftId, savedDrafts])

	useEffect(() => {
		if (!actionsMenuOpen && !draftMenuOpen && !productMenuOpen) return

		function handlePointerDown(event: PointerEvent) {
			const target = event.target as Node
			if (actionsMenuOpen && !actionsMenuRef.current?.contains(target)) {
				setActionsMenuOpen(false)
			}
			if (draftMenuOpen && !draftMenuRef.current?.contains(target)) {
				setDraftMenuOpen(false)
			}
			if (productMenuOpen && !productMenuRef.current?.contains(target)) {
				setProductMenuOpen(false)
			}
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key !== 'Escape') return
			setActionsMenuOpen(false)
			setDraftMenuOpen(false)
			setProductMenuOpen(false)
		}

		document.addEventListener('pointerdown', handlePointerDown)
		document.addEventListener('keydown', handleKeyDown)
		return () => {
			document.removeEventListener('pointerdown', handlePointerDown)
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [actionsMenuOpen, draftMenuOpen, productMenuOpen])

	useEffect(() => {
		if (!submittedReference) return
		const timeout = window.setTimeout(() => {
			setSubmittedReference(null)
			setActiveDraftKey(null)
			setActionsMenuOpen(false)
			setConfirmCartAddOpen(false)
			setConfirmSubmitOpen(false)
			setConfirmDeleteId(null)
			setDraftMenuOpen(false)
			setDraftSearch('')
			setEditor(null)
			setProductMenuOpen(false)
			setProductSearch('')
			setSubmitError(null)
		}, SUBMITTED_RESET_DELAY_MS)
		return () => window.clearTimeout(timeout)
	}, [submittedReference])

	const saveMutation = useMutation({
		mutationFn: (draft: DraftEditorState) => {
			const trimmedName = draft.name.trim() || defaultDraftName
			const trimmedNotes = draft.notes.trim()
			return saveDraft({
				data: {
					draftId: draft.id ?? undefined,
					items: toQuoteRequestItems(draft.items),
					name: trimmedName,
					notes: trimmedNotes || undefined,
				},
			})
		},
		onSuccess: (result, draft) => {
			const savedEditor = {
				...draft,
				id: result.draftId,
				name: draft.name.trim() || defaultDraftName,
				notes: draft.notes.trim(),
				reference: result.reference,
				sessionKey: `draft:${result.draftId}`,
			}
			setActiveDraftKey(result.draftId)
			setConfirmCartAddOpen(false)
			setConfirmSubmitOpen(false)
			setEditor({
				...savedEditor,
				baseFingerprint: editorFingerprint(savedEditor),
			})
			queryClient.invalidateQueries({ queryKey: ['customer-orders-all'] })
			toast.success(t('orders.savedAsDraft', { ref: result.reference }))
		},
		onError: () => {
			toast.error(t('orders.saveDraftFailed'))
		},
	})

	const submitMutation = useMutation({
		mutationFn: (draft: DraftEditorState) =>
			submitQuoteRequest({
				data: {
					draftId: draft.id ?? undefined,
					idempotencyKey: crypto.randomUUID(),
					items: toQuoteRequestItems(draft.items),
					name: draft.name.trim() || defaultDraftName,
					notes: draft.notes.trim() || undefined,
				},
			}),
		onMutate: () => setSubmitError(null),
		onSuccess: (result) => {
			setActiveDraftKey(NEW_DRAFT_KEY)
			setActionsMenuOpen(false)
			setConfirmCartAddOpen(false)
			setConfirmSubmitOpen(false)
			setConfirmDeleteId(null)
			setDraftMenuOpen(false)
			setProductMenuOpen(false)
			setSubmitError(null)
			setSubmittedReference(result.reference)
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

	const deleteMutation = useMutation({
		mutationFn: (draft: DraftEditorState) => {
			if (!draft.id) throw new Error('Draft has not been saved')
			return deleteOrder({ data: { orderId: draft.id } })
		},
		onSuccess: (_result, draft) => {
			onDraftThreadClear?.(draft.sessionKey)
			setActionsMenuOpen(false)
			setConfirmCartAddOpen(false)
			setConfirmSubmitOpen(false)
			setConfirmDeleteId(null)
			setActiveDraftKey(null)
			setDraftMenuOpen(false)
			setEditor(null)
			setProductMenuOpen(false)
			setProductSearch('')
			setSubmitError(null)
			queryClient.invalidateQueries({ queryKey: ['customer-orders-all'] })
			toast.success(t('orders.draftDeleted'))
		},
		onError: () => {
			toast.error(t('orders.deleteDraftFailed'))
		},
	})

	function selectDraft(draft: Order) {
		setActiveDraftKey(draft.id)
		setConfirmCartAddOpen(false)
		setConfirmSubmitOpen(false)
		setConfirmDeleteId(null)
		setDraftMenuOpen(false)
		setEditor(createEditorFromOrder(draft))
		setProductSearch('')
		setSubmitError(null)
	}

	function startNewDraft() {
		setActiveDraftKey(NEW_DRAFT_KEY)
		setActionsMenuOpen(false)
		setConfirmCartAddOpen(false)
		setConfirmSubmitOpen(false)
		setConfirmDeleteId(null)
		setDraftMenuOpen(false)
		setEditor(createNewEditor(defaultDraftName))
		setProductMenuOpen(false)
		setProductSearch('')
		setSubmitError(null)
	}

	function saveCurrentEditor() {
		if (!editor || !canPersist || saveMutation.isPending) return
		setConfirmSubmitOpen(false)
		saveMutation.mutate(editor)
	}

	function clearEditorWorkspace() {
		if (editor) onDraftThreadClear?.(editor.sessionKey)
		setActiveDraftKey(null)
		setActionsMenuOpen(false)
		setConfirmCartAddOpen(false)
		setConfirmSubmitOpen(false)
		setConfirmDeleteId(null)
		setDraftMenuOpen(false)
		setEditor(null)
		setProductMenuOpen(false)
		setProductSearch('')
		setSubmitError(null)
		toast.success(t('orders.draftCleared', 'Draft cleared.'))
	}

	function updateEditor(
		patch: Partial<Omit<DraftEditorState, 'baseFingerprint'>>,
	) {
		setConfirmCartAddOpen(false)
		setConfirmSubmitOpen(false)
		setEditor((current) => (current ? { ...current, ...patch } : current))
	}

	function updateItem(index: number, patch: Partial<OrderItem>) {
		setConfirmCartAddOpen(false)
		setConfirmSubmitOpen(false)
		setEditor((current) => {
			if (!current) return current
			return {
				...current,
				items: current.items.map((item, itemIndex) =>
					itemIndex === index ? { ...item, ...patch } : item,
				),
			}
		})
	}

	function removeItem(index: number) {
		setConfirmCartAddOpen(false)
		setConfirmSubmitOpen(false)
		setEditor((current) => {
			if (!current) return current
			return {
				...current,
				items: current.items.filter((_, itemIndex) => itemIndex !== index),
			}
		})
	}

	function addProduct(product: MarketProduct) {
		if (product.availabilityStatus === 'out_of_stock') return
		setConfirmCartAddOpen(false)
		setConfirmSubmitOpen(false)
		setEditor((current) => {
			if (!current) return current
			const existingIndex = current.items.findIndex(
				(item) =>
					item.productId === product.id && item.category !== 'unmatched',
			)
			if (existingIndex >= 0) {
				return {
					...current,
					items: current.items.map((item, index) =>
						index === existingIndex
							? { ...item, quantity: item.quantity + 1 }
							: item,
					),
				}
			}
			return {
				...current,
				items: [...current.items, productToOrderItem(product)],
			}
		})
	}

	function addEditorToCart() {
		if (!editor || invalidDraftItems(editor.items).length > 0) return
		setActionsMenuOpen(false)
		setConfirmCartAddOpen(false)
		setConfirmSubmitOpen(false)
		editor.items.forEach((item) => {
			const productId = item.catalogProductId
			if (!productId) return
			addCartItem(
				{
					category: item.category,
					categoryName: item.category,
					categoryNameAr: item.category,
					imageUrl: item.imageUrl,
					name: item.productName,
					nameAr: item.productNameAr,
					productId,
					slug: productId,
					unitOfMeasure: item.unitOfMeasure,
					unitOfMeasureAr: item.unitOfMeasureAr,
				},
				item.quantity,
			)
		})
		toast.success(t('orders.draftAddedToCart'))
		setDraftQuoteOpen(true)
	}

	function requestAddEditorToCart() {
		if (!editor || !canPersist) return
		setActionsMenuOpen(false)
		setConfirmSubmitOpen(false)
		setConfirmCartAddOpen(true)
	}

	function requestSubmitEditor() {
		if (!editor || !canPersist || submitMutation.isPending) return
		setActionsMenuOpen(false)
		setConfirmCartAddOpen(false)
		setConfirmSubmitOpen(true)
	}

	function confirmSubmitEditor() {
		if (!editor || !canPersist || submitMutation.isPending) return
		setConfirmSubmitOpen(false)
		submitMutation.mutate(editor)
	}

	function duplicateEditor() {
		if (!editor) return
		setActionsMenuOpen(false)
		setConfirmCartAddOpen(false)
		setConfirmSubmitOpen(false)
		const name = editor.name.trim() || editor.reference || defaultDraftName
		const duplicate = {
			date: new Date().toISOString(),
			id: null,
			items: editor.items.map(itemWithoutNotes),
			name: t('orders.copyName', { name }),
			notes: editor.notes,
			reference: null,
			sessionKey: `draft:temp:${crypto.randomUUID()}`,
		}
		setActiveDraftKey(NEW_DRAFT_KEY)
		setConfirmDeleteId(null)
		setEditor({
			...duplicate,
			baseFingerprint: editorFingerprint(duplicate),
		})
	}

	function promptEditor(intent: 'notes' | 'review') {
		if (!editor || !onDraftPrompt) return
		onDraftPrompt(buildDraftPrompt(editor, intent))
		setActionsMenuOpen(false)
		setConfirmCartAddOpen(false)
		setConfirmSubmitOpen(false)
	}

	function handleDeleteEditor() {
		if (!editor) return
		const deleteKey = editor.id ?? NEW_DRAFT_KEY
		if (confirmDeleteId === deleteKey) {
			if (!editor.id) {
				clearEditorWorkspace()
				return
			}
			deleteMutation.mutate(editor)
			return
		}
		setConfirmDeleteId(deleteKey)
	}

	if (submittedReference) {
		return (
			<motion.section
				key="draft-submitted-panel"
				className={`flex min-h-0 flex-col overflow-hidden bg-[var(--p-bg)] text-[var(--p-text)] ${className}`}
				initial={shouldReduceMotion ? false : { opacity: 0.92 }}
				animate={{ opacity: 1 }}
				transition={{
					duration: shouldReduceMotion ? 0.01 : 0.18,
					ease: CHAT_DRAFT_EASE,
				}}
			>
				<SubmittedDraftPanel
					reference={submittedReference}
					shouldReduceMotion={shouldReduceMotion}
				/>
			</motion.section>
		)
	}

	return (
		<section
			className={`flex min-h-0 flex-col bg-[var(--p-bg)] text-[var(--p-text)] ${className}`}
		>
			<header className="shrink-0 border-b border-[var(--p-border)] px-4 py-3">
				<div className="flex items-center justify-between gap-3">
					<div className="min-w-0">
						<p className="truncate text-[15px] font-semibold text-[var(--p-text)]">
							{t('orders.draftWorkspace')}
						</p>
						<p className="mt-1 text-[11px] text-[var(--p-text-muted)]">
							{t('orders.items', { count: savedDrafts.length })}
						</p>
					</div>
					<div className="flex shrink-0 items-center gap-1">
						<motion.button
							type="button"
							onClick={clearEditorWorkspace}
							disabled={!editor}
							className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--p-border)] text-[#B3261E] transition-colors hover:bg-[#B3261E]/10 disabled:pointer-events-none disabled:opacity-40 dark:text-[#FF6B61] dark:hover:bg-[#FF6B61]/10"
							aria-label={t('orders.deleteClear', 'Delete / Clear')}
							whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
						>
							<Trash2 size={16} strokeWidth={1.8} />
						</motion.button>
						<motion.button
							type="button"
							onClick={saveCurrentEditor}
							disabled={!canPersist || saveMutation.isPending}
							className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--p-border)] text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)] disabled:pointer-events-none disabled:opacity-40"
							aria-label={
								saveMutation.isPending
									? t('quoteBuilder.savingDraft')
									: t('orders.save')
							}
							whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
						>
							<Save size={16} strokeWidth={1.8} />
						</motion.button>
						{headerAction}
					</div>
				</div>
				<div ref={draftMenuRef} className="relative mt-3">
					<motion.button
						type="button"
						onClick={() => setDraftMenuOpen((open) => !open)}
						aria-expanded={draftMenuOpen}
						aria-haspopup="menu"
						className="flex h-12 w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-3 text-start transition-colors hover:border-[var(--p-border-strong)]"
						whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
					>
						<span className="min-w-0">
							<span className="block truncate text-[13px] font-semibold text-[var(--p-text)]">
								{activeDraftTitle}
							</span>
							<span className="mt-0.5 block truncate text-[11px] text-[var(--p-text-muted)]">
								{activeDraftMeta}
							</span>
						</span>
						<ChevronDown
							size={16}
							strokeWidth={1.8}
							className={`shrink-0 text-[var(--p-text-muted)] transition-transform ${
								draftMenuOpen ? 'rotate-180' : ''
							}`}
						/>
					</motion.button>

					<AnimatePresence initial={false}>
						{draftMenuOpen && (
							<motion.div
								key="draft-menu"
								role="menu"
								className="absolute inset-x-0 top-full z-30 mt-2 max-h-[min(70vh,420px)] touch-pan-y overflow-y-auto overscroll-contain rounded-xl border border-[var(--p-border-strong)] bg-[var(--p-elevated)] p-2 shadow-2xl [-webkit-overflow-scrolling:touch]"
								{...chatMenuMotion(shouldReduceMotion, 'top')}
							>
								<label className="flex h-9 items-center gap-2 rounded-lg border border-[var(--p-border)] bg-[var(--p-card)] px-2 transition-colors focus-within:border-[var(--p-border-strong)]">
									<Search
										size={14}
										strokeWidth={1.7}
										className="shrink-0 text-[var(--p-text-muted)]"
									/>
									<input
										value={draftSearch}
										onChange={(event) =>
											setDraftSearch(event.currentTarget.value)
										}
										placeholder={t('orders.searchDrafts')}
										className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--p-text)] outline-none placeholder:text-[var(--p-text-faint)]"
										type="search"
									/>
								</label>

								<div className="mt-2 space-y-1">
									{isLoading ? (
										showDraftMenuLoading ? (
											<MenuLoadingState
												label={t('common.loading', 'Loading...')}
											/>
										) : (
											<div className="h-11" aria-hidden="true" />
										)
									) : isError ? (
										<div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--p-border)] bg-[var(--p-card)] p-2">
											<div className="flex min-w-0 items-center gap-2 text-[12px] text-[var(--p-text-muted)]">
												<AlertTriangle size={14} strokeWidth={1.7} />
												<span className="truncate">{t('orders.error')}</span>
											</div>
											<button
												type="button"
												onClick={() => refetch()}
												className="shrink-0 text-[12px] font-semibold text-[var(--p-text)]"
											>
												{t('orders.retry')}
											</button>
										</div>
									) : visibleDrafts.length === 0 ? (
										<button
											type="button"
											onClick={startNewDraft}
											className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--p-border)] text-[12px] font-semibold text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
										>
											<Plus size={14} strokeWidth={1.7} />
											{t('orders.newDraft')}
										</button>
									) : (
										visibleDrafts.map((draft) => {
											const isActive = activeDraftKey === draft.id
											const title =
												draft.name ??
												draft.reference ??
												t('market.defaultDraftName')
											return (
												<button
													key={draft.id}
													type="button"
													onClick={() => selectDraft(draft)}
													className={`flex h-12 w-full min-w-0 items-center gap-2 rounded-lg px-2 text-start transition-colors ${
														isActive
															? 'bg-[var(--p-accent-dim)] text-[var(--p-accent)]'
															: 'text-[var(--p-text)] hover:bg-[var(--p-hover)]'
													}`}
												>
													<FilePenLine
														size={14}
														strokeWidth={1.7}
														className="shrink-0"
													/>
													<span className="min-w-0 flex-1">
														<span className="block truncate text-[12px] font-semibold">
															{title}
														</span>
														<span className="block truncate text-[10px] text-[var(--p-text-muted)]">
															{formatDraftDate(draft.date, isAr)}
														</span>
													</span>
													<span className="voice-mono shrink-0 text-[10px] text-[var(--p-text-muted)]">
														{draft.itemCount}
													</span>
												</button>
											)
										})
									)}
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</header>

			<div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 py-4 [-webkit-overflow-scrolling:touch]">
				<AnimatePresence mode="wait" initial={false}>
					{editor ? (
						<motion.div
							key={activeDraftKey ?? 'draft-editor'}
							className="space-y-4"
							{...chatFadeMotion(shouldReduceMotion)}
						>
							<div className="space-y-3">
								<label className="block">
									<span className="mb-1.5 block text-[11px] font-semibold text-[var(--p-text-muted)]">
										{t('market.draftNameLabel')}
									</span>
									<input
										value={editor.name}
										onChange={(event) =>
											updateEditor({ name: event.currentTarget.value })
										}
										placeholder={t('orders.orderName')}
										className="h-10 w-full rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-3 text-[13px] font-semibold text-[var(--p-text)] outline-none transition-colors placeholder:text-[var(--p-text-faint)] focus:border-[var(--p-border-strong)]"
									/>
								</label>

								<label className="block">
									<span className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-semibold text-[var(--p-text-muted)]">
										<span>{t('market.cartNotesLabel')}</span>
										{editor.notes.trim() && (
											<CopyButton text={editor.notes.trim()} />
										)}
									</span>
									<textarea
										value={editor.notes}
										onChange={(event) =>
											updateEditor({ notes: event.currentTarget.value })
										}
										rows={3}
										placeholder={t('market.cartNotesPlaceholder')}
										className="min-h-20 w-full resize-none rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-3 py-2 text-[13px] leading-5 text-[var(--p-text)] outline-none transition-colors placeholder:text-[var(--p-text-faint)] focus:border-[var(--p-border-strong)]"
									/>
								</label>
							</div>

							<div>
								<div className="mb-2 flex items-center justify-between gap-2">
									<p className="text-[12px] font-semibold text-[var(--p-text)]">
										{t('orders.items', { count: editor.items.length })}
									</p>
									{dirty && (
										<motion.span
											className="rounded-full border border-[var(--p-border)] px-2 py-1 text-[10px] font-semibold text-[var(--p-text-muted)]"
											{...chatFadeMotion(shouldReduceMotion)}
										>
											{t('orders.unsaved')}
										</motion.span>
									)}
								</div>

								{editor.items.length === 0 ? (
									<div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-[var(--p-border)] text-center text-[12px] text-[var(--p-text-muted)]">
										{t('orders.emptyOrder')}
									</div>
								) : (
									<div className="space-y-2">
										<AnimatePresence initial={false}>
											{editor.items.map((item, index) => (
												<DraftItemEditor
													key={`${item.productId}:${item.productName}:${item.unitOfMeasure}`}
													item={item}
													index={index}
													isAr={isAr}
													onRemove={() => removeItem(index)}
													onUpdate={(patch) => updateItem(index, patch)}
												/>
											))}
										</AnimatePresence>
									</div>
								)}
							</div>

							<div ref={productMenuRef} className="relative">
								<motion.button
									type="button"
									onClick={() => setProductMenuOpen((open) => !open)}
									aria-expanded={productMenuOpen}
									aria-haspopup="menu"
									className="flex h-10 w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-3 text-start transition-colors hover:border-[var(--p-border-strong)]"
									whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
								>
									<span className="flex min-w-0 items-center gap-2">
										<Search
											size={15}
											strokeWidth={1.7}
											className="shrink-0 text-[var(--p-text-muted)]"
										/>
										<span className="truncate text-[12px] font-semibold text-[var(--p-text)]">
											{t('orders.searchProducts')}
										</span>
									</span>
									<ChevronDown
										size={15}
										strokeWidth={1.8}
										className={`shrink-0 text-[var(--p-text-muted)] transition-transform ${
											productMenuOpen ? 'rotate-180' : ''
										}`}
									/>
								</motion.button>

								<AnimatePresence initial={false}>
									{productMenuOpen && (
										<motion.div
											key="product-menu"
											role="menu"
											className="mt-2 overflow-hidden rounded-xl border border-[var(--p-border-strong)] bg-[var(--p-card)] p-2"
											{...chatMenuMotion(shouldReduceMotion, 'top')}
										>
											<label className="flex h-9 items-center gap-2 rounded-lg border border-[var(--p-border)] bg-[var(--p-bg)] px-2 transition-colors focus-within:border-[var(--p-border-strong)]">
												<Search
													size={14}
													strokeWidth={1.7}
													className="shrink-0 text-[var(--p-text-muted)]"
												/>
												<input
													value={productSearch}
													onChange={(event) =>
														setProductSearch(event.currentTarget.value)
													}
													placeholder={t('orders.searchProducts')}
													className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--p-text)] outline-none placeholder:text-[var(--p-text-faint)]"
													type="search"
												/>
											</label>
											<div className="mt-2 max-h-72 touch-pan-y space-y-2 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
												{productSearchFailed ? (
													<p className="py-3 text-center text-[12px] text-[var(--p-error)]">
														{t('orders.error')}
													</p>
												) : isProductLoading ? (
													showProductMenuLoading ? (
														<MenuLoadingState
															label={t('common.loading', 'Loading...')}
															size="comfortable"
														/>
													) : (
														<div className="min-h-24" aria-hidden="true" />
													)
												) : products.length === 0 ? (
													<p className="py-3 text-center text-[12px] text-[var(--p-text-muted)]">
														{t('orders.noProducts')}
													</p>
												) : (
													products.map((product) => (
														<ProductResult
															key={product.id}
															product={product}
															isAr={isAr}
															onAdd={() => {
																addProduct(product)
																setProductMenuOpen(false)
															}}
														/>
													))
												)}
											</div>
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						</motion.div>
					) : (
						<motion.div
							key="draft-empty"
							className="flex min-h-full flex-col items-center justify-center text-center"
							{...chatFadeMotion(shouldReduceMotion)}
						>
							<FilePenLine
								size={28}
								strokeWidth={1.5}
								className="mb-3 text-[var(--p-text-faint)]"
							/>
							<p className="text-[14px] font-semibold text-[var(--p-text)]">
								{t('orders.noDraftSelected', 'No draft selected')}
							</p>
							<motion.button
								type="button"
								onClick={startNewDraft}
								className="mt-4 flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--p-accent)] px-4 text-[12px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90"
								whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
							>
								<Plus size={15} strokeWidth={1.7} />
								{t('orders.newDraft')}
							</motion.button>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{invalidItemsText && (
				<p className="shrink-0 border-t border-[var(--p-border)] px-4 py-2 text-[12px] font-medium text-[var(--p-error)]">
					{invalidItemsText}
				</p>
			)}

			{submitError && (
				<p className="shrink-0 border-t border-[var(--p-border)] px-4 py-2 text-[12px] font-medium text-[var(--p-error)]">
					{submitError}
				</p>
			)}

			{editor && (
				<footer className="shrink-0 border-t border-[var(--p-border)] px-4 py-3">
					<AnimatePresence initial={false}>
						{confirmSubmitOpen && (
							<motion.div
								key="submit-confirm"
								className="mb-2 overflow-hidden rounded-xl border border-[var(--p-border-strong)] bg-[var(--p-card)] p-2"
								{...chatRevealMotion(shouldReduceMotion)}
							>
								<p className="text-[12px] font-semibold text-[var(--p-text)]">
									{t('market.confirmSubmitTitle')}
								</p>
								<p className="mt-1 text-[11px] leading-4 text-[var(--p-text-muted)]">
									{t('market.confirmSubmitBody')}
								</p>
								<div className="mt-2 grid grid-cols-2 gap-2">
									<motion.button
										type="button"
										onClick={() => setConfirmSubmitOpen(false)}
										className="flex h-9 items-center justify-center rounded-lg border border-[var(--p-border)] text-[12px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)]"
										whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
									>
										{t('orders.cancel')}
									</motion.button>
									<motion.button
										type="button"
										onClick={confirmSubmitEditor}
										className="flex h-9 items-center justify-center rounded-lg bg-[var(--p-accent)] text-[12px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90"
										whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
									>
										{t('market.confirmSubmitAction')}
									</motion.button>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
					<AnimatePresence initial={false}>
						{confirmCartAddOpen && (
							<motion.div
								key="cart-add-confirm"
								className="mb-2 overflow-hidden rounded-xl border border-[var(--p-border-strong)] bg-[var(--p-card)] p-2"
								{...chatRevealMotion(shouldReduceMotion)}
							>
								<p className="text-[12px] font-semibold text-[var(--p-text)]">
									{t('orders.confirmAddToCart')}
								</p>
								<p className="mt-1 text-[11px] leading-4 text-[var(--p-text-muted)]">
									{t('orders.confirmAddToCartBody', {
										count: editor.items.length,
									})}
								</p>
								<div className="mt-2 grid grid-cols-2 gap-2">
									<motion.button
										type="button"
										onClick={() => setConfirmCartAddOpen(false)}
										className="flex h-9 items-center justify-center rounded-lg border border-[var(--p-border)] text-[12px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)]"
										whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
									>
										{t('orders.cancel')}
									</motion.button>
									<motion.button
										type="button"
										onClick={addEditorToCart}
										className="flex h-9 items-center justify-center rounded-lg bg-[var(--p-accent)] text-[12px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90"
										whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
									>
										{t('market.confirm')}
									</motion.button>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
					<div className="grid grid-cols-[minmax(0,1fr)_40px_40px_40px] gap-2">
						<motion.button
							type="button"
							onClick={requestSubmitEditor}
							disabled={!canPersist || submitMutation.isPending}
							className="flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl bg-[var(--p-accent)] px-3 text-[12px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-45"
							whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
						>
							<Send size={14} strokeWidth={1.7} />
							<span className="truncate">
								{submitMutation.isPending
									? t('quoteBuilder.submitting')
									: t('orders.submit')}
							</span>
						</motion.button>
						<motion.button
							type="button"
							onClick={requestAddEditorToCart}
							disabled={!canPersist}
							className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--p-border)] text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)] disabled:pointer-events-none disabled:opacity-45"
							aria-label={t('orders.addToCart')}
							whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
						>
							<ShoppingCart size={15} strokeWidth={1.7} />
						</motion.button>
						<motion.button
							type="button"
							onClick={() => setDraftQuoteOpen(true)}
							className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--p-border)] text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)]"
							aria-label={t('market.openCart')}
							whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
						>
							<PanelRightOpen size={15} strokeWidth={1.7} />
						</motion.button>
						<div ref={actionsMenuRef} className="relative">
							<motion.button
								type="button"
								onClick={() => setActionsMenuOpen((open) => !open)}
								aria-expanded={actionsMenuOpen}
								aria-haspopup="menu"
								className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--p-border)] text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)]"
								aria-label={t('orders.moreActions', 'More actions')}
								whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
							>
								<MoreHorizontal size={16} strokeWidth={1.8} />
							</motion.button>

							<AnimatePresence initial={false}>
								{actionsMenuOpen && (
									<motion.div
										key="actions-menu"
										role="menu"
										className="absolute right-0 bottom-full z-30 mb-2 w-[min(240px,calc(100vw-2rem))] rounded-xl border border-[var(--p-border-strong)] bg-[var(--p-elevated)] p-2 shadow-2xl"
										{...chatMenuMotion(shouldReduceMotion, 'bottom')}
									>
										<button
											type="button"
											onClick={() => promptEditor('review')}
											disabled={editor.items.length === 0 || !onDraftPrompt}
											className="flex h-9 w-full min-w-0 items-center gap-2 rounded-lg px-2 text-start text-[12px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)] disabled:pointer-events-none disabled:opacity-45"
										>
											<MessageSquareText size={14} strokeWidth={1.7} />
											<span className="truncate">
												{t('orders.reviewWithLyon')}
											</span>
										</button>
										<button
											type="button"
											onClick={() => promptEditor('notes')}
											disabled={editor.items.length === 0 || !onDraftPrompt}
											className="flex h-9 w-full min-w-0 items-center gap-2 rounded-lg px-2 text-start text-[12px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)] disabled:pointer-events-none disabled:opacity-45"
										>
											<FilePenLine size={14} strokeWidth={1.7} />
											<span className="truncate">
												{t('orders.writeNotesWithLyon')}
											</span>
										</button>
										<button
											type="button"
											onClick={duplicateEditor}
											disabled={editor.items.length === 0}
											className="flex h-9 w-full min-w-0 items-center gap-2 rounded-lg px-2 text-start text-[12px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)] disabled:pointer-events-none disabled:opacity-45"
										>
											<Copy size={14} strokeWidth={1.7} />
											<span className="truncate">{t('orders.duplicate')}</span>
										</button>
										<button
											type="button"
											onClick={handleDeleteEditor}
											disabled={deleteMutation.isPending}
											className={`flex h-9 w-full min-w-0 items-center gap-2 rounded-lg px-2 text-start text-[12px] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45 ${
												confirmDeleteId === (editor.id ?? NEW_DRAFT_KEY)
													? 'bg-[#B3261E] text-white hover:bg-[#9F201B]'
													: 'text-[#B3261E] hover:bg-[#B3261E]/10 dark:text-[#FF6B61] dark:hover:bg-[#FF6B61]/10'
											}`}
										>
											{confirmDeleteId === (editor.id ?? NEW_DRAFT_KEY) ? (
												<Check size={14} strokeWidth={1.8} />
											) : (
												<Trash2 size={14} strokeWidth={1.7} />
											)}
											<span className="truncate">
												{confirmDeleteId === (editor.id ?? NEW_DRAFT_KEY)
													? t('orders.confirmDeleteClear', 'Confirm')
													: t('orders.deleteClear', 'Delete / Clear')}
											</span>
										</button>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					</div>
				</footer>
			)}
		</section>
	)
}

function SubmittedDraftPanel({
	reference,
	shouldReduceMotion,
}: {
	reference: string
	shouldReduceMotion: boolean | null
}) {
	const { t } = useTranslation('portal')

	return (
		<div className="flex min-h-0 flex-1 items-center justify-center px-6 py-10 text-center">
			<motion.div
				className="flex max-w-[280px] flex-col items-center"
				initial={
					shouldReduceMotion ? false : { opacity: 0, y: 14, scale: 0.98 }
				}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				transition={{
					duration: shouldReduceMotion ? 0.01 : 0.28,
					ease: CHAT_DRAFT_EASE,
				}}
			>
				<motion.div
					className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[var(--p-text)] text-[var(--p-bg)] shadow-[0_18px_45px_-24px_rgba(0,0,0,0.9)]"
					initial={shouldReduceMotion ? false : { scale: 0.82 }}
					animate={{ scale: 1 }}
					transition={{
						delay: shouldReduceMotion ? 0 : 0.04,
						duration: shouldReduceMotion ? 0.01 : 0.32,
						ease: CHAT_DRAFT_EASE,
					}}
				>
					<motion.span
						aria-hidden="true"
						className="absolute inset-0 rounded-full border border-[var(--p-border)]"
						initial={shouldReduceMotion ? false : { opacity: 0.42, scale: 1 }}
						animate={
							shouldReduceMotion
								? { opacity: 0.24, scale: 1 }
								: { opacity: 0, scale: 1.55 }
						}
						transition={{
							delay: shouldReduceMotion ? 0 : 0.1,
							duration: shouldReduceMotion ? 0.01 : 0.75,
							ease: 'easeOut',
						}}
					/>
					<motion.div
						initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.86 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{
							delay: shouldReduceMotion ? 0 : 0.16,
							duration: shouldReduceMotion ? 0.01 : 0.22,
							ease: CHAT_DRAFT_EASE,
						}}
					>
						<Check size={38} strokeWidth={2.1} />
					</motion.div>
				</motion.div>
				<motion.p
					className="mt-5 text-[20px] font-semibold text-[var(--p-text)]"
					initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						delay: shouldReduceMotion ? 0 : 0.18,
						duration: shouldReduceMotion ? 0.01 : 0.18,
						ease: CHAT_DRAFT_EASE,
					}}
				>
					{t('orders.draftSubmitted')}
				</motion.p>
				<motion.p
					className="mt-2 text-[12px] font-medium text-[var(--p-text-muted)]"
					initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						delay: shouldReduceMotion ? 0 : 0.24,
						duration: shouldReduceMotion ? 0.01 : 0.18,
						ease: CHAT_DRAFT_EASE,
					}}
				>
					{t('orders.draftSubmittedReady', { ref: reference })}
				</motion.p>
			</motion.div>
		</div>
	)
}

function MenuLoadingState({
	label,
	size = 'compact',
}: {
	label: string
	size?: 'compact' | 'comfortable'
}) {
	const shouldReduceMotion = useReducedMotion()

	return (
		<motion.div
			className={[
				'flex items-center justify-center gap-2 rounded-lg text-[12px] font-medium text-[var(--p-text-muted)]',
				size === 'comfortable' ? 'min-h-24' : 'h-11',
			].join(' ')}
			{...chatFadeMotion(shouldReduceMotion)}
		>
			<span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--p-border)] border-t-[var(--p-accent)]" />
			<span>{label}</span>
		</motion.div>
	)
}

function DraftItemEditor({
	index,
	isAr,
	item,
	onRemove,
	onUpdate,
}: {
	index: number
	isAr: boolean
	item: OrderItem
	onRemove: () => void
	onUpdate: (patch: Partial<OrderItem>) => void
}) {
	const { t } = useTranslation('portal')
	const shouldReduceMotion = useReducedMotion()
	const name = isAr ? item.productNameAr : item.productName
	const unit =
		isAr && item.unitOfMeasureAr ? item.unitOfMeasureAr : item.unitOfMeasure
	const itemUnavailable =
		item.isOrderable === false || item.isUnmatched || !item.catalogProductId

	return (
		<motion.div
			className={`flex min-w-0 items-center gap-2 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-2 ${
				itemUnavailable ? 'opacity-55' : ''
			}`}
			{...chatFadeMotion(shouldReduceMotion)}
		>
			<OrderItemImage imageUrl={item.imageUrl} />
			<div className="min-w-0 flex-1">
				<p className="truncate text-[12px] font-semibold text-[var(--p-text)]">
					{name}
				</p>
				{itemUnavailable && (
					<span className="mt-1 inline-flex rounded-full border border-[var(--p-error)]/25 px-2 py-0.5 text-[10px] font-semibold text-[var(--p-error)]">
						{t('market.outOfStock')}
					</span>
				)}
			</div>
			<label className="flex h-9 w-[112px] shrink-0 items-center justify-end gap-2 rounded-lg border border-[var(--p-border)] bg-[var(--p-bg)] px-2 transition-colors focus-within:border-[var(--p-border-strong)]">
				<span className="sr-only">{t('chat.qty')}</span>
				<input
					value={item.quantity}
					onChange={(event) => {
						const quantity = Number.parseInt(event.currentTarget.value, 10)
						if (Number.isFinite(quantity) && quantity > 0) {
							onUpdate({ quantity })
						}
					}}
					min={1}
					type="number"
					inputMode="numeric"
					className="h-full min-w-0 flex-1 bg-transparent text-end text-[13px] font-semibold tabular-nums text-[var(--p-text)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
					aria-label={t('quoteBuilder.quantityFor', { name })}
				/>
				<span className="max-w-12 truncate text-[11px] text-[var(--p-text-muted)]">
					{unit}
				</span>
			</label>
			<motion.button
				type="button"
				onClick={onRemove}
				className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-error)]"
				aria-label={t('quoteBuilder.removeItem', { name })}
				whileTap={shouldReduceMotion ? undefined : { scale: 0.92 }}
			>
				<X size={14} strokeWidth={1.7} />
			</motion.button>
			<span className="sr-only">{index + 1}</span>
		</motion.div>
	)
}

function ProductResult({
	isAr,
	onAdd,
	product,
}: {
	isAr: boolean
	onAdd: () => void
	product: MarketProduct
}) {
	const { t } = useTranslation('portal')
	const shouldReduceMotion = useReducedMotion()
	const name = isAr ? product.nameAr : product.name
	const category =
		isAr && product.categoryNameAr
			? product.categoryNameAr
			: product.categoryName
	const unit =
		isAr && product.unitOfMeasureAr
			? product.unitOfMeasureAr
			: product.unitOfMeasure

	return (
		<motion.div
			className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] p-2"
			{...chatFadeMotion(shouldReduceMotion)}
		>
			<OrderItemImage imageUrl={product.imageUrl} />
			<div className="min-w-0 flex-1">
				<p className="truncate text-[12px] font-semibold text-[var(--p-text)]">
					{name}
				</p>
				<p className="mt-1 truncate text-[10px] text-[var(--p-text-muted)]">
					{category} · {unit}
				</p>
			</div>
			<motion.button
				type="button"
				onClick={onAdd}
				className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--p-accent)] text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90"
				aria-label={t('orders.addItem')}
				whileTap={shouldReduceMotion ? undefined : { scale: 0.92 }}
			>
				<Plus size={14} strokeWidth={1.8} />
			</motion.button>
		</motion.div>
	)
}

function CopyButton({ text }: { text: string }) {
	const { t } = useTranslation('portal')
	const shouldReduceMotion = useReducedMotion()

	async function copyText() {
		await navigator.clipboard.writeText(text)
		toast.success(t('orders.notesCopied'))
	}

	return (
		<motion.button
			type="button"
			onClick={copyText}
			className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
			aria-label={t('orders.copyNotes')}
			whileTap={shouldReduceMotion ? undefined : { scale: 0.92 }}
		>
			<Copy size={13} strokeWidth={1.7} />
		</motion.button>
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
