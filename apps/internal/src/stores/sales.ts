import { create } from 'zustand'
import type { PipelineFilters } from '../types/sales'

type SalesTab =
  | 'home'
  | 'rfq-inbox'
  | 'quote-builder'
  | 'pipeline'
  | 'customer-360'
  | 'contacts'
  | 'calendar'
  | 'reports'

type PipelineView = 'kanban' | 'list' | 'funnel'
type PipelineScope = 'my' | 'team'
type RfqInboxTab = 'all' | 'my' | 'unassigned' | 'needs-clarification' | 'urgent'

interface SalesStore {
  // Tab navigation
  activeTab: SalesTab
  setActiveTab: (tab: SalesTab) => void

  // Pipeline
  pipelineView: PipelineView
  pipelineScope: PipelineScope
  pipelineFilters: PipelineFilters
  savedFilterSets: Record<string, PipelineFilters>
  setPipelineView: (view: PipelineView) => void
  setPipelineScope: (scope: PipelineScope) => void
  setPipelineFilters: (filters: PipelineFilters) => void
  saveFilterSet: (name: string, filters: PipelineFilters) => void
  deleteFilterSet: (name: string) => void

  // RFQ Inbox
  rfqInboxTab: RfqInboxTab
  selectedRfqId: string | null
  setRfqInboxTab: (tab: RfqInboxTab) => void
  setSelectedRfqId: (id: string | null) => void
}

export const useSalesStore = create<SalesStore>()(
  (set) => ({
    // Tab navigation
    activeTab: 'home',
    setActiveTab: (tab) => set({ activeTab: tab }),

    // Pipeline
    pipelineView: 'kanban',
    pipelineScope: 'my',
    pipelineFilters: {},
    savedFilterSets: {},
    setPipelineView: (view) => set({ pipelineView: view }),
    setPipelineScope: (scope) => set({ pipelineScope: scope }),
    setPipelineFilters: (filters) => set({ pipelineFilters: filters }),
    saveFilterSet: (name, filters) =>
      set((s) => ({
        savedFilterSets: { ...s.savedFilterSets, [name]: filters },
      })),
    deleteFilterSet: (name) =>
      set((s) => {
        const { [name]: _, ...rest } = s.savedFilterSets
        return { savedFilterSets: rest }
      }),

    // RFQ Inbox
    rfqInboxTab: 'all',
    selectedRfqId: null,
    setRfqInboxTab: (tab) => set({ rfqInboxTab: tab }),
    setSelectedRfqId: (id) => set({ selectedRfqId: id }),
  }),
  // SSR safety: skip auto-hydration so Zustand doesn't read localStorage during SSR
  // @ts-expect-error -- skipHydration is a valid persist middleware option
  { skipHydration: true },
)
