export type QuoteStatus =
	| 'draft'
	| 'internal_review'
	| 'pending_approval'
	| 'approved'
	| 'sent'
	| 'viewed'
	| 'negotiating'
	| 'revised'
	| 'accepted'
	| 'declined'
	| 'expired'
	| 'cancelled'

export type LineDecision = 'accepted' | 'rejected' | 'negotiate' | 'pending'

export type RejectReason =
	| 'too_expensive'
	| 'not_needed'
	| 'found_alternative'
	| 'other'

export type DeclineReason =
	| 'price_too_high'
	| 'found_alternative'
	| 'project_cancelled'
	| 'other'

export interface QuoteTimelineStep {
	key:
		| 'submitted'
		| 'under_review'
		| 'sourcing'
		| 'quote_ready'
		| 'sent'
		| 'accepted_negotiating'
		| 'order_confirmed'
	label: string
	status: 'completed' | 'current' | 'future'
	timestamp?: string
}

export interface QuoteItem {
	id: string
	productId: string
	productName: string
	productNameAr: string
	quantity: number
	unitOfMeasure: string
	unitPrice: number
	lineTotal: number
	marginPercent?: number
	customerCounterPrice?: number | null
	lineStatus: string
	isAccepted?: boolean | null
	sortOrder: number
}

export interface QuoteVersion {
	id: string
	versionNumber: number
	createdAt: string
	status: QuoteStatus
	subtotal: number
	total: number
	items: QuoteItem[]
	notes?: string
}

export interface Quote {
	id: string
	tenantId: string
	quoteNumber: string
	quoteRequestId?: string
	customerId: string
	projectId?: string
	versionNumber: number
	previousVersionId?: string | null
	status: QuoteStatus
	subtotal: number
	taxAmount: number
	deliveryFee: number
	discountAmount: number
	total: number
	currency: string
	paymentTerms: string
	validityDays: number
	validUntil: string
	daysRemaining: number
	assignedRepName?: string
	assignedRepPhone?: string
	items: QuoteItem[]
	versions: QuoteVersion[]
	timeline: QuoteTimelineStep[]
	createdAt: string
	updatedAt: string
}

export interface CounterOfferPayload {
	quoteId: string
	counterType: 'total' | 'per_line'
	lineItems?: Array<{ itemId: string; newPrice: number; newQuantity?: number }>
	totalDiscount?: number
	selfPickup?: boolean
	notes?: string
}

export interface PartialResponsePayload {
	quoteId: string
	lineResponses: Array<{
		itemId: string
		decision: 'accepted' | 'rejected' | 'negotiate'
		rejectReason?: RejectReason
		negotiatedPrice?: number
	}>
}
