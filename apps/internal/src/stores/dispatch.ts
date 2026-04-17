import { create } from 'zustand'

interface DispatchStore {
	selectedQuoteId: string | null
	setSelectedQuoteId: (id: string | null) => void

	overlayCloseHandler: (() => boolean) | null
	setOverlayCloseHandler: (fn: (() => boolean) | null) => void
}

export const useDispatchStore = create<DispatchStore>()((set) => ({
	selectedQuoteId: null,
	setSelectedQuoteId: (id) => set({ selectedQuoteId: id }),

	overlayCloseHandler: null,
	setOverlayCloseHandler: (fn) => set({ overlayCloseHandler: fn }),
}))
