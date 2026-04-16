import { create } from 'zustand'
import type { ChannelType, ConversationStatus } from '../types/customer-service'

interface SupportStore {
  // Selected conversation
  selectedConversationId: string | null
  setSelectedConversation: (id: string | null) => void

  // Filters
  channelFilter: ChannelType | 'all'
  statusFilter: ConversationStatus | 'all'
  searchQuery: string
  setChannelFilter: (filter: ChannelType | 'all') => void
  setStatusFilter: (filter: ConversationStatus | 'all') => void
  setSearchQuery: (query: string) => void

  // Close ladder for ModuleWindow
  overlayCloseHandler: (() => boolean) | null
  setOverlayCloseHandler: (handler: (() => boolean) | null) => void
}

export const useSupportStore = create<SupportStore>()((set) => ({
  selectedConversationId: null,
  setSelectedConversation: (id) => set({ selectedConversationId: id }),

  channelFilter: 'all',
  statusFilter: 'all',
  searchQuery: '',
  setChannelFilter: (filter) => set({ channelFilter: filter }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  overlayCloseHandler: null,
  setOverlayCloseHandler: (handler) => set({ overlayCloseHandler: handler }),
}))
