/**
 * Supabase Realtime hook for notifications.
 * Subscribes to postgres_changes on notifications table filtered by user_id.
 * Invalidates TanStack Query cache on new notifications.
 */

import {
	createSupabaseBrowserClient,
	resolveSupabaseBrowserConfig,
} from '@hyperquote/auth'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

export function useRealtimeNotifications(userId: string | undefined) {
	const queryClient = useQueryClient()

	useEffect(() => {
		if (!userId) return
		const config = resolveSupabaseBrowserConfig(import.meta.env)
		if (!config) return
		const { cookieName, supabaseAnonKey, supabaseUrl } = config

		let channel: ReturnType<
			Awaited<
				ReturnType<typeof import('@supabase/supabase-js')['createClient']>
			>['channel']
		>
		let supabaseClient: Awaited<
			ReturnType<typeof import('@supabase/supabase-js')['createClient']>
		>

		async function setup() {
			supabaseClient = createSupabaseBrowserClient(
				supabaseUrl,
				supabaseAnonKey,
				cookieName,
			)

			channel = supabaseClient
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
						queryClient.invalidateQueries({
							queryKey: ['notification-count'],
						})
					},
				)
				.subscribe()
		}

		setup()

		return () => {
			if (channel && supabaseClient) {
				supabaseClient.removeChannel(channel)
			}
		}
	}, [userId, queryClient])
}
