/** Customer chat state persisted per draft/thread context. */
import { create } from 'zustand'
import {
	createJSONStorage,
	persist,
	type StateStorage,
} from 'zustand/middleware'
import type { ChatMessage } from '../lib/chat-types'

interface ChatStoreState {
	customerMessages: ChatMessage[]
	customerThreadMessages: Record<string, ChatMessage[]>
}

interface ChatStoreActions {
	setMessages: (messages: ChatMessage[], threadKey?: string) => void
	clearActive: (threadKey?: string) => void
	moveThread: (fromKey: string, toKey: string) => void
}

type ChatStore = ChatStoreState & ChatStoreActions

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

function migrateCustomerChatStore(persistedState: unknown): ChatStoreState {
	if (!persistedState || typeof persistedState !== 'object') {
		return { customerMessages: [], customerThreadMessages: {} }
	}
	const state = persistedState as Partial<ChatStoreState>
	const customerMessages = readStoredMessages(state.customerMessages)
	const customerThreadMessages = readStoredThreadMessages(
		state.customerThreadMessages,
	)
	if (customerMessages.length > 0 && !customerThreadMessages.default) {
		customerThreadMessages.default = customerMessages
	}
	return { customerMessages, customerThreadMessages }
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
		// Unavailable browser storage is non-fatal.
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

export const useChatStore = create<ChatStore>()(
	persist(
		(set) => ({
			customerMessages: [],
			customerThreadMessages: {},
			setMessages: (messages, threadKey = 'default') =>
				set((state) => {
					const customerThreadMessages = {
						...state.customerThreadMessages,
					}
					if (messages.length > 0) {
						customerThreadMessages[threadKey] = messages
					} else {
						delete customerThreadMessages[threadKey]
					}
					return { customerMessages: messages, customerThreadMessages }
				}),
			clearActive: (threadKey = 'default') =>
				set((state) => {
					const customerThreadMessages = {
						...state.customerThreadMessages,
					}
					delete customerThreadMessages[threadKey]
					return { customerMessages: [], customerThreadMessages }
				}),
			moveThread: (fromKey, toKey) =>
				set((state) => {
					if (fromKey === toKey) return state
					const fromMessages = state.customerThreadMessages[fromKey]
					if (!fromMessages?.length) return state
					const customerThreadMessages = {
						...state.customerThreadMessages,
					}
					if (!customerThreadMessages[toKey]?.length) {
						customerThreadMessages[toKey] = fromMessages
					}
					delete customerThreadMessages[fromKey]
					return { customerThreadMessages }
				}),
		}),
		{
			name: 'hq-portal-chat',
			storage: createJSONStorage(() => portalChatStorage()),
			version: 2,
			migrate: migrateCustomerChatStore,
			merge: (persistedState, currentState) => ({
				...currentState,
				...migrateCustomerChatStore(persistedState),
			}),
			partialize: (state) => ({
				customerMessages: state.customerMessages,
				customerThreadMessages: state.customerThreadMessages,
			}),
			skipHydration: true,
		},
	),
)
