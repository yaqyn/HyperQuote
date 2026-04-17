// Procurement domain types — contracts for the entire procurement module
// Supplier pricing data only returned to procurement role, not customer-facing
// PO anonymization enforced: coded_delivery_reference used instead of customer name

// ─── Status Unions ────────────────────────────────────────

/** TEXT column, not enum (Pitfall 6) */
export type InquiryStatus =
	| 'sent'
	| 'opened'
	| 'responded'
	| 'overdue'
	| 'closed'

/** 11 values per Pitfall 2 — full PO lifecycle */
export type POStatus =
	| 'draft'
	| 'sent'
	| 'confirmed'
	| 'in_production'
	| 'shipped'
	| 'partially_received'
	| 'received'
	| 'inspected'
	| 'closed'
	| 'rejected'
	| 'cancelled'

export type SupplierTier = 'preferred' | 'approved' | 'conditional' | 'new'

export type StockFreshness = 'fresh' | 'aging' | 'stale' | 'suppressed'

export type MatchStatus = 'matched' | 'partial_match' | 'mismatch' | 'pending'

export type ProcurementTab =
	| 'stock'
	| 'procurement'
	| 'orders'
	| 'sourcing'
	| 'po-management'
	| 'suppliers'

export type SourcingView = 'inquiry' | 'comparison'

export type InquiryTemplate =
	| 'standard'
	| 'urgent'
	| 'repeat'
	| 'project_based'
	| 'negotiation_followup'

// ─── Inquiry ──────────────────────────────────────────────

export interface InquiryItem {
	productId: string
	productName: string
	quantity: number
	uom: string
	specs: string
}

export interface InquiryResponseItem {
	productId: string
	unitPrice: number
	leadTimeDays: number
	availableQty: number
	notes: string
}

export interface SupplierInquiry {
	id: string
	inquiryNumber: string
	quoteRequestId: string | null
	supplierId: string
	supplierName: string
	status: InquiryStatus
	responseDueDate: string
	sentAt: string
	respondedAt: string | null
	items: InquiryItem[]
	responseItems: InquiryResponseItem[]
}

// ─── Response Tracking ────────────────────────────────────

export interface ResponseTrackingRow {
	supplierId: string
	supplierName: string
	sentDate: string
	status: InquiryStatus
	responseDate: string | null
	inquiryId: string
}

// ─── Price Comparison ─────────────────────────────────────

export type SupplierTag = 'best-price' | 'fastest' | 'partial'

export interface RankedSupplier {
	supplierId: string
	supplierName: string
	unitPrice: number
	leadTimeDays: number
	availableQty: number
	certificationStatus: 'certified' | 'pending' | 'none'
	rank: number
	tags: SupplierTag[]
}

export interface PriceComparison {
	productId: string
	productName: string
	requestedQty: number
	uom: string
	suppliers: RankedSupplier[]
}

export interface SplitSource {
	productId: string
	allocations: { supplierId: string; quantity: number; unitPrice: number }[]
}

// ─── Purchase Order ───────────────────────────────────────

export interface POItem {
	id: string
	productId: string
	productName: string
	quantity: number
	receivedQuantity: number
	rejectedQuantity: number
	unitCost: number
	lineTotal: number
}

export interface ThreeWayMatchResult {
	poVsReceipt: MatchStatus
	poVsInvoice: MatchStatus
	receiptVsInvoice: MatchStatus
	overall: MatchStatus
	variances: {
		quantityVariance: number
		priceVariance: number
		taxVariance: number
	}
}

export interface PurchaseOrder {
	id: string
	poNumber: string
	supplierId: string
	supplierName: string
	orderId: string | null
	status: POStatus
	codedDeliveryReference: string
	subtotal: number
	vatAmount: number
	total: number
	expectedDeliveryDate: string
	items: POItem[]
	threeWayMatch: ThreeWayMatchResult
}

// ─── Supplier Scorecard ───────────────────────────────────

export interface SupplierScorecard {
	supplierId: string
	supplierName: string
	onTimeDeliveryRate: number
	fillRate: number
	qualityRejectionRate: number
	priceCompetitiveness: number
	avgResponseTimeDays: number
	overallScore: number
	trend: 'improving' | 'declining' | 'stable'
	tier: SupplierTier
}

// ─── Home / Queue ─────────────────────────────────────────

export interface ProcurementHomeData {
	pendingInquiries: number
	responsesNeedingReview: number
	activePOs: Record<string, number>
	performanceHighlights: {
		best: { supplierId: string; supplierName: string; score: number }
		worst: { supplierId: string; supplierName: string; score: number }
	}
}

// ─── Historical ───────────────────────────────────────────

export interface HistoricalPurchase {
	date: string
	supplierId: string
	supplierName: string
	unitPrice: number
	quantity: number
	deliveryPerformance: 'on_time' | 'late' | 'early'
}

// ─── Ranking Algorithm ────────────────────────────────────

/**
 * Supplier ranking weights per RESEARCH.md Pattern 4:
 * Price 40% + Availability 25% + Lead Time 20% + Reliability 15%
 *
 * Each factor is normalized to 0-100 before weighting.
 * Computed server-side in procurement-comparison.ts.
 */
export const RANKING_WEIGHTS = {
	price: 0.4,
	availability: 0.25,
	leadTime: 0.2,
	reliability: 0.15,
} as const

/**
 * Compute weighted supplier rank score.
 * Higher score = better supplier for this request.
 */
export function computeRankScore(
	priceScore: number,
	availabilityScore: number,
	leadTimeScore: number,
	reliabilityScore: number,
): number {
	return Math.round(
		priceScore * RANKING_WEIGHTS.price +
			availabilityScore * RANKING_WEIGHTS.availability +
			leadTimeScore * RANKING_WEIGHTS.leadTime +
			reliabilityScore * RANKING_WEIGHTS.reliability,
	)
}

// ─── Three-Way Match ──────────────────────────────────────

/**
 * Compute match status based on variance and tolerance threshold.
 * Tolerance thresholds should come from system_settings, not hardcoded.
 */
export function computeMatchStatus(
	variance: number,
	tolerance: number,
): MatchStatus {
	const absVariance = Math.abs(variance)
	if (absVariance === 0) return 'matched'
	if (absVariance <= tolerance) return 'partial_match'
	return 'mismatch'
}

/**
 * Compute overall three-way match from individual statuses.
 */
export function computeOverallMatch(
	poVsReceipt: MatchStatus,
	poVsInvoice: MatchStatus,
	receiptVsInvoice: MatchStatus,
): MatchStatus {
	const statuses = [poVsReceipt, poVsInvoice, receiptVsInvoice]
	if (statuses.every((s) => s === 'matched')) return 'matched'
	if (statuses.some((s) => s === 'mismatch')) return 'mismatch'
	if (statuses.some((s) => s === 'pending')) return 'pending'
	return 'partial_match'
}

// ─── Supplier Tier ────────────────────────────────────────

/**
 * Compute supplier tier from scorecard metrics.
 * onTimeDeliveryRate >= 95 and is_preferred -> Preferred
 * >= 85 and qualityScore >= 80 -> Approved
 * >= 70 -> Conditional
 * else New
 */
export function computeTier(
	onTimeDeliveryRate: number,
	qualityScore: number,
	isPreferred: boolean,
): SupplierTier {
	if (onTimeDeliveryRate >= 95 && isPreferred) return 'preferred'
	if (onTimeDeliveryRate >= 85 && qualityScore >= 80) return 'approved'
	if (onTimeDeliveryRate >= 70) return 'conditional'
	return 'new'
}

// ─── PO Status Flow ───────────────────────────────────────

/** Valid PO status transitions */
const PO_TRANSITIONS: Record<POStatus, POStatus[]> = {
	draft: ['sent', 'cancelled'],
	sent: ['confirmed', 'rejected', 'cancelled'],
	confirmed: ['in_production', 'cancelled'],
	in_production: ['shipped', 'cancelled'],
	shipped: ['partially_received', 'received'],
	partially_received: ['received'],
	received: ['inspected'],
	inspected: ['closed'],
	closed: [],
	rejected: [],
	cancelled: [],
}

/** Happy-path PO statuses (exclude terminal/error states) */
export const HAPPY_PATH_STATUSES: POStatus[] = [
	'draft',
	'sent',
	'confirmed',
	'in_production',
	'shipped',
	'partially_received',
	'received',
	'inspected',
	'closed',
]

/**
 * Check whether a PO status transition is valid.
 */
export function isValidTransition(from: POStatus, to: POStatus): boolean {
	return PO_TRANSITIONS[from]?.includes(to) ?? false
}
