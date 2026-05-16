import { create } from 'zustand'

interface SearchStore {
	overlayCloseHandler: (() => boolean) | null
	setOverlayCloseHandler: (handler: (() => boolean) | null) => void
}

export const useSearchStore = create<SearchStore>()((set) => ({
	overlayCloseHandler: null,
	setOverlayCloseHandler: (handler) => set({ overlayCloseHandler: handler }),
}))
