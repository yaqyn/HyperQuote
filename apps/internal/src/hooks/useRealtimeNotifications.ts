import {
	createSupabaseBrowserClient,
	resolveSupabaseBrowserConfig,
} from '@hyperquote/auth'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useNotificationStore } from '../stores/notifications'

interface UseRealtimeNotificationsOpts {
	userId: string
	enabled?: boolean
}

/**
 * Subscribes to Supabase Realtime postgres_changes on the notifications table.
 * On INSERT, invalidates TanStack Query cache and increments unread count.
 * No-op when VITE_SUPABASE_URL is not set (dev mode without Supabase).
 */
export function useRealtimeNotifications({
	userId,
	enabled = true,
}: UseRealtimeNotificationsOpts) {
	const queryClient = useQueryClient()
	const incrementUnread = useNotificationStore((s) => s.incrementUnread)

	useEffect(() => {
		const config = resolveSupabaseBrowserConfig(import.meta.env)
		if (!enabled || !config) return

		const supabase = createSupabaseBrowserClient(
			config.supabaseUrl,
			config.supabaseAnonKey,
			config.cookieName,
		)

		const channel = supabase
			.channel(`notifications:${userId}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'notifications',
					filter: `user_id=eq.${userId}`,
				},
				() => {
					queryClient.invalidateQueries({ queryKey: ['notifications'] })
					incrementUnread()
				},
			)
			.subscribe()

		return () => {
			supabase.removeChannel(channel)
		}
	}, [userId, enabled, queryClient, incrementUnread])
}
