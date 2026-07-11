/**
 * usePortalChat — Portal-specific chat hook wrapping @tanstack/ai-react.
 *
 * This is the ONLY file that imports from @tanstack/ai-react in the portal.
 * All chat components consume this hook instead of the underlying library.
 * Phase 30 swaps the connection adapter — consumers stay unchanged.
 *
 * Uses stream() adapter which wraps a function returning AsyncIterable<StreamChunk>.
 * The server function returns AG-UI chunks as an array; client converts to iterable.
 * Customer chat is scoped by active draft/thread context.
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
	PORTAL_CHAT_CLEAR_DRAFT_THREADS_EVENT,
	PORTAL_CHAT_OPEN_DRAFT_EVENT,
	type PortalChatClearDraftThreadsEventDetail,
	type PortalChatOpenDraftEventDetail,
	type PortalConfirmedActionPayload,
	type RichContent,
} from '../lib/chat-types'
import { logPortalError } from '../lib/log'
import {
	isLocalPortalChatCommand,
	parsePortalChatCommand,
	portalChatCommandPaletteGroups,
} from '../lib/portal-chat-commands'
import {
	assistantMessageIdFromChunks,
	extractPortalRichContent,
	portalChatErrorChunks,
} from '../lib/portal-chat-stream'
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

function shouldInvalidateCustomerOrders(chunks: StreamChunk[]): boolean {
	return chunks.some(
		(chunk) =>
			chunk.type === 'CUSTOM' && chunk.name === 'portal_cache_invalidation',
	)
}

function draftPanelOpenDraftDetail(
	chunks: StreamChunk[],
): PortalChatOpenDraftEventDetail | null {
	for (const chunk of chunks) {
		if (chunk.type !== 'CUSTOM' || chunk.name !== 'portal_open_draft_panel') {
			continue
		}
		const value = chunk.value as PortalChatOpenDraftEventDetail | undefined
		if (
			(typeof value?.draftId === 'string' && value.draftId.trim()) ||
			value?.tempDraft
		) {
			return value
		}
	}
	return null
}

function clearDraftThreadKeys(chunks: StreamChunk[]): string[] {
	for (const chunk of chunks) {
		if (
			chunk.type !== 'CUSTOM' ||
			chunk.name !== 'portal_clear_draft_threads'
		) {
			continue
		}
		const value = chunk.value as
			| PortalChatClearDraftThreadsEventDetail
			| undefined
		return Array.isArray(value?.sessionKeys)
			? value.sessionKeys.filter((key) => key.trim())
			: []
	}
	return []
}

function textMessage(role: 'assistant' | 'user', content: string): UIMessage {
	return {
		id: crypto.randomUUID(),
		role,
		parts: [{ type: 'text', content }],
		createdAt: new Date(),
	}
}

function setRichContentForMessage(
	map: Map<string, RichContent[]>,
	messageId: string,
	richContent: RichContent[],
) {
	if (richContent.length === 0) return
	map.set(messageId, richContent)
}

function richContentMapFromStoredMessages(
	messages: ChatMessage[],
): Map<string, RichContent[]> {
	const map = new Map<string, RichContent[]>()
	for (const message of messages) {
		if (message.richContent?.length) {
			map.set(message.id, message.richContent)
		}
	}
	return map
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

function storedMessagesFromUiMessages(
	messages: UIMessage[],
	richContentByMessageId: Map<string, RichContent[]>,
): ChatMessage[] {
	return messages.map((msg: UIMessage) => ({
		id: msg.id,
		role: msg.role as 'user' | 'assistant',
		content: extractContent(msg),
		richContent: richContentByMessageId.get(msg.id),
		timestamp: msg.createdAt?.getTime() ?? Date.now(),
	}))
}

function storedMessages(): ChatMessage[] {
	return useChatStore.getState().customerMessages
}

function storedMessagesForThread(threadKey: string): ChatMessage[] {
	return useChatStore.getState().customerThreadMessages[threadKey] ?? []
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
				event: 'open_cart',
				icon: 'cart',
				label: itemCount > 0 ? 'Open cart' : 'Open empty cart',
				labelAr: itemCount > 0 ? 'افتح السلة' : 'افتح السلة الفارغة',
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

function localHelpResponse(): {
	richContent: RichContent[]
	text: string
} {
	return {
		text: '## Command Guide\nRun safe shortcuts below, or prepare commands that need details.',
		richContent: [
			{
				type: 'command_palette',
				data: {
					description:
						'Run safe shortcuts directly, or prepare commands that need a target, product, date, or message.',
					groups: portalChatCommandPaletteGroups(),
					title: 'Portal Command Desk',
				},
			},
		],
	}
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
	conversationKey = 'default',
	onNewSession,
}: {
	activeDraft?: ActiveChatDraftContext | null
	conversationKey?: string
	onNewSession?: () => void
} = {}) {
	const queryClient = useQueryClient()
	const setMessages = useChatStore((s) => s.setMessages)
	const clearStoreActive = useChatStore((s) => s.clearActive)
	const moveStoreThread = useChatStore((s) => s.moveThread)
	const [isChatStoreHydrated, setIsChatStoreHydrated] = useState(() =>
		useChatStore.persist.hasHydrated(),
	)
	const [isHistoryReady, setIsHistoryReady] = useState(false)
	const [isResponsePending, setIsResponsePending] = useState(false)
	const activeDraftRef = useRef<ActiveChatDraftContext | null>(activeDraft)
	const pendingConfirmedActionRef = useRef<PortalConfirmedActionPayload | null>(
		null,
	)
	const conversationKeyRef = useRef(conversationKey)
	const loadedConversationKeyRef = useRef<string | null>(null)
	const lastPersistedChatFingerprintRef = useRef('')
	const richContentByMessageIdRef = useRef<Map<string, RichContent[]>>(
		new Map(),
	)
	const pendingRichContentRef = useRef<RichContent[]>([])
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
				const outgoingMessages = messages as UIMessage[]
				const historyById = new Map(
					chatMessagesRef.current.map((message) => [message.id, message]),
				)
				for (const message of outgoingMessages) {
					historyById.set(message.id, message)
				}
				const simpleMessages = Array.from(historyById.values()).map((m) => ({
					role: m.role as 'user' | 'assistant',
					content: extractContent(m),
				}))

				// Server-fn returns StreamChunk[] accumulated server-side. Iterate
				// client-side so the stream() adapter processes chunks one at a time.
				const raw = await portalChatFn({
					data: {
						activeDraft: activeDraftRef.current,
						confirmedAction: pendingConfirmedActionRef.current,
						messages: simpleMessages,
						conversationId:
							conversationKeyRef.current === 'default'
								? null
								: conversationKeyRef.current,
					},
				})
				pendingConfirmedActionRef.current = null
				const chunks = raw as unknown as StreamChunk[]

				lastChunksRef.current = chunks
				const richContent = extractPortalRichContent(chunks)
				const assistantMessageId = assistantMessageIdFromChunks(chunks)
				if (assistantMessageId) {
					setRichContentForMessage(
						richContentByMessageIdRef.current,
						assistantMessageId,
						richContent,
					)
					pendingRichContentRef.current = []
				} else {
					pendingRichContentRef.current = richContent
				}
				if (shouldInvalidateCustomerOrders(chunks)) {
					await queryClient.invalidateQueries({
						queryKey: ['customer-orders-all'],
					})
					await queryClient.refetchQueries({
						queryKey: ['customer-orders-all'],
						type: 'active',
					})
				}
				const openDraftDetail = draftPanelOpenDraftDetail(chunks)
				if (openDraftDetail) {
					window.dispatchEvent(
						new CustomEvent(PORTAL_CHAT_OPEN_DRAFT_EVENT, {
							detail: openDraftDetail,
						}),
					)
				}
				const draftThreadKeys = clearDraftThreadKeys(chunks)
				if (draftThreadKeys.length > 0) {
					const activeThreadCleared = draftThreadKeys.includes(
						conversationKeyRef.current,
					)
					for (const key of draftThreadKeys) {
						clearStoreActive(key)
					}
					if (activeThreadCleared) onNewSession?.()
					window.dispatchEvent(
						new CustomEvent(PORTAL_CHAT_CLEAR_DRAFT_THREADS_EVENT, {
							detail: { sessionKeys: draftThreadKeys },
						}),
					)
				}

				yield* arrayToAsyncIterable(chunks)
			} catch (err) {
				logPortalError('portal.chat.stream_error', err)
				yield* arrayToAsyncIterable(portalChatErrorChunks())
			}
		}),
		onError: (err) => {
			logPortalError('portal.chat.error', err)
		},
	})
	const chatMessagesRef = useRef<UIMessage[]>(chat.messages)
	chatMessagesRef.current = chat.messages

	useEffect(() => {
		const previousKey = conversationKeyRef.current
		conversationKeyRef.current = conversationKey
		if (
			previousKey.startsWith('draft:temp:') &&
			conversationKey.startsWith('draft:') &&
			!conversationKey.startsWith('draft:temp:')
		) {
			moveStoreThread(previousKey, conversationKey)
			return
		}
		if (
			previousKey.startsWith('draft:temp:') &&
			conversationKey === 'default'
		) {
			clearStoreActive(previousKey)
			return
		}
		if (
			previousKey === 'default' &&
			conversationKey.startsWith('draft:temp:')
		) {
			const currentMessages = storedMessagesFromUiMessages(
				chatMessagesRef.current,
				richContentByMessageIdRef.current,
			)
			if (currentMessages.length > 0) {
				setMessages(currentMessages, previousKey)
			}
			moveStoreThread(previousKey, conversationKey)
		}
	}, [clearStoreActive, conversationKey, moveStoreThread, setMessages])

	useEffect(() => {
		if (!isChatStoreHydrated) {
			setIsHistoryReady(false)
			return
		}
		if (loadedConversationKeyRef.current === conversationKey) {
			setIsHistoryReady(true)
			return
		}
		setIsHistoryReady(false)
		const threadMessages =
			storedMessagesForThread(conversationKey).length > 0
				? storedMessagesForThread(conversationKey)
				: conversationKey === 'default'
					? storedMessages()
					: []
		if (
			threadMessages.length === 0 &&
			conversationKey.startsWith('draft:temp:') &&
			chatMessagesRef.current.length > 0
		) {
			const currentMessages = storedMessagesFromUiMessages(
				chatMessagesRef.current,
				richContentByMessageIdRef.current,
			)
			setMessages(currentMessages, conversationKey)
			lastPersistedChatFingerprintRef.current = uiMessagesFingerprint(
				chatMessagesRef.current,
			)
			loadedConversationKeyRef.current = conversationKey
			setIsHistoryReady(true)
			return
		}
		const storedFingerprint = storedMessagesFingerprint(threadMessages)
		const currentFingerprint = uiMessagesFingerprint(chatMessagesRef.current)
		richContentByMessageIdRef.current =
			richContentMapFromStoredMessages(threadMessages)
		pendingRichContentRef.current = []
		loadedConversationKeyRef.current = conversationKey
		if (storedFingerprint === currentFingerprint) {
			lastPersistedChatFingerprintRef.current = storedFingerprint
			setIsHistoryReady(true)
			return
		}
		lastPersistedChatFingerprintRef.current = currentFingerprint
		chat.setMessages(threadMessages.map(uiMessageFromStoredMessage))
		setIsHistoryReady(true)
	}, [chat.setMessages, conversationKey, isChatStoreHydrated, setMessages])

	// Sync messages to the durable Zustand thread for the active chat context.
	useEffect(() => {
		if (!isChatStoreHydrated) return
		const fingerprint = uiMessagesFingerprint(chat.messages)
		if (fingerprint === lastPersistedChatFingerprintRef.current) return
		lastPersistedChatFingerprintRef.current = fingerprint
		const activeStoredMessages = storedMessagesForThread(conversationKey)
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
		if (
			lastAssistantIdx >= 0 &&
			pendingRichContentRef.current.length > 0 &&
			chat.messages[lastAssistantIdx]
		) {
			setRichContentForMessage(
				richContentByMessageIdRef.current,
				chat.messages[lastAssistantIdx].id,
				pendingRichContentRef.current,
			)
			pendingRichContentRef.current = []
		}
		const mapped: ChatMessage[] = chat.messages.map((msg: UIMessage) => ({
			id: msg.id,
			role: msg.role as 'user' | 'assistant',
			content: extractContent(msg),
			richContent:
				richContentByMessageIdRef.current.get(msg.id) ??
				existingById.get(msg.id)?.richContent,
			timestamp: msg.createdAt?.getTime() ?? Date.now(),
		}))
		setMessages(mapped, conversationKey)
	}, [chat.messages, conversationKey, isChatStoreHydrated, setMessages])

	// Map UIMessage to simplified ChatMessage for consumers
	const messages: ChatMessage[] = chat.messages.map((msg: UIMessage) => ({
		id: msg.id,
		role: msg.role as 'user' | 'assistant',
		content: extractContent(msg),
		richContent: richContentByMessageIdRef.current.get(msg.id),
		timestamp: msg.createdAt?.getTime() ?? Date.now(),
	}))

	const clear = useCallback(() => {
		chat.stop()
		chat.clear()
		setIsResponsePending(false)
		richContentByMessageIdRef.current = new Map()
		pendingRichContentRef.current = []
		lastChunksRef.current = []
		lastPersistedChatFingerprintRef.current = ''
		clearStoreActive(conversationKeyRef.current)
	}, [chat.clear, chat.stop, clearStoreActive])

	const clearThread = useCallback(
		(threadKey: string) => {
			clearStoreActive(threadKey)
		},
		[clearStoreActive],
	)

	const stop = useCallback(() => {
		chat.stop()
		setIsResponsePending(false)
	}, [chat.stop])

	const sendMessage = useCallback(
		(
			message: string,
			options?: { confirmedAction?: PortalConfirmedActionPayload },
		) => {
			pendingConfirmedActionRef.current = options?.confirmedAction ?? null
			const command = parsePortalChatCommand(message)
			if (command && isLocalPortalChatCommand(command.name)) {
				if (command.name === '/help') {
					const response = localHelpResponse()
					const userMessage = textMessage('user', message)
					const assistantMessage = textMessage('assistant', response.text)
					setRichContentForMessage(
						richContentByMessageIdRef.current,
						assistantMessage.id,
						response.richContent,
					)
					chat.setMessages([
						...chatMessagesRef.current,
						userMessage,
						assistantMessage,
					])
					return
				}
				if (command.name === '/cart' || command.name === '/open-cart') {
					if (command.name === '/open-cart') {
						usePortalStore.getState().setDraftQuoteOpen(true)
					}
					const response = localCartResponse({
						opened: command.name === '/open-cart',
					})
					const userMessage = textMessage('user', message)
					const assistantMessage = textMessage('assistant', response.text)
					setRichContentForMessage(
						richContentByMessageIdRef.current,
						assistantMessage.id,
						response.richContent,
					)
					chat.setMessages([
						...chatMessagesRef.current,
						userMessage,
						assistantMessage,
					])
					return
				}
				clear()
				return
			}
			setIsResponsePending(true)
			void chat.sendMessage(message).finally(() => {
				setIsResponsePending(false)
			})
		},
		[chat.sendMessage, chat.setMessages, clear],
	)

	const isLoading = chat.isLoading || isResponsePending
	let latestAssistantRichContent: RichContent[] = []
	for (let i = messages.length - 1; i >= 0; i--) {
		const message = messages[i]
		if (message?.role !== 'assistant') continue
		latestAssistantRichContent = message.richContent ?? []
		break
	}

	return {
		messages,
		sendMessage,
		isLoading,
		isReady: isChatStoreHydrated && isHistoryReady,
		stop,
		clear,
		clearThread,
		error: chat.error,
		richContent: latestAssistantRichContent,
	}
}
