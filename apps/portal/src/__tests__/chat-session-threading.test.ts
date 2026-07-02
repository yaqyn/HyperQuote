import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ChatMessage } from '../lib/chat-types'
import { useChatStore } from '../stores/chat'

const repoRoot = process.cwd().endsWith('apps/portal')
	? join(process.cwd(), '../..')
	: process.cwd()

function readRepoFile(path: string): string {
	return readFileSync(join(repoRoot, path), 'utf8')
}

function message(id: string, content: string): ChatMessage {
	return {
		id,
		content,
		role: 'user',
		timestamp: 1,
	}
}

describe('portal chat session threading', () => {
	beforeEach(() => {
		useChatStore.setState({
			activeConversationId: { customer: null, supplier: null },
			customerConversations: [],
			customerMessages: [],
			customerThreadMessages: {},
			isHistoryOpen: false,
			quickActionContext: 'home',
			supplierConversations: [],
			supplierMessages: [],
			supplierThreadMessages: {},
		})
	})

	it('keeps default and draft chat messages in separate customer threads', () => {
		const store = useChatStore.getState()
		const defaultMessages = [message('default-1', 'hello')]
		const draftMessages = [message('draft-1', 'draft 123')]

		store.setMessages('customer', defaultMessages, 'default')
		store.setMessages('customer', draftMessages, 'draft:123')

		expect(useChatStore.getState().customerThreadMessages.default).toEqual(
			defaultMessages,
		)
		expect(useChatStore.getState().customerThreadMessages['draft:123']).toEqual(
			draftMessages,
		)
		expect(useChatStore.getState().customerMessages).toEqual(draftMessages)
	})

	it('moves an unsaved draft chat thread to the saved draft key', () => {
		const store = useChatStore.getState()
		const tempMessages = [message('temp-1', 'before save')]

		store.setMessages('customer', tempMessages, 'draft:temp:abc')
		store.moveThread('customer', 'draft:temp:abc', 'draft:123')

		expect(
			useChatStore.getState().customerThreadMessages['draft:temp:abc'],
		).toBe(undefined)
		expect(useChatStore.getState().customerThreadMessages['draft:123']).toEqual(
			tempMessages,
		)
	})

	it('removes a temp draft chat when the saved draft already has a thread', () => {
		const store = useChatStore.getState()
		const savedMessages = [message('saved-1', 'existing saved chat')]
		const tempMessages = [message('temp-1', 'temporary chat')]

		store.setMessages('customer', savedMessages, 'draft:123')
		store.setMessages('customer', tempMessages, 'draft:temp:abc')
		store.moveThread('customer', 'draft:temp:abc', 'draft:123')

		expect(
			useChatStore.getState().customerThreadMessages['draft:temp:abc'],
		).toBe(undefined)
		expect(useChatStore.getState().customerThreadMessages['draft:123']).toEqual(
			savedMessages,
		)
	})

	it('wires New Page to the default chat and draft-panel reset', () => {
		const chatViewSource = readRepoFile(
			'apps/portal/src/components/chat/ChatView.tsx',
		)
		const draftPanelSource = readRepoFile(
			'apps/portal/src/components/chat/ChatDraftsPanel.tsx',
		)

		expect(chatViewSource).toContain(
			'usePortalChat({ activeDraft, conversationKey: chatThreadKey })',
		)
		expect(chatViewSource).toContain("draft?.sessionKey ?? 'default'")
		expect(chatViewSource).toContain("setChatThreadKey('default')")
		expect(chatViewSource).toContain('setDraftSelectionResetToken')
		expect(chatViewSource).toContain(
			'resetSelectionToken={draftSelectionResetToken}',
		)

		expect(draftPanelSource).toMatch(
			/sessionKey: `draft:temp:\$\{crypto\.randomUUID\(\)\}`/,
		)
		expect(draftPanelSource).toMatch(/sessionKey: `draft:\$\{order\.id\}`/)
		expect(draftPanelSource).toContain('resetSelectionToken?: number')
		expect(draftPanelSource).toContain('setActiveDraftKey(null)')
		expect(draftPanelSource).toContain('setEditor(null)')
	})
})
