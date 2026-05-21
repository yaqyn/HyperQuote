// Sales domain types — contracts for the entire sales module
// Margin thresholds are always fetched from pricing_rules.

// ─── RFQ ───────────────────────────────────────────────────

type CustomerTier = 'A' | 'B' | 'C' | 'new'

type RFQStatus =
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
	requestNumber?: string
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
	source?: 'local' | 'supabase'
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

// ─── Margin ────────────────────────────────────────────────

export interface MarginThresholds {
	active?: boolean
	categorySlug: string | null
	productSlug: string | null
	productCategory: string
	bonus: number
	target: number
	floor: number
	absoluteMin: number
}

const DEFAULT_MARGIN_THRESHOLDS: MarginThresholds = {
	absoluteMin: 20,
	bonus: 20,
	categorySlug: null,
	floor: 20,
	productCategory: 'all',
	productSlug: null,
	target: 20,
}

export function resolveMarginThreshold(
	thresholds: MarginThresholds[],
	scope: { categorySlug?: string | null; productSlug?: string | null },
): MarginThresholds {
	const categorySlug = scope.categorySlug ?? null
	const productSlug = scope.productSlug ?? null
	const productRule =
		productSlug && categorySlug
			? thresholds.find(
					(rule) =>
						rule.active !== false &&
						rule.categorySlug === categorySlug &&
						rule.productSlug === productSlug,
				)
			: null
	if (productRule) return productRule

	const categoryRule = categorySlug
		? thresholds.find(
				(rule) =>
					rule.active !== false &&
					rule.categorySlug === categorySlug &&
					rule.productSlug == null,
			)
		: null
	if (categoryRule) return categoryRule

	return (
		thresholds.find(
			(rule) =>
				rule.active !== false &&
				rule.categorySlug == null &&
				rule.productSlug == null,
		) ??
		thresholds.find((rule) => rule.active !== false) ??
		DEFAULT_MARGIN_THRESHOLDS
	)
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
