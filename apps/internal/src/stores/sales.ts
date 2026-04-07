import { create } from 'zustand'
import type { PipelineFilters } from '../types/sales'

type SalesTab =
  | 'rfq-inbox'
  | 'customers'

type PipelineView = 'kanban' | 'list' | 'funnel' | 'timeline'
type PipelineScope = 'my' | 'team'
type RfqStageFilter = 'inbox' | 'in-progress' | 'sent' | 'negotiating' | 'closed'
type RfqInboxTab = 'all' | 'my' | 'unassigned' | 'needs-clarification' | 'urgent'
type RfqViewMode = 'list' | 'board'

interface SalesStore {
  // Tab navigation
  activeTab: SalesTab
  setActiveTab: (tab: SalesTab) => void

  // Pipeline (used within RFQ inbox board view)
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
  rfqStageFilter: RfqStageFilter
  rfqInboxTab: RfqInboxTab
  rfqViewMode: RfqViewMode
  selectedRfqId: string | null
  editingRfqId: string | null
  setRfqStageFilter: (stage: RfqStageFilter) => void
  setRfqInboxTab: (tab: RfqInboxTab) => void
  setRfqViewMode: (mode: RfqViewMode) => void
  setSelectedRfqId: (id: string | null) => void
  setEditingRfqId: (id: string | null) => void

  // Customer 360
  selectedCustomerId: string | null
  setSelectedCustomerId: (id: string | null) => void
}

export const useSalesStore = create<SalesStore>()(
  (set) => ({
    // Tab navigation
    activeTab: 'rfq-inbox',
    setActiveTab: (tab) => set({ activeTab: tab }),

    // Pipeline (used within RFQ inbox board view)
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
    rfqStageFilter: 'inbox',
    rfqInboxTab: 'all',
    rfqViewMode: 'list',
    selectedRfqId: null,
    editingRfqId: null,
    setRfqStageFilter: (stage) => set({ rfqStageFilter: stage }),
    setRfqInboxTab: (tab) => set({ rfqInboxTab: tab }),
    setRfqViewMode: (mode) => set({ rfqViewMode: mode }),
    setSelectedRfqId: (id) => set({ selectedRfqId: id }),
    setEditingRfqId: (id) => set({ editingRfqId: id }),

    // Customer 360
    selectedCustomerId: null,
    setSelectedCustomerId: (id) => set({ selectedCustomerId: id }),
  }),
  // SSR safety: skip auto-hydration so Zustand doesn't read localStorage during SSR
  // @ts-expect-error -- skipHydration is a valid persist middleware option
  { skipHydration: true },
)
