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

	it('wires New Page to clear the current chat without clearing the cart desk', () => {
		const chatViewSource = readRepoFile(
			'apps/portal/src/components/chat/ChatView.tsx',
		)
		const draftPanelSource = readRepoFile(
			'apps/portal/src/components/chat/ChatDraftsPanel.tsx',
		)

		expect(chatViewSource).toContain('conversationKey: chatThreadKey')
		expect(chatViewSource).toContain(
			"setChatThreadKey(draft?.sessionKey ?? 'default')",
		)
		expect(chatViewSource).toContain(
			'const handleNewPage = useCallback(() => {',
		)
		expect(chatViewSource).toContain('chat.clear()')
		expect(chatViewSource).toContain("if (chatThreadKey === 'cart') return")
		expect(chatViewSource).toContain(
			'resetSelectionToken={draftSelectionResetToken}',
		)
		expect(chatViewSource).toContain(
			'onNewSession: handleClearedActiveDraftThread',
		)

		expect(draftPanelSource).toMatch(
			/sessionKey: `draft:temp:\$\{crypto\.randomUUID\(\)\}`/,
		)
		expect(draftPanelSource).toMatch(/sessionKey: `draft:\$\{order\.id\}`/)
		expect(draftPanelSource).toContain('resetSelectionToken?: number')
		expect(draftPanelSource).toContain('readPersistedDraftWorkspace')
		expect(draftPanelSource).toContain('writePersistedDraftWorkspace')
		expect(draftPanelSource).toContain('setActiveDraftKey(null)')
		expect(draftPanelSource).toContain('setEditor(null)')
	})

	it('keeps chat-created drafts temporary until the draft desk saves them', () => {
		const chatSource = readRepoFile('apps/portal/src/lib/chat.ts')
		const draftPanelSource = readRepoFile(
			'apps/portal/src/components/chat/ChatDraftsPanel.tsx',
		)
		const createDraftStart = chatSource.indexOf(
			'async function createDraftFromPlan',
		)
		const createDraftEnd = chatSource.indexOf(
			'async function insertStrictCatalogDraftItems',
		)
		const createDraftSource = chatSource.slice(createDraftStart, createDraftEnd)

		expect(createDraftSource).toContain('tempDraftDataFromDraftItems')
		expect(createDraftSource).toContain('tempDraft,')
		expect(createDraftSource).not.toContain(".from('quote_requests')")
		expect(createDraftSource).not.toContain('insertStrictCatalogDraftItems')
		expect(chatSource).toContain(
			'portalOpenDraftPanelEvent(result.context.result.tempDraft',
		)
		expect(chatSource).not.toContain('adoptCurrentChat')

		expect(draftPanelSource).toContain('createEditorFromTempDraft')
		expect(draftPanelSource).toContain('detail?.tempDraft')
		expect(draftPanelSource).toContain(
			'onClick={editor ? clearEditorWorkspace : clearCartWorkspace}',
		)
		expect(draftPanelSource).toContain('onClick={saveCurrentEditor}')
	})

	it('moves temp draft chat threads between default, temp, and saved draft keys', () => {
		const hookSource = readRepoFile('apps/portal/src/hooks/usePortalChat.ts')
		const chatViewSource = readRepoFile(
			'apps/portal/src/components/chat/ChatView.tsx',
		)

		expect(hookSource).toContain("previousKey.startsWith('draft:temp:')")
		expect(hookSource).toContain("conversationKey === 'default'")
		expect(hookSource).toContain('clearStoreActive(activeRole, previousKey)')
		expect(hookSource).toContain("previousKey === 'default'")
		expect(hookSource).toContain("conversationKey.startsWith('draft:temp:')")
		expect(hookSource).toContain(
			'moveStoreThread(activeRole, previousKey, conversationKey)',
		)
		expect(hookSource).toContain('currentMessages.length > 0')
		expect(hookSource).toContain(
			"storedMessages.length === 0 &&\n\t\t\tconversationKey.startsWith('draft:temp:')",
		)
		expect(chatViewSource).toContain(
			"setChatThreadKey(draft?.sessionKey ?? 'default')",
		)
		expect(hookSource).toContain('clear()')
	})

	it('clears a draft chat thread when the draft desk clears or deletes that draft', () => {
		const hookSource = readRepoFile('apps/portal/src/hooks/usePortalChat.ts')
		const chatViewSource = readRepoFile(
			'apps/portal/src/components/chat/ChatView.tsx',
		)
		const draftPanelSource = readRepoFile(
			'apps/portal/src/components/chat/ChatDraftsPanel.tsx',
		)

		expect(hookSource).toContain('clearThread')
		expect(chatViewSource).toContain(
			'onDraftThreadClear={(sessionKey) => chat.clearThread(sessionKey)}',
		)
		expect(draftPanelSource).toContain('onDraftThreadClear?.(draft.sessionKey)')
		expect(draftPanelSource).toContain(
			'onDraftThreadClear?.(editor.sessionKey)',
		)
		expect(draftPanelSource).toContain("onDraftThreadClear?.('cart')")
	})

	it('clears draft chat threads after server-side draft clear or delete actions', () => {
		const chatSource = readRepoFile('apps/portal/src/lib/chat.ts')
		const hookSource = readRepoFile('apps/portal/src/hooks/usePortalChat.ts')

		expect(chatSource).toContain('clearThreadSessionKeys')
		expect(chatSource).toContain("name: 'portal_clear_draft_threads'")
		expect(chatSource).toContain('clearThreadSessionKeys: [draftSessionKey')
		expect(hookSource).toContain('clearDraftThreadKeys')
		expect(hookSource).toContain('clearStoreActive(activeRole, key)')
		expect(hookSource).toContain('if (activeThreadCleared) onNewSession?.()')
	})
})
