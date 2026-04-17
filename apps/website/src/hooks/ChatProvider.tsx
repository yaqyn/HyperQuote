import { createContext, useContext } from 'react'
import type { ChatMessage } from './useAIChat'
import { useAIChat } from './useAIChat'

interface SharedChat {
	messages: ChatMessage[]
	sendMessage: (content: string) => Promise<void>
	isLoading: boolean
	error: Error | null
}

const ChatContext = createContext<SharedChat | null>(null)

export function ChatProvider({ children }: { children: React.ReactNode }) {
	const chat = useAIChat()

	return (
		<ChatContext.Provider
			value={{
				messages: chat.messages,
				sendMessage: chat.sendMessage,
				isLoading: chat.isLoading,
				error: chat.error ?? null,
			}}
		>
			{children}
		</ChatContext.Provider>
	)
}

export function useSharedChat(): SharedChat {
	const ctx = useContext(ChatContext)
	if (!ctx) throw new Error('useSharedChat must be used within ChatProvider')
	return ctx
}
