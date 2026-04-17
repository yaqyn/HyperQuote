import { create } from 'zustand'
import type { ConversationStatus } from '../types/customer-service'

interface SupportStore {
	// Selected conversation
	selectedConversationId: string | null
	setSelectedConversation: (id: string | null) => void

	// Filters
	statusFilter: ConversationStatus | 'all'
	searchQuery: string
	setStatusFilter: (filter: ConversationStatus | 'all') => void
	setSearchQuery: (query: string) => void

	// Close ladder for ModuleWindow
	overlayCloseHandler: (() => boolean) | null
	setOverlayCloseHandler: (handler: (() => boolean) | null) => void
}

export const useSupportStore = create<SupportStore>()((set) => ({
	selectedConversationId: null,
	setSelectedConversation: (id) => set({ selectedConversationId: id }),

	statusFilter: 'all',
	searchQuery: '',
	setStatusFilter: (filter) => set({ statusFilter: filter }),
	setSearchQuery: (query) => set({ searchQuery: query }),

	overlayCloseHandler: null,
	setOverlayCloseHandler: (handler) => set({ overlayCloseHandler: handler }),
}))
