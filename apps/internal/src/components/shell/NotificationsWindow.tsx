import { GlassWindow } from '@hyperquote/ui/glass/GlassWindow'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
	AtSign,
	Bell,
	CheckCircle2,
	Clock,
	Cloud,
	Truck,
	X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo } from 'react'
import { Button } from 'react-aria-components/Button'
import { useTranslation } from 'react-i18next'
import { useKeyboardScope } from '../../hooks/useKeyboardScope'
import {
	getNotifications,
	markAllRead,
	markNotificationRead,
	type Notification,
} from '../../lib/server/notifications'
import { useNotificationStore } from '../../stores/notifications'

interface NotificationsWindowProps {
	isOpen: boolean
	onClose: () => void
}

const TYPE_ICONS = {
	system: Bell,
	mention: AtSign,
	approval: CheckCircle2,
	sla: Clock,
	delivery: Truck,
} as const

function isToday(dateStr: string): boolean {
	const d = new Date(dateStr)
	const now = new Date()
	return d.toDateString() === now.toDateString()
}

function isYesterday(dateStr: string): boolean {
	const d = new Date(dateStr)
	const yesterday = new Date()
	yesterday.setDate(yesterday.getDate() - 1)
	return d.toDateString() === yesterday.toDateString()
}

function groupByTime(
	notifications: Notification[],
): Record<string, Notification[]> {
	const groups: Record<string, Notification[]> = {}

	for (const notif of notifications) {
		let key: string
		if (isToday(notif.createdAt)) key = 'today'
		else if (isYesterday(notif.createdAt)) key = 'yesterday'
		else key = 'older'

		if (!groups[key]) groups[key] = []
		groups[key].push(notif)
	}

	return groups
}

export function NotificationsWindow({
	isOpen,
	onClose,
}: NotificationsWindowProps) {
	const { t } = useTranslation('internal')
	const queryClient = useQueryClient()
	const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)
	const { openPanel, closePanel } = useKeyboardScope()

	const { data: notifications = [] } = useQuery({
		queryKey: ['notifications'],
		queryFn: () => getNotifications(),
		enabled: isOpen,
	})

	const grouped = useMemo(() => groupByTime(notifications), [notifications])

	const unreadCount = useMemo(
		() => notifications.filter((n) => !n.readAt).length,
		[notifications],
	)

	// Sync unread count to store
	useEffect(() => {
		if (isOpen) {
			setUnreadCount(unreadCount)
		}
	}, [isOpen, unreadCount, setUnreadCount])

	// Scope transitions
	useEffect(() => {
		if (isOpen) {
			openPanel()
		}
	}, [isOpen, openPanel])

	const handleClose = useCallback(() => {
		closePanel()
		onClose()
	}, [closePanel, onClose])

	const handleMarkRead = useCallback(
		async (id: string) => {
			await markNotificationRead({ data: { id } })
			queryClient.invalidateQueries({ queryKey: ['notifications'] })
		},
		[queryClient],
	)

	const handleMarkAllRead = useCallback(async () => {
		await markAllRead()
		setUnreadCount(0)
		queryClient.invalidateQueries({ queryKey: ['notifications'] })
	}, [queryClient, setUnreadCount])

	const sectionLabels: Record<string, string> = {
		today: t('notifications.today', 'Today'),
		yesterday: t('notifications.yesterday', 'Yesterday'),
		older: t('notifications.older', 'Older'),
	}

	const sectionOrder = ['today', 'yesterday', 'older']

	return (
		<GlassWindow
			isOpen={isOpen}
			onClose={handleClose}
			className="shell-plate max-h-[80vh] w-full max-w-md max-lg:!fixed max-lg:!inset-0 max-lg:!h-dvh max-lg:!max-h-dvh max-lg:!w-screen max-lg:!max-w-none max-lg:!rounded-none"
		>
			{/* Header */}
			<div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--color-border)]">
				<h2 className="text-base font-semibold text-[var(--color-text)]">
					{t('notifications.title', 'Notifications')}
				</h2>
				<div className="flex items-center gap-2">
					{unreadCount > 0 && (
						<Button
							onPress={handleMarkAllRead}
							className="text-sm text-[var(--color-primary)] hover:underline cursor-pointer outline-none"
						>
							{t('notifications.markAllRead', 'Mark all read')}
						</Button>
					)}
					<Button
						onPress={handleClose}
						aria-label={t('notifications.close', 'Close notifications')}
						className="inline-flex size-8 items-center justify-center rounded-md text-[var(--color-text-muted)] outline-none transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
					>
						<X aria-hidden="true" size={16} strokeWidth={1.8} />
					</Button>
				</div>
			</div>

			{/* Content */}
			<div className="min-h-0 flex-1 overflow-auto">
				{notifications.length === 0 ? (
					<div className="grid h-full min-h-[320px] place-items-center text-center">
						<div className="flex flex-col items-center justify-center gap-2">
							<Cloud size={28} className="text-[var(--color-text-muted)]" />
							<p className="text-sm text-[var(--color-text-muted)]">
								{t('notifications.empty', 'Calm')}
							</p>
						</div>
					</div>
				) : (
					sectionOrder.map((section) => {
						const items = grouped[section]
						if (!items?.length) return null
						return (
							<div key={section}>
								<h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide px-4 py-2">
									{sectionLabels[section]}
								</h3>
								{items.map((notif) => {
									const Icon = TYPE_ICONS[notif.type]
									return (
										<button
											key={notif.id}
											type="button"
											onClick={() => {
												handleMarkRead(notif.id)
											}}
											className="flex items-start gap-3 w-full px-4 py-3 text-start hover:bg-[var(--color-primary)]/5 transition-colors cursor-pointer"
										>
											{/* Unread indicator */}
											<div className="shrink-0 w-2 pt-1.5">
												{!notif.readAt && (
													<span className="block w-2 h-2 rounded-full bg-[var(--color-primary)]" />
												)}
											</div>
											{/* Icon */}
											<span className="shrink-0 text-[var(--color-text-muted)] pt-0.5">
												<Icon size={18} />
											</span>
											{/* Content */}
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium text-[var(--color-text)]">
													{notif.title}
												</p>
												<p className="text-xs text-[var(--color-text-muted)] truncate">
													{notif.body}
												</p>
												<time className="text-xs text-[var(--color-text-muted)] font-[var(--font-mono)]">
													{new Date(notif.createdAt).toLocaleTimeString(
														undefined,
														{
															hour: '2-digit',
															minute: '2-digit',
														},
													)}
												</time>
											</div>
										</button>
									)
								})}
							</div>
						)
					})
				)}
			</div>
		</GlassWindow>
	)
}
