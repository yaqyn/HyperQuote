/**
 * Zustand chat store with sessionStorage persistence.
 * Role-keyed conversations: customer and supplier have separate message histories.
 * Uses skipHydration for SSR safety — rehydrate in useEffect.
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
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

// ============================================================================
// Store
// ============================================================================

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
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

      loadConversation: (role, id) => {
        const state = get()
        const convKey =
          role === 'customer'
            ? 'customerConversations'
            : 'supplierConversations'
        const msgKey =
          role === 'customer' ? 'customerMessages' : 'supplierMessages'
        const conversation = state[convKey].find((c) => c.id === id)
        if (conversation) {
          set({
            [msgKey]: [...conversation.messages],
            activeConversationId: {
              ...state.activeConversationId,
              [role]: id,
            },
          })
        }
      },

      clearActive: (role) =>
        set((state) => {
          const msgKey =
            role === 'customer' ? 'customerMessages' : 'supplierMessages'
          return {
            [msgKey]: [],
            activeConversationId: {
              ...state.activeConversationId,
              [role]: null,
            },
          }
        }),

      saveConversation: (role) =>
        set((state) => {
          const msgKey =
            role === 'customer' ? 'customerMessages' : 'supplierMessages'
          const convKey =
            role === 'customer'
              ? 'customerConversations'
              : 'supplierConversations'
          const messages = state[msgKey]
          if (messages.length === 0) return state

          const activeId = state.activeConversationId[role]
          const preview =
            messages[0]?.content.slice(0, 100) ?? ''
          const now = new Date().toISOString()

          if (activeId) {
            // Update existing conversation
            return {
              [convKey]: state[convKey].map((c) =>
                c.id === activeId
                  ? { ...c, messages: [...messages], preview }
                  : c,
              ),
            }
          }

          // Create new conversation
          const newId = crypto.randomUUID()
          return {
            [convKey]: [
              {
                id: newId,
                messages: [...messages],
                createdAt: now,
                preview,
                pinned: false,
              },
              ...state[convKey],
            ],
            activeConversationId: {
              ...state.activeConversationId,
              [role]: newId,
            },
          }
        }),

      togglePin: (role, id) =>
        set((state) => {
          const convKey =
            role === 'customer'
              ? 'customerConversations'
              : 'supplierConversations'
          return {
            [convKey]: state[convKey].map((c) =>
              c.id === id ? { ...c, pinned: !c.pinned } : c,
            ),
          }
        }),

      setQuickActionContext: (ctx) => set({ quickActionContext: ctx }),

      setHistoryOpen: (open) => set({ isHistoryOpen: open }),
    }),
    {
      name: 'hq-portal-chat',
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
    },
  ),
)
