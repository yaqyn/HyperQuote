import type { AuthSession } from '@hyperquote/auth/types'

export type ActivityEntryType =
  | 'comment_internal'
  | 'comment_external'
  | 'system'
  | 'mention'
  | 'handoff'

export interface ActivityEntry {
  id: string
  entityType: string // 'order' | 'quote' | 'customer' | 'delivery' | 'ticket' etc.
  entityId: string
  type: ActivityEntryType
  actorId: string
  actorName: string
  actorRole?: string
  body: string // plain text, may contain @mentions as @[name](userId)
  createdAt: string // ISO datetime
  metadata?: Record<string, unknown> // type-specific data (e.g., handoff target, system event details)
}

export interface MentionTarget {
  id: string
  name: string
  role: string
  department?: string
}

export interface HandoffStatus {
  entityType: string
  entityId: string
  assignedTo: string
  assignedAt: string // ISO datetime
  acknowledgedAt: string | null
  escalatedAt: string | null
  escalationTarget: string | null // department manager
  isEscalated: boolean
}

export interface ActivityFeedProps {
  entityType: string
  entityId: string
  auth: AuthSession
}
