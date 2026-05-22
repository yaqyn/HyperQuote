import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

const NOTIFICATION_POLL_MS = 10_000

export function useRealtimeNotifications(userId: string | undefined) {
	const queryClient = useQueryClient()

	useEffect(() => {
		if (!userId) return
		const poll = () => {
			queryClient.invalidateQueries({ queryKey: ['notifications'] })
			queryClient.invalidateQueries({ queryKey: ['notification-count'] })
		}
		const interval = window.setInterval(poll, NOTIFICATION_POLL_MS)

		return () => {
			window.clearInterval(interval)
		}
	}, [userId, queryClient])
}
