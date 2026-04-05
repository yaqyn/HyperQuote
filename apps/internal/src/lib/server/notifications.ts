import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export interface Notification {
  id: string
  type: 'system' | 'mention' | 'approval' | 'sla' | 'delivery'
  title: string
  body: string
  createdAt: string
  readAt: string | null
  actionUrl?: string
}

/**
 * Fetch notifications for the current user.
 * Returns mock data for development -- will query notifications table with RLS in Phase 16+.
 */
export const getNotifications = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Notification[]> => {
    const now = new Date()
    const today = now.toISOString()
    const yesterday = new Date(now.getTime() - 86400000).toISOString()
    const older = new Date(now.getTime() - 86400000 * 3).toISOString()

    return [
      {
        id: 'notif-1',
        type: 'approval',
        title: 'Quote #QR-2024-0847 awaiting approval',
        body: 'Ahmed Hassan submitted a quote for EGP 245,000. Requires manager approval.',
        createdAt: today,
        readAt: null,
        actionUrl: '/internal/sales/quotes/QR-2024-0847',
      },
      {
        id: 'notif-2',
        type: 'sla',
        title: 'SLA warning: Quote #QR-2024-0839',
        body: '3 hours remaining on 4-hour SLA. No supplier response yet.',
        createdAt: yesterday,
        readAt: null,
        actionUrl: '/internal/procurement/quotes/QR-2024-0839',
      },
      {
        id: 'notif-3',
        type: 'delivery',
        title: 'Delivery DEL-0412 completed',
        body: 'Driver Mohamed confirmed delivery at Nasr City site. POD attached.',
        createdAt: older,
        readAt: older,
        actionUrl: '/internal/dispatch/deliveries/DEL-0412',
      },
    ]
  },
)

/**
 * Mark a single notification as read.
 * Mock implementation -- will UPDATE notifications SET read_at = now() in Phase 16+.
 */
export const markNotificationRead = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data: _input }) => {
    return { success: true as const }
  })

/**
 * Mark all notifications as read for the current user.
 * Mock implementation -- will UPDATE notifications SET read_at = now() WHERE user_id = ... in Phase 16+.
 */
export const markAllRead = createServerFn({ method: 'POST' }).handler(async () => {
  return { success: true as const }
})
