/**
 * Notification server functions.
 * Get notifications, mark as read, mark all as read.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { Notification, NotificationType } from '../../types/notification'
import { getAuthenticatedSupabase } from './_supabase'

// ============================================================================
// getNotifications
// ============================================================================

export const getNotifications = createServerFn({ method: 'POST' })
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
