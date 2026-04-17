import { create } from 'zustand'
import type { AIMessage } from '../types/ai'

interface AIStore {
	// Messages
	messages: AIMessage[]
	addMessage: (message: AIMessage) => void
	clearMessages: () => void

	// Streaming state
	isStreaming: boolean
	setIsStreaming: (streaming: boolean) => void

	// Conversation
	conversationId: string | null
	setConversationId: (id: string | null) => void

	// History panel
	historyOpen: boolean
	setHistoryOpen: (open: boolean) => void
}

export const useAIStore = create<AIStore>()((set) => ({
	messages: [],
	addMessage: (message) =>
		set((state) => ({ messages: [...state.messages, message] })),
	clearMessages: () => set({ messages: [] }),

	isStreaming: false,
	setIsStreaming: (streaming) => set({ isStreaming: streaming }),

	conversationId: null,
	setConversationId: (id) => set({ conversationId: id }),

	historyOpen: false,
	setHistoryOpen: (open) => set({ historyOpen: open }),
}))
