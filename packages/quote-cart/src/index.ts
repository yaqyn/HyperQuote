import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const QUOTE_CART_SYNC_CHANNEL = 'hyperquote:quote-cart-sync'
const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const FALLBACK_CATEGORY = 'material'
const FALLBACK_CATEGORY_AR = 'مواد'
const FALLBACK_DESCRIPTION = 'Custom material'
const FALLBACK_DESCRIPTION_AR = 'مواد مخصصة'
const FALLBACK_UNIT = 'unit'
const FALLBACK_UNIT_AR = 'وحدة'

export const QUOTE_CART_STORAGE_KEY = 'hq-draft-quote'
export const LEGACY_WEBSITE_QUOTE_CART_STORAGE_KEY = 'hq-website-quote-cart'

export interface QuoteCartItem {
	productId: string
	slug: string
	name: string
	nameAr: string
	category: string
	categoryName: string
	categoryNameAr: string
	unitOfMeasure: string
	unitOfMeasureAr: string
	quantity: number
	imageUrl: string
	note: string
}

export interface QuoteCartItemInput {
	productId: string
	slug?: string
	name: string
	nameAr?: string
	category: string
	categoryName?: string
	categoryNameAr?: string
	unitOfMeasure: string
	unitOfMeasureAr?: string
	imageUrl?: string | null
}

export interface QuoteRequestItemPayload {
	productId?: string
	customerDescription: string
	quantity: number
	unitOfMeasure: string
	unitOfMeasureAr?: string
	notes?: string
	sortOrder: number
	matchConfidence?: number
	isUnmatched?: boolean
}

export interface QuoteCartState {
	items: QuoteCartItem[]
	globalNote: string
	add: (item: QuoteCartItemInput, quantity?: number) => void
	remove: (productId: string) => void
	updateQuantity: (productId: string, quantity: number) => void
	updateNote: (productId: string, note: string) => void
	setGlobalNote: (note: string) => void
	duplicate: (productId: string) => void
	clear: () => void
	totalUnits: () => number
}

export interface QuoteCartSnapshot {
	globalNote: string
	items: QuoteCartItem[]
}

export interface RemoteQuoteCartSnapshot extends QuoteCartSnapshot {
	updatedAt: string
	version: number
}

export interface QuoteCartSyncAdapter {
	load: () => Promise<RemoteQuoteCartSnapshot | null>
	save: (snapshot: QuoteCartSnapshot) => Promise<RemoteQuoteCartSnapshot | null>
}

export interface QuoteCartSyncOptions {
	adapter?: QuoteCartSyncAdapter
	broadcast?: boolean
	intervalMs?: number
	source: 'portal' | 'website'
	store?: QuoteCartStoreApi
}

export interface QuoteCartSyncController {
	pull: () => Promise<void>
	stop: () => void
}

export interface QuoteCartStoreApi {
	getState: () => QuoteCartState
	setState: (partial: Partial<QuoteCartState>, replace?: false) => void
	subscribe: (
		listener: (state: QuoteCartState, previousState: QuoteCartState) => void,
	) => () => void
}

export function isQuoteCartProductId(value: string): boolean {
	return UUID_RE.test(value)
}

export function sanitizeQuoteCartSnapshot(value: unknown): {
	globalNote: string
	items: QuoteCartItem[]
} {
	const record = asRecord(value)
	const stateRecord = asRecord(record?.state)
	const source = stateRecord ?? record

	return {
		globalNote: textFrom(source?.globalNote, source?.note, source?.notes),
		items: sanitizeQuoteCartItems(source?.items),
	}
}

export function toQuoteRequestItemPayloads(
	items: QuoteCartItem[],
	options: { isArabic: boolean },
): QuoteRequestItemPayload[] {
	return sanitizeQuoteCartItems(items)
		.filter((item) => item.quantity > 0)
		.map((item, index) => {
			const productId = isQuoteCartProductId(item.productId)
				? item.productId
				: undefined
			const customerDescription =
				options.isArabic && item.nameAr ? item.nameAr : item.name
			const notes = item.note.trim()

			return {
				productId,
				customerDescription,
				quantity: item.quantity,
				unitOfMeasure: item.unitOfMeasure,
				unitOfMeasureAr: item.unitOfMeasureAr,
				notes: notes || undefined,
				sortOrder: index,
				matchConfidence: productId ? 1 : undefined,
				isUnmatched: !productId,
			}
		})
}

export function getQuoteCartFingerprint(
	items: QuoteCartItem[],
	globalNote: string,
) {
	return JSON.stringify({
		globalNote: globalNote.trim(),
		items: sanitizeQuoteCartItems(items)
			.filter((item) => item.quantity > 0)
			.map((item, index) => ({
				category: item.category,
				categoryName: item.categoryName,
				categoryNameAr: item.categoryNameAr,
				imageUrl: item.imageUrl,
				name: item.name,
				nameAr: item.nameAr,
				note: item.note.trim(),
				productId: item.productId,
				quantity: item.quantity,
				sortOrder: index,
				unitOfMeasure: item.unitOfMeasure,
				unitOfMeasureAr: item.unitOfMeasureAr,
			})),
	})
}

export function getQuoteCartSnapshot(
	state: Pick<QuoteCartState, 'globalNote' | 'items'>,
): QuoteCartSnapshot {
	return sanitizeQuoteCartSnapshot({
		globalNote: state.globalNote,
		items: state.items,
	})
}

export function applyQuoteCartSnapshot(
	store: QuoteCartStoreApi,
	snapshot: unknown,
) {
	const sanitized = sanitizeQuoteCartSnapshot(snapshot)
	store.setState({
		globalNote: sanitized.globalNote,
		items: sanitized.items,
	})
}

export function createQuoteCartSync(
	options: QuoteCartSyncOptions,
): QuoteCartSyncController {
	const store = options.store ?? useQuoteCartStore
	const source = options.source
	const intervalMs = Math.max(1000, options.intervalMs ?? 2500)
	const clientId = randomSyncClientId()
	let stopped = false
	let applyingRemote = false
	let saveTimer: ReturnType<typeof setTimeout> | null = null
	let lastFingerprint = getQuoteCartFingerprint(
		store.getState().items,
		store.getState().globalNote,
	)
	let lastRemoteUpdatedAt = ''

	const channel =
		options.broadcast === false ? null : createQuoteCartBroadcastChannel()

	function broadcast(snapshot: QuoteCartSnapshot) {
		try {
			channel?.postMessage({
				clientId,
				snapshot,
				source,
				type: 'quote-cart-sync',
			})
		} catch {
			// BroadcastChannel can fail in hardened browser modes; remote sync still works.
		}
	}

	function readSnapshot() {
		return getQuoteCartSnapshot(store.getState())
	}

	function applyRemoteSnapshot(snapshot: QuoteCartSnapshot) {
		applyingRemote = true
		try {
			applyQuoteCartSnapshot(store, snapshot)
			lastFingerprint = getQuoteCartFingerprint(
				snapshot.items,
				snapshot.globalNote,
			)
		} finally {
			applyingRemote = false
		}
	}

	function scheduleSave() {
		if (stopped || applyingRemote) return
		const snapshot = readSnapshot()
		const fingerprint = getQuoteCartFingerprint(
			snapshot.items,
			snapshot.globalNote,
		)
		if (fingerprint === lastFingerprint) return
		lastFingerprint = fingerprint
		broadcast(snapshot)
		if (!options.adapter) return
		if (saveTimer) clearTimeout(saveTimer)
		saveTimer = setTimeout(() => {
			saveRemote(snapshot).catch(() => undefined)
		}, 450)
	}

	async function saveRemote(snapshot: QuoteCartSnapshot) {
		if (stopped || !options.adapter) return
		const remote = await options.adapter.save(snapshot)
		if (!remote) return
		lastRemoteUpdatedAt = remote.updatedAt
		const remoteSnapshot = getQuoteCartSnapshot(remote)
		const remoteFingerprint = getQuoteCartFingerprint(
			remoteSnapshot.items,
			remoteSnapshot.globalNote,
		)
		const localFingerprint = getQuoteCartFingerprint(
			snapshot.items,
			snapshot.globalNote,
		)
		if (remoteFingerprint !== localFingerprint) {
			applyRemoteSnapshot(remoteSnapshot)
			broadcast(remoteSnapshot)
			return
		}
		lastFingerprint = remoteFingerprint
	}

	async function pull() {
		if (stopped || !options.adapter) return
		const remote = await options.adapter.load()
		const localSnapshot = readSnapshot()
		if (!remote) {
			if (quoteCartSnapshotHasContent(localSnapshot)) {
				await saveRemote(localSnapshot)
			}
			return
		}
		if (
			!quoteCartSnapshotHasContent(remote) &&
			quoteCartSnapshotHasContent(localSnapshot)
		) {
			lastRemoteUpdatedAt = remote.updatedAt
			await saveRemote(localSnapshot)
			return
		}
		if (remote.updatedAt === lastRemoteUpdatedAt) return
		lastRemoteUpdatedAt = remote.updatedAt
		const remoteFingerprint = getQuoteCartFingerprint(
			remote.items,
			remote.globalNote,
		)
		if (remoteFingerprint === lastFingerprint) return
		applyRemoteSnapshot(remote)
	}

	const unsubscribe = store.subscribe(scheduleSave)

	channel?.addEventListener('message', (event) => {
		const message = asRecord(event.data)
		if (message?.type !== 'quote-cart-sync' || message.clientId === clientId) {
			return
		}
		applyRemoteSnapshot(sanitizeQuoteCartSnapshot(message.snapshot))
	})

	void pull()
	const interval = options.adapter
		? setInterval(() => {
				void pull()
			}, intervalMs)
		: null

	return {
		pull,
		stop: () => {
			stopped = true
			unsubscribe()
			if (saveTimer) clearTimeout(saveTimer)
			if (interval) clearInterval(interval)
			channel?.close()
		},
	}
}

export function createQuoteCartStore(storageKey = QUOTE_CART_STORAGE_KEY) {
	return create<QuoteCartState>()(
		persist(
			(set, get) => ({
				items: [],
				globalNote: '',
				add: (item, quantity = 1) =>
					set((state) => {
						const normalized = normalizeQuoteCartItemInput(item, quantity)
						if (!normalized) return state
						const existing = state.items.find(
							(cartItem) => cartItem.productId === normalized.productId,
						)

						if (existing) {
							return {
								items: state.items.map((cartItem) =>
									cartItem.productId === normalized.productId
										? {
												...cartItem,
												quantity: cartItem.quantity + normalized.quantity,
											}
										: cartItem,
								),
							}
						}

						return { items: [...state.items, normalized] }
					}),
				remove: (productId) =>
					set((state) => ({
						items: state.items.filter((item) => item.productId !== productId),
					})),
				updateQuantity: (productId, quantity) =>
					set((state) => {
						if (!Number.isFinite(quantity)) return state
						const nextQuantity = Math.max(0, Math.floor(quantity))
						return {
							items: state.items.map((item) =>
								item.productId === productId
									? { ...item, quantity: nextQuantity }
									: item,
							),
						}
					}),
				updateNote: (productId, note) =>
					set((state) => ({
						items: state.items.map((item) =>
							item.productId === productId ? { ...item, note } : item,
						),
					})),
				setGlobalNote: (globalNote) => set({ globalNote }),
				duplicate: (productId) =>
					set((state) => {
						const item = state.items.find(
							(cartItem) => cartItem.productId === productId,
						)
						if (!item) return state
						return {
							items: state.items.map((cartItem) =>
								cartItem.productId === productId
									? {
											...cartItem,
											quantity: cartItem.quantity + item.quantity,
										}
									: cartItem,
							),
						}
					}),
				clear: () => set({ items: [], globalNote: '' }),
				totalUnits: () =>
					get().items.reduce((sum, item) => sum + item.quantity, 0),
			}),
			{
				merge: (persisted, current) => ({
					...current,
					...sanitizeQuoteCartSnapshot(persisted),
				}),
				name: storageKey,
				partialize: (state) => ({
					globalNote: state.globalNote,
					items: state.items,
				}),
				storage: createJSONStorage(() => {
					migrateLegacyWebsiteQuoteCartStorage()
					return localStorage
				}),
			},
		),
	)
}

export const useQuoteCartStore = createQuoteCartStore()

function createQuoteCartBroadcastChannel(): BroadcastChannel | null {
	if (typeof BroadcastChannel === 'undefined') return null
	try {
		return new BroadcastChannel(QUOTE_CART_SYNC_CHANNEL)
	} catch {
		return null
	}
}

function randomSyncClientId(): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID()
	}
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function quoteCartSnapshotHasContent(snapshot: QuoteCartSnapshot): boolean {
	return (
		snapshot.globalNote.trim().length > 0 ||
		snapshot.items.some((item) => item.quantity > 0)
	)
}

function migrateLegacyWebsiteQuoteCartStorage() {
	if (typeof window === 'undefined') return
	try {
		const current = window.localStorage.getItem(QUOTE_CART_STORAGE_KEY)
		if (current) return
		const legacy = window.localStorage.getItem(
			LEGACY_WEBSITE_QUOTE_CART_STORAGE_KEY,
		)
		if (legacy) {
			window.localStorage.setItem(QUOTE_CART_STORAGE_KEY, legacy)
		}
	} catch {
		// Storage may be unavailable in private or server-like browser contexts.
	}
}

function sanitizeQuoteCartItems(value: unknown): QuoteCartItem[] {
	if (!Array.isArray(value)) return []

	const itemsByProductId = new Map<string, QuoteCartItem>()
	for (const item of value) {
		const normalized = normalizeQuoteCartItem(item)
		if (!normalized) continue

		const existing = itemsByProductId.get(normalized.productId)
		if (existing) {
			existing.quantity += normalized.quantity
			if (!existing.note && normalized.note) existing.note = normalized.note
			continue
		}
		itemsByProductId.set(normalized.productId, normalized)
	}

	return Array.from(itemsByProductId.values())
}

function normalizeQuoteCartItem(value: unknown): QuoteCartItem | null {
	const record = asRecord(value)
	if (!record) return null

	const productId = textFrom(record.productId, record.product_id, record.id)
	if (!isQuoteCartProductId(productId)) return null
	const name = textFrom(
		record.name,
		record.customerDescription,
		record.customer_description,
		record.title,
		record.label,
		record.nameAr,
		record.name_ar,
		FALLBACK_DESCRIPTION,
	)
	const nameAr = textFrom(
		record.nameAr,
		record.name_ar,
		record.nameArabic,
		name === FALLBACK_DESCRIPTION ? FALLBACK_DESCRIPTION_AR : name,
	)
	const category = textFrom(
		record.category,
		record.categorySlug,
		record.category_slug,
		record.categoryName,
		FALLBACK_CATEGORY,
	)
	const categoryName = textFrom(
		record.categoryName,
		record.category_name,
		record.categoryLabel,
		humanCategoryLabel(category),
		FALLBACK_CATEGORY,
	)
	const categoryNameAr = textFrom(
		record.categoryNameAr,
		record.category_name_ar,
		record.categoryArabic,
		record.categoryAr,
		categoryName === FALLBACK_CATEGORY ? FALLBACK_CATEGORY_AR : categoryName,
	)
	const unitOfMeasure = textFrom(
		record.unitOfMeasure,
		record.unit_of_measure,
		record.unit,
		record.uom,
		FALLBACK_UNIT,
	)
	const unitOfMeasureAr = textFrom(
		record.unitOfMeasureAr,
		record.unit_of_measure_ar,
		record.unitAr,
		record.uomAr,
		unitOfMeasure === FALLBACK_UNIT ? FALLBACK_UNIT_AR : unitOfMeasure,
	)

	return {
		productId,
		slug: textFrom(record.slug, productId),
		name,
		nameAr,
		category,
		categoryName,
		categoryNameAr,
		unitOfMeasure,
		unitOfMeasureAr,
		quantity: nonNegativeQuantity(record.quantity, record.qty, record.amount),
		imageUrl: textFrom(record.imageUrl, record.image_url, record.image, ''),
		note: textFrom(record.note, record.notes, ''),
	}
}

function normalizeQuoteCartItemInput(
	item: QuoteCartItemInput,
	quantity: number,
): QuoteCartItem | null {
	if (!isQuoteCartProductId(item.productId)) return null
	const categoryName =
		item.categoryName?.trim() || humanCategoryLabel(item.category)
	const unitOfMeasureAr = item.unitOfMeasureAr?.trim() || item.unitOfMeasure
	const nameAr = item.nameAr?.trim() || item.name

	return {
		productId: item.productId,
		slug: item.slug?.trim() || item.productId,
		name: item.name,
		nameAr,
		category: item.category,
		categoryName,
		categoryNameAr: item.categoryNameAr?.trim() || categoryName,
		unitOfMeasure: item.unitOfMeasure,
		unitOfMeasureAr,
		quantity: nonNegativeQuantity(quantity),
		imageUrl: item.imageUrl?.trim() || '',
		note: '',
	}
}

function humanCategoryLabel(value: string) {
	return value.trim().replace(/[_-]+/g, ' ') || FALLBACK_CATEGORY
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null
}

function textFrom(...values: unknown[]): string {
	for (const value of values) {
		if (typeof value !== 'string') continue
		const text = value.trim()
		if (text) return text
	}
	return ''
}

function nonNegativeQuantity(...values: unknown[]): number {
	for (const value of values) {
		const numberValue =
			typeof value === 'number'
				? value
				: typeof value === 'string'
					? Number(value)
					: Number.NaN
		if (Number.isFinite(numberValue) && numberValue >= 0) {
			return Math.max(0, Math.floor(numberValue))
		}
	}
	return 1
}
