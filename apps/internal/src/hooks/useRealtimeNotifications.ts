import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

interface UseRealtimeNotificationsOpts {
	userId: string
	enabled?: boolean
}

const NOTIFICATION_POLL_MS = 10_000

export function useRealtimeNotifications({
	userId,
	enabled = true,
}: UseRealtimeNotificationsOpts) {
	const queryClient = useQueryClient()

	useEffect(() => {
		if (!enabled || !userId) return
		const interval = window.setInterval(() => {
			queryClient.invalidateQueries({ queryKey: ['notifications'] })
		}, NOTIFICATION_POLL_MS)

		return () => {
			window.clearInterval(interval)
		}
	}, [userId, enabled, queryClient])
}
