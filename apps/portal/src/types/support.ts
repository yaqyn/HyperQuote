/**
 * Support types for the Support window.
 * Ticket management with categories, statuses, and threaded replies.
 */

export type TicketStatus = 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed'

export type TicketCategory = 'order_issue' | 'delivery_problem' | 'billing' | 'account' | 'other'

export interface Ticket {
  /** Unique ticket ID */
  id: string
  /** Ticket subject line */
  subject: string
  /** Issue category */
  category: TicketCategory
  /** Current ticket status */
  status: TicketStatus
  /** ISO date string of creation */
  createdAt: string
  /** ISO date string of last update */
  updatedAt: string
  /** Related order reference (optional) */
  relatedOrderRef?: string
}

export interface TicketReply {
  /** Unique reply ID */
  id: string
  /** Parent ticket ID */
  ticketId: string
  /** Reply message content */
  message: string
  /** Who sent this reply */
  sender: 'customer' | 'support'
  /** ISO date string of reply */
  createdAt: string
  /** Attachment URLs (optional) */
  attachments?: string[]
}
