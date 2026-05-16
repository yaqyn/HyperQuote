/**
 * Notification server functions.
 * Get notifications, mark as read, mark all as read.
 * Dev mode fallback when Supabase not configured.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { Notification, NotificationType } from '../../types/notification'
import { getAuthenticatedSupabase, isSupabaseConfigured } from './_supabase'

// ============================================================================
// Mock data for dev mode
// ============================================================================

function getMockNotifications(): Notification[] {
	const now = Date.now()
	const min = 60 * 1000
	const hour = 60 * min
	const day = 24 * hour

	return [
		{
			id: 'notif-001',
			type: 'quote_ready',
			title: 'Quote QT-2026-00142 is ready',
			body: 'Your quote for 6 items has been prepared. Review and accept before it expires.',
			read: false,
			createdAt: new Date(now - 2 * min).toISOString(),
			targetType: 'quote',
			targetId: 'quote-001',
		},
		{
			id: 'notif-002',
			type: 'order_update',
			title: 'Order ORD-2026-00089 confirmed',
			body: 'Your order has been confirmed and is being prepared.',
			read: false,
			createdAt: new Date(now - 35 * min).toISOString(),
			targetType: 'order',
			targetId: 'order-001',
		},
		{
			id: 'notif-003',
			type: 'delivery',
			title: 'Delivery on the way',
			body: 'Your driver is en route. ETA: 25 minutes.',
			read: false,
			createdAt: new Date(now - 1 * hour).toISOString(),
			targetType: 'delivery',
			targetId: 'delivery-001',
		},
		{
			id: 'notif-004',
			type: 'payment',
			title: 'Invoice INV-2026-00034 generated',
			body: 'Your invoice is ready. Payment due within 30 days.',
			read: true,
			createdAt: new Date(now - 3 * hour).toISOString(),
			targetType: 'order',
			targetId: 'order-002',
		},
		{
			id: 'notif-005',
			type: 'support',
			title: 'Support ticket updated',
			body: 'Our team has responded to your ticket #TK-00012.',
			read: true,
			createdAt: new Date(now - 6 * hour).toISOString(),
			targetType: 'ticket',
			targetId: 'ticket-001',
		},
		{
			id: 'notif-006',
			type: 'quote_ready',
			title: 'Quote QT-2026-00138 expires soon',
			body: 'Your quote expires in 2 days. Accept or counter-offer before it expires.',
			read: true,
			createdAt: new Date(now - 1 * day).toISOString(),
			targetType: 'quote',
			targetId: 'quote-002',
		},
		{
			id: 'notif-007',
			type: 'order_update',
			title: 'Order ORD-2026-00085 delivered',
			body: 'Your order has been delivered. Please confirm delivery within 72 hours.',
			read: true,
			createdAt: new Date(now - 2 * day).toISOString(),
			targetType: 'order',
			targetId: 'order-003',
		},
		{
			id: 'notif-008',
			type: 'delivery',
			title: 'Delivery scheduled',
			body: 'Your delivery for order ORD-2026-00082 is scheduled for tomorrow.',
			read: true,
			createdAt: new Date(now - 3 * day).toISOString(),
			targetType: 'delivery',
			targetId: 'delivery-002',
		},
	]
}

// ============================================================================
// getNotifications
// ============================================================================

export const getNotifications = createServerFn({ method: 'GET' })
	.inputValidator(
		z.object({
			page: z.number().default(1),
			limit: z.number().default(20),
		}),
	)
	.handler(
		async ({
			data: input,
		}): Promise<{
			notifications: Notification[]
			unread: number
			hasMore: boolean
		}> => {
			if (!isSupabaseConfigured()) {
				const all = getMockNotifications()
				const start = (input.page - 1) * input.limit
				const paginated = all.slice(start, start + input.limit)
				const unread = all.filter((n) => !n.read).length
				return {
					notifications: paginated,
					unread,
					hasMore: start + input.limit < all.length,
				}
			}

			const { supabase } = await getAuthenticatedSupabase()
			const offset = (input.page - 1) * input.limit

			const { data: notifications, error } = await supabase
				.from('notifications')
				.select('id,type,title,body,read,created_at,target_type,target_id')
				.order('created_at', { ascending: false })
				.range(offset, offset + input.limit - 1)

			if (error) {
				throw new Error(error.message)
			}

			// Get unread count
			const { count: unreadCount } = await supabase
				.from('notifications')
				.select('id', { count: 'exact', head: true })
				.eq('read', false)

			// Check if there are more
			const { count: totalCount } = await supabase
				.from('notifications')
				.select('id', { count: 'exact', head: true })

			const mapped: Notification[] = (notifications ?? []).map(
				(row: Record<string, unknown>) => ({
					id: row.id as string,
					type: row.type as NotificationType,
					title: row.title as string,
					body: row.body as string,
					read: row.read as boolean,
					createdAt: row.created_at as string,
					targetType: row.target_type as Notification['targetType'],
					targetId: row.target_id as string,
				}),
			)

			return {
				notifications: mapped,
				unread: unreadCount ?? 0,
				hasMore: offset + input.limit < (totalCount ?? 0),
			}
		},
	)

// ============================================================================
// markNotificationRead (POST -- TanStack Start server fns only support GET/POST)
// ============================================================================

export const markNotificationRead = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			notificationId: z.string(),
		}),
	)
	.handler(async ({ data: input }): Promise<{ success: boolean }> => {
		if (!isSupabaseConfigured()) {
			return { success: true }
		}

		const { supabase } = await getAuthenticatedSupabase()

		const { error } = await supabase
			.from('notifications')
			.update({ read: true })
			.eq('id', input.notificationId)

		if (error) {
			throw new Error(error.message)
		}

		return { success: true }
	})

// ============================================================================
// markAllNotificationsRead (POST -- TanStack Start server fns only support GET/POST)
// ============================================================================

export const markAllNotificationsRead = createServerFn({ method: 'POST' })
	.inputValidator(z.object({}))
	.handler(async (): Promise<{ success: boolean }> => {
		if (!isSupabaseConfigured()) {
			return { success: true }
		}

		const { supabase } = await getAuthenticatedSupabase()

		const { error } = await supabase
			.from('notifications')
			.update({ read: true })
			.eq('read', false)

		if (error) {
			throw new Error(error.message)
		}

		return { success: true }
	})
