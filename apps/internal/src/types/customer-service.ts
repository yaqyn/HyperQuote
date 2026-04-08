// Customer Service domain types — contracts for the entire CS module
// Tickets, WhatsApp conversations, damage claims, returns, SLA, and AI triage

// ─── Tab Navigation ──────────────────────────────────────

export type CSTab =
  | 'conversations'
  | 'claims'

// ─── Ticket Types ────────────────────────────────────────

export type TicketPriority = 'critical' | 'high' | 'medium' | 'low'

export type TicketStatus =
  | 'new'
  | 'open'
  | 'in_progress'
  | 'awaiting_customer'
  | 'awaiting_internal'
  | 'awaiting_supplier'
  | 'escalated'
  | 'resolved'
  | 'closed'
  | 'reopened'

export type TicketCategory =
  | 'order'
  | 'quote'
  | 'delivery'
  | 'payment'
  | 'account'
  | 'product'
  | 'platform'

export interface Ticket {
  id: string
  /** Geist Mono */ number: string
  customerName: string
  subject: string
  priority: TicketPriority
  status: TicketStatus
  category: TicketCategory
  assignedAgent: string | null
  /** Geist Mono */ slaDeadline: string
  createdAt: string
  updatedAt: string
}

export interface TicketActivity {
  id: string
  type: 'status_change' | 'comment' | 'note' | 'assignment' | 'escalation'
  author: string
  content: string
  timestamp: string
  isInternal: boolean
}

export interface TicketDetail extends Ticket {
  description: string
  attachments: string[]
  activities: TicketActivity[]
  linkedOrders: string[]
  linkedQuotes: string[]
  linkedInvoices: string[]
  internalNotes: string[]
  subTickets: SubTicket[]
}

export interface SubTicket {
  id: string
  department: string
  subject: string
  status: TicketStatus
  assignedAgent: string | null
}

// ─── WhatsApp Types ──────────────────────────────────────

export type AITriageTier = 0 | 1 | 2

export interface WhatsAppMessage {
  id: string
  sender: 'customer' | 'agent' | 'ai'
  content: string
  timestamp: string
}

export interface WhatsAppConversation {
  id: string
  customerName: string
  customerPhone: string
  lastMessage: string
  timestamp: string
  unresolved: boolean
  unread: boolean
  aiTier: AITriageTier
  messages: WhatsAppMessage[]
  orderCount: number
  openQuotes: number
  outstandingInvoices: number
}

// ─── Returns & Claims Types ──────────────────────────────

export type ClaimTier = 'minor' | 'moderate' | 'major'

export type ClaimStatus =
  | 'reported'
  | 'under_review'
  | 'inspection_scheduled'
  | 'resolution_proposed'
  | 'settled'

export type ReturnStatus =
  | 'requested'
  | 'rma_issued'
  | 'received'
  | 'inspected'
  | 'credit_issued'

export type ResolutionType =
  | 'partial_replacement'
  | 'credit_note'
  | 'price_reduction'
  | 'full_replacement'
  | 'full_refund'
  | 'return_and_reorder'

export interface DamageClaim {
  id: string
  deliveryId: string
  orderId: string
  customerName: string
  claimTier: ClaimTier
  status: ClaimStatus
  photos: string[]
  resolution: ResolutionType | null
  /** Geist Mono */ damagePercent: number
  createdAt: string
}

export interface ReturnRequest {
  id: string
  orderId: string
  customerName: string
  items: string[]
  status: ReturnStatus
  /** Geist Mono */ rmaNumber: string
  createdAt: string
}

// ─── Knowledge Base ──────────────────────────────────────

export interface KBArticle {
  id: string
  title: string
  content: string
  category: TicketCategory
}

// ─── SLA Configuration ───────────────────────────────────

/** SLA targets in minutes */
export const SLA_CONFIG: Record<TicketPriority, { firstResponse: number; resolution: number }> = {
  critical: { firstResponse: 15, resolution: 240 },
  high: { firstResponse: 60, resolution: 480 },
  medium: { firstResponse: 240, resolution: 1440 },
  low: { firstResponse: 480, resolution: 2880 },
}

// ─── Damage Tier Configuration ───────────────────────────

export const DAMAGE_TIERS: Record<ClaimTier, { maxPercent: number; autoApprove: boolean; inspectionHours: number | null }> = {
  minor: { maxPercent: 5, autoApprove: true, inspectionHours: null },
  moderate: { maxPercent: 20, autoApprove: false, inspectionHours: 48 },
  major: { maxPercent: 100, autoApprove: false, inspectionHours: 24 },
}
