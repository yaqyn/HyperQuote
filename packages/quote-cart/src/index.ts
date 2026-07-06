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
export const DEFAULT_QUOTE_CART_LOCATION_CLIENT_ID = 'default-location'
export const DEFAULT_QUOTE_CART_LOCATION_LABEL = 'Default Location'
export type QuoteDeliveryPeriod = 'AM' | 'PM'

export interface CountryCodeOption {
	code: string
	label: string
}

export const ORDER_ASSOCIATE_COUNTRY_CODES: CountryCodeOption[] = [
	{ code: '+20', label: 'Egypt' },
	{ code: '+966', label: 'Saudi Arabia' },
	{ code: '+971', label: 'United Arab Emirates' },
	{ code: '+965', label: 'Kuwait' },
	{ code: '+974', label: 'Qatar' },
	{ code: '+973', label: 'Bahrain' },
	{ code: '+968', label: 'Oman' },
	{ code: '+962', label: 'Jordan' },
	{ code: '+961', label: 'Lebanon' },
	{ code: '+964', label: 'Iraq' },
	{ code: '+963', label: 'Syria' },
	{ code: '+970', label: 'Palestine' },
	{ code: '+212', label: 'Morocco' },
	{ code: '+213', label: 'Algeria' },
	{ code: '+216', label: 'Tunisia' },
	{ code: '+218', label: 'Libya' },
	{ code: '+249', label: 'Sudan' },
	{ code: '+967', label: 'Yemen' },
	{ code: '+1', label: 'United States / Canada' },
	{ code: '+44', label: 'United Kingdom' },
	{ code: '+33', label: 'France' },
	{ code: '+49', label: 'Germany' },
	{ code: '+39', label: 'Italy' },
	{ code: '+34', label: 'Spain' },
	{ code: '+90', label: 'Turkey' },
	{ code: '+91', label: 'India' },
	{ code: '+92', label: 'Pakistan' },
	{ code: '+880', label: 'Bangladesh' },
	{ code: '+86', label: 'China' },
	{ code: '+81', label: 'Japan' },
	{ code: '+82', label: 'South Korea' },
	{ code: '+234', label: 'Nigeria' },
	{ code: '+27', label: 'South Africa' },
	{ code: '+61', label: 'Australia' },
]

export interface QuoteCartLocation {
	clientId: string
	label: string
	addressId: string | null
	deliveryDate: string | null
	deliveryHour: number | null
	deliveryPeriod: QuoteDeliveryPeriod | null
}

export interface QuoteCartAssociate {
	id: string
	name: string
	countryCode: string
	number: string
}

export interface QuoteCartItem {
	productId: string
	locationClientId: string
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

export interface QuoteRequestLocationPayload {
	clientId: string
	addressId?: string
	locationLabel?: string
	deliveryDate?: string
	deliveryHour?: number
	deliveryPeriod?: QuoteDeliveryPeriod
	items: QuoteRequestItemPayload[]
}

export interface QuoteRequestAssociatePayload {
	name: string
	countryCode: string
	number: string
}

export interface QuoteCartState {
	items: QuoteCartItem[]
	locations: QuoteCartLocation[]
	associates: QuoteCartAssociate[]
	globalNote: string
	add: (item: QuoteCartItemInput, quantity?: number) => void
	remove: (productId: string) => void
	updateQuantity: (productId: string, quantity: number) => void
	updateNote: (productId: string, note: string) => void
	addLocation: () => string
	updateLocation: (
		clientId: string,
		updates: Partial<Omit<QuoteCartLocation, 'clientId'>>,
	) => void
	removeLocation: (clientId: string) => void
	updateItemLocation: (productId: string, locationClientId: string) => void
	applyDeliveryToAllLocations: (
		delivery: Pick<
			QuoteCartLocation,
			'deliveryDate' | 'deliveryHour' | 'deliveryPeriod'
		>,
	) => void
	addAssociate: () => string
	updateAssociate: (
		id: string,
		updates: Partial<Omit<QuoteCartAssociate, 'id'>>,
	) => void
	removeAssociate: (id: string) => void
	setGlobalNote: (note: string) => void
	duplicate: (productId: string) => void
	clear: () => void
	totalUnits: () => number
}

export interface QuoteCartSnapshot {
	globalNote: string
	items: QuoteCartItem[]
	locations: QuoteCartLocation[]
	associates: QuoteCartAssociate[]
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
	locations: QuoteCartLocation[]
	associates: QuoteCartAssociate[]
} {
	const record = asRecord(value)
	const stateRecord = asRecord(record?.state)
	const source = stateRecord ?? record
	const locations = sanitizeQuoteCartLocations(source?.locations)
	const locationIds = new Set(locations.map((location) => location.clientId))

	return {
		globalNote: textFrom(source?.globalNote, source?.note, source?.notes),
		items: sanitizeQuoteCartItems(source?.items, locationIds),
		locations,
		associates: sanitizeQuoteCartAssociates(source?.associates),
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

export function toQuoteRequestLocationPayloads(
	snapshot: Pick<QuoteCartSnapshot, 'items' | 'locations'>,
	options: { isArabic: boolean },
): QuoteRequestLocationPayload[] {
	const sanitized = sanitizeQuoteCartSnapshot(snapshot)
	const fallbackClientId =
		sanitized.locations[0]?.clientId ?? DEFAULT_QUOTE_CART_LOCATION_CLIENT_ID

	return sanitized.locations
		.map((location) => {
			const locationItems = sanitized.items.filter(
				(item) =>
					(item.locationClientId || fallbackClientId) === location.clientId,
			)
			return {
				clientId: location.clientId,
				addressId: location.addressId ?? undefined,
				locationLabel: location.label.trim() || undefined,
				deliveryDate: location.deliveryDate ?? undefined,
				deliveryHour: location.deliveryHour ?? undefined,
				deliveryPeriod: location.deliveryPeriod ?? undefined,
				items: toQuoteRequestItemPayloads(locationItems, options),
			}
		})
		.filter((location) => location.items.length > 0)
}

export function toQuoteRequestAssociatePayloads(
	associates: QuoteCartAssociate[],
): QuoteRequestAssociatePayload[] | undefined {
	const payload = sanitizeQuoteCartAssociates(associates)
		.map((associate) => ({
			name: associate.name.trim(),
			countryCode: associate.countryCode.trim(),
			number: associate.number.trim(),
		}))
		.filter(
			(associate) =>
				associate.name.length > 0 &&
				associate.countryCode.length > 0 &&
				associate.number.length > 0,
		)

	return payload.length > 0 ? payload : undefined
}

export function getQuoteCartFingerprint(
	items: QuoteCartItem[],
	globalNote: string,
	locations: QuoteCartLocation[] = defaultQuoteCartLocations(),
	associates: QuoteCartAssociate[] = [],
) {
	const sanitizedLocations = sanitizeQuoteCartLocations(locations)
	const locationIds = new Set(
		sanitizedLocations.map((location) => location.clientId),
	)
	return JSON.stringify({
		globalNote: globalNote.trim(),
		items: sanitizeQuoteCartItems(items, locationIds)
			.filter((item) => item.quantity > 0)
			.map((item, index) => ({
				category: item.category,
				categoryName: item.categoryName,
				categoryNameAr: item.categoryNameAr,
				imageUrl: item.imageUrl,
				locationClientId: item.locationClientId,
				name: item.name,
				nameAr: item.nameAr,
				note: item.note.trim(),
				productId: item.productId,
				quantity: item.quantity,
				sortOrder: index,
				unitOfMeasure: item.unitOfMeasure,
				unitOfMeasureAr: item.unitOfMeasureAr,
			})),
		locations: sanitizedLocations.map((location) => ({
			addressId: location.addressId,
			clientId: location.clientId,
			deliveryDate: location.deliveryDate,
			deliveryHour: location.deliveryHour,
			deliveryPeriod: location.deliveryPeriod,
			label: location.label.trim(),
		})),
		associates: sanitizeQuoteCartAssociates(associates).map((associate) => ({
			countryCode: associate.countryCode,
			name: associate.name.trim(),
			number: associate.number.trim(),
		})),
	})
}

export function getQuoteCartSnapshot(
	state: Pick<QuoteCartState, 'globalNote' | 'items'> &
		Partial<Pick<QuoteCartState, 'associates' | 'locations'>>,
): QuoteCartSnapshot {
	return sanitizeQuoteCartSnapshot({
		globalNote: state.globalNote,
		items: state.items,
		locations: state.locations,
		associates: state.associates,
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
		locations: sanitized.locations,
		associates: sanitized.associates,
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
		store.getState().locations,
		store.getState().associates,
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
				snapshot.locations,
				snapshot.associates,
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
			snapshot.locations,
			snapshot.associates,
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
			remoteSnapshot.locations,
			remoteSnapshot.associates,
		)
		const localFingerprint = getQuoteCartFingerprint(
			snapshot.items,
			snapshot.globalNote,
			snapshot.locations,
			snapshot.associates,
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
		if (remote.updatedAt === lastRemoteUpdatedAt) return
		lastRemoteUpdatedAt = remote.updatedAt
		const remoteFingerprint = getQuoteCartFingerprint(
			remote.items,
			remote.globalNote,
			remote.locations,
			remote.associates,
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
				locations: defaultQuoteCartLocations(),
				associates: [],
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
				addLocation: () => {
					const clientId = randomClientId('loc')
					set((state) => ({
						locations: [
							...sanitizeQuoteCartLocations(state.locations),
							{
								clientId,
								label: `Location ${state.locations.length + 1}`,
								addressId: null,
								deliveryDate: state.locations[0]?.deliveryDate ?? null,
								deliveryHour: state.locations[0]?.deliveryHour ?? null,
								deliveryPeriod: state.locations[0]?.deliveryPeriod ?? null,
							},
						],
					}))
					return clientId
				},
				updateLocation: (clientId, updates) =>
					set((state) => ({
						locations: sanitizeQuoteCartLocations(state.locations).map(
							(location) => {
								if (location.clientId !== clientId) return location
								return (
									normalizeQuoteCartLocation({ ...location, ...updates }) ??
									location
								)
							},
						),
					})),
				removeLocation: (clientId) =>
					set((state) => {
						const locations = sanitizeQuoteCartLocations(state.locations)
						if (locations.length <= 1) return state
						const nextLocations = locations.filter(
							(location) => location.clientId !== clientId,
						)
						const fallbackClientId =
							nextLocations[0]?.clientId ??
							DEFAULT_QUOTE_CART_LOCATION_CLIENT_ID
						return {
							locations: nextLocations,
							items: state.items.map((item) =>
								item.locationClientId === clientId
									? { ...item, locationClientId: fallbackClientId }
									: item,
							),
						}
					}),
				updateItemLocation: (productId, locationClientId) =>
					set((state) => ({
						items: state.items.map((item) =>
							item.productId === productId
								? { ...item, locationClientId }
								: item,
						),
					})),
				applyDeliveryToAllLocations: (delivery) =>
					set((state) => ({
						locations: sanitizeQuoteCartLocations(state.locations).map(
							(location) => ({ ...location, ...delivery }),
						),
					})),
				addAssociate: () => {
					const id = randomClientId('assoc')
					set((state) => ({
						associates: [
							...sanitizeQuoteCartAssociates(state.associates),
							{ id, name: '', countryCode: '+20', number: '' },
						],
					}))
					return id
				},
				updateAssociate: (id, updates) =>
					set((state) => ({
						associates: sanitizeQuoteCartAssociates(state.associates).map(
							(associate) => {
								if (associate.id !== id) return associate
								return (
									normalizeQuoteCartAssociate({
										...associate,
										...updates,
									}) ?? associate
								)
							},
						),
					})),
				removeAssociate: (id) =>
					set((state) => ({
						associates: sanitizeQuoteCartAssociates(state.associates).filter(
							(associate) => associate.id !== id,
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
				clear: () =>
					set({
						items: [],
						locations: defaultQuoteCartLocations(),
						associates: [],
						globalNote: '',
					}),
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
					locations: state.locations,
					associates: state.associates,
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

function randomClientId(prefix: string): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return `${prefix}-${crypto.randomUUID()}`
	}
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function quoteCartSnapshotHasContent(snapshot: QuoteCartSnapshot): boolean {
	return (
		snapshot.globalNote.trim().length > 0 ||
		snapshot.items.some((item) => item.quantity > 0) ||
		snapshot.associates.length > 0 ||
		snapshot.locations.some(
			(location, index) =>
				index > 0 ||
				location.label !== DEFAULT_QUOTE_CART_LOCATION_LABEL ||
				location.addressId !== null ||
				location.deliveryDate !== null ||
				location.deliveryHour !== null ||
				location.deliveryPeriod !== null,
		)
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

function sanitizeQuoteCartItems(
	value: unknown,
	locationIds: Set<string> = new Set([DEFAULT_QUOTE_CART_LOCATION_CLIENT_ID]),
): QuoteCartItem[] {
	if (!Array.isArray(value)) return []

	const itemsByProductId = new Map<string, QuoteCartItem>()
	for (const item of value) {
		const normalized = normalizeQuoteCartItem(item, locationIds)
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

function normalizeQuoteCartItem(
	value: unknown,
	locationIds: Set<string>,
): QuoteCartItem | null {
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
		locationClientId: safeLocationClientId(
			record.locationClientId,
			locationIds,
		),
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
		locationClientId: DEFAULT_QUOTE_CART_LOCATION_CLIENT_ID,
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

function defaultQuoteCartLocations(): QuoteCartLocation[] {
	return [
		{
			clientId: DEFAULT_QUOTE_CART_LOCATION_CLIENT_ID,
			label: DEFAULT_QUOTE_CART_LOCATION_LABEL,
			addressId: null,
			deliveryDate: null,
			deliveryHour: null,
			deliveryPeriod: null,
		},
	]
}

function sanitizeQuoteCartLocations(value: unknown): QuoteCartLocation[] {
	if (!Array.isArray(value)) return defaultQuoteCartLocations()
	const locations: QuoteCartLocation[] = []
	const seen = new Set<string>()

	for (const entry of value) {
		const location = normalizeQuoteCartLocation(entry)
		if (!location || seen.has(location.clientId)) continue
		seen.add(location.clientId)
		locations.push(location)
	}

	if (locations.length === 0) return defaultQuoteCartLocations()
	return locations
}

function normalizeQuoteCartLocation(value: unknown): QuoteCartLocation | null {
	const record = asRecord(value)
	if (!record) return null
	const clientId = textFrom(record.clientId, record.client_id)
	const normalizedClientId =
		clientId || `${DEFAULT_QUOTE_CART_LOCATION_CLIENT_ID}-${Date.now()}`
	const hour = deliveryHourFrom(record.deliveryHour, record.delivery_hour)
	const period = deliveryPeriodFrom(
		record.deliveryPeriod,
		record.delivery_period,
	)
	return {
		clientId: normalizedClientId,
		label: textFrom(
			record.label,
			record.locationLabel,
			record.location_label,
			normalizedClientId === DEFAULT_QUOTE_CART_LOCATION_CLIENT_ID
				? DEFAULT_QUOTE_CART_LOCATION_LABEL
				: normalizedClientId,
		).slice(0, 240),
		addressId: uuidOrNull(record.addressId, record.address_id),
		deliveryDate: deliveryDateFrom(record.deliveryDate, record.delivery_date),
		deliveryHour: hour,
		deliveryPeriod: hour ? (period ?? 'AM') : null,
	}
}

function sanitizeQuoteCartAssociates(value: unknown): QuoteCartAssociate[] {
	if (!Array.isArray(value)) return []
	const associates: QuoteCartAssociate[] = []
	const seen = new Set<string>()

	for (const entry of value) {
		const associate = normalizeQuoteCartAssociate(entry)
		if (!associate || seen.has(associate.id)) continue
		seen.add(associate.id)
		associates.push(associate)
	}

	return associates
}

function normalizeQuoteCartAssociate(
	value: unknown,
): QuoteCartAssociate | null {
	const record = asRecord(value)
	if (!record) return null
	const id = textFrom(record.id) || randomClientId('assoc')
	const countryCode = textFrom(record.countryCode, record.country_code, '+20')
	return {
		id,
		name: textFrom(record.name).slice(0, 120),
		countryCode: /^\+[1-9][0-9]{0,3}$/.test(countryCode) ? countryCode : '+20',
		number: textFrom(record.number, record.phone, record.phoneNumber).slice(
			0,
			40,
		),
	}
}

function safeLocationClientId(
	value: unknown,
	locationIds: Set<string>,
): string {
	const clientId = textFrom(value)
	return locationIds.has(clientId)
		? clientId
		: DEFAULT_QUOTE_CART_LOCATION_CLIENT_ID
}

function uuidOrNull(...values: unknown[]): string | null {
	const value = textFrom(...values)
	return UUID_RE.test(value) ? value : null
}

function deliveryDateFrom(...values: unknown[]): string | null {
	const value = textFrom(...values)
	return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

function deliveryHourFrom(...values: unknown[]): number | null {
	for (const value of values) {
		const numberValue =
			typeof value === 'number'
				? value
				: typeof value === 'string'
					? Number(value)
					: Number.NaN
		if (
			Number.isInteger(numberValue) &&
			numberValue >= 1 &&
			numberValue <= 12
		) {
			return numberValue
		}
	}
	return null
}

function deliveryPeriodFrom(...values: unknown[]): QuoteDeliveryPeriod | null {
	const value = textFrom(...values).toUpperCase()
	return value === 'AM' || value === 'PM' ? value : null
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
