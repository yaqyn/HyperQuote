import { create } from 'zustand'
import type { OperationsTab, KanbanFilters } from '../types/operations'

interface OperationsStore {
  // Tab navigation
  activeTab: OperationsTab
  setActiveTab: (tab: OperationsTab) => void

  // Order selection
  selectedOrderId: string | null
  setSelectedOrderId: (id: string | null) => void

  // Kanban filters
  kanbanFilters: KanbanFilters
  setKanbanFilters: (filters: KanbanFilters) => void

  // Kanban view mode
  kanbanView: 'board' | 'calendar'
  setKanbanView: (view: 'board' | 'calendar') => void

  // Bottleneck drill-down
  selectedBottleneckStage: string | null
  setSelectedBottleneckStage: (stage: string | null) => void
}

export const useOperationsStore = create<OperationsStore>()(
  (set) => ({
    // Tab navigation
    activeTab: 'dashboard',
    setActiveTab: (tab) => set({ activeTab: tab }),

    // Order selection
    selectedOrderId: null,
    setSelectedOrderId: (id) => set({ selectedOrderId: id }),

    // Kanban filters
    kanbanFilters: { customer: null, dateRange: null, deliveryMethod: null, status: null },
    setKanbanFilters: (filters) => set({ kanbanFilters: filters }),

    // Kanban view mode
    kanbanView: 'board',
    setKanbanView: (view) => set({ kanbanView: view }),

    // Bottleneck drill-down
    selectedBottleneckStage: null,
    setSelectedBottleneckStage: (stage) => set({ selectedBottleneckStage: stage }),
  }),
  // SSR safety: skip auto-hydration so Zustand doesn't read localStorage during SSR
  // @ts-expect-error -- skipHydration is a valid persist middleware option
  { skipHydration: true },
)
