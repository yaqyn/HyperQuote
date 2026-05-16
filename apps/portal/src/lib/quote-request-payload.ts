import type { QuoteItem } from '../stores/quote-builder'

interface QuoteItemPayload {
	productId?: string
	customerDescription: string
	quantity: number
	unitOfMeasure: string
	notes?: string
	sortOrder: number
	matchConfidence?: number
	isUnmatched?: boolean
}

interface QuoteBuilderPayloadSource {
	draftId: string | null
	items: QuoteItem[]
	deliveryAddressId: string | null
	deliveryDate: string | null
	notes: string
	projectId: string | null
}

interface QuoteSubmissionPayload {
	items: QuoteItemPayload[]
	deliveryAddressId?: string
	deliveryDate?: string
	notes?: string
	projectId?: string
}

function toQuoteItemPayload(item: QuoteItem): QuoteItemPayload {
	return {
		productId: item.productId,
		customerDescription: item.customerDescription,
		quantity: item.quantity,
		unitOfMeasure: item.unitOfMeasure,
		notes: item.notes,
		sortOrder: item.sortOrder,
		matchConfidence: item.matchConfidence,
		isUnmatched: item.isUnmatched,
	}
}

function toQuoteItemsPayload(items: QuoteItem[]): QuoteItemPayload[] {
	return items.map(toQuoteItemPayload)
}

export function toQuoteSubmissionPayload(
	state: QuoteBuilderPayloadSource,
): QuoteSubmissionPayload {
	return {
		items: toQuoteItemsPayload(state.items),
		deliveryAddressId: state.deliveryAddressId ?? undefined,
		deliveryDate: state.deliveryDate ?? undefined,
		notes: state.notes || undefined,
		projectId: state.projectId ?? undefined,
	}
}

export function toQuoteDraftPayload(
	state: QuoteBuilderPayloadSource,
): QuoteSubmissionPayload & { draftId?: string } {
	return {
		draftId: state.draftId ?? undefined,
		...toQuoteSubmissionPayload(state),
	}
}
