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
import { useMemo, useState } from 'react'
import {
	chatStreamFn,
	type WebsiteActionButtonData,
	type WebsiteRichContent,
} from '../lib/chat'
import type { ChatMessage, WebsiteChatAction } from './chatSession'

const SERVER_CHAT_HISTORY_MESSAGES = 12
const SERVER_CHAT_MESSAGE_CHARACTERS = 4000

interface ChatOptions {
	onError?: (error: Error) => void
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

function assistantMessageIdFromChunks(chunks: StreamChunk[]): string | null {
	for (const chunk of chunks) {
		if (chunk.type !== 'TEXT_MESSAGE_START' || chunk.role !== 'assistant') {
			continue
		}
		return chunk.messageId
	}
	return null
}

function websiteActionsFromChunks(chunks: StreamChunk[]): WebsiteChatAction[] {
	const actions: WebsiteChatAction[] = []
	for (const chunk of chunks) {
		if (chunk.type !== 'CUSTOM' || chunk.name !== 'rich_message') continue
		const content = chunk.value as WebsiteRichContent | undefined
		if (content?.type !== 'action_button') continue
		actions.push(websiteChatActionFromButton(content.data))
	}
	return actions
}

function websiteChatActionFromButton(
	button: WebsiteActionButtonData,
): WebsiteChatAction {
	return {
		href: button.href,
		icon: button.icon,
		label: button.label,
		labelAr: button.labelAr,
	}
}

export function useAIChat(options?: ChatOptions) {
	const [actionsByMessageId, setActionsByMessageId] = useState<
		Map<string, WebsiteChatAction[]>
	>(() => new Map())
	const chat: UseChatReturn = useChat({
		connection: stream(async function* (messages) {
			// Convert UIMessage[] to simple format for server function
			const simpleMessages = (messages as UIMessage[])
				.slice(-SERVER_CHAT_HISTORY_MESSAGES)
				.map((m) => ({
					role: m.role as 'user' | 'assistant',
					content: (
						m.parts
							?.filter(
								(p): p is { type: 'text'; content: string } =>
									p.type === 'text' &&
									typeof (p as { content?: unknown }).content === 'string',
							)
							.map((p) => p.content)
							.join('') ?? ''
					).slice(0, SERVER_CHAT_MESSAGE_CHARACTERS),
				}))

			const chunks = (await chatStreamFn({
				data: { messages: simpleMessages },
			})) as StreamChunk[]
			const assistantMessageId = assistantMessageIdFromChunks(chunks)
			const actions = websiteActionsFromChunks(chunks)
			if (assistantMessageId && actions.length > 0) {
				setActionsByMessageId((current) => {
					const next = new Map(current)
					next.set(assistantMessageId, actions)
					return next
				})
			}
			yield* arrayToAsyncIterable(chunks)
		}),
		onError: options?.onError,
	})

	// Map UIMessage to simplified ChatMessage for consumers
	// TanStack AI 0.x stores text in parts[].text, but fallback to every
	// known property so content is never silently empty.
	const messages: ChatMessage[] = useMemo(
		() =>
			chat.messages.map((msg: UIMessage) => {
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
					actions: actionsByMessageId.get(msg.id),
					id: msg.id,
					role: msg.role as 'user' | 'assistant',
					content,
				}
			}),
		[actionsByMessageId, chat.messages],
	)

	return {
		messages,
		sendMessage: chat.sendMessage,
		isLoading: chat.isLoading,
		error: chat.error,
		clear: chat.clear,
		stop: chat.stop,
	}
}
