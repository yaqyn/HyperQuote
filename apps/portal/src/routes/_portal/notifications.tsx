import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	createFileRoute,
	useNavigate,
	useRouteContext,
} from '@tanstack/react-router'
import { Bell } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { ListBox } from 'react-aria-components/ListBox'
import { useTranslation } from 'react-i18next'
import { NotificationItem } from '../../components/notifications/NotificationItem'
import { useRealtimeNotifications } from '../../components/notifications/useRealtimeNotifications'
import { FloatingAIButton } from '../../components/windows/FloatingAIButton'
import { WindowShell } from '../../components/windows/WindowShell'
import {
	getNotifications,
	markAllNotificationsRead,
	markNotificationRead,
} from '../../lib/server/notifications'
import { useNotificationStore } from '../../stores/notifications'
import type { Notification } from '../../types/notification'

export const Route = createFileRoute('/_portal/notifications')({
	component: NotificationsWindow,
})

// ============================================================================
// Route map for click-through navigation
// ============================================================================

function getTargetRoute(
	targetType: Notification['targetType'],
	targetId: string,
): string {
	switch (targetType) {
		case 'quote':
			return `/orders/quotes/${targetId}`
		case 'order':
			return `/orders/${targetId}`
		case 'delivery':
			return `/orders/${targetId}`
		case 'ticket':
			return `/support/${targetId}`
		default:
			return '/'
	}
}

// ============================================================================
// Component
// ============================================================================

function NotificationsWindow() {
	const { t } = useTranslation('portal')
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)

	const [page, setPage] = useState(1)
	const [allNotifications, setAllNotifications] = useState<Notification[]>([])
	const knownIdsRef = useRef<Set<string>>(new Set())
	const [newIds, setNewIds] = useState<Set<string>>(new Set())

	const { auth } = useRouteContext({ from: '/_portal' })
	const userId = auth?.user.id

	// Real-time subscription
	useRealtimeNotifications(userId)

	// Fetch notifications
	const { data, isLoading } = useQuery({
		queryKey: ['notifications', page],
		queryFn: () => getNotifications({ data: { page, limit: 20 } }),
	})

	// Sync notifications and detect new ones for animation
	useEffect(() => {
		if (!data?.notifications) return

		if (page === 1) {
			// Detect new notifications (not in known set)
			const incoming = new Set<string>()
			for (const n of data.notifications) {
				if (!knownIdsRef.current.has(n.id)) {
					incoming.add(n.id)
				}
			}

			// On first load, don't animate existing items
			if (knownIdsRef.current.size > 0 && incoming.size > 0) {
				setNewIds(incoming)
			}

			// Update known IDs
			for (const n of data.notifications) {
				knownIdsRef.current.add(n.id)
			}

			setAllNotifications(data.notifications)
		} else {
			// Append for pagination
			setAllNotifications((prev) => {
				const existingIds = new Set(prev.map((n) => n.id))
				const newOnes = data.notifications.filter((n) => !existingIds.has(n.id))
				for (const n of newOnes) {
					knownIdsRef.current.add(n.id)
				}
				return [...prev, ...newOnes]
			})
		}
	}, [data, page])

	// Sync unread count to store for nav badge
	useEffect(() => {
		if (data?.unread !== undefined) {
			setUnreadCount(data.unread)
		}
	}, [data?.unread, setUnreadCount])

	// Mark single notification as read
	const markReadMutation = useMutation({
		mutationFn: (notificationId: string) =>
			markNotificationRead({ data: { notificationId } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['notifications'] })
			queryClient.invalidateQueries({ queryKey: ['notification-count'] })
		},
	})

	// Mark all as read
	const markAllReadMutation = useMutation({
		mutationFn: () => markAllNotificationsRead({ data: {} }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['notifications'] })
			queryClient.invalidateQueries({ queryKey: ['notification-count'] })
		},
	})

	// Handle notification press
	function handleNotificationPress(notification: Notification) {
		if (!notification.read) {
			markReadMutation.mutate(notification.id)
		}
		const route = getTargetRoute(notification.targetType, notification.targetId)
		navigate({ to: route })
	}

	const hasMore = data?.hasMore ?? false
	const hasUnread = allNotifications.some((n) => !n.read)

	return (
		<>
			<WindowShell title={t('notifications.title', 'Notifications')}>
				<div className="flex flex-col max-w-[480px] mx-auto max-h-[70vh]">
					{/* Header with mark all read */}
					{hasUnread && (
						<div className="flex justify-end px-4 py-2 border-b border-[var(--color-border)]">
							<button
								type="button"
								onClick={() => markAllReadMutation.mutate()}
								disabled={markAllReadMutation.isPending}
								className="text-[13px] text-[var(--color-primary)] hover:underline disabled:opacity-50"
							>
								{t('notifications.markAllRead', 'Mark all as read')}
							</button>
						</div>
					)}

					{/* Notification list */}
					{allNotifications.length > 0 ? (
						<div className="overflow-y-auto flex-1">
							<ListBox
								aria-label="Notifications"
								selectionMode="none"
								onAction={(key) => {
									const notification = allNotifications.find(
										(n) => n.id === key,
									)
									if (notification) {
										handleNotificationPress(notification)
									}
								}}
							>
								{allNotifications.map((notification) => {
									const isNew = newIds.has(notification.id)
									if (isNew) {
										return (
											<motion.div
												key={notification.id}
												initial={{ opacity: 0, y: -20 }}
												animate={{ opacity: 1, y: 0 }}
												transition={{
													type: 'spring',
													stiffness: 400,
													damping: 30,
												}}
											>
												<NotificationItem notification={notification} />
											</motion.div>
										)
									}
									return (
										<NotificationItem
											key={notification.id}
											notification={notification}
										/>
									)
								})}
							</ListBox>

							{/* Show older link */}
							{hasMore && (
								<div className="flex justify-center py-3 border-t border-[var(--color-border)]">
									<button
										type="button"
										onClick={() => setPage((p) => p + 1)}
										disabled={isLoading}
										className="text-[13px] text-[var(--color-primary)] hover:underline disabled:opacity-50"
									>
										{t('notifications.showOlder', 'Show older')}
									</button>
								</div>
							)}
						</div>
					) : isLoading ? (
						<div className="flex flex-col gap-3 p-4">
							{['a', 'b', 'c', 'd'].map((slot) => (
								<div
									key={`skeleton-${slot}`}
									className="h-16 rounded-lg bg-[var(--color-surface)] animate-pulse"
								/>
							))}
						</div>
					) : (
						/* Empty state */
						<div className="flex flex-col items-center justify-center gap-3 py-16">
							<Bell size={48} className="text-[var(--color-text-subtle)]" />
							<p className="text-lg font-semibold text-[var(--color-text)]">
								{t('notifications.emptyTitle', 'No notifications')}
							</p>
							<p className="text-sm text-[var(--color-text-muted)]">
								{t('notifications.emptyBody', "You're all caught up.")}
							</p>
						</div>
					)}
				</div>
			</WindowShell>
			<FloatingAIButton />
		</>
	)
}
