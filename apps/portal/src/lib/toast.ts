/**
 * Imperative toast API backed by a simple event system.
 * QuoteDetail and other components call toast.success(msg) or toast.error(msg).
 * The ToastContainer in the layout listens and renders the Toast component.
 */
import { create } from 'zustand'

interface ToastState {
	message: string | null
	show: (message: string) => void
	dismiss: () => void
}

const useToastStore = create<ToastState>()((set) => ({
	message: null,
	show: (message) => set({ message }),
	dismiss: () => set({ message: null }),
}))

export const toast = {
	error: (message: string) => useToastStore.getState().show(message),
	success: (message: string) => useToastStore.getState().show(message),
}
