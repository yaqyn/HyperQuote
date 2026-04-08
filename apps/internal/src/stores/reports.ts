import { create } from 'zustand'
import type { ReportsTab, ReportFilter, DateRange } from '../types/reports'

interface ReportsStore {
  // Tab navigation
  activeTab: ReportsTab
  setActiveTab: (tab: ReportsTab) => void

  // Filters
  filters: ReportFilter
  setFilters: (filters: Partial<ReportFilter>) => void

  // Date range shortcut
  dateRange: DateRange
  setDateRange: (range: DateRange) => void
}

const DEFAULT_FILTERS: ReportFilter = {
  dateRange: 'mtd',
}

export const useReportsStore = create<ReportsStore>()(
  (set) => ({
    activeTab: 'overview',
    setActiveTab: (tab) => set({ activeTab: tab }),

    filters: DEFAULT_FILTERS,
    setFilters: (partial) =>
      set((state) => ({ filters: { ...state.filters, ...partial } })),

    dateRange: 'mtd',
    setDateRange: (range) =>
      set((state) => ({
        dateRange: range,
        filters: { ...state.filters, dateRange: range },
      })),
  }),
)
