/**
 * usePortalChat — Portal-specific chat hook wrapping @tanstack/ai-react.
 *
 * This is the ONLY file that imports from @tanstack/ai-react in the portal.
 * All chat components consume this hook instead of the underlying library.
 * Phase 30 swaps the connection adapter — consumers stay unchanged.
 *
 * Uses stream() adapter which wraps a function returning AsyncIterable<StreamChunk>.
 * The server function returns AG-UI chunks as an array; client converts to iterable.
 * Role-aware: uses activeRole from portal store for customer/supplier differentiation.
 */
import { useEffect, useCallback, useRef } from 'react'
import { useChat, stream } from '@tanstack/ai-react'
import type { UIMessage } from '@tanstack/ai-react'
import type { StreamChunk } from '@tanstack/ai'
import { portalChatFn } from '../lib/chat'
import { usePortalStore } from '../stores/portal'
import { useChatStore } from '../stores/chat'
import type { RichContent, ChatMessage } from '../lib/chat-types'

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract text content from a UIMessage.
 * Handles multiple @tanstack/ai-react part structures:
 * - parts with type 'text' and .text property
 * - parts with type 'text' and .value property
 * - direct content string on message
 */
function extractContent(msg: UIMessage): string {
  // Try parts first
  if (msg.parts && msg.parts.length > 0) {
    const textParts = msg.parts.filter((p) => p.type === 'text')
    if (textParts.length > 0) {
      const text = textParts
        .map((p) => {
          const part = p as Record<string, unknown>
          return (part.text as string) ?? (part.value as string) ?? ''
        })
        .join('')
      if (text) return text
    }
  }
  // Fallback: direct content property
  if ((msg as Record<string, unknown>).content) {
    return String((msg as Record<string, unknown>).content)
  }
  return ''
}

/**
 * Convert array of StreamChunks to AsyncIterable.
 * Server function returns array (serialized over RPC); stream() needs iterable.
 */
async function* arrayToAsyncIterable(
  chunks: StreamChunk[],
): AsyncIterable<StreamChunk> {
  for (const chunk of chunks) {
    yield chunk
  }
}

/**
 * Extract rich content from CUSTOM events in stream chunks.
 */
function extractRichContent(chunks: StreamChunk[]): RichContent[] {
  const rich: RichContent[] = []
  for (const chunk of chunks) {
    if (
      chunk.type === 'CUSTOM' &&
      (chunk as Record<string, unknown>).name === 'rich_message'
    ) {
      const value = (chunk as Record<string, unknown>).value as RichContent
      if (value) {
        rich.push(value)
      }
    }
  }
  return rich
}

// ============================================================================
// Hook
// ============================================================================

export function usePortalChat() {
  const activeRole = usePortalStore((s) => s.activeRole)
  const setMessages = useChatStore((s) => s.setMessages)
  const addMessage = useChatStore((s) => s.addMessage)
  const richContentRef = useRef<RichContent[]>([])
  const lastChunksRef = useRef<StreamChunk[]>([])

  // SSR hydration safety — rehydrate Zustand store on mount
  useEffect(() => {
    useChatStore.persist.rehydrate()
  }, [])

  const chat = useChat({
    connection: stream(async function* (messages) {
      try {
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
        const chunks = await portalChatFn({
          data: {
            messages: simpleMessages,
            role: activeRole,
            conversationId: null,
          },
        })

        // Extract rich content from CUSTOM events
        lastChunksRef.current = chunks
        richContentRef.current = extractRichContent(chunks)

        // Yield chunks as async iterable for the stream() adapter
        yield* arrayToAsyncIterable(chunks)
      } catch (err) {
        console.error('[portal-chat] stream error:', err)
        // Yield a minimal error response so the UI doesn't hang
        yield {
          type: 'RUN_STARTED' as const,
          timestamp: Date.now(),
          runId: crypto.randomUUID(),
        }
        yield {
          type: 'TEXT_MESSAGE_START' as const,
          timestamp: Date.now(),
          messageId: crypto.randomUUID(),
          role: 'assistant' as const,
        }
        yield {
          type: 'TEXT_MESSAGE_CONTENT' as const,
          timestamp: Date.now(),
          messageId: crypto.randomUUID(),
          delta: 'Something went wrong. Please try again.',
        }
        yield {
          type: 'TEXT_MESSAGE_END' as const,
          timestamp: Date.now(),
          messageId: crypto.randomUUID(),
        }
        yield {
          type: 'RUN_FINISHED' as const,
          timestamp: Date.now(),
          runId: crypto.randomUUID(),
          finishReason: 'stop' as const,
        }
      }
    }),
    onError: (err) => {
      console.error('[portal-chat]', err)
    },
  })

  // Sync messages to Zustand store when messages change
  const prevLengthRef = useRef(0)
  useEffect(() => {
    if (chat.messages.length !== prevLengthRef.current) {
      prevLengthRef.current = chat.messages.length
      const mapped: ChatMessage[] = chat.messages.map((msg: UIMessage) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content:
          extractContent(msg),
        timestamp: Date.now(),
      }))
      setMessages(activeRole, mapped)
    }
  }, [chat.messages, activeRole, setMessages])

  // Debug: log raw UIMessage structure
  if (chat.messages.length > 0) {
    const raw = chat.messages[0] as Record<string, unknown>
    console.log('[usePortalChat] raw UIMessage keys:', Object.keys(raw), 'parts:', raw.parts, 'content:', raw.content, 'role:', raw.role)
  }

  // Map UIMessage to simplified ChatMessage for consumers
  const messages: ChatMessage[] = chat.messages.map((msg: UIMessage) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    content:
      msg.parts
        ?.filter((p) => p.type === 'text')
        .map((p) => (p as { type: 'text'; text: string }).text)
        .join('') ?? '',
    richContent:
      msg.role === 'assistant' ? richContentRef.current : undefined,
    timestamp: Date.now(),
  }))

  const clear = useCallback(() => {
    chat.clear()
    richContentRef.current = []
    lastChunksRef.current = []
  }, [chat.clear])

  return {
    messages,
    sendMessage: chat.sendMessage,
    isLoading: chat.isLoading,
    stop: chat.stop,
    clear,
    error: chat.error,
    richContent: richContentRef.current,
  }
}
