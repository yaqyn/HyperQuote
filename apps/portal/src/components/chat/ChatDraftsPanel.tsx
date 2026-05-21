import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	AlertTriangle,
	Check,
	Copy,
	FilePenLine,
	MessageSquareText,
	Package,
	Plus,
	Save,
	Search,
	Send,
	Trash2,
	X,
} from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
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
			notes: item.notes?.trim() ?? '',
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

function createEditorFromOrder(order: Order): DraftEditorState {
	const editor = {
		date: order.date,
		id: order.id,
		items: order.items,
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
		notes: item.notes?.trim() || undefined,
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
		.map((item, index) => {
			const note = item.notes?.trim() ? ` Notes: ${item.notes.trim()}` : ''
			return `${index + 1}. ${item.quantity} ${item.unitOfMeasure} ${item.productName}.${note}`
		})
		.join('\n')
	const draftNotes = editor.notes.trim() || 'No draft notes yet.'

	if (intent === 'notes') {
		return `Write concise order notes for this draft. Keep delivery/site assumptions separate from material assumptions.\n\nDraft: ${title}\nCurrent notes: ${draftNotes}\nItems:\n${items}`
	}

	return `Inspect this draft and suggest what to change before submitting it as a quote request. Check quantities, missing notes, and whether any items need clarification.\n\nDraft: ${title}\nNotes: ${draftNotes}\nItems:\n${items}`
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
	const addCartItem = useDraftQuoteStore((s) => s.add)
	const updateCartItemNote = useDraftQuoteStore((s) => s.updateNote)
	const globalNote = useDraftQuoteStore((s) => s.globalNote)
	const setGlobalNote = useDraftQuoteStore((s) => s.setGlobalNote)
	const defaultDraftName = getDefaultDraftName(
		t('market.defaultDraftName'),
		isAr,
	)
	const [activeDraftKey, setActiveDraftKey] = useState<string | null>(null)
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
	const [draftSearch, setDraftSearch] = useState('')
	const [editor, setEditor] = useState<DraftEditorState | null>(null)
	const [productSearch, setProductSearch] = useState('')
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

	const dirty = editor
		? editorFingerprint(editor) !== editor.baseFingerprint
		: false
	const canPersist = Boolean(editor && editor.items.length > 0)

	useEffect(() => {
		if (activeDraftKey || savedDrafts.length === 0) return
		const firstDraft = savedDrafts[0]
		setActiveDraftKey(firstDraft.id)
		setEditor(createEditorFromOrder(firstDraft))
	}, [activeDraftKey, savedDrafts])

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
		onSuccess: () => {
			setActiveDraftKey(null)
			setConfirmDeleteId(null)
			setEditor(null)
			queryClient.invalidateQueries({ queryKey: ['customer-orders-all'] })
			toast.success(t('orders.draftDeleted'))
		},
		onError: () => {
			toast.error(t('orders.deleteDraftFailed'))
		},
	})

	function selectDraft(draft: Order) {
		setActiveDraftKey(draft.id)
		setConfirmDeleteId(null)
		setEditor(createEditorFromOrder(draft))
		setProductSearch('')
		setSubmitError(null)
	}

	function startNewDraft() {
		setActiveDraftKey(NEW_DRAFT_KEY)
		setConfirmDeleteId(null)
		setEditor(createNewEditor(defaultDraftName))
		setProductSearch('')
		setSubmitError(null)
	}

	function updateEditor(
		patch: Partial<Omit<DraftEditorState, 'baseFingerprint'>>,
	) {
		setEditor((current) => (current ? { ...current, ...patch } : current))
	}

	function updateItem(index: number, patch: Partial<OrderItem>) {
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
		setEditor((current) => {
			if (!current) return current
			return {
				...current,
				items: current.items.filter((_, itemIndex) => itemIndex !== index),
			}
		})
	}

	function addProduct(product: MarketProduct) {
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
			if (item.notes?.trim()) updateCartItemNote(productId, item.notes.trim())
		})
		if (editor.notes.trim()) {
			const nextNote = editor.notes.trim()
			setGlobalNote(
				globalNote.trim() ? `${globalNote.trim()}\n${nextNote}` : nextNote,
			)
		}
		toast.success(t('orders.draftAddedToCart'))
	}

	function duplicateEditor() {
		if (!editor) return
		const name = editor.name.trim() || editor.reference || defaultDraftName
		const duplicate = {
			date: new Date().toISOString(),
			id: null,
			items: editor.items,
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
						<button
							type="button"
							onClick={startNewDraft}
							className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--p-border)] text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)]"
							aria-label={t('orders.newDraft')}
						>
							<Plus size={16} strokeWidth={1.8} />
						</button>
						{headerAction}
					</div>
				</div>
				<label className="mt-3 flex h-10 items-center gap-2 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-3 transition-colors focus-within:border-[var(--p-border-strong)]">
					<Search
						size={15}
						strokeWidth={1.7}
						className="shrink-0 text-[var(--p-text-muted)]"
					/>
					<input
						value={draftSearch}
						onChange={(event) => setDraftSearch(event.currentTarget.value)}
						placeholder={t('orders.searchDrafts')}
						className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--p-text)] outline-none placeholder:text-[var(--p-text-faint)]"
						type="search"
					/>
				</label>
			</header>

			<div className="shrink-0 border-b border-[var(--p-border)] px-3 py-3">
				{isLoading ? (
					<div className="grid grid-cols-1 gap-2">
						{['a', 'b', 'c'].map((key) => (
							<div
								key={key}
								className="h-16 animate-pulse rounded-xl bg-[var(--p-border)]"
							/>
						))}
					</div>
				) : isError ? (
					<div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-3">
						<div className="flex min-w-0 items-center gap-2 text-[12px] text-[var(--p-text-muted)]">
							<AlertTriangle size={15} strokeWidth={1.7} />
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
						className="flex h-16 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--p-border)] text-[12px] font-semibold text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
					>
						<Plus size={15} strokeWidth={1.7} />
						{t('orders.newDraft')}
					</button>
				) : (
					<div className="flex snap-x gap-2 overflow-x-auto pb-1">
						{visibleDrafts.map((draft) => {
							const isActive = activeDraftKey === draft.id
							const title =
								draft.name ?? draft.reference ?? t('market.defaultDraftName')
							return (
								<button
									key={draft.id}
									type="button"
									onClick={() => selectDraft(draft)}
									className={`min-w-[190px] snap-start rounded-xl border p-3 text-start transition-colors ${
										isActive
											? 'border-[var(--p-border-strong)] bg-[var(--p-card)]'
											: 'border-[var(--p-border)] bg-[var(--p-surface)] hover:bg-[var(--p-hover)]'
									}`}
								>
									<div className="flex items-start gap-2">
										<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--p-accent-dim)] text-[var(--p-accent)]">
											<FilePenLine size={14} strokeWidth={1.7} />
										</span>
										<span className="min-w-0 flex-1">
											<span className="block truncate text-[12px] font-semibold text-[var(--p-text)]">
												{title}
											</span>
											<span className="mt-1 block text-[10px] text-[var(--p-text-muted)]">
												{formatDraftDate(draft.date, isAr)}
											</span>
										</span>
										<span className="voice-mono shrink-0 text-[10px] text-[var(--p-text-muted)]">
											{draft.itemCount}
										</span>
									</div>
								</button>
							)
						})}
					</div>
				)}
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
				{editor ? (
					<div className="space-y-4">
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

						<div className="grid grid-cols-2 gap-2">
							<button
								type="button"
								onClick={() =>
									onDraftPrompt?.(buildDraftPrompt(editor, 'review'))
								}
								disabled={editor.items.length === 0 || !onDraftPrompt}
								className="flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl border border-[var(--p-border)] px-3 text-[12px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)] disabled:pointer-events-none disabled:opacity-45"
							>
								<MessageSquareText size={14} strokeWidth={1.7} />
								<span className="truncate">{t('orders.reviewWithLyon')}</span>
							</button>
							<button
								type="button"
								onClick={() =>
									onDraftPrompt?.(buildDraftPrompt(editor, 'notes'))
								}
								disabled={editor.items.length === 0 || !onDraftPrompt}
								className="flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl border border-[var(--p-border)] px-3 text-[12px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)] disabled:pointer-events-none disabled:opacity-45"
							>
								<FilePenLine size={14} strokeWidth={1.7} />
								<span className="truncate">
									{t('orders.writeNotesWithLyon')}
								</span>
							</button>
						</div>

						<div>
							<div className="mb-2 flex items-center justify-between gap-2">
								<p className="text-[12px] font-semibold text-[var(--p-text)]">
									{t('orders.items', { count: editor.items.length })}
								</p>
								{dirty && (
									<span className="rounded-full border border-[var(--p-border)] px-2 py-1 text-[10px] font-semibold text-[var(--p-text-muted)]">
										{t('orders.unsaved')}
									</span>
								)}
							</div>

							{editor.items.length === 0 ? (
								<div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-[var(--p-border)] text-center text-[12px] text-[var(--p-text-muted)]">
									{t('orders.emptyOrder')}
								</div>
							) : (
								<div className="space-y-2">
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
								</div>
							)}
						</div>

						<div className="rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-3">
							<label className="flex h-10 items-center gap-2 rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] px-3 transition-colors focus-within:border-[var(--p-border-strong)]">
								<Search
									size={15}
									strokeWidth={1.7}
									className="shrink-0 text-[var(--p-text-muted)]"
								/>
								<input
									value={productSearch}
									onChange={(event) =>
										setProductSearch(event.currentTarget.value)
									}
									placeholder={t('orders.searchProducts')}
									className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--p-text)] outline-none placeholder:text-[var(--p-text-faint)]"
									type="search"
								/>
							</label>
							<div className="mt-3 space-y-2">
								{productSearchFailed ? (
									<p className="py-3 text-center text-[12px] text-[var(--p-error)]">
										{t('orders.error')}
									</p>
								) : isProductLoading ? (
									<div className="space-y-2">
										{['a', 'b'].map((key) => (
											<div
												key={key}
												className="h-12 animate-pulse rounded-xl bg-[var(--p-border)]"
											/>
										))}
									</div>
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
											onAdd={() => addProduct(product)}
										/>
									))
								)}
							</div>
						</div>
					</div>
				) : (
					<div className="flex min-h-full flex-col items-center justify-center text-center">
						<FilePenLine
							size={28}
							strokeWidth={1.5}
							className="mb-3 text-[var(--p-text-faint)]"
						/>
						<p className="text-[14px] font-semibold text-[var(--p-text)]">
							{t('quoteBuilder.emptyDraftsTitle')}
						</p>
						<button
							type="button"
							onClick={startNewDraft}
							className="mt-4 flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--p-accent)] px-4 text-[12px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90"
						>
							<Plus size={15} strokeWidth={1.7} />
							{t('orders.newDraft')}
						</button>
					</div>
				)}
			</div>

			{submitError && (
				<p className="shrink-0 border-t border-[var(--p-border)] px-4 py-2 text-[12px] font-medium text-[var(--p-error)]">
					{submitError}
				</p>
			)}

			{editor && (
				<footer className="shrink-0 border-t border-[var(--p-border)] px-4 py-3">
					<div className="grid grid-cols-2 gap-2">
						<button
							type="button"
							onClick={addEditorToCart}
							disabled={editor.items.length === 0}
							className="flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl border border-[var(--p-border)] px-3 text-[12px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)] disabled:pointer-events-none disabled:opacity-45"
						>
							<Plus size={14} strokeWidth={1.7} />
							<span className="truncate">{t('orders.addToCart')}</span>
						</button>
						<button
							type="button"
							onClick={duplicateEditor}
							disabled={editor.items.length === 0}
							className="flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl border border-[var(--p-border)] px-3 text-[12px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)] disabled:pointer-events-none disabled:opacity-45"
						>
							<Copy size={14} strokeWidth={1.7} />
							<span className="truncate">{t('orders.duplicate')}</span>
						</button>
					</div>
					<div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
						<button
							type="button"
							onClick={() => editor && saveMutation.mutate(editor)}
							disabled={!canPersist || saveMutation.isPending}
							className="flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl border border-[var(--p-border)] px-3 text-[12px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)] disabled:pointer-events-none disabled:opacity-45"
						>
							<Save size={14} strokeWidth={1.7} />
							<span className="truncate">
								{saveMutation.isPending
									? t('quoteBuilder.savingDraft')
									: t('orders.save')}
							</span>
						</button>
						<button
							type="button"
							onClick={() => editor && submitMutation.mutate(editor)}
							disabled={!canPersist || submitMutation.isPending}
							className="flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl bg-[var(--p-accent)] px-3 text-[12px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-45"
						>
							<Send size={14} strokeWidth={1.7} />
							<span className="truncate">
								{submitMutation.isPending
									? t('quoteBuilder.submitting')
									: t('orders.submit')}
							</span>
						</button>
						{editor.id && confirmDeleteId === editor.id ? (
							<button
								type="button"
								onClick={() => deleteMutation.mutate(editor.id ?? '')}
								disabled={deleteMutation.isPending}
								className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--p-error)] text-white transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-45"
								aria-label={t('orders.confirmDelete')}
							>
								<Check size={15} strokeWidth={1.8} />
							</button>
						) : (
							<button
								type="button"
								onClick={() => editor.id && setConfirmDeleteId(editor.id)}
								disabled={!editor.id}
								className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--p-border)] text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-error)] disabled:pointer-events-none disabled:opacity-45"
								aria-label={t('orders.delete')}
							>
								<Trash2 size={15} strokeWidth={1.7} />
							</button>
						)}
					</div>
				</footer>
			)}
		</section>
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
	const name = isAr ? item.productNameAr : item.productName
	const unit =
		isAr && item.unitOfMeasureAr ? item.unitOfMeasureAr : item.unitOfMeasure

	return (
		<div className="rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-3">
			<div className="flex min-w-0 items-start gap-2">
				<OrderItemImage imageUrl={item.imageUrl} />
				<div className="min-w-0 flex-1">
					<p className="truncate text-[12px] font-semibold text-[var(--p-text)]">
						{name}
					</p>
					<p className="mt-1 text-[10px] text-[var(--p-text-muted)]">{unit}</p>
				</div>
				<button
					type="button"
					onClick={onRemove}
					className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-error)]"
					aria-label={t('quoteBuilder.removeItem', { name })}
				>
					<X size={14} strokeWidth={1.7} />
				</button>
			</div>
			<div className="mt-3 grid grid-cols-[82px_minmax(0,1fr)] gap-2">
				<label className="block">
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
						className="h-10 w-full rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] px-3 text-center text-[13px] font-semibold tabular-nums text-[var(--p-text)] outline-none transition-colors focus:border-[var(--p-border-strong)]"
						aria-label={t('quoteBuilder.quantityFor', { name })}
					/>
				</label>
				<label className="block">
					<span className="sr-only">{t('orders.itemNotes')}</span>
					<input
						value={item.notes ?? ''}
						onChange={(event) => onUpdate({ notes: event.currentTarget.value })}
						placeholder={t('orders.itemNotes')}
						className="h-10 w-full rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] px-3 text-[12px] text-[var(--p-text)] outline-none transition-colors placeholder:text-[var(--p-text-faint)] focus:border-[var(--p-border-strong)]"
					/>
				</label>
			</div>
			{item.notes?.trim() && (
				<div className="mt-2 flex justify-end">
					<CopyButton text={item.notes.trim()} />
				</div>
			)}
			<span className="sr-only">{index + 1}</span>
		</div>
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
		<div className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] p-2">
			<OrderItemImage imageUrl={product.imageUrl} />
			<div className="min-w-0 flex-1">
				<p className="truncate text-[12px] font-semibold text-[var(--p-text)]">
					{name}
				</p>
				<p className="mt-1 truncate text-[10px] text-[var(--p-text-muted)]">
					{category} · {unit}
				</p>
			</div>
			<button
				type="button"
				onClick={onAdd}
				className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--p-accent)] text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90"
				aria-label={t('orders.addItem')}
			>
				<Plus size={14} strokeWidth={1.8} />
			</button>
		</div>
	)
}

function CopyButton({ text }: { text: string }) {
	const { t } = useTranslation('portal')

	async function copyText() {
		await navigator.clipboard.writeText(text)
		toast.success(t('orders.notesCopied'))
	}

	return (
		<button
			type="button"
			onClick={copyText}
			className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
			aria-label={t('orders.copyNotes')}
		>
			<Copy size={13} strokeWidth={1.7} />
		</button>
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
