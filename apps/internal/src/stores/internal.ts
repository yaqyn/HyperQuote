import { create } from 'zustand'

export interface WindowState {
  scrollTop: number
  activeTab?: string
  expandedSections: string[]
  filters: Record<string, unknown>
}

interface InternalStore {
  activeModule: string | null
  windowStates: Record<string, WindowState>
  setActiveModule: (module: string | null) => void
  saveWindowState: (module: string, state: Partial<WindowState>) => void
  getWindowState: (module: string) => WindowState | undefined
}

export const useInternalStore = create<InternalStore>()(
  (set, get) => ({
    activeModule: null,
    windowStates: {},

    setActiveModule: (module) => set({ activeModule: module }),

    saveWindowState: (module, partial) =>
      set((s) => ({
        windowStates: {
          ...s.windowStates,
          [module]: {
            scrollTop: 0,
            expandedSections: [],
            filters: {},
            ...s.windowStates[module],
            ...partial,
          },
        },
      })),

    getWindowState: (module) => get().windowStates[module],
  }),
  // SSR safety: skip auto-hydration so Zustand doesn't read localStorage during SSR
  // @ts-expect-error -- skipHydration is a valid persist middleware option
  { skipHydration: true },
)
