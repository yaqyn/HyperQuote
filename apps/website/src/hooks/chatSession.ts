import { create } from 'zustand'

export interface ChatMessage {
	actions?: WebsiteChatAction[]
	id: string
	role: 'user' | 'assistant'
	content: string
}

export interface WebsiteChatAction {
	href: string
	icon: 'book' | 'login' | 'market' | 'quote' | 'support'
	label: string
	labelAr: string
}

type SendMessage = (content: string) => Promise<void>

interface ChatSessionSnapshot {
	messages: ChatMessage[]
	isLoading: boolean
	error: Error | null
}

interface ChatSessionState extends ChatSessionSnapshot {
	isReady: boolean
	queuedMessages: string[]
	runtimeSendMessage: SendMessage | null
	sendMessage: SendMessage
	bindRuntime: (sendMessage: SendMessage) => void
	consumeQueuedMessages: () => string[]
	setSnapshot: (snapshot: ChatSessionSnapshot) => void
}

export const useChatSession = create<ChatSessionState>((set, get) => ({
	messages: [],
	isLoading: false,
	error: null,
	isReady: false,
	queuedMessages: [],
	runtimeSendMessage: null,
	sendMessage: async (content) => {
		const runtimeSendMessage = get().runtimeSendMessage
		if (runtimeSendMessage) {
			await runtimeSendMessage(content)
			return
		}

		const trimmed = content.trim()
		if (trimmed) {
			set((state) => ({
				queuedMessages: [...state.queuedMessages, trimmed],
			}))
		}
	},
	bindRuntime: (sendMessage) => {
		set({
			isReady: true,
			runtimeSendMessage: sendMessage,
		})
	},
	consumeQueuedMessages: () => {
		const queuedMessages = get().queuedMessages
		if (queuedMessages.length > 0) {
			set({ queuedMessages: [] })
		}
		return queuedMessages
	},
	setSnapshot: (snapshot) => {
		set(snapshot)
	},
}))
