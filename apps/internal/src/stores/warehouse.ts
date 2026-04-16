import { create } from 'zustand'

export type WarehouseTab = 'loading' | 'receiving'

interface WarehouseStore {
  activeTab: WarehouseTab
  setActiveTab: (tab: WarehouseTab) => void

  selectedQuoteId: string | null
  setSelectedQuoteId: (id: string | null) => void

  selectedDealId: string | null
  setSelectedDealId: (id: string | null) => void

  // Slide-in overlay dismissal handler — mirrors procurement/finance
  // stores so the outer panel X dismisses the wizard before closing
  // the whole warehouse module.
  overlayCloseHandler: (() => boolean) | null
  setOverlayCloseHandler: (fn: (() => boolean) | null) => void
}

export const useWarehouseStore = create<WarehouseStore>()(
  (set) => ({
    activeTab: 'loading',
    setActiveTab: (tab) =>
      set({ activeTab: tab, selectedQuoteId: null, selectedDealId: null }),

    selectedQuoteId: null,
    setSelectedQuoteId: (id) => set({ selectedQuoteId: id, selectedDealId: null }),

    selectedDealId: null,
    setSelectedDealId: (id) => set({ selectedDealId: id, selectedQuoteId: null }),

    overlayCloseHandler: null,
    setOverlayCloseHandler: (fn) => set({ overlayCloseHandler: fn }),
  }),
  // @ts-expect-error -- skipHydration is a valid persist middleware option
  { skipHydration: true },
)
