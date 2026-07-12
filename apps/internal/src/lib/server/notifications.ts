import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getInternalSupabaseClient } from './_supabase'

export interface Notification {
	id: string
	type: 'system' | 'mention' | 'approval' | 'sla' | 'delivery'
	title: string
	body: string
	createdAt: string
	readAt: string | null
	actionUrl?: string
}

function mapNotificationType(value: string): Notification['type'] {
	if (
		value === 'mention' ||
		value === 'approval' ||
		value === 'sla' ||
		value === 'delivery'
	) {
		return value
	}
	return 'system'
}

export const getNotifications = createServerFn({ method: 'GET' }).handler(
	async (): Promise<Notification[]> => {
		const { client, user } = await getInternalSupabaseClient({
			activeEmployeeOnly: true,
		})
		const { data, error } = await client
			.from('notifications')
			.select('id, type, title, body, read, target_type, target_id, created_at')
			.eq('user_id', user.id)
			.order('created_at', { ascending: false })
			.limit(30)

		if (error) throw new Error(error.message)

		return (data ?? []).map((row) => ({
			id: row.id,
			type: mapNotificationType(row.type),
			title: row.title,
			body: row.body,
			createdAt: row.created_at,
			readAt: row.read ? row.created_at : null,
			actionUrl:
				row.target_type && row.target_id
					? `/internal/${row.target_type}/${row.target_id}`
					: undefined,
		}))
	},
)

export const markNotificationRead = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ id: z.string().uuid() }))
	.handler(async ({ data: input }) => {
		const { client, user } = await getInternalSupabaseClient({
			activeEmployeeOnly: true,
		})
		const { error } = await client
			.from('notifications')
			.update({ read: true })
			.eq('id', input.id)
			.eq('user_id', user.id)

		if (error) throw new Error(error.message)
		return { success: true as const }
	})

export const markAllRead = createServerFn({ method: 'POST' }).handler(
	async () => {
		const { client, user } = await getInternalSupabaseClient({
			activeEmployeeOnly: true,
		})
		const { error } = await client
			.from('notifications')
			.update({ read: true })
			.eq('user_id', user.id)
			.eq('read', false)

		if (error) throw new Error(error.message)
		return { success: true as const }
	},
)
