const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const FALLBACK_CATEGORY = 'material'
const FALLBACK_CATEGORY_AR = 'مواد'
const FALLBACK_DESCRIPTION = 'Custom material'
const FALLBACK_DESCRIPTION_AR = 'مواد مخصصة'
const FALLBACK_UNIT = 'unit'
const FALLBACK_UNIT_AR = 'وحدة'

export interface DraftCartItem {
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

export interface DraftQuoteRequestItemPayload {
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

function sanitizeDraftQuoteItems(value: unknown): DraftCartItem[] {
	if (!Array.isArray(value)) return []

	const usedIds = new Set<string>()
	return value.flatMap((item, index) => {
		const normalized = normalizeDraftCartItem(item, index)
		if (!normalized) return []

		if (usedIds.has(normalized.productId)) {
			normalized.productId = `${normalized.productId}-${index + 1}`
		}
		usedIds.add(normalized.productId)
		return [normalized]
	})
}

export function sanitizeDraftQuoteSnapshot(value: unknown): {
	globalNote: string
	items: DraftCartItem[]
} {
	const record = asRecord(value)
	return {
		globalNote: textFrom(record?.globalNote, record?.note, record?.notes),
		items: sanitizeDraftQuoteItems(record?.items),
	}
}

export function toDraftQuoteRequestItemPayloads(
	items: DraftCartItem[],
	options: { isArabic: boolean },
): DraftQuoteRequestItemPayload[] {
	return sanitizeDraftQuoteItems(items)
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

function normalizeDraftCartItem(
	value: unknown,
	index: number,
): DraftCartItem | null {
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
		record.category,
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
	const quantity = nonNegativeQuantity(
		record.quantity,
		record.qty,
		record.amount,
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
		quantity,
		imageUrl: textFrom(record.imageUrl, record.image_url, record.image, ''),
		note: textFrom(record.note, record.notes, ''),
	}
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
