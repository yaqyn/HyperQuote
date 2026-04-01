import { create } from 'zustand'

interface ChatWidgetState {
  isOpen: boolean
  hasSeenPulse: boolean
  open: () => void
  close: () => void
  toggle: () => void
  dismissPulse: () => void
}

export const useChatWidget = create<ChatWidgetState>((set) => ({
  isOpen: false,
  hasSeenPulse: false,
  open: () => set({ isOpen: true, hasSeenPulse: true }),
  close: () => set({ isOpen: false }),
  toggle: () =>
    set((s) => ({ isOpen: !s.isOpen, hasSeenPulse: true })),
  dismissPulse: () => set({ hasSeenPulse: true }),
}))
