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
  | 'declined'
  | 'expired'

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
}

export interface RFQItem {
  id: string
  productName: string
  specification: string
  quantity: number
  unit: string
  customerDescription: string
}

export interface CustomerSnapshot {
  id: string
  name: string
  tier: CustomerTier
  orderCount: number
  lifetimeValue: number
  avgMargin: number
  paymentHistory: 'excellent' | 'good' | 'fair' | 'poor'
  creditLimit: number
  currentExposure: number
  availableCredit: number
}

export interface RFQDetail extends RFQ {
  items: RFQItem[]
  customer: CustomerSnapshot
  deliveryRequirements: {
    address: string
    requestedDate: string
    deliveryType: string
    specialInstructions: string
  }
  attachments: { id: string; name: string; url: string; size: number }[]
  aiInsights?: {
    winProbability: number
    recommendedMargin: number
    behavioralPrediction: string
  }
  similarQuotes?: {
    id: string
    quoteNumber: string
    marginPercent: number
    outcome: 'won' | 'lost'
    value: number
  }[]
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
  supplierName: string
  customerCounterPrice: number | null
}

export interface Quote {
  id: string
  rfqId: string
  quoteNumber: string
  version: number
  status: QuoteStatus
  items: QuoteItem[]
  subtotal: number
  vatAmount: number
  total: number
  validUntil: string
  marginPercent: number
  sentAt: string | null
  sentVia: 'portal' | 'email' | 'both' | null
  scheduledSendAt: string | null
  previousVersionId: string | null
  customerPoNumber: string | null
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
  target: number   // fetched from pricing_rules, NOT hardcoded
  floor: number    // fetched from pricing_rules, NOT hardcoded
  absoluteMin: number // fetched from pricing_rules, NOT hardcoded
}

export type MarginLevel = 'green' | 'yellow' | 'red' | 'blocked'

/**
 * Determines the margin level based on current margin and category thresholds.
 * Thresholds MUST come from pricing_rules table -- never hardcode values.
 */
export function getMarginLevel(marginPercent: number, thresholds: MarginThresholds): MarginLevel {
  if (marginPercent < 0) return 'blocked'
  if (marginPercent < thresholds.absoluteMin) return 'blocked'
  if (marginPercent < thresholds.floor) return 'red'
  if (marginPercent < thresholds.target) return 'yellow'
  return 'green'
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
    tierWeight * 0.4 + valueWeight * 0.3 + ageWeight * 0.2 + urgencyWeight * 0.1,
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

export interface CustomerContact {
  id: string
  name: string
  role: string
  email: string | null
  phone: string
  lastContactDate: string | null
  commPreference: 'phone' | 'email' | 'whatsapp' | 'portal'
  relationshipStrength: 'strong' | 'developing' | 'new'
  dealRole: 'decision_maker' | 'budget_holder' | 'influencer' | 'end_user' | 'gatekeeper'
  reportsTo: string | null
}

export interface Customer360Data {
  customer: Customer
  contacts: CustomerContact[]
  quotes: {
    id: string
    quoteNumber: string
    status: QuoteStatus
    total: number
    createdAt: string
    outcome: 'won' | 'lost' | 'pending' | null
  }[]
  orders: {
    id: string
    orderNumber: string
    status: string
    total: number
    createdAt: string
    deliveryStatus: string
    paymentStatus: string
  }[]
  financials: {
    creditLimit: number
    creditLimitHistory: { date: string; limit: number }[]
    arAging: {
      current: number
      days1to30: number
      days31to60: number
      days61to90: number
      days90plus: number
    }
    paymentHistory: { date: string; amount: number; daysLate: number }[]
    avgDaysToPay: number
  }
  projects: {
    id: string
    name: string
    stage: 'planning' | 'foundation' | 'structure' | 'finishing'
    materialRequirements: string[]
  }[]
  communications: {
    id: string
    type: 'call' | 'email' | 'meeting' | 'whatsapp'
    summary: string
    date: string
    contactName: string
  }[]
  documents: {
    id: string
    name: string
    type: 'quote' | 'invoice' | 'delivery_note' | 'contract' | 'certificate'
    url: string
    uploadedAt: string
  }[]
  notes: {
    id: string
    body: string
    author: string
    tag: 'quote-related' | 'order-related' | 'general'
    createdAt: string
  }[]
  healthScore: number // 0-100 composite
}

// ─── Pipeline ──────────────────────────────────────────────

export type PipelineStageId =
  | 'rfq_received'
  | 'reviewing'
  | 'sourcing'
  | 'quoting'
  | 'sent'
  | 'negotiating'
  | 'closing'
  | 'won'
  | 'lost_expired'

export interface PipelineDeal {
  id: string
  customerName: string
  customerTier: CustomerTier
  dealValue: number
  stage: PipelineStageId
  daysInStage: number
  winProbability: number
  assignedRep: string
  statusText: string
  color: 'green' | 'yellow' | 'red'
}

export interface PipelineStage {
  id: PipelineStageId
  name: string
  dealCount: number
  totalValue: number
}

// ─── SLA ───────────────────────────────────────────────────

export interface SLATierConfig {
  response: number // hours (business hours)
  escalation: number // hours (business hours)
}

export interface SLAConfig {
  tierA: SLATierConfig
  tierB: SLATierConfig
  tierC: SLATierConfig
  new: SLATierConfig
}

export const DEFAULT_SLA_CONFIG: SLAConfig = {
  tierA: { response: 2, escalation: 4 },
  tierB: { response: 4, escalation: 8 },
  tierC: { response: 8, escalation: 24 },
  new: { response: 4, escalation: 8 },
}

// ─── Activity ──────────────────────────────────────────────

export interface ActivityEvent {
  id: string
  type: string
  description: string
  timestamp: string
  entityType: string
  entityId: string
  actionLabel: string | null
  actionUrl: string | null
}

// ─── Analytics ─────────────────────────────────────────────

export interface SalesAnalytics {
  revenue: number
  orderCount: number
  avgOrderValue: number
  topProducts: { name: string; revenue: number; quantity: number }[]
  topCustomers: { name: string; revenue: number; orderCount: number }[]
  pipelineByStage: { stage: string; count: number; value: number }[]
  conversionRates: { fromStage: string; toStage: string; rate: number }[]
}

// ─── Approval ──────────────────────────────────────────────

export interface ApprovalRequest {
  id: string
  quoteId: string
  quoteSummary: {
    quoteNumber: string
    customerName: string
    total: number
    lineItemCount: number
  }
  marginPercent: number
  profitAmount: number
  customerContext: {
    tier: CustomerTier
    lifetimeValue: number
    orderCount: number
    strategicImportance: 'high' | 'medium' | 'low'
  }
  repJustification: string | null
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested'
  createdAt: string
}

// ─── Clarification ─────────────────────────────────────────

export type ClarificationQuestionType =
  | 'material_spec_ambiguous'
  | 'quantity_unclear'
  | 'delivery_access'
  | 'no_date'
  | 'mixed_units'
  | 'missing_attachment'

export interface ClarificationQuestion {
  type: ClarificationQuestionType
  freeText?: string
}

// ─── Pipeline Filters ──────────────────────────────────────

export interface PipelineFilters {
  rep?: string
  customer?: string
  valueRange?: { min: number; max: number }
  ageRange?: { min: number; max: number }
}
