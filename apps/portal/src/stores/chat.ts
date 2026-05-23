/**
 * Zustand chat store with durable local persistence.
 * The portal keeps one active chat thread per role until the user clears it.
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
	setMessages: (role: 'customer' | 'supplier', msgs: ChatMessage[]) => void
	loadConversation: (role: 'customer' | 'supplier', id: string) => void
	clearActive: (role: 'customer' | 'supplier') => void
	saveConversation: (role: 'customer' | 'supplier') => void
	togglePin: (role: 'customer' | 'supplier', id: string) => void
	setQuickActionContext: (ctx: 'home' | 'product' | 'order') => void
	setHistoryOpen: (open: boolean) => void
}

type ChatStore = ChatStoreState & ChatStoreActions

type PersistedChatStore = Pick<
	ChatStoreState,
	'customerMessages' | 'quickActionContext' | 'supplierMessages'
>

function emptyPersistedChatStore(): PersistedChatStore {
	return {
		customerMessages: [],
		quickActionContext: 'home',
		supplierMessages: [],
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

function migrateChatStoreToSingleSession(
	persistedState: unknown,
): PersistedChatStore {
	if (!persistedState || typeof persistedState !== 'object') {
		return emptyPersistedChatStore()
	}
	const state = persistedState as Partial<ChatStoreState>
	return {
		customerMessages: readStoredMessages(state.customerMessages),
		quickActionContext:
			state.quickActionContext === 'product' ||
			state.quickActionContext === 'order'
				? state.quickActionContext
				: 'home',
		supplierMessages: readStoredMessages(state.supplierMessages),
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
			supplierMessages: [],
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

			setMessages: (role, msgs) =>
				set(() => {
					const key =
						role === 'customer' ? 'customerMessages' : 'supplierMessages'
					return { [key]: msgs }
				}),

			loadConversation: () => undefined,

			clearActive: (role) =>
				set((state) => {
					const msgKey =
						role === 'customer' ? 'customerMessages' : 'supplierMessages'
					return {
						customerConversations: [],
						supplierConversations: [],
						[msgKey]: [],
						activeConversationId: {
							...state.activeConversationId,
							[role]: null,
						},
					}
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
				quickActionContext: state.quickActionContext,
				supplierMessages: state.supplierMessages,
			}),
			skipHydration: true,
		},
	),
)
