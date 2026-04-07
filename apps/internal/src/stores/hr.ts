import { create } from 'zustand'
import type { HRTab } from '../types/hr'

interface HRStore {
  // Tab navigation
  activeTab: HRTab
  setActiveTab: (tab: HRTab) => void

  // Entity selection
  selectedEmployeeId: string | null
  setSelectedEmployeeId: (id: string | null) => void

  selectedLeaveRequestId: string | null
  setSelectedLeaveRequestId: (id: string | null) => void
}

export const useHRStore = create<HRStore>()(
  (set) => ({
    // Tab navigation
    activeTab: 'people',
    setActiveTab: (tab) => set({ activeTab: tab }),

    // Entity selection
    selectedEmployeeId: null,
    setSelectedEmployeeId: (id) => set({ selectedEmployeeId: id }),

    selectedLeaveRequestId: null,
    setSelectedLeaveRequestId: (id) => set({ selectedLeaveRequestId: id }),
  }),
  // SSR safety: skip auto-hydration so Zustand doesn't read localStorage during SSR
  // @ts-expect-error -- skipHydration is a valid persist middleware option
  { skipHydration: true },
)
