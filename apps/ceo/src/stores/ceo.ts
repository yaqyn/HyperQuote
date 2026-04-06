import { create } from 'zustand'

interface CEOStore {
  isOnline: boolean
  setOnline: (v: boolean) => void
  lastSynced: number | null
  setLastSynced: (ts: number) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
}

export const useCEOStore = create<CEOStore>()((set) => ({
  isOnline: true,
  setOnline: (v) => set({ isOnline: v }),
  lastSynced: null,
  setLastSynced: (ts) => set({ lastSynced: ts }),
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
}))
