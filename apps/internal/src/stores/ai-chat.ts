import { create } from 'zustand'

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
	open: () => void
	close: () => void
	toggle: () => void
	setDraft: (text: string) => void
	/** Append a user message and produce a stubbed assistant reply. */
	send: () => void
	clear: () => void
}

/**
 * Global AI chat state. Lives at the shell level so the panel survives
 * module switches — flipping between Sales and Procurement keeps the
 * same conversation in memory. The backend wire-up (TanStack AI or
 * Anthropic SDK) will replace `send()` with a real streaming call later;
 * for now it echoes a placeholder so the UI can be fully built against it.
 */
export const useAIChatStore = create<AIChatStore>()((set, get) => ({
	isOpen: false,
	messages: [],
	draft: '',
	open: () => set({ isOpen: true }),
	close: () => set({ isOpen: false }),
	toggle: () => set((s) => ({ isOpen: !s.isOpen })),
	setDraft: (text) => set({ draft: text }),
	send: () => {
		const draft = get().draft.trim()
		if (!draft) return
		const now = new Date().toISOString()
		const userMessage: AIChatMessage = {
			id: `m-${Date.now()}-u`,
			role: 'user',
			content: draft,
			createdAt: now,
		}
		// Placeholder assistant reply until the real model is wired up.
		const assistantMessage: AIChatMessage = {
			id: `m-${Date.now()}-a`,
			role: 'assistant',
			content:
				"I'm not hooked up to a model yet — this is a placeholder so the UI can render. Wire me to Anthropic (or TanStack AI) and I'll answer for real.",
			createdAt: new Date(Date.now() + 1).toISOString(),
		}
		set({
			messages: [...get().messages, userMessage, assistantMessage],
			draft: '',
		})
	},
	clear: () => set({ messages: [], draft: '' }),
}))
