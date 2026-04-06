import { create } from 'zustand'
import type { CSTab } from '../types/customer-service'

interface CustomerServiceStore {
  // Tab navigation
  activeTab: CSTab
  setActiveTab: (tab: CSTab) => void

  // Entity selection
  selectedTicketId: string | null
  setSelectedTicketId: (id: string | null) => void

  selectedConversationId: string | null
  setSelectedConversationId: (id: string | null) => void

  selectedClaimId: string | null
  setSelectedClaimId: (id: string | null) => void
}

export const useCustomerServiceStore = create<CustomerServiceStore>()(
  (set) => ({
    // Tab navigation
    activeTab: 'home',
    setActiveTab: (tab) => set({ activeTab: tab }),

    // Entity selection
    selectedTicketId: null,
    setSelectedTicketId: (id) => set({ selectedTicketId: id }),

    selectedConversationId: null,
    setSelectedConversationId: (id) => set({ selectedConversationId: id }),

    selectedClaimId: null,
    setSelectedClaimId: (id) => set({ selectedClaimId: id }),
  }),
  // SSR safety: skip auto-hydration so Zustand doesn't read localStorage during SSR
  // @ts-expect-error -- skipHydration is a valid persist middleware option
  { skipHydration: true },
)
