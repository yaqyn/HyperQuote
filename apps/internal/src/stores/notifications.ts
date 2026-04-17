import { create } from 'zustand'

interface NotificationState {
	unreadCount: number
	isWindowOpen: boolean
	setUnreadCount: (n: number) => void
	incrementUnread: () => void
	toggleWindow: () => void
	closeWindow: () => void
}

export const useNotificationStore = create<NotificationState>()(
	(set) => ({
		unreadCount: 0,
		isWindowOpen: false,

		setUnreadCount: (n) => set({ unreadCount: n }),
		incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
		toggleWindow: () => set((s) => ({ isWindowOpen: !s.isWindowOpen })),
		closeWindow: () => set({ isWindowOpen: false }),
	}),
	// SSR safety: skip auto-hydration so Zustand doesn't read localStorage during SSR
	// @ts-expect-error -- skipHydration is a valid persist middleware option
	{ skipHydration: true },
)
