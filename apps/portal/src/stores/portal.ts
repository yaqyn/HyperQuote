import { create } from 'zustand'

interface PortalStore {
  activeRole: 'customer' | 'supplier'
  setActiveRole: (role: 'customer' | 'supplier') => void
  isFloatingAIOpen: boolean
  toggleFloatingAI: () => void
  setFloatingAIOpen: (open: boolean) => void
}

export const usePortalStore = create<PortalStore>()((set) => ({
  activeRole: 'customer',
  setActiveRole: (role) => set({ activeRole: role }),
  isFloatingAIOpen: false,
  toggleFloatingAI: () =>
    set((s) => ({ isFloatingAIOpen: !s.isFloatingAIOpen })),
  setFloatingAIOpen: (open) => set({ isFloatingAIOpen: open }),
}))
