// ---------------------------------------------------------------------------
// Support Panel — Unified conversation model across 3 channels
// Ticket is a tracking layer on conversations, not a channel.
// ---------------------------------------------------------------------------

export type ChannelType = 'email' | 'whatsapp' | 'chat'

export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'closed'

export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export type MessageDirection = 'inbound' | 'outbound'

// ── Customer ────────────────────────────────────────────────────────────────

export interface Customer {
  id: string
  name: string
  nameAr: string
  email: string | null
  phone: string | null
  company: string | null
  companyAr: string | null
  totalConversations: number
  firstContactAt: string
  satisfactionAvg: number | null
}

// ── Linked entities ─────────────────────────────────────────────────────────

export interface LinkedOrder {
  id: string
  displayId: string
  rfqId: string | null
  status: string
  totalAmount: number
  currency: string
  createdAt: string
}

export interface LinkedQuote {
  id: string
  displayId: string
  status: string
  totalAmount: number
  currency: string
  createdAt: string
}

// ── Message ─────────────────────────────────────────────────────────────────

export interface Attachment {
  id: string
  name: string
  type: string
  sizeBytes: number
  url: string
}

export interface Message {
  id: string
  conversationId: string
  channel: ChannelType
  direction: MessageDirection
  content: string
  senderName: string
  timestamp: string
  attachments: Attachment[]
  read: boolean
  metadata: Record<string, unknown>
}

// ── Conversation ────────────────────────────────────────────────────────────

export interface Conversation {
  id: string
  customer: Customer
  channel: ChannelType
  status: ConversationStatus
  priority: Priority
  subject: string
  lastMessagePreview: string
  lastMessageAt: string
  unreadCount: number
  assignedTo: string | null
  assignedToName: string | null
  tags: string[]
  messages: Message[]
  linkedOrders: LinkedOrder[]
  linkedQuotes: LinkedQuote[]
  createdAt: string
  /** Ticket number when this conversation is formally tracked (e.g. TKT-2026-0001). Null if untracked. */
  ticketId: string | null
  slaDeadline: string | null
  slaBreached: boolean
}

// ── Inbox metrics ───────────────────────────────────────────────────────────

export interface InboxMetrics {
  openCount: number
  pendingCount: number
  urgentCount: number
  avgResponseMinutes: number
  slaCompliancePercent: number
}
