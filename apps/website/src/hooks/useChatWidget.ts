import { create } from 'zustand'

interface ChatWidgetState {
	isOpen: boolean
	hasSeenPulse: boolean
	pendingMessage: string | null
	open: () => void
	close: () => void
	toggle: () => void
	dismissPulse: () => void
	openWithMessage: (msg: string) => void
	consumePendingMessage: () => string | null
}

export const useChatWidget = create<ChatWidgetState>((set, get) => ({
	isOpen: false,
	hasSeenPulse: false,
	pendingMessage: null,
	open: () => set({ isOpen: true, hasSeenPulse: true }),
	close: () => set({ isOpen: false }),
	toggle: () => set((s) => ({ isOpen: !s.isOpen, hasSeenPulse: true })),
	dismissPulse: () => set({ hasSeenPulse: true }),
	openWithMessage: (msg) =>
		set({ isOpen: true, hasSeenPulse: true, pendingMessage: msg }),
	consumePendingMessage: () => {
		const msg = get().pendingMessage
		if (msg) set({ pendingMessage: null })
		return msg
	},
}))
