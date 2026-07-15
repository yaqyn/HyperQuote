import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = process.cwd().endsWith('apps/portal')
	? join(process.cwd(), '../..')
	: process.cwd()

function readRepoFile(path: string): string {
	return readFileSync(join(repoRoot, path), 'utf8')
}

describe('chat drafts panel state', () => {
	it('does not auto-select a saved draft when drafts refresh', () => {
		const source = readRepoFile(
			'apps/portal/src/components/chat/ChatDraftsPanel.tsx',
		)

		expect(source).not.toContain('savedDrafts[0]')
		expect(source).toContain("sessionKey: 'cart'")
		expect(source).toContain("t('market.cart')")
	})

	it('returns passive resets to the unselected draft workspace', () => {
		const source = readRepoFile(
			'apps/portal/src/components/chat/ChatDraftsPanel.tsx',
		)
		const staleServerDraftBranch = source.slice(
			source.indexOf('if (!serverDraft) {'),
			source.indexOf('const serverEditor = createEditorFromOrder(serverDraft)'),
		)
		const guidedSubmitBranch = source.slice(
			source.indexOf('function confirmSubmitEditor() {'),
			source.indexOf('function duplicateEditor() {'),
		)

		expect(staleServerDraftBranch).toContain('setActiveDraftKey(null)')
		expect(staleServerDraftBranch).toContain('setEditor(null)')
		expect(staleServerDraftBranch).not.toContain('createNewEditor')

		expect(guidedSubmitBranch).toContain('setDraftQuoteOpen(true)')
		expect(guidedSubmitBranch).not.toContain('setActiveDraftKey(null)')
		expect(guidedSubmitBranch).not.toContain('setEditor(null)')
	})

	it('persists the active draft workspace across chat panel remounts', () => {
		const source = readRepoFile(
			'apps/portal/src/components/chat/ChatDraftsPanel.tsx',
		)

		expect(source).toContain('CHAT_DRAFT_WORKSPACE_STORAGE_KEY')
		expect(source).toContain('readPersistedDraftWorkspace')
		expect(source).toContain('restoredWorkspace?.activeDraftKey ?? null')
		expect(source).toContain('restoredWorkspace?.editor ?? null')
		expect(source).toContain('writePersistedDraftWorkspace({')
		expect(source).toContain('writePersistedDraftWorkspace(null)')
	})
})
