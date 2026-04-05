import { create } from 'zustand'
import type { ProcurementTab } from '../types/procurement'

interface InquiryFilters {
  status?: string
  supplierId?: string
  dateRange?: { from: string; to: string }
}

interface POFilters {
  status?: string
  supplierId?: string
  dateRange?: { from: string; to: string }
}

interface ProcurementStore {
  // Tab navigation
  activeTab: ProcurementTab
  setActiveTab: (tab: ProcurementTab) => void

  // Inquiry state
  selectedInquiryId: string | null
  setSelectedInquiryId: (id: string | null) => void
  inquiryFilters: InquiryFilters
  setInquiryFilters: (filters: InquiryFilters) => void

  // PO state
  selectedPOId: string | null
  setSelectedPOId: (id: string | null) => void
  poFilters: POFilters
  setPOFilters: (filters: POFilters) => void

  // Directory
  directorySearch: string
  setDirectorySearch: (search: string) => void
}

export const useProcurementStore = create<ProcurementStore>()(
  (set) => ({
    // Tab navigation
    activeTab: 'home',
    setActiveTab: (tab) => set({ activeTab: tab }),

    // Inquiry state
    selectedInquiryId: null,
    setSelectedInquiryId: (id) => set({ selectedInquiryId: id }),
    inquiryFilters: {},
    setInquiryFilters: (filters) => set({ inquiryFilters: filters }),

    // PO state
    selectedPOId: null,
    setSelectedPOId: (id) => set({ selectedPOId: id }),
    poFilters: {},
    setPOFilters: (filters) => set({ poFilters: filters }),

    // Directory
    directorySearch: '',
    setDirectorySearch: (search) => set({ directorySearch: search }),
  }),
  // SSR safety: skip auto-hydration so Zustand doesn't read localStorage during SSR
  // @ts-expect-error -- skipHydration is a valid persist middleware option
  { skipHydration: true },
)
