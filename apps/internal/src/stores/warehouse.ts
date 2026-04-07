import { create } from 'zustand'
import type { WarehouseTab, InboundView, OutboundView } from '../types/warehouse'

interface WarehouseStore {
  // Tab navigation
  activeTab: WarehouseTab
  setActiveTab: (tab: WarehouseTab) => void

  // Inbound sub-navigation (receiving + putaway merged)
  inboundView: InboundView
  setInboundView: (view: InboundView) => void
  activeDeliveryId: string | null
  setActiveDeliveryId: (id: string | null) => void

  // Outbound sub-navigation (picking + staging merged)
  outboundView: OutboundView
  setOutboundView: (view: OutboundView) => void
  activePickOrderId: string | null
  setActivePickOrderId: (id: string | null) => void

  // Active workflow persistence (per Pitfall 6: gated flow state)
  activeWorkflow: { type: string; step: number; data: Record<string, unknown> } | null
  setActiveWorkflow: (wf: { type: string; step: number; data: Record<string, unknown> } | null) => void
  clearWorkflow: () => void

  // Scan mode: enables large touch targets for scanner devices
  scanMode: boolean
  setScanMode: (mode: boolean) => void

  // Entity selection (legacy — kept for inventory/count flows)
  selectedReceivingId: string | null
  setSelectedReceivingId: (id: string | null) => void

  selectedPickOrderId: string | null
  setSelectedPickOrderId: (id: string | null) => void

  selectedCountId: string | null
  setSelectedCountId: (id: string | null) => void

  // Inventory → Count master-detail
  countingItemId: string | null
  setCountingItemId: (id: string | null) => void
}

export const useWarehouseStore = create<WarehouseStore>()(
  (set) => ({
    // Tab navigation
    activeTab: 'inbound',
    setActiveTab: (tab) => set({ activeTab: tab }),

    // Inbound sub-navigation
    inboundView: 'list',
    setInboundView: (view) => set({ inboundView: view }),
    activeDeliveryId: null,
    setActiveDeliveryId: (id) => set({ activeDeliveryId: id }),

    // Outbound sub-navigation
    outboundView: 'queue',
    setOutboundView: (view) => set({ outboundView: view }),
    activePickOrderId: null,
    setActivePickOrderId: (id) => set({ activePickOrderId: id }),

    // Active workflow persistence
    activeWorkflow: null,
    setActiveWorkflow: (wf) => set({ activeWorkflow: wf }),
    clearWorkflow: () => set({ activeWorkflow: null }),

    // Scan mode
    scanMode: false,
    setScanMode: (mode) => set({ scanMode: mode }),

    // Entity selection (legacy — kept for inventory/count flows)
    selectedReceivingId: null,
    setSelectedReceivingId: (id) => set({ selectedReceivingId: id }),

    selectedPickOrderId: null,
    setSelectedPickOrderId: (id) => set({ selectedPickOrderId: id }),

    selectedCountId: null,
    setSelectedCountId: (id) => set({ selectedCountId: id }),

    // Inventory → Count master-detail
    countingItemId: null,
    setCountingItemId: (id) => set({ countingItemId: id }),
  }),
  // SSR safety: skip auto-hydration so Zustand doesn't read localStorage during SSR
  // @ts-expect-error -- skipHydration is a valid persist middleware option
  { skipHydration: true },
)
