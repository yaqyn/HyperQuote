import { create } from 'zustand'

interface NotificationStore {
	unreadCount: number
	setUnreadCount: (count: number) => void
}

export const useNotificationStore = create<NotificationStore>()((_set) => ({
	unreadCount: 0,
	setUnreadCount: (count) => _set({ unreadCount: count }),
}))
