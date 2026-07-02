/**
 * Zustand chat store with durable local persistence.
 * The portal keeps one active chat thread per role and draft context.
 * Uses skipHydration for SSR safety — rehydrate in useEffect.
 */
import { create } from 'zustand'
import {
	createJSONStorage,
	persist,
	type StateStorage,
} from 'zustand/middleware'
import type { ChatMessage } from '../lib/chat-types'

// ============================================================================
// Types
// ============================================================================

export interface Conversation {
	id: string
	messages: ChatMessage[]
	createdAt: string
	preview: string
	entityRef?: string
	pinned: boolean
}

interface ChatStoreState {
	// Per-role active messages
	customerMessages: ChatMessage[]
	supplierMessages: ChatMessage[]
	// Per-role scoped threads. Keys are "default", "draft:<id>", or "draft:new".
	customerThreadMessages: Record<string, ChatMessage[]>
	supplierThreadMessages: Record<string, ChatMessage[]>
	// Per-role conversation history
	customerConversations: Conversation[]
	supplierConversations: Conversation[]
	// Active conversation ID per role
	activeConversationId: Record<'customer' | 'supplier', string | null>
	// Context for quick action chips
	quickActionContext: 'home' | 'product' | 'order'
	// History overlay state
	isHistoryOpen: boolean
}

interface ChatStoreActions {
	addMessage: (role: 'customer' | 'supplier', msg: ChatMessage) => void
	setMessages: (
		role: 'customer' | 'supplier',
		msgs: ChatMessage[],
		threadKey?: string,
	) => void
	loadConversation: (role: 'customer' | 'supplier', id: string) => void
	clearActive: (role: 'customer' | 'supplier', threadKey?: string) => void
	moveThread: (
		role: 'customer' | 'supplier',
		fromKey: string,
		toKey: string,
	) => void
	saveConversation: (role: 'customer' | 'supplier') => void
	togglePin: (role: 'customer' | 'supplier', id: string) => void
	setQuickActionContext: (ctx: 'home' | 'product' | 'order') => void
	setHistoryOpen: (open: boolean) => void
}

type ChatStore = ChatStoreState & ChatStoreActions

type PersistedChatStore = Pick<
	ChatStoreState,
	| 'customerMessages'
	| 'customerThreadMessages'
	| 'quickActionContext'
	| 'supplierMessages'
	| 'supplierThreadMessages'
>

function emptyPersistedChatStore(): PersistedChatStore {
	return {
		customerMessages: [],
		customerThreadMessages: {},
		quickActionContext: 'home',
		supplierMessages: [],
		supplierThreadMessages: {},
	}
}

function isChatMessage(value: unknown): value is ChatMessage {
	if (!value || typeof value !== 'object') return false
	const message = value as Partial<ChatMessage>
	return (
		typeof message.id === 'string' &&
		(message.role === 'user' || message.role === 'assistant') &&
		typeof message.content === 'string' &&
		typeof message.timestamp === 'number'
	)
}

function readStoredMessages(value: unknown): ChatMessage[] {
	return Array.isArray(value) ? value.filter(isChatMessage) : []
}

function readStoredThreadMessages(
	value: unknown,
): Record<string, ChatMessage[]> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
	return Object.fromEntries(
		Object.entries(value as Record<string, unknown>)
			.map(([key, messages]) => [key, readStoredMessages(messages)] as const)
			.filter(([key, messages]) => key.trim() && messages.length > 0),
	)
}

function migrateChatStoreToSingleSession(
	persistedState: unknown,
): PersistedChatStore {
	if (!persistedState || typeof persistedState !== 'object') {
		return emptyPersistedChatStore()
	}
	const state = persistedState as Partial<ChatStoreState>
	const customerMessages = readStoredMessages(state.customerMessages)
	const supplierMessages = readStoredMessages(state.supplierMessages)
	const customerThreadMessages = readStoredThreadMessages(
		state.customerThreadMessages,
	)
	const supplierThreadMessages = readStoredThreadMessages(
		state.supplierThreadMessages,
	)
	if (customerMessages.length > 0 && !customerThreadMessages.default) {
		customerThreadMessages.default = customerMessages
	}
	if (supplierMessages.length > 0 && !supplierThreadMessages.default) {
		supplierThreadMessages.default = supplierMessages
	}
	return {
		customerMessages,
		customerThreadMessages,
		quickActionContext:
			state.quickActionContext === 'product' ||
			state.quickActionContext === 'order'
				? state.quickActionContext
				: 'home',
		supplierMessages,
		supplierThreadMessages,
	}
}

function webStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
	if (typeof window === 'undefined') return null
	try {
		return window[kind]
	} catch {
		return null
	}
}

function safeGet(storage: Storage | null, name: string): string | null {
	if (!storage) return null
	try {
		return storage.getItem(name)
	} catch {
		return null
	}
}

function safeRemove(storage: Storage | null, name: string) {
	if (!storage) return
	try {
		storage.removeItem(name)
	} catch {
		// Ignore unavailable browser storage.
	}
}

function safeSet(
	storage: Storage | null,
	name: string,
	value: string,
): boolean {
	if (!storage) return false
	try {
		storage.setItem(name, value)
		return true
	} catch {
		return false
	}
}

function portalChatStorage(): StateStorage {
	return {
		getItem: (name) =>
			safeGet(webStorage('localStorage'), name) ??
			safeGet(webStorage('sessionStorage'), name),
		removeItem: (name) => {
			safeRemove(webStorage('localStorage'), name)
			safeRemove(webStorage('sessionStorage'), name)
		},
		setItem: (name, value) => {
			const local = webStorage('localStorage')
			if (safeSet(local, name, value)) {
				safeRemove(webStorage('sessionStorage'), name)
				return
			}
			safeSet(webStorage('sessionStorage'), name, value)
		},
	}
}

// ============================================================================
// Store
// ============================================================================

export const useChatStore = create<ChatStore>()(
	persist(
		(set) => ({
			// State
			customerMessages: [],
			customerThreadMessages: {},
			supplierMessages: [],
			supplierThreadMessages: {},
			customerConversations: [],
			supplierConversations: [],
			activeConversationId: { customer: null, supplier: null },
			quickActionContext: 'home',
			isHistoryOpen: false,

			// Actions
			addMessage: (role, msg) =>
				set((state) => {
					const key =
						role === 'customer' ? 'customerMessages' : 'supplierMessages'
					return { [key]: [...state[key], msg] }
				}),

			setMessages: (role, msgs, threadKey = 'default') =>
				set((state) => {
					const key =
						role === 'customer' ? 'customerMessages' : 'supplierMessages'
					const threadStoreKey =
						role === 'customer'
							? 'customerThreadMessages'
							: 'supplierThreadMessages'
					const nextThreads = { ...state[threadStoreKey] }
					if (msgs.length > 0) {
						nextThreads[threadKey] = msgs
					} else {
						delete nextThreads[threadKey]
					}
					return {
						[key]: msgs,
						[threadStoreKey]: nextThreads,
					}
				}),

			loadConversation: () => undefined,

			clearActive: (role, threadKey = 'default') =>
				set((state) => {
					const msgKey =
						role === 'customer' ? 'customerMessages' : 'supplierMessages'
					const threadStoreKey =
						role === 'customer'
							? 'customerThreadMessages'
							: 'supplierThreadMessages'
					const nextThreads = { ...state[threadStoreKey] }
					delete nextThreads[threadKey]
					return {
						customerConversations: [],
						supplierConversations: [],
						[msgKey]: [],
						[threadStoreKey]: nextThreads,
						activeConversationId: {
							...state.activeConversationId,
							[role]: null,
						},
					}
				}),

			moveThread: (role, fromKey, toKey) =>
				set((state) => {
					if (fromKey === toKey) return state
					const threadStoreKey =
						role === 'customer'
							? 'customerThreadMessages'
							: 'supplierThreadMessages'
					const fromMessages = state[threadStoreKey][fromKey]
					const toMessages = state[threadStoreKey][toKey]
					if (!fromMessages?.length || toMessages?.length) return state
					const nextThreads = { ...state[threadStoreKey] }
					nextThreads[toKey] = fromMessages
					delete nextThreads[fromKey]
					return { [threadStoreKey]: nextThreads }
				}),

			saveConversation: () => undefined,

			togglePin: () => undefined,

			setQuickActionContext: (ctx) => set({ quickActionContext: ctx }),

			setHistoryOpen: (open) => set({ isHistoryOpen: open }),
		}),
		{
			name: 'hq-portal-chat',
			storage: createJSONStorage(() => portalChatStorage()),
			version: 1,
			migrate: migrateChatStoreToSingleSession,
			merge: (persistedState, currentState) => ({
				...currentState,
				...migrateChatStoreToSingleSession(persistedState),
				activeConversationId: { customer: null, supplier: null },
				customerConversations: [],
				isHistoryOpen: false,
				supplierConversations: [],
			}),
			partialize: (state) => ({
				customerMessages: state.customerMessages,
				customerThreadMessages: state.customerThreadMessages,
				quickActionContext: state.quickActionContext,
				supplierMessages: state.supplierMessages,
				supplierThreadMessages: state.supplierThreadMessages,
			}),
			skipHydration: true,
		},
	),
)
