import { create } from 'zustand'

interface ChatWidgetState {
	isOpen: boolean
	isRuntimeRequested: boolean
	hasSeenPulse: boolean
	pendingMessage: string | null
	open: () => void
	close: () => void
	toggle: () => void
	dismissPulse: () => void
	requestRuntime: () => void
	openWithMessage: (msg: string) => void
	consumePendingMessage: () => string | null
}

export const useChatWidget = create<ChatWidgetState>((set, get) => ({
	isOpen: false,
	isRuntimeRequested: false,
	hasSeenPulse: false,
	pendingMessage: null,
	open: () =>
		set({ isOpen: true, hasSeenPulse: true, isRuntimeRequested: true }),
	close: () => set({ isOpen: false }),
	toggle: () =>
		set((s) => ({
			isOpen: !s.isOpen,
			hasSeenPulse: true,
			isRuntimeRequested: s.isRuntimeRequested || !s.isOpen,
		})),
	dismissPulse: () => set({ hasSeenPulse: true }),
	requestRuntime: () => set({ isRuntimeRequested: true }),
	openWithMessage: (msg) =>
		set({
			isOpen: true,
			hasSeenPulse: true,
			pendingMessage: msg,
			isRuntimeRequested: true,
		}),
	consumePendingMessage: () => {
		const msg = get().pendingMessage
		if (msg) set({ pendingMessage: null })
		return msg
	},
}))
