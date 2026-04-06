import { create } from 'zustand'
import type { WarehouseTab } from '../types/warehouse'

interface WarehouseStore {
  // Tab navigation
  activeTab: WarehouseTab
  setActiveTab: (tab: WarehouseTab) => void

  // Active workflow persistence (per Pitfall 6: gated flow state)
  activeWorkflow: { type: string; step: number; data: Record<string, unknown> } | null
  setActiveWorkflow: (wf: { type: string; step: number; data: Record<string, unknown> } | null) => void
  clearWorkflow: () => void

  // Scan mode: enables large touch targets for scanner devices
  scanMode: boolean
  setScanMode: (mode: boolean) => void

  // Entity selection
  selectedReceivingId: string | null
  setSelectedReceivingId: (id: string | null) => void

  selectedPickOrderId: string | null
  setSelectedPickOrderId: (id: string | null) => void

  selectedCountId: string | null
  setSelectedCountId: (id: string | null) => void
}

export const useWarehouseStore = create<WarehouseStore>()(
  (set) => ({
    // Tab navigation
    activeTab: 'home',
    setActiveTab: (tab) => set({ activeTab: tab }),

    // Active workflow persistence
    activeWorkflow: null,
    setActiveWorkflow: (wf) => set({ activeWorkflow: wf }),
    clearWorkflow: () => set({ activeWorkflow: null }),

    // Scan mode
    scanMode: false,
    setScanMode: (mode) => set({ scanMode: mode }),

    // Entity selection
    selectedReceivingId: null,
    setSelectedReceivingId: (id) => set({ selectedReceivingId: id }),

    selectedPickOrderId: null,
    setSelectedPickOrderId: (id) => set({ selectedPickOrderId: id }),

    selectedCountId: null,
    setSelectedCountId: (id) => set({ selectedCountId: id }),
  }),
  // SSR safety: skip auto-hydration so Zustand doesn't read localStorage during SSR
  // @ts-expect-error -- skipHydration is a valid persist middleware option
  { skipHydration: true },
)
