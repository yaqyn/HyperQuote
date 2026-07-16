import { applyQuoteCartSnapshot } from '@hyperquote/quote-cart'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	AlertTriangle,
	Check,
	ChevronDown,
	Copy,
	FilePenLine,
	FolderKanban,
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
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
	type ActiveChatDraftContext,
	type ChatTempDraftData,
	PORTAL_CHAT_OPEN_DRAFT_EVENT,
	type PortalChatOpenDraftEventDetail,
} from '../../lib/chat-types'
import { getMarketProducts, type MarketProduct } from '../../lib/server/market'
import { deleteOrder, getAllCustomerOrders } from '../../lib/server/orders'
import { getCustomerProjects } from '../../lib/server/projects'
import {
	saveDraft,
	validateQuoteRequestItems,
} from '../../lib/server/quote-requests'
import { toast } from '../../lib/toast'
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
	resetSelectionToken?: number
}

interface DraftEditorState {
	baseFingerprint: string
	date: string
	id: string | null
	items: OrderItem[]
	name: string
	notes: string
	projectId: string | null
	reference: string | null
	sessionKey: string
}

const NEW_DRAFT_KEY = '__new_draft__'
const CHAT_DRAFT_EASE = cubicBezier(0.22, 1, 0.36, 1)
const CHAT_DRAFT_WORKSPACE_STORAGE_KEY = 'hq-portal-chat-draft-workspace:v1'

interface PersistedDraftWorkspace {
	activeDraftKey: string
	editor: DraftEditorState
}

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
		projectId: editor.projectId,
	})
}

function dirtyEditor(editor: DraftEditorState): boolean {
	return editorFingerprint(editor) !== editor.baseFingerprint
}

function draftWorkspaceStorage(): Storage | null {
	if (typeof window === 'undefined') return null
	try {
		return window.sessionStorage
	} catch {
		return null
	}
}

function readStringField(
	value: Record<string, unknown>,
	key: string,
): string | null {
	return typeof value[key] === 'string' ? value[key] : null
}

function readNullableStringField(
	value: Record<string, unknown>,
	key: string,
): string | null | undefined {
	if (value[key] === null) return null
	return typeof value[key] === 'string' ? value[key] : undefined
}

function readPersistedOrderItem(value: unknown): OrderItem | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null
	const item = value as Record<string, unknown>
	const productId = readStringField(item, 'productId')
	const productName = readStringField(item, 'productName')
	const productNameAr = readStringField(item, 'productNameAr')
	const unitOfMeasure = readStringField(item, 'unitOfMeasure')
	const unitOfMeasureAr = readStringField(item, 'unitOfMeasureAr')
	const quantity = item.quantity
	if (
		!productId ||
		!productName ||
		!productNameAr ||
		!unitOfMeasure ||
		!unitOfMeasureAr ||
		typeof quantity !== 'number' ||
		!Number.isFinite(quantity) ||
		quantity <= 0
	) {
		return null
	}
	const category = readStringField(item, 'category')
	const catalogProductId = readNullableStringField(item, 'catalogProductId')
	const imageUrl = readStringField(item, 'imageUrl')
	const availabilityStatus = readStringField(item, 'availabilityStatus')
	return {
		availabilityStatus: availabilityStatus ?? 'available',
		catalogProductId: catalogProductId ?? productId,
		category: category ?? 'catalog',
		imageUrl: imageUrl ?? '',
		isOrderable: item.isOrderable !== false,
		isUnmatched: item.isUnmatched === true,
		productId,
		productName,
		productNameAr,
		quantity,
		unitOfMeasure,
		unitOfMeasureAr,
	}
}

function readPersistedDraftWorkspace(): PersistedDraftWorkspace | null {
	const storage = draftWorkspaceStorage()
	if (!storage) return null
	try {
		const raw = storage.getItem(CHAT_DRAFT_WORKSPACE_STORAGE_KEY)
		if (!raw) return null
		const parsed: unknown = JSON.parse(raw)
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return null
		}
		const workspace = parsed as Record<string, unknown>
		const activeDraftKey = readStringField(workspace, 'activeDraftKey')
		const rawEditor = workspace.editor
		if (
			!activeDraftKey ||
			!rawEditor ||
			typeof rawEditor !== 'object' ||
			Array.isArray(rawEditor)
		) {
			return null
		}
		const editorValue = rawEditor as Record<string, unknown>
		const date = readStringField(editorValue, 'date')
		const id = readNullableStringField(editorValue, 'id')
		const name = readStringField(editorValue, 'name')
		const notes = readStringField(editorValue, 'notes')
		const projectId = readNullableStringField(editorValue, 'projectId') ?? null
		const reference = readNullableStringField(editorValue, 'reference')
		const sessionKey = readStringField(editorValue, 'sessionKey')
		const rawItems = editorValue.items
		if (
			!date ||
			id === undefined ||
			name === null ||
			notes === null ||
			reference === undefined ||
			!sessionKey ||
			!Array.isArray(rawItems)
		) {
			return null
		}
		const items = rawItems.flatMap((item) => {
			const restored = readPersistedOrderItem(item)
			return restored ? [restored] : []
		})
		if (items.length !== rawItems.length) return null
		const editor = {
			date,
			id,
			items,
			name,
			notes,
			projectId,
			reference,
			sessionKey,
		}
		return {
			activeDraftKey,
			editor: {
				...editor,
				baseFingerprint: editorFingerprint(editor),
			},
		}
	} catch {
		return null
	}
}

function writePersistedDraftWorkspace(
	workspace: PersistedDraftWorkspace | null,
) {
	const storage = draftWorkspaceStorage()
	if (!storage) return
	try {
		if (!workspace) {
			storage.removeItem(CHAT_DRAFT_WORKSPACE_STORAGE_KEY)
			return
		}
		storage.setItem(CHAT_DRAFT_WORKSPACE_STORAGE_KEY, JSON.stringify(workspace))
	} catch {
		// Browser storage is best-effort; live component state remains authoritative.
	}
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
		projectId: order.projectId ?? null,
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
		projectId: null,
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
		projectId: null,
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
	projectName: string | null,
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
		projectId: editor.projectId,
		projectName,
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
	resetSelectionToken = 0,
}: ChatDraftsPanelProps) {
	const { t, i18n } = useTranslation('portal')
	const queryClient = useQueryClient()
	const isAr = i18n.language === 'ar'
	const shouldReduceMotion = useReducedMotion()
	const addCartItem = useDraftQuoteStore((s) => s.add)
	const cartItems = useDraftQuoteStore((s) => s.items)
	const cartGlobalNote = useDraftQuoteStore((s) => s.globalNote)
	const clearCart = useDraftQuoteStore((s) => s.clear)
	const removeCartItem = useDraftQuoteStore((s) => s.remove)
	const setCartGlobalNote = useDraftQuoteStore((s) => s.setGlobalNote)
	const updateCartQuantity = useDraftQuoteStore((s) => s.updateQuantity)
	const setDraftQuoteOpen = usePortalStore((s) => s.setDraftQuoteOpen)
	const setPendingProjectId = usePortalStore((s) => s.setPendingProjectId)
	const setPendingQuoteDraftId = usePortalStore((s) => s.setPendingQuoteDraftId)
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
	const [restoredWorkspace] = useState(() => readPersistedDraftWorkspace())
	const [activeDraftKey, setActiveDraftKey] = useState<string | null>(
		restoredWorkspace?.activeDraftKey ?? null,
	)
	const [actionsMenuOpen, setActionsMenuOpen] = useState(false)
	const [confirmCartAddOpen, setConfirmCartAddOpen] = useState(false)
	const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false)
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
	const [draftMenuOpen, setDraftMenuOpen] = useState(false)
	const [draftSearch, setDraftSearch] = useState('')
	const [editor, setEditor] = useState<DraftEditorState | null>(
		restoredWorkspace?.editor ?? null,
	)
	const [productMenuOpen, setProductMenuOpen] = useState(false)
	const [productSearch, setProductSearch] = useState('')
	const [requestedDraftId, setRequestedDraftId] = useState<string | null>(null)

	const { data, isError, isLoading, refetch } = useQuery({
		queryKey: ['customer-orders-all'],
		queryFn: () => getAllCustomerOrders(),
		staleTime: 30_000,
	})
	const { data: projects = [] } = useQuery({
		queryFn: () => getCustomerProjects(),
		queryKey: ['customer-projects'],
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
		writePersistedDraftWorkspace(null)
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
		onActiveDraftChange?.(null)
	}, [onActiveDraftChange, resetSelectionToken])

	useEffect(() => {
		if (!editor) {
			writePersistedDraftWorkspace(null)
			return
		}
		writePersistedDraftWorkspace({
			activeDraftKey: activeDraftKey ?? editor.id ?? NEW_DRAFT_KEY,
			editor,
		})
	}, [activeDraftKey, editor])

	const savedDrafts = useMemo(
		() => data?.orders.filter((order) => order.type === 'saved') ?? [],
		[data?.orders],
	)
	const visibleDrafts = useMemo(() => {
		const query = draftSearch.trim().toLowerCase()
		if (!query) return savedDrafts
		return savedDrafts.filter((draft) => {
			const projectName = projects.find(
				(project) => project.id === draft.projectId,
			)?.name
			const haystack = [
				draft.name,
				draft.reference,
				draft.notes,
				projectName,
				...draft.items.map((item) => item.productName),
				...draft.items.map((item) => item.productNameAr),
			]
				.filter(Boolean)
				.join(' ')
				.toLowerCase()
			return haystack.includes(query)
		})
	}, [draftSearch, projects, savedDrafts])
	const visibleDraftGroups = useMemo(() => {
		const groups: Array<{
			drafts: Order[]
			id: string | null
			name: string
		}> = projects.flatMap((project) => {
			const drafts = visibleDrafts.filter(
				(draft) => draft.projectId === project.id,
			)
			return drafts.length > 0
				? [{ drafts, id: project.id, name: project.name }]
				: []
		})
		const projectIds = new Set(projects.map((project) => project.id))
		const independent = visibleDrafts.filter(
			(draft) => !draft.projectId || !projectIds.has(draft.projectId),
		)
		if (independent.length > 0) {
			groups.push({
				drafts: independent,
				id: null,
				name: t('projectsPage.independent'),
			})
		}
		return groups
	}, [projects, t, visibleDrafts])

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
		enabled: editor !== null || productMenuOpen,
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
		: t('market.cart')
	const activeDraftMeta = editor
		? `${t('orders.items', { count: editor.items.length })} · ${formatDraftDate(editor.date, isAr)}`
		: t('market.cartItemCount', { count: cartItems.length })
	const activeProjectName = editor?.projectId
		? (projects.find((project) => project.id === editor.projectId)?.name ??
			null)
		: null
	const activeDraftContext = useMemo(
		() =>
			editor
				? activeDraftContextFromEditor(editor, activeProjectName)
				: {
						dirty: cartItems.length > 0 || cartGlobalNote.trim().length > 0,
						id: null,
						items: cartItems.slice(0, 40).map((item, index) => ({
							lineId: `cart:${index}:${item.productId}`,
							orderable: true,
							productId: item.productId,
							productName: item.name,
							productNameAr: item.nameAr,
							quantity: item.quantity,
							unitOfMeasure: item.unitOfMeasure,
							unitOfMeasureAr: item.unitOfMeasureAr,
						})),
						name: t('market.cart'),
						notes: cartGlobalNote.trim().slice(0, 600),
						projectId: null,
						projectName: null,
						reference: null,
						sessionKey: 'cart',
					},
		[activeProjectName, cartGlobalNote, cartItems, editor, t],
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

	const applyTempDraftToCart = useCallback(
		(draft: ChatTempDraftData) => {
			applyQuoteCartSnapshot(useDraftQuoteStore, {
				globalNote: draft.notes,
				items: draft.items.map((item) => ({
					category: item.category,
					categoryName: item.category,
					categoryNameAr: item.category,
					imageUrl: item.imageUrl,
					name: item.productName,
					nameAr: item.productNameAr,
					note: '',
					productId: item.productId,
					quantity: item.quantity,
					slug: item.productId,
					unitOfMeasure: item.unitOfMeasure,
					unitOfMeasureAr: item.unitOfMeasureAr,
				})),
			})
			writePersistedDraftWorkspace(null)
			setActiveDraftKey(null)
			setActionsMenuOpen(false)
			setConfirmCartAddOpen(false)
			setConfirmSubmitOpen(false)
			setConfirmDeleteId(null)
			setDraftMenuOpen(false)
			setEditor(null)
			setProductSearch('')
			if (draft.items.length === 0 && !draft.notes.trim()) {
				onDraftThreadClear?.('cart')
			}
		},
		[onDraftThreadClear],
	)

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
			writePersistedDraftWorkspace(null)
			setActiveDraftKey(null)
			setActionsMenuOpen(false)
			setConfirmCartAddOpen(false)
			setConfirmSubmitOpen(false)
			setConfirmDeleteId(null)
			setDraftMenuOpen(false)
			setEditor(null)
			setProductMenuOpen(false)
			setProductSearch('')
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
				if (detail.tempDraft.sessionKey === 'cart') {
					applyTempDraftToCart(detail.tempDraft)
					return
				}
				const nextEditor = createEditorFromTempDraft(detail.tempDraft)
				writePersistedDraftWorkspace({
					activeDraftKey: NEW_DRAFT_KEY,
					editor: nextEditor,
				})
				setActiveDraftKey(NEW_DRAFT_KEY)
				setConfirmCartAddOpen(false)
				setConfirmSubmitOpen(false)
				setConfirmDeleteId(null)
				setDraftMenuOpen(false)
				setEditor(nextEditor)
				setProductSearch('')
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
	}, [applyTempDraftToCart, queryClient])

	useEffect(() => {
		if (!requestedDraftId) return
		const draft = savedDrafts.find(
			(candidate) => candidate.id === requestedDraftId,
		)
		if (!draft) return
		const nextEditor = createEditorFromOrder(draft)
		writePersistedDraftWorkspace({
			activeDraftKey: draft.id,
			editor: nextEditor,
		})
		setActiveDraftKey(draft.id)
		setConfirmCartAddOpen(false)
		setConfirmSubmitOpen(false)
		setConfirmDeleteId(null)
		setDraftMenuOpen(false)
		setEditor(nextEditor)
		setProductSearch('')
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
					projectId: draft.projectId,
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
			const nextEditor = {
				...savedEditor,
				baseFingerprint: editorFingerprint(savedEditor),
			}
			writePersistedDraftWorkspace({
				activeDraftKey: result.draftId,
				editor: nextEditor,
			})
			setEditor(nextEditor)
			queryClient.invalidateQueries({ queryKey: ['customer-orders-all'] })
			toast.success(t('orders.savedAsDraft', { ref: result.reference }))
		},
		onError: () => {
			toast.error(t('orders.saveDraftFailed'))
		},
	})

	const deleteMutation = useMutation({
		mutationFn: (draft: DraftEditorState) => {
			if (!draft.id) throw new Error('Draft has not been saved')
			return deleteOrder({ data: { orderId: draft.id } })
		},
		onSuccess: (_result, draft) => {
			onDraftThreadClear?.(draft.sessionKey)
			writePersistedDraftWorkspace(null)
			setActionsMenuOpen(false)
			setConfirmCartAddOpen(false)
			setConfirmSubmitOpen(false)
			setConfirmDeleteId(null)
			setActiveDraftKey(null)
			setDraftMenuOpen(false)
			setEditor(null)
			setProductMenuOpen(false)
			setProductSearch('')
			queryClient.invalidateQueries({ queryKey: ['customer-orders-all'] })
			toast.success(t('orders.draftDeleted'))
		},
		onError: () => {
			toast.error(t('orders.deleteDraftFailed'))
		},
	})

	function selectDraft(draft: Order) {
		const nextEditor = createEditorFromOrder(draft)
		writePersistedDraftWorkspace({
			activeDraftKey: draft.id,
			editor: nextEditor,
		})
		setActiveDraftKey(draft.id)
		setConfirmCartAddOpen(false)
		setConfirmSubmitOpen(false)
		setConfirmDeleteId(null)
		setDraftMenuOpen(false)
		setEditor(nextEditor)
		setProductSearch('')
	}

	function startNewDraft() {
		const nextEditor = createNewEditor(defaultDraftName)
		writePersistedDraftWorkspace({
			activeDraftKey: NEW_DRAFT_KEY,
			editor: nextEditor,
		})
		setActiveDraftKey(NEW_DRAFT_KEY)
		setActionsMenuOpen(false)
		setConfirmCartAddOpen(false)
		setConfirmSubmitOpen(false)
		setConfirmDeleteId(null)
		setDraftMenuOpen(false)
		setEditor(nextEditor)
		setProductMenuOpen(false)
		setProductSearch('')
	}

	function saveCurrentEditor() {
		if (!editor || !canPersist || saveMutation.isPending) return
		setConfirmSubmitOpen(false)
		saveMutation.mutate(editor)
	}

	function clearEditorWorkspace() {
		if (editor) onDraftThreadClear?.(editor.sessionKey)
		writePersistedDraftWorkspace(null)
		setActiveDraftKey(null)
		setActionsMenuOpen(false)
		setConfirmCartAddOpen(false)
		setConfirmSubmitOpen(false)
		setConfirmDeleteId(null)
		setDraftMenuOpen(false)
		setEditor(null)
		setProductMenuOpen(false)
		setProductSearch('')
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
		if (!editor) {
			addCartProduct(product)
			return
		}
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

	function addCartProduct(product: MarketProduct) {
		addCartItem(
			{
				category: product.category,
				categoryName: product.categoryName,
				categoryNameAr: product.categoryNameAr,
				imageUrl: product.imageUrl,
				name: product.name,
				nameAr: product.nameAr,
				productId: product.id,
				slug: product.slug,
				unitOfMeasure: product.unitOfMeasure,
				unitOfMeasureAr: product.unitOfMeasureAr,
			},
			1,
		)
	}

	function showCartWorkspace() {
		writePersistedDraftWorkspace(null)
		setActiveDraftKey(null)
		setActionsMenuOpen(false)
		setConfirmCartAddOpen(false)
		setConfirmSubmitOpen(false)
		setConfirmDeleteId(null)
		setDraftMenuOpen(false)
		setEditor(null)
		setProductSearch('')
	}

	function clearCartWorkspace() {
		clearCart()
		onDraftThreadClear?.('cart')
		setActionsMenuOpen(false)
		setConfirmCartAddOpen(false)
		setConfirmSubmitOpen(false)
		setProductMenuOpen(false)
		setProductSearch('')
		toast.success(t('market.cartCleared', 'Cart cleared.'))
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
		if (!editor || !canPersist) return
		setActionsMenuOpen(false)
		setConfirmCartAddOpen(false)
		setConfirmSubmitOpen(true)
	}

	function confirmSubmitEditor() {
		if (!editor || !canPersist) return
		setConfirmSubmitOpen(false)
		applyQuoteCartSnapshot(useDraftQuoteStore, {
			globalNote: editor.notes,
			items: editor.items.flatMap((item) => {
				const productId = item.catalogProductId
				if (!productId) return []
				return [
					{
						category: item.category,
						categoryName: item.category,
						categoryNameAr: item.category,
						imageUrl: item.imageUrl,
						name: item.productName,
						nameAr: item.productNameAr,
						note: item.notes ?? '',
						productId,
						quantity: item.quantity,
						slug: productId,
						unitOfMeasure: item.unitOfMeasure,
						unitOfMeasureAr: item.unitOfMeasureAr,
					},
				]
			}),
		})
		setPendingProjectId(editor.projectId ?? undefined)
		setPendingQuoteDraftId(editor.id ?? undefined)
		setDraftQuoteOpen(true)
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
			projectId: editor.projectId,
			reference: null,
			sessionKey: `draft:temp:${crypto.randomUUID()}`,
		}
		const nextEditor = {
			...duplicate,
			baseFingerprint: editorFingerprint(duplicate),
		}
		writePersistedDraftWorkspace({
			activeDraftKey: NEW_DRAFT_KEY,
			editor: nextEditor,
		})
		setActiveDraftKey(NEW_DRAFT_KEY)
		setConfirmDeleteId(null)
		setEditor(nextEditor)
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
							onClick={editor ? clearEditorWorkspace : clearCartWorkspace}
							disabled={
								!editor && cartItems.length === 0 && !cartGlobalNote.trim()
							}
							className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--p-border)] text-[#B3261E] transition-colors hover:bg-[#B3261E]/10 disabled:pointer-events-none disabled:opacity-40 dark:text-[#FF6B61] dark:hover:bg-[#FF6B61]/10"
							aria-label={
								editor
									? t('orders.deleteClear', 'Delete / Clear')
									: t('market.clearCart')
							}
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
									<button
										type="button"
										onClick={showCartWorkspace}
										className={`flex h-12 w-full min-w-0 items-center gap-2 rounded-lg px-2 text-start transition-colors ${
											editor
												? 'text-[var(--p-text)] hover:bg-[var(--p-hover)]'
												: 'bg-[var(--p-accent-dim)] text-[var(--p-accent)]'
										}`}
									>
										<ShoppingCart
											size={14}
											strokeWidth={1.7}
											className="shrink-0"
										/>
										<span className="min-w-0 flex-1">
											<span className="block truncate text-[12px] font-semibold">
												{t('market.cart')}
											</span>
											<span className="block truncate text-[10px] text-[var(--p-text-muted)]">
												{t('market.cartItemCount', {
													count: cartItems.length,
												})}
											</span>
										</span>
									</button>
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
										visibleDraftGroups.map((group) => (
											<div key={group.id ?? 'independent'} className="pt-1">
												<div className="flex items-center gap-2 px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--p-text-faint)]">
													<FolderKanban size={12} strokeWidth={1.6} />
													<span className="truncate">{group.name}</span>
												</div>
												{group.drafts.map((draft) => {
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
												})}
											</div>
										))
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
									<span className="mb-1.5 block text-[11px] font-semibold text-[var(--p-text-muted)]">
										{t('projectsPage.workspace')}
									</span>
									<select
										value={editor.projectId ?? ''}
										onChange={(event) =>
											updateEditor({
												projectId: event.currentTarget.value || null,
											})
										}
										className="h-10 w-full rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-3 text-[13px] text-[var(--p-text)] outline-none transition-colors focus:border-[var(--p-border-strong)]"
									>
										<option value="">{t('projectsPage.independent')}</option>
										{projects.map((project) => (
											<option key={project.id} value={project.id}>
												{project.name}
											</option>
										))}
									</select>
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
							key="cart-workspace"
							className="space-y-4"
							{...chatFadeMotion(shouldReduceMotion)}
						>
							<label className="block">
								<span className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-semibold text-[var(--p-text-muted)]">
									<span>{t('market.cartNotesLabel')}</span>
									{cartGlobalNote.trim() && (
										<CopyButton text={cartGlobalNote.trim()} />
									)}
								</span>
								<textarea
									value={cartGlobalNote}
									onChange={(event) =>
										setCartGlobalNote(event.currentTarget.value)
									}
									rows={3}
									placeholder={t('market.cartNotesPlaceholder')}
									className="min-h-20 w-full resize-none rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-3 py-2 text-[13px] leading-5 text-[var(--p-text)] outline-none transition-colors placeholder:text-[var(--p-text-faint)] focus:border-[var(--p-border-strong)]"
								/>
							</label>

							<div>
								<div className="mb-2 flex items-center justify-between gap-2">
									<p className="text-[12px] font-semibold text-[var(--p-text)]">
										{t('market.cartItemCount', { count: cartItems.length })}
									</p>
									<button
										type="button"
										onClick={() => setDraftQuoteOpen(true)}
										className="text-[12px] font-semibold text-[var(--p-text-muted)] transition-colors hover:text-[var(--p-text)]"
									>
										{t('market.openCart')}
									</button>
								</div>

								{cartItems.length === 0 ? (
									<div className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--p-border)] px-4 text-center">
										<ShoppingCart
											size={22}
											strokeWidth={1.5}
											className="mb-2 text-[var(--p-text-faint)]"
										/>
										<p className="text-[12px] text-[var(--p-text-muted)]">
											{t('market.cartEmptyBody')}
										</p>
									</div>
								) : (
									<div className="space-y-2">
										<AnimatePresence initial={false}>
											{cartItems.map((item) => {
												const itemName =
													isAr && item.nameAr ? item.nameAr : item.name
												const unitLabel =
													isAr && item.unitOfMeasureAr
														? item.unitOfMeasureAr
														: item.unitOfMeasure
												return (
													<motion.div
														key={item.productId}
														className="rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-3"
														{...chatRevealMotion(shouldReduceMotion)}
													>
														<div className="flex min-w-0 items-center gap-3">
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
																	<Package size={14} />
																</div>
															)}
															<div className="min-w-0 flex-1">
																<p className="truncate text-[13px] font-semibold text-[var(--p-text)]">
																	{itemName}
																</p>
																<p className="mt-0.5 truncate text-[11px] text-[var(--p-text-muted)]">
																	{isAr && item.categoryNameAr
																		? item.categoryNameAr
																		: item.categoryName}
																</p>
															</div>
															<label className="flex h-9 w-[112px] shrink-0 items-center justify-end gap-2">
																<span className="sr-only">
																	{t('market.quantity')}
																</span>
																<input
																	type="number"
																	inputMode="numeric"
																	min={0}
																	aria-label={t('quoteBuilder.quantityFor', {
																		name: itemName,
																	})}
																	value={item.quantity}
																	onChange={(event) => {
																		const rawValue =
																			event.currentTarget.value.trim()
																		if (rawValue === '') {
																			updateCartQuantity(item.productId, 0)
																			return
																		}
																		const next = Number.parseInt(rawValue, 10)
																		if (Number.isFinite(next) && next >= 0) {
																			updateCartQuantity(item.productId, next)
																		}
																	}}
																	className="h-full min-w-0 flex-1 bg-transparent text-end font-mono text-[14px] font-semibold text-[var(--p-text)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
																	style={{
																		fontVariantNumeric: 'tabular-nums',
																	}}
																/>
																<span className="min-w-0 truncate text-[11px] text-[var(--p-text-muted)]">
																	{unitLabel}
																</span>
															</label>
															<button
																type="button"
																onClick={() => removeCartItem(item.productId)}
																className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-error)]"
																aria-label={t('market.removeItem')}
															>
																<X size={14} strokeWidth={1.8} />
															</button>
														</div>
													</motion.div>
												)
											})}
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
											key="cart-product-menu"
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
							<div className="grid grid-cols-2 gap-2">
								<button
									type="button"
									onClick={() => setDraftQuoteOpen(true)}
									className="flex h-10 items-center justify-center rounded-xl border border-[var(--p-border)] text-[12px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)]"
								>
									{t('market.openCart')}
								</button>
								<button
									type="button"
									onClick={clearCartWorkspace}
									disabled={cartItems.length === 0 && !cartGlobalNote.trim()}
									className="flex h-10 items-center justify-center rounded-xl border border-[#B3261E]/20 text-[12px] font-semibold text-[#B3261E] transition-colors hover:bg-[#B3261E]/10 disabled:pointer-events-none disabled:opacity-45 dark:text-[#FF6B61] dark:hover:bg-[#FF6B61]/10"
								>
									{t('market.clearCart')}
								</button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{invalidItemsText && (
				<p className="shrink-0 border-t border-[var(--p-border)] px-4 py-2 text-[12px] font-medium text-[var(--p-error)]">
					{invalidItemsText}
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
							disabled={!canPersist}
							className="flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl bg-[var(--p-accent)] px-3 text-[12px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-45"
							whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
						>
							<Send size={14} strokeWidth={1.7} />
							<span className="truncate">{t('orders.submit')}</span>
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
