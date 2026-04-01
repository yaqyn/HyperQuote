/**
 * Notification types for the portal notification system.
 */

export type NotificationType =
  | 'quote_ready'
  | 'order_update'
  | 'delivery'
  | 'payment'
  | 'support'

export type NotificationTargetType =
  | 'quote'
  | 'order'
  | 'delivery'
  | 'ticket'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  createdAt: string // ISO string
  targetType: NotificationTargetType
  targetId: string
}
