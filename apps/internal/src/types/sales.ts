// Sales domain types — contracts for the entire sales module
// Margin thresholds are ALWAYS fetched from pricing_rules table, NEVER hardcoded

// ─── RFQ ───────────────────────────────────────────────────

export type CustomerTier = 'A' | 'B' | 'C' | 'new'

export type RFQStatus =
	| 'submitted'
	| 'assigned'
	| 'reviewing'
	| 'awaiting_clarification'
	| 'quoting'
	| 'quoted'
	| 'negotiating'
	| 'declined'
	| 'expired'
	| 'saved'

export interface RFQ {
	id: string
	customerName: string
	customerTier: CustomerTier
	estimatedValue: number
	priorityScore: number // 0-100, computed server-side
	lineItemCount: number
	status: RFQStatus
	assignedRep: string | null
	createdAt: string
	slaDeadline: string
	deliveryUrgency: number // days until requested delivery
	previewItems?: string[]
	deliveryCity?: string
	contactName?: string
	hasOutdatedPrices?: boolean
}

// ─── Quote ─────────────────────────────────────────────────

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

export type FreshnessIndicator = 'fresh' | 'aging' | 'stale' | 'missing'

/**
 * Two-dimensional price state for catalog items:
 * - priceStatus: whether inventory has recently updated the supplier price
 * - recentlyOrdered: whether a customer recently ordered this item (demand signal)
 *
 * Combined urgency:
 *   updated                  → good (normal)
 *   updated + recentlyOrdered → hot  (selling, price is fresh)
 *   outdated                 → stale (ignore until demand appears)
 *   outdated + recentlyOrdered → urgent (MUST update — inventory needs to act)
 */
export type PriceStatus = 'updated' | 'outdated'

export interface QuoteItem {
	id: string
	productName: string
	specification: string
	quantity: number
	unit: string
	supplierCost: number // buffered cost (raw + 2.5%), NEVER raw supplier invoice cost
	marginPercent: number
	sellPrice: number
	lineTotal: number
	freshnessIndicator: FreshnessIndicator
	priceStatus: PriceStatus
	recentlyOrdered: boolean
	supplierName: string
	customerCounterPrice: number | null
}

export interface QuoteVersion {
	id: string
	quoteNumber: string
	version: number
	status: QuoteStatus
	total: number
	marginPercent: number
	createdAt: string
	changes: string
}

// ─── Margin ────────────────────────────────────────────────

export interface MarginThresholds {
	productCategory: string
	target: number // fetched from pricing_rules, NOT hardcoded
	floor: number // fetched from pricing_rules, NOT hardcoded
	absoluteMin: number // fetched from pricing_rules, NOT hardcoded
}

// ─── Priority Score ────────────────────────────────────────

const TIER_WEIGHTS: Record<string, number> = {
	A: 100,
	B: 60,
	C: 30,
	new: 20,
}

function getValueWeight(value: number): number {
	if (value > 5_000_000) return 100
	if (value > 1_000_000) return 80
	if (value > 500_000) return 50
	return 20
}

function getAgeWeight(ageHours: number): number {
	if (ageHours > 24) return 100
	if (ageHours > 8) return 80
	if (ageHours > 4) return 60
	if (ageHours > 1) return 40
	return 20
}

function getDeliveryUrgencyWeight(deliveryDays: number): number {
	if (deliveryDays < 7) return 100
	if (deliveryDays < 14) return 70
	if (deliveryDays < 30) return 40
	return 20
}

/**
 * Priority Score = (Tier * 40%) + (Value * 30%) + (Age * 20%) + (Delivery Urgency * 10%)
 * Computed server-side, stored on quote_requests.priority_score.
 */
export function calculatePriorityScore(
	tier: string,
	value: number,
	ageHours: number,
	deliveryDays: number,
): number {
	const tierWeight = TIER_WEIGHTS[tier] ?? 20
	const valueWeight = getValueWeight(value)
	const ageWeight = getAgeWeight(ageHours)
	const urgencyWeight = getDeliveryUrgencyWeight(deliveryDays)

	return Math.round(
		tierWeight * 0.4 +
			valueWeight * 0.3 +
			ageWeight * 0.2 +
			urgencyWeight * 0.1,
	)
}

// ─── Customer ──────────────────────────────────────────────

export interface Customer {
	id: string
	companyName: string
	tier: CustomerTier
	status: 'unclaimed' | 'claimed' | 'active' | 'inactive'
	contactName: string
	phone: string
	email: string | null
	address: string | null
	creditLimit: number
	currentExposure: number
	assignedSalesRep: string | null
	createdAt: string
}
