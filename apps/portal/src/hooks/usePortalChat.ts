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
import { useCallback, useEffect, useRef, useState } from 'react'
import { portalChatFn } from '../lib/chat'
import {
	type ActiveChatDraftContext,
	type ChatMessage,
	PORTAL_CHAT_OPEN_DRAFT_EVENT,
	type RichContent,
} from '../lib/chat-types'
import { logPortalError } from '../lib/log'
import {
	isLocalPortalChatCommand,
	parsePortalChatCommand,
} from '../lib/portal-chat-commands'
import { useChatStore } from '../stores/chat'
import { useDraftQuoteStore } from '../stores/draft-quote'
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

function draftPanelOpenDraftId(chunks: StreamChunk[]): string | null {
	for (const chunk of chunks) {
		if (chunk.type !== 'CUSTOM' || chunk.name !== 'portal_open_draft_panel') {
			continue
		}
		const value = chunk.value as { draftId?: unknown } | undefined
		if (typeof value?.draftId === 'string' && value.draftId.trim()) {
			return value.draftId
		}
	}
	return null
}

function textMessage(role: 'assistant' | 'user', content: string): UIMessage {
	return {
		id: crypto.randomUUID(),
		role,
		parts: [{ type: 'text', content }],
		createdAt: new Date(),
	}
}

function uiMessageFromStoredMessage(message: ChatMessage): UIMessage {
	return {
		id: message.id,
		role: message.role,
		parts: [{ type: 'text', content: message.content }],
		createdAt: new Date(message.timestamp),
	}
}

function uiMessagesFingerprint(messages: UIMessage[]): string {
	return JSON.stringify(
		messages.map((message) => [
			message.id,
			message.role,
			extractContent(message),
		]),
	)
}

function storedMessagesFingerprint(messages: ChatMessage[]): string {
	return JSON.stringify(
		messages.map((message) => [message.id, message.role, message.content]),
	)
}

function storedMessagesForRole(role: 'customer' | 'supplier'): ChatMessage[] {
	const state = useChatStore.getState()
	return role === 'customer' ? state.customerMessages : state.supplierMessages
}

function localCartResponse(options: { opened?: boolean } = {}): {
	richContent: RichContent[]
	text: string
} {
	const cart = useDraftQuoteStore.getState()
	const itemCount = cart.items.length
	const totalUnits = cart.items.reduce((sum, item) => sum + item.quantity, 0)
	const table = cartTextTable(
		cart.items,
		itemCount,
		totalUnits,
		cart.globalNote,
	)
	const tableWithoutHeading = table.replace(/^## Cart\n\n/, '')
	const text = options.opened
		? [
				'## Cart',
				itemCount === 0
					? 'Opened the quote drawer. It is empty right now.'
					: 'Opened the quote drawer with your current items.',
				itemCount > 0 ? tableWithoutHeading : '',
			]
				.filter(Boolean)
				.join('\n\n')
		: itemCount === 0
			? '## Cart\nYour quote drawer is empty.'
			: table
	const richContent: RichContent[] = [
		...(itemCount > 0
			? [
					{
						type: 'material_list' as const,
						data: {
							items: cart.items.map((item) => ({
								name: item.name,
								nameAr: item.nameAr,
								qty: item.quantity,
								unit: item.unitOfMeasure,
								unitAr: item.unitOfMeasureAr,
							})),
						},
					},
				]
			: []),
		{
			type: 'action_button',
			data: {
				icon: 'draft',
				label: itemCount > 0 ? 'Open quote drawer' : 'Start quote drawer',
				labelAr: itemCount > 0 ? 'افتح درج العرض' : 'ابدأ درج العرض',
				params: { draft: 'true' },
				route: '/orders',
			},
		},
		{
			type: 'action_button',
			data: {
				icon: 'market',
				label: 'Browse market',
				labelAr: 'تصفح السوق',
				route: '/market',
			},
		},
	]
	return { richContent, text }
}

function cartTextTable(
	items: ReturnType<typeof useDraftQuoteStore.getState>['items'],
	itemCount: number,
	totalUnits: number,
	globalNote: string,
): string {
	return [
		'## Cart',
		'',
		`| Metric | Value |`,
		'| --- | ---: |',
		`| Items | ${itemCount} |`,
		`| Total units | ${totalUnits} |`,
		...(globalNote ? [`| Note | ${globalNote.replace(/\|/g, '\\|')} |`] : []),
		'',
		'| Product | Qty | Unit |',
		'| --- | ---: | --- |',
		...items.map((item) => {
			return `| ${item.name.replace(/\|/g, '\\|')} | ${item.quantity} | ${item.unitOfMeasure.replace(/\|/g, '\\|')} |`
		}),
	].join('\n')
}

// ============================================================================
// Hook
// ============================================================================

export function usePortalChat({
	activeDraft = null,
}: {
	activeDraft?: ActiveChatDraftContext | null
} = {}) {
	const activeRole = usePortalStore((s) => s.activeRole)
	const queryClient = useQueryClient()
	const setMessages = useChatStore((s) => s.setMessages)
	const clearStoreActive = useChatStore((s) => s.clearActive)
	const _addMessage = useChatStore((s) => s.addMessage)
	const [isChatStoreHydrated, setIsChatStoreHydrated] = useState(() =>
		useChatStore.persist.hasHydrated(),
	)
	const activeDraftRef = useRef<ActiveChatDraftContext | null>(activeDraft)
	const loadedRoleRef = useRef<'customer' | 'supplier' | null>(null)
	const lastPersistedChatFingerprintRef = useRef('')
	const richContentRef = useRef<RichContent[]>([])
	const lastChunksRef = useRef<StreamChunk[]>([])

	// SSR hydration safety — rehydrate Zustand store on mount
	useEffect(() => {
		let mounted = true
		const unsubscribe = useChatStore.persist.onFinishHydration(() => {
			if (mounted) setIsChatStoreHydrated(true)
		})
		if (useChatStore.persist.hasHydrated()) {
			setIsChatStoreHydrated(true)
		} else {
			void useChatStore.persist.rehydrate()
		}
		return () => {
			mounted = false
			unsubscribe()
		}
	}, [])

	useEffect(() => {
		activeDraftRef.current = activeDraft
	}, [activeDraft])

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
						activeDraft: activeDraftRef.current,
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
				const draftId = draftPanelOpenDraftId(chunks)
				if (draftId) {
					window.dispatchEvent(
						new CustomEvent(PORTAL_CHAT_OPEN_DRAFT_EVENT, {
							detail: { draftId },
						}),
					)
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
	const chatMessagesRef = useRef<UIMessage[]>(chat.messages)
	chatMessagesRef.current = chat.messages

	useEffect(() => {
		if (!isChatStoreHydrated) return
		if (loadedRoleRef.current === activeRole) return
		const storedMessages = storedMessagesForRole(activeRole)
		const storedFingerprint = storedMessagesFingerprint(storedMessages)
		const currentFingerprint = uiMessagesFingerprint(chatMessagesRef.current)
		richContentRef.current =
			storedMessages.at(-1)?.role === 'assistant'
				? (storedMessages.at(-1)?.richContent ?? [])
				: []
		loadedRoleRef.current = activeRole
		if (storedFingerprint === currentFingerprint) {
			lastPersistedChatFingerprintRef.current = storedFingerprint
			return
		}
		lastPersistedChatFingerprintRef.current = currentFingerprint
		chat.setMessages(storedMessages.map(uiMessageFromStoredMessage))
	}, [activeRole, chat.setMessages, isChatStoreHydrated])

	// Sync messages to the single durable Zustand thread when messages change.
	useEffect(() => {
		if (!isChatStoreHydrated) return
		const fingerprint = uiMessagesFingerprint(chat.messages)
		if (fingerprint === lastPersistedChatFingerprintRef.current) return
		lastPersistedChatFingerprintRef.current = fingerprint
		const activeStoredMessages =
			activeRole === 'customer'
				? useChatStore.getState().customerMessages
				: useChatStore.getState().supplierMessages
		const existingById = new Map(
			activeStoredMessages.map((message) => [message.id, message]),
		)
		let lastAssistantIdx = -1
		for (let i = chat.messages.length - 1; i >= 0; i--) {
			if (chat.messages[i].role === 'assistant') {
				lastAssistantIdx = i
				break
			}
		}
		const mapped: ChatMessage[] = chat.messages.map(
			(msg: UIMessage, idx: number) => ({
				id: msg.id,
				role: msg.role as 'user' | 'assistant',
				content: extractContent(msg),
				richContent:
					idx === lastAssistantIdx && richContentRef.current.length > 0
						? richContentRef.current
						: existingById.get(msg.id)?.richContent,
				timestamp: msg.createdAt?.getTime() ?? Date.now(),
			}),
		)
		setMessages(activeRole, mapped)
	}, [activeRole, chat.messages, isChatStoreHydrated, setMessages])

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
				idx === lastAssistantIdx && richContentRef.current.length > 0
					? richContentRef.current
					: undefined,
			timestamp: msg.createdAt?.getTime() ?? Date.now(),
		}),
	)

	const clear = useCallback(() => {
		chat.stop()
		chat.clear()
		richContentRef.current = []
		lastChunksRef.current = []
		lastPersistedChatFingerprintRef.current = ''
		clearStoreActive(activeRole)
	}, [activeRole, chat.clear, chat.stop, clearStoreActive])

	const sendMessage = useCallback(
		(message: string) => {
			const command = parsePortalChatCommand(message)
			if (command && isLocalPortalChatCommand(command.name)) {
				if (command.name === '/cart' || command.name === '/open-cart') {
					if (command.name === '/open-cart') {
						usePortalStore.getState().setDraftQuoteOpen(true)
					}
					const response = localCartResponse({
						opened: command.name === '/open-cart',
					})
					richContentRef.current = response.richContent
					chat.setMessages([
						...chat.messages,
						textMessage('user', message),
						textMessage('assistant', response.text),
					])
					return
				}
				clear()
				return
			}
			chat.sendMessage(message)
		},
		[chat.messages, chat.sendMessage, chat.setMessages, clear],
	)

	return {
		messages,
		sendMessage,
		isLoading: chat.isLoading,
		stop: chat.stop,
		clear,
		error: chat.error,
		richContent: richContentRef.current,
	}
}
