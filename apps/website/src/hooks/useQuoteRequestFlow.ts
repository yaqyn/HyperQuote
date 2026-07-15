import { create } from 'zustand'

export type QuoteRequestFlowIntent = 'save' | 'submit'
export type QuoteRequestFlowSource = 'cart' | 'hero'

interface SavedWebsiteDraftLink {
	draftId: string
	fingerprint: string
	name: string
	reference: string
}

interface QuoteRequestFlowState {
	intent: QuoteRequestFlowIntent
	isOpen: boolean
	savedDraft: SavedWebsiteDraftLink | null
	source: QuoteRequestFlowSource
	close: () => void
	clearSavedDraft: () => void
	open: (intent: QuoteRequestFlowIntent, source: QuoteRequestFlowSource) => void
	recordSavedDraft: (draft: SavedWebsiteDraftLink) => void
}

export const useQuoteRequestFlow = create<QuoteRequestFlowState>((set) => ({
	intent: 'submit',
	isOpen: false,
	savedDraft: null,
	source: 'cart',
	close: () => set({ isOpen: false }),
	clearSavedDraft: () => set({ savedDraft: null }),
	open: (intent, source) => set({ intent, isOpen: true, source }),
	recordSavedDraft: (savedDraft) => set({ savedDraft }),
}))
