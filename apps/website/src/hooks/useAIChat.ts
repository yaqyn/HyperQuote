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

import type { StreamChunk } from '@tanstack/ai'
import type { UIMessage, UseChatReturn } from '@tanstack/ai-react'
import { stream, useChat } from '@tanstack/ai-react'
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
 * Server-fn returns a StreamChunk[]; iterate client-side so the stream()
 * adapter processes chunks one at a time.
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
						?.filter(
							(p): p is { type: 'text'; content: string } =>
								p.type === 'text' &&
								typeof (p as { content?: unknown }).content === 'string',
						)
						.map((p) => p.content)
						.join('') ?? '',
			}))

			const chunks = (await chatStreamFn({
				data: { messages: simpleMessages },
			})) as StreamChunk[]
			yield* arrayToAsyncIterable(chunks)
		}),
		onError: options?.onError,
	})

	// Map UIMessage to simplified ChatMessage for consumers
	// TanStack AI 0.x stores text in parts[].text, but fallback to every
	// known property so content is never silently empty.
	const messages: ChatMessage[] = chat.messages.map((msg: UIMessage) => {
		const m = msg as unknown as {
			parts?: unknown
			content?: unknown
			text?: unknown
		}

		// 1. Try parts with type 'text'
		let content = ''
		if (Array.isArray(m.parts) && m.parts.length > 0) {
			content = m.parts
				.map((p: unknown) => {
					if (typeof p === 'string') return p
					if (p && typeof p === 'object') {
						const part = p as {
							text?: unknown
							content?: unknown
							delta?: unknown
						}
						const value = part.text ?? part.content ?? part.delta
						return typeof value === 'string' ? value : ''
					}
					return ''
				})
				.join('')
		}

		// 2. Fallback: direct content / text property
		if (!content) {
			if (typeof m.content === 'string') content = m.content
			else if (typeof m.text === 'string') content = m.text
		}

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
