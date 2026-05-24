import type { StreamChunk } from '@tanstack/ai'
import { create } from 'zustand'
import { internalChatFn } from '../lib/ai-chat'

export interface AIChatMessage {
	id: string
	role: 'user' | 'assistant'
	content: string
	createdAt: string
}

interface AIChatStore {
	isOpen: boolean
	messages: AIChatMessage[]
	draft: string
	isStreaming: boolean
	panelId: string | null
	open: () => void
	close: () => void
	toggle: () => void
	setPanelId: (panelId: string | null) => void
	setDraft: (text: string) => void
	/** Append a user message, call the ops-assistant backend, stream reply. */
	send: () => void
	clear: () => void
}

/**
 * Global AI chat state. Lives at the shell level so the panel survives
 * module switches — flipping between Sales and Procurement keeps the same
 * conversation in memory. `send()` fires the server function and walks its
 * StreamChunks into the last assistant message as they arrive.
 */
export const useAIChatStore = create<AIChatStore>()((set, get) => ({
	isOpen: false,
	messages: [],
	draft: '',
	isStreaming: false,
	panelId: null,
	open: () => set({ isOpen: true }),
	close: () => set({ isOpen: false }),
	toggle: () => set((s) => ({ isOpen: !s.isOpen })),
	setPanelId: (panelId) => set({ panelId }),
	setDraft: (text) => set({ draft: text }),
	send: () => {
		const state = get()
		const draft = state.draft.trim()
		if (!draft || state.isStreaming) return

		const now = Date.now()
		const userMessage: AIChatMessage = {
			id: `m-${now}-u`,
			role: 'user',
			content: draft,
			createdAt: new Date(now).toISOString(),
		}
		const assistantId = `m-${now}-a`
		const assistantMessage: AIChatMessage = {
			id: assistantId,
			role: 'assistant',
			content: '',
			createdAt: new Date(now + 1).toISOString(),
		}
		set({
			messages: [...state.messages, userMessage, assistantMessage],
			draft: '',
			isStreaming: true,
		})

		// Server-fn returns StreamChunk[] accumulated server-side. We walk
		// the array here and drip tokens into the store so the panel still
		// animates a bit, rather than snapping into a single flash.
		void (async () => {
			try {
				const history = [...state.messages, userMessage].map((m) => ({
					role: m.role,
					content: m.content,
				}))
				const raw = await internalChatFn({
					data: {
						messages: history,
						panelId: state.panelId ?? undefined,
					},
				})
				const chunks = raw as unknown as StreamChunk[]

				let accumulated = ''
				for (const chunk of chunks) {
					if (chunk.type === 'TEXT_MESSAGE_CONTENT') {
						accumulated += chunk.delta
						set((s) => ({
							messages: s.messages.map((m) =>
								m.id === assistantId ? { ...m, content: accumulated } : m,
							),
						}))
						await new Promise((r) => setTimeout(r, 18))
					}
				}
			} catch (err) {
				const msg = err instanceof Error ? err.message : 'unknown error'
				set((s) => ({
					messages: s.messages.map((m) =>
						m.id === assistantId ? { ...m, content: `— error: ${msg} —` } : m,
					),
				}))
			} finally {
				set({ isStreaming: false })
			}
		})()
	},
	clear: () => set({ messages: [], draft: '', isStreaming: false }),
}))
