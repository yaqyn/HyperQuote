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

import type { StreamChunk } from '@tanstack/ai'
import type { UIMessage } from '@tanstack/ai-react'
import { stream, useChat } from '@tanstack/ai-react'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { portalChatFn } from '../lib/chat'
import type { ChatMessage, RichContent } from '../lib/chat-types'
import { logPortalError } from '../lib/log'
import { useChatStore } from '../stores/chat'
import { usePortalStore } from '../stores/portal'

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
	const m = msg as unknown as {
		content?: unknown
		parts?: unknown
		text?: unknown
	}
	if (Array.isArray(m.parts) && m.parts.length > 0) {
		return m.parts
			.map((part: unknown) => {
				if (typeof part === 'string') return part
				if (!part || typeof part !== 'object') return ''
				const p = part as {
					content?: unknown
					delta?: unknown
					text?: unknown
					type?: unknown
				}
				if (p.type !== 'text') return ''
				const value = p.content ?? p.text ?? p.delta
				return typeof value === 'string' ? value : ''
			})
			.join('')
	}
	if (typeof m.content === 'string') return m.content
	if (typeof m.text === 'string') return m.text
	return ''
}

/**
 * Convert array of StreamChunks to AsyncIterable. The server-fn returns
 * chunks accumulated into an array (clean RPC serialization); stream() needs
 * an iterable so we yield one at a time.
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
		if (chunk.type === 'CUSTOM' && chunk.name === 'rich_message') {
			// value is typed `unknown` on CustomEvent — treat it as RichContent
			// if truthy (producers of this channel emit only RichContent objects).
			const value = chunk.value as RichContent | undefined
			if (value) {
				rich.push(value)
			}
		}
	}
	return rich
}

function shouldInvalidateCustomerOrders(chunks: StreamChunk[]): boolean {
	return chunks.some(
		(chunk) =>
			chunk.type === 'CUSTOM' && chunk.name === 'portal_cache_invalidation',
	)
}

// ============================================================================
// Hook
// ============================================================================

export function usePortalChat() {
	const activeRole = usePortalStore((s) => s.activeRole)
	const queryClient = useQueryClient()
	const setMessages = useChatStore((s) => s.setMessages)
	const _addMessage = useChatStore((s) => s.addMessage)
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
					content: extractContent(m),
				}))

				// Server-fn returns StreamChunk[] accumulated server-side. Iterate
				// client-side so the stream() adapter processes chunks one at a time.
				const raw = await portalChatFn({
					data: {
						messages: simpleMessages,
						role: activeRole,
						conversationId: null,
					},
				})
				const chunks = raw as unknown as StreamChunk[]

				lastChunksRef.current = chunks
				richContentRef.current = extractRichContent(chunks)
				if (shouldInvalidateCustomerOrders(chunks)) {
					queryClient.invalidateQueries({ queryKey: ['customer-orders-all'] })
				}

				yield* arrayToAsyncIterable(chunks)
			} catch (err) {
				logPortalError('portal.chat.stream_error', err)
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
			logPortalError('portal.chat.error', err)
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
				content: extractContent(msg),
				timestamp: Date.now(),
			}))
			setMessages(activeRole, mapped)
		}
	}, [chat.messages, activeRole, setMessages])

	// Map UIMessage to simplified ChatMessage for consumers
	// Rich content only attaches to the last assistant message.
	// Manual findLastIndex — target is ES2022, findLastIndex is ES2023.
	let lastAssistantIdx = -1
	for (let i = chat.messages.length - 1; i >= 0; i--) {
		if (chat.messages[i].role === 'assistant') {
			lastAssistantIdx = i
			break
		}
	}
	const messages: ChatMessage[] = chat.messages.map(
		(msg: UIMessage, idx: number) => ({
			id: msg.id,
			role: msg.role as 'user' | 'assistant',
			content: extractContent(msg),
			richContent:
				idx === lastAssistantIdx ? richContentRef.current : undefined,
			timestamp: msg.createdAt?.getTime() ?? Date.now(),
		}),
	)

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
