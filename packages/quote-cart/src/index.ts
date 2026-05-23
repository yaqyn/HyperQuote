import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

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
			const productId = UUID_RE.test(item.productId)
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

export function createQuoteCartStore(storageKey = QUOTE_CART_STORAGE_KEY) {
	return create<QuoteCartState>()(
		persist(
			(set, get) => ({
				items: [],
				globalNote: '',
				add: (item, quantity = 1) =>
					set((state) => {
						const normalized = normalizeQuoteCartItemInput(item, quantity)
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
	for (const [index, item] of value.entries()) {
		const normalized = normalizeQuoteCartItem(item, index)
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
	index: number,
): QuoteCartItem | null {
	const record = asRecord(value)
	if (!record) return null

	const productId = textFrom(
		record.productId,
		record.product_id,
		record.id,
		record.sku,
		record.slug,
		`legacy-cart-item-${index + 1}`,
	)
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
): QuoteCartItem {
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
