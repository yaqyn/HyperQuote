/**
 * useAIChat — Abstraction layer over TanStack AI 0.x
 *
 * This is the ONLY file that imports from @tanstack/ai-react.
 * All chat components consume this hook instead of the underlying library.
 * Phase 30 swaps the connection URL and options — consumers stay unchanged.
 */
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'
import type { UseChatReturn, UIMessage } from '@tanstack/ai-react'

interface ChatOptions {
  onError?: (error: Error) => void
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export function useAIChat(options?: ChatOptions) {
  const chat: UseChatReturn = useChat({
    // fetchServerSentEvents handles SSE parsing, reconnection, [DONE] marker
    connection: fetchServerSentEvents('/api/chat'),
    onError: options?.onError,
  })

  // Map UIMessage to simplified ChatMessage for consumers
  const messages: ChatMessage[] = chat.messages.map((msg: UIMessage) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    content:
      msg.parts
        ?.filter((p) => p.type === 'text')
        .map((p) => (p as { type: 'text'; text: string }).text)
        .join('') ?? '',
  }))

  return {
    messages,
    sendMessage: chat.sendMessage,
    isLoading: chat.isLoading,
    error: chat.error,
    clear: chat.clear,
    stop: chat.stop,
  }
}
