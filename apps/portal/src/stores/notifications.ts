import { create } from 'zustand'

interface NotificationStore {
	unreadCount: number
	setUnreadCount: (count: number) => void
}

export const useNotificationStore = create<NotificationStore>()((_set) => ({
	unreadCount: 0,
	setUnreadCount: (count) => _set({ unreadCount: count }),
}))

// SSR: skip hydration, rehydrate in useEffect on client
// Usage: useNotificationStore.persist?.rehydrate?.() or just read after mount
// skipHydration convention: store is safe to use server-side (returns defaults)
export const skipHydration = true
