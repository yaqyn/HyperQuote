import { create } from 'zustand'

interface Toast {
	id: string
	message: string
	type: 'success' | 'error' | 'info'
}

interface ToastStore {
	toasts: Toast[]
	addToast: (message: string, type?: Toast['type']) => void
	removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
	toasts: [],
	addToast: (message, type = 'info') => {
		const id = crypto.randomUUID()
		set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
		// Auto-dismiss after 4s
		setTimeout(() => {
			set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
		}, 4000)
	},
	removeToast: (id) =>
		set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
