import { create } from 'zustand'
import type { DispatchTab } from '../types/dispatch'

interface MapViewport {
  latitude: number
  longitude: number
  zoom: number
}

interface DispatchStore {
  // Tab navigation
  activeTab: DispatchTab
  setActiveTab: (tab: DispatchTab) => void

  // Entity selection
  selectedDriverId: string | null
  setSelectedDriverId: (id: string | null) => void

  selectedDeliveryId: string | null
  setSelectedDeliveryId: (id: string | null) => void

  selectedRouteId: string | null
  setSelectedRouteId: (id: string | null) => void

  // Map viewport (default: Cairo)
  mapViewport: MapViewport
  setMapViewport: (viewport: MapViewport) => void

  // Route planning date (default: tomorrow ISO)
  routePlanningDate: string
  setRoutePlanningDate: (date: string) => void

  // Map mode toggle (planning vs live tracking)
  mapMode: 'planning' | 'live'
  setMapMode: (mode: 'planning' | 'live') => void

  // Delivery detail drill-down (POD review)
  reviewingDeliveryId: string | null
  setReviewingDeliveryId: (id: string | null) => void

  // Roster sidebar in map view
  rosterSidebarOpen: boolean
  setRosterSidebarOpen: (open: boolean) => void
}

function getTomorrowISO(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]!
}

// Cairo center coordinates
const CAIRO_VIEWPORT: MapViewport = {
  latitude: 30.0444,
  longitude: 31.2357,
  zoom: 11,
}

export const useDispatchStore = create<DispatchStore>()(
  (set) => ({
    // Tab navigation
    activeTab: 'map',
    setActiveTab: (tab) => set({ activeTab: tab }),

    // Entity selection
    selectedDriverId: null,
    setSelectedDriverId: (id) => set({ selectedDriverId: id }),

    selectedDeliveryId: null,
    setSelectedDeliveryId: (id) => set({ selectedDeliveryId: id }),

    selectedRouteId: null,
    setSelectedRouteId: (id) => set({ selectedRouteId: id }),

    // Map viewport
    mapViewport: CAIRO_VIEWPORT,
    setMapViewport: (viewport) => set({ mapViewport: viewport }),

    // Route planning date
    routePlanningDate: getTomorrowISO(),
    setRoutePlanningDate: (date) => set({ routePlanningDate: date }),

    // Map mode toggle
    mapMode: 'planning',
    setMapMode: (mode) => set({ mapMode: mode }),

    // Delivery detail drill-down (POD review)
    reviewingDeliveryId: null,
    setReviewingDeliveryId: (id) => set({ reviewingDeliveryId: id }),

    // Roster sidebar in map view
    rosterSidebarOpen: false,
    setRosterSidebarOpen: (open) => set({ rosterSidebarOpen: open }),
  }),
  // SSR safety: skip auto-hydration so Zustand doesn't read localStorage during SSR
  // @ts-expect-error -- skipHydration is a valid persist middleware option
  { skipHydration: true },
)
