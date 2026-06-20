export interface PortalDraftCopyItem {
	name: string
	nameAr?: string | null
	qty: number
	unit: string
	unitAr?: string | null
}

const DRAFT_COPY_BOILERPLATE = [
	/\blyon\s+selected\b/i,
	/\bportal ai\b/i,
	/\bavailable catalog\b/i,
	/\bcatalog match\b/i,
	/\bcustomer review\b/i,
	/\breview\s+(?:dimensions|quantities|it|the draft)/i,
	/\bbefore submitting\b/i,
	/\bsubmit manually\b/i,
	/\bremains?\s+a\s+draft\b/i,
	/\bedit link\b/i,
	/\bshall i apply\b/i,
	/\bi can adjust\b/i,
	/\bto the draft\b/i,
	/\|\s*item\s*\|\s*qty\s*\|/i,
	/اختار\s+ليون/,
	/الكتالوج\s+المتاح/,
	/راجع/,
	/قبل\s+الإرسال/,
]

const WEAK_TITLE_START =
	/^(?:an?\s+)?(?:draft|quote|request|rfq|order)\s+(?:of|for)\b/i

export function normalizePortalDraftTitle(
	modelTitle: string | undefined,
	items: PortalDraftCopyItem[],
	locale: 'ar' | 'en',
): string {
	const cleaned = cleanDraftTitle(modelTitle)
	if (
		cleaned &&
		!isBoilerplateCopy(cleaned) &&
		!WEAK_TITLE_START.test(cleaned)
	) {
		return cleaned.slice(0, 120)
	}
	return materialTitleFromItems(items, locale)
}

export function normalizePortalDraftNotes(
	modelNotes: string | undefined,
	items: PortalDraftCopyItem[],
	locale: 'ar' | 'en',
): string {
	const cleaned = cleanDraftNotes(modelNotes)
	if (cleaned && !isBoilerplateCopy(cleaned)) {
		return cleaned.slice(0, 600)
	}
	return materialNotesFromItems(items, locale)
}

export function isLegacyGeneratedDraftTitle(value: string | null | undefined) {
	const title = cleanWhitespace(value)
	return (
		!title ||
		/^Draft\s*:/i.test(title) ||
		/^Portal AI draft$/i.test(title) ||
		/^Merged Portal AI draft$/i.test(title) ||
		/^Catalog selection draft$/i.test(title) ||
		/^مسودة(?:\s+من\s+ليون|\s+اختيار\s+من\s+الكتالوج)?$/i.test(title)
	)
}

function materialTitleFromItems(
	items: PortalDraftCopyItem[],
	locale: 'ar' | 'en',
): string {
	const first = items[0]
	if (!first) return locale === 'ar' ? 'طلب مواد' : 'Material request'
	const firstName = itemName(first, locale)
	if (items.length === 1) {
		return `${firstName} - ${formatItemQuantity(first, locale)}`.slice(0, 120)
	}
	return locale === 'ar'
		? `${firstName} + ${items.length - 1} مواد أخرى`
		: `${firstName} + ${items.length - 1} more material${items.length === 2 ? '' : 's'}`
}

function materialNotesFromItems(
	items: PortalDraftCopyItem[],
	locale: 'ar' | 'en',
): string {
	if (items.length === 0) {
		return locale === 'ar'
			? 'لم يتم تحديد مواد بعد.'
			: 'No materials selected yet.'
	}
	const visible = items.slice(0, 4).map((item) => {
		return locale === 'ar'
			? `${formatItemQuantity(item, locale)} ${itemName(item, locale)}`
			: `${formatItemQuantity(item, locale)} ${itemName(item, locale)}`
	})
	const more = items.length - visible.length
	if (more > 0) {
		visible.push(
			locale === 'ar'
				? `${more} مواد أخرى`
				: `${more} more material${more === 1 ? '' : 's'}`,
		)
	}
	return `${visible.join(locale === 'ar' ? '، ' : ', ')}.`
}

function formatItemQuantity(
	item: PortalDraftCopyItem,
	locale: 'ar' | 'en',
): string {
	const unit = locale === 'ar' ? item.unitAr || item.unit : item.unit
	return `${formatQuantity(item.qty)} ${unit}`.trim()
}

function itemName(item: PortalDraftCopyItem, locale: 'ar' | 'en'): string {
	return locale === 'ar' ? item.nameAr || item.name : item.name
}

function cleanDraftTitle(value: string | undefined): string {
	return cleanWhitespace(value)
		.replace(/^(?:draft|quote|request|rfq)\s*[:：-]\s*/i, '')
		.replace(/^مسودة\s*[:：-]\s*/i, '')
		.trim()
}

function cleanDraftNotes(value: string | undefined): string {
	return cleanWhitespace(value)
		.replace(/^notes?\s*[:：-]\s*/i, '')
		.replace(/^ملاحظات\s*[:：-]\s*/i, '')
		.trim()
}

function cleanWhitespace(value: string | null | undefined): string {
	return (value ?? '').replace(/\s+/g, ' ').trim()
}

function isBoilerplateCopy(value: string): boolean {
	return DRAFT_COPY_BOILERPLATE.some((pattern) => pattern.test(value))
}

function formatQuantity(value: number): string {
	return Number.isInteger(value)
		? String(value)
		: String(value).replace(/\.0+$/, '')
}
