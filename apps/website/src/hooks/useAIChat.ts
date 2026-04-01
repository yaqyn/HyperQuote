/**
 * useAIChat — Abstraction layer over TanStack AI 0.x
 *
 * This is the ONLY file that imports from @tanstack/ai-react.
 * All chat components consume this hook instead of the underlying library.
 * Phase 30 swaps the connection adapter — consumers stay unchanged.
 *
 * Uses stream() adapter which wraps a function returning AsyncIterable<StreamChunk>.
 * The server function returns AG-UI chunks as an array; client converts to iterable.
 */
import { useChat, stream } from '@tanstack/ai-react'
import type { UseChatReturn, UIMessage } from '@tanstack/ai-react'
import type { StreamChunk } from '@tanstack/ai'
import { chatStreamFn } from '../lib/chat'

interface ChatOptions {
  onError?: (error: Error) => void
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

/**
 * Convert array of StreamChunks to AsyncIterable
 * Server function returns array (serialized over RPC); stream() needs iterable
 */
async function* arrayToAsyncIterable(
  chunks: StreamChunk[],
): AsyncIterable<StreamChunk> {
  for (const chunk of chunks) {
    yield chunk
  }
}

export function useAIChat(options?: ChatOptions) {
  const chat: UseChatReturn = useChat({
    connection: stream(async function* (messages) {
      // Convert UIMessage[] to simple format for server function
      const simpleMessages = (messages as UIMessage[]).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content:
          m.parts
            ?.filter((p) => p.type === 'text')
            .map((p) => (p as { type: 'text'; text: string }).text)
            .join('') ?? '',
      }))

      // Call server function — returns StreamChunk[] (serialized)
      const chunks = await chatStreamFn({
        data: { messages: simpleMessages },
      })

      // Yield chunks as async iterable for the stream() adapter
      yield* arrayToAsyncIterable(chunks)
    }),
    onError: options?.onError,
  })

  // Map UIMessage to simplified ChatMessage for consumers
  // TanStack AI 0.x stores text in parts[].text, but fallback to every
  // known property so content is never silently empty.
  const messages: ChatMessage[] = chat.messages.map((msg: UIMessage) => {
    const m = msg as any

    // 1. Try parts with type 'text'
    let content = ''
    if (Array.isArray(m.parts) && m.parts.length > 0) {
      content = m.parts
        .map((p: any) => {
          if (typeof p === 'string') return p
          return p.text ?? p.content ?? p.delta ?? ''
        })
        .join('')
    }

    // 2. Fallback: direct content / text property
    if (!content) content = m.content ?? m.text ?? ''

    return {
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content,
    }
  })

  return {
    messages,
    sendMessage: chat.sendMessage,
    isLoading: chat.isLoading,
    error: chat.error,
    clear: chat.clear,
    stop: chat.stop,
  }
}
