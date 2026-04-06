import { create } from 'zustand'
import type { AdminTab } from '../types/admin'

interface AdminStore {
  // Tab navigation
  activeTab: AdminTab
  setActiveTab: (tab: AdminTab) => void

  // Entity selection
  selectedUserId: string | null
  setSelectedUserId: (id: string | null) => void

  selectedRoleId: string | null
  setSelectedRoleId: (id: string | null) => void
}

export const useAdminStore = create<AdminStore>()(
  (set) => ({
    // Tab navigation
    activeTab: 'users',
    setActiveTab: (tab) => set({ activeTab: tab }),

    // Entity selection
    selectedUserId: null,
    setSelectedUserId: (id) => set({ selectedUserId: id }),

    selectedRoleId: null,
    setSelectedRoleId: (id) => set({ selectedRoleId: id }),
  }),
  // SSR safety: skip auto-hydration so Zustand doesn't read localStorage during SSR
  // @ts-expect-error -- skipHydration is a valid persist middleware option
  { skipHydration: true },
)
