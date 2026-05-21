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
import { getMarketProducts, type MarketProduct } from '../../lib/server/market'
import { deleteOrder, getAllCustomerOrders } from '../../lib/server/orders'
import { saveDraft, submitQuoteRequest } from '../../lib/server/quote-requests'
import { toast } from '../../lib/toast'
import { unavailableItemNamesFromError } from '../../lib/unavailable-quote-items'
import { useDraftQuoteStore } from '../../stores/draft-quote'
import type { Order, OrderItem } from '../../types/order'

interface ChatDraftsPanelProps {
	className?: string
	headerAction?: ReactNode
	onDraftPrompt?: (prompt: string) => void
	onSubmitted?: (reference: string) => void
}

interface DraftEditorState {
	baseFingerprint: string
	date: string
	id: string | null
	items: OrderItem[]
	name: string
	notes: string
	reference: string | null
}

const NEW_DRAFT_KEY = '__new_draft__'
const CHAT_DRAFT_EASE = cubicBezier(0.22, 1, 0.36, 1)

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

function itemWithoutNotes(item: OrderItem): OrderItem {
	return {
		category: item.category,
		imageUrl: item.imageUrl,
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
	}
	return {
		...editor,
		baseFingerprint: editorFingerprint(editor),
	}
}

function productToOrderItem(product: MarketProduct): OrderItem {
	return {
		category: product.category,
		imageUrl: product.imageUrl,
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
		isUnmatched: item.category === 'unmatched',
		productId: item.category === 'unmatched' ? undefined : item.productId,
		quantity: item.quantity,
		sortOrder: index,
		unitOfMeasure: item.unitOfMeasure,
		unitOfMeasureAr: item.unitOfMeasureAr,
	}))
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

export function ChatDraftsPanel({
	className = '',
	headerAction,
	onDraftPrompt,
	onSubmitted,
}: ChatDraftsPanelProps) {
	const { t, i18n } = useTranslation('portal')
	const queryClient = useQueryClient()
	const isAr = i18n.language === 'ar'
	const shouldReduceMotion = useReducedMotion()
	const addCartItem = useDraftQuoteStore((s) => s.add)
	const defaultDraftName = getDefaultDraftName(
		t('market.defaultDraftName'),
		isAr,
	)
	const actionsMenuRef = useRef<HTMLDivElement>(null)
	const draftMenuRef = useRef<HTMLDivElement>(null)
	const productMenuRef = useRef<HTMLDivElement>(null)
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
	const [submitError, setSubmitError] = useState<string | null>(null)

	const { data, isError, isLoading, refetch } = useQuery({
		queryKey: ['customer-orders-all'],
		queryFn: () => getAllCustomerOrders(),
		staleTime: 30_000,
	})
	const showDraftMenuLoading = useDelayedVisibility(isLoading)

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
	const products = productData?.products ?? []
	const showProductMenuLoading = useDelayedVisibility(isProductLoading)

	const dirty = editor
		? editorFingerprint(editor) !== editor.baseFingerprint
		: false
	const canPersist = Boolean(editor && editor.items.length > 0)
	const activeDraftTitle = editor
		? editor.name.trim() || editor.reference || t('market.defaultDraftName')
		: t('orders.selectDraft', 'Select draft')
	const activeDraftMeta = editor
		? `${t('orders.items', { count: editor.items.length })} · ${formatDraftDate(editor.date, isAr)}`
		: t('orders.noDraftSelected', 'No draft selected')

	useEffect(() => {
		if (activeDraftKey || savedDrafts.length === 0) return
		const firstDraft = savedDrafts[0]
		setActiveDraftKey(firstDraft.id)
		setEditor(createEditorFromOrder(firstDraft))
	}, [activeDraftKey, savedDrafts])

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
			setActiveDraftKey(null)
			setConfirmCartAddOpen(false)
			setConfirmSubmitOpen(false)
			setEditor(null)
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
		mutationFn: (draftId: string) =>
			deleteOrder({ data: { orderId: draftId } }),
		onSuccess: (_result, draftId) => {
			const nextDraft = savedDrafts.find((draft) => draft.id !== draftId)
			setActionsMenuOpen(false)
			setConfirmCartAddOpen(false)
			setConfirmSubmitOpen(false)
			setConfirmDeleteId(null)
			if (nextDraft) {
				setActiveDraftKey(nextDraft.id)
				setEditor(createEditorFromOrder(nextDraft))
			} else {
				setActiveDraftKey(null)
				setEditor(null)
			}
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
		if (!editor) return
		setActionsMenuOpen(false)
		setConfirmCartAddOpen(false)
		setConfirmSubmitOpen(false)
		editor.items.forEach((item, index) => {
			const productId =
				item.category === 'unmatched'
					? `${editor.id ?? NEW_DRAFT_KEY}:${index}:${item.productName}`
					: item.productId
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
	}

	function requestAddEditorToCart() {
		if (!editor || editor.items.length === 0) return
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
		if (!editor?.id) return
		if (confirmDeleteId === editor.id) {
			deleteMutation.mutate(editor.id)
			return
		}
		setConfirmDeleteId(editor.id)
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
							onClick={startNewDraft}
							className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--p-border)] text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)]"
							aria-label={t('orders.newDraft')}
							whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
						>
							<Plus size={16} strokeWidth={1.8} />
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
								className="absolute inset-x-0 top-full z-30 mt-2 max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border border-[var(--p-border-strong)] bg-[var(--p-elevated)] p-2 shadow-2xl"
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

			<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
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
											<div className="mt-2 max-h-72 space-y-2 overflow-y-auto">
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
								{t('quoteBuilder.emptyDraftsTitle')}
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
							onClick={() => {
								setConfirmSubmitOpen(false)
								editor && saveMutation.mutate(editor)
							}}
							disabled={!canPersist || saveMutation.isPending}
							className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--p-border)] text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)] disabled:pointer-events-none disabled:opacity-45"
							whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
							aria-label={
								saveMutation.isPending
									? t('quoteBuilder.savingDraft')
									: t('orders.save')
							}
						>
							<Save size={15} strokeWidth={1.7} />
						</motion.button>
						<motion.button
							type="button"
							onClick={requestAddEditorToCart}
							disabled={editor.items.length === 0}
							className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--p-border)] text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)] disabled:pointer-events-none disabled:opacity-45"
							aria-label={t('orders.addToCart')}
							whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
						>
							<ShoppingCart size={15} strokeWidth={1.7} />
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
											disabled={!editor.id || deleteMutation.isPending}
											className={`flex h-9 w-full min-w-0 items-center gap-2 rounded-lg px-2 text-start text-[12px] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45 ${
												editor.id && confirmDeleteId === editor.id
													? 'bg-[var(--p-error)] text-white hover:opacity-90'
													: 'text-[var(--p-error)] hover:bg-[var(--p-hover)]'
											}`}
										>
											{editor.id && confirmDeleteId === editor.id ? (
												<Check size={14} strokeWidth={1.8} />
											) : (
												<Trash2 size={14} strokeWidth={1.7} />
											)}
											<span className="truncate">
												{editor.id && confirmDeleteId === editor.id
													? t('orders.confirmDelete')
													: t('orders.delete')}
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

	return (
		<motion.div
			className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-2"
			{...chatFadeMotion(shouldReduceMotion)}
		>
			<OrderItemImage imageUrl={item.imageUrl} />
			<div className="min-w-0 flex-1">
				<p className="truncate text-[12px] font-semibold text-[var(--p-text)]">
					{name}
				</p>
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
