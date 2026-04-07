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

  // Channel filter for unified conversations tab (includes returns)
  channelFilter: 'all' | 'email' | 'whatsapp' | 'phone' | 'returns'
  setChannelFilter: (filter: 'all' | 'email' | 'whatsapp' | 'phone' | 'returns') => void

  // Knowledge Base panel (inline within conversations)
  kbPanelOpen: boolean
  setKbPanelOpen: (open: boolean) => void
}

export const useCustomerServiceStore = create<CustomerServiceStore>()(
  (set) => ({
    // Tab navigation
    activeTab: 'conversations',
    setActiveTab: (tab) => set({ activeTab: tab }),

    // Entity selection
    selectedTicketId: null,
    setSelectedTicketId: (id) => set({ selectedTicketId: id }),

    selectedConversationId: null,
    setSelectedConversationId: (id) => set({ selectedConversationId: id }),

    selectedClaimId: null,
    setSelectedClaimId: (id) => set({ selectedClaimId: id }),

    // Channel filter
    channelFilter: 'all',
    setChannelFilter: (filter) => set({ channelFilter: filter }),

    // Knowledge Base panel
    kbPanelOpen: false,
    setKbPanelOpen: (open) => set({ kbPanelOpen: open }),
  }),
  // SSR safety: skip auto-hydration so Zustand doesn't read localStorage during SSR
  // @ts-expect-error -- skipHydration is a valid persist middleware option
  { skipHydration: true },
)
