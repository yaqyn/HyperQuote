import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = process.cwd().endsWith('apps/portal')
	? join(process.cwd(), '../..')
	: process.cwd()

function readRepoFile(path: string): string {
	return readFileSync(join(repoRoot, path), 'utf8')
}

describe('mobile panel back button handling', () => {
	it('keeps device back wired to the active overlay layer before parent panels', () => {
		const backButtonSource = readRepoFile(
			'packages/ui/src/navigation/back-button.ts',
		)
		const driverShellSource = readRepoFile(
			'apps/driver/src/components/DriverShell.tsx',
		)
		const fleetPanelSource = readRepoFile(
			'apps/driver/src/components/FleetPanel.tsx',
		)
		const internalModuleSource = readRepoFile(
			'apps/internal/src/components/shell/ModuleWindow.tsx',
		)
		const internalSlidePanelSource = readRepoFile(
			'apps/internal/src/components/shared/SlidePanel.tsx',
		)
		const portalChatSource = readRepoFile(
			'apps/portal/src/components/chat/ChatView.tsx',
		)

		expect(backButtonSource).toContain('useBackButtonDismissLayer')
		expect(backButtonSource).toContain('window.history.pushState')
		expect(backButtonSource).toContain('window.addEventListener')
		expect(backButtonSource).toContain("'popstate'")
		expect(backButtonSource).toContain('priority')

		expect(driverShellSource).toContain('useBackButtonDismissLayer')
		expect(driverShellSource).toContain('priority: 10')
		expect(fleetPanelSource).toContain('useBackButtonDismissLayer')
		expect(fleetPanelSource).toContain("enabled: selectedTab === 'chat'")
		expect(fleetPanelSource).toContain('priority: 100')

		expect(internalModuleSource).toContain('useBackButtonDismissLayer')
		expect(internalModuleSource).toContain('priority: 10')
		expect(internalSlidePanelSource).toContain('useBackButtonDismissLayer')
		expect(internalSlidePanelSource).toContain('priority: 100')

		expect(portalChatSource).toContain('useBackButtonDismissLayer')
		expect(portalChatSource).toContain('enabled: draftPanelOpen')
		expect(portalChatSource).toContain('onDismiss: closeDraftPanel')
	})

	it('keeps chat surfaces as the only touch scrollers inside panels', () => {
		const driverPanelShellSource = readRepoFile(
			'apps/driver/src/components/PanelShell.tsx',
		)
		const driverTeamChatSource = readRepoFile(
			'apps/driver/src/components/TeamChatPanel.tsx',
		)
		const fleetPanelSource = readRepoFile(
			'apps/driver/src/components/FleetPanel.tsx',
		)
		const internalAiChatSource = readRepoFile(
			'apps/internal/src/components/shared/AIChatPanel.tsx',
		)
		const portalChatMessagesSource = readRepoFile(
			'apps/portal/src/components/chat/ChatMessages.tsx',
		)
		const portalDraftPanelSource = readRepoFile(
			'apps/portal/src/components/chat/ChatDraftsPanel.tsx',
		)

		expect(driverPanelShellSource).toContain('scrollable = true')
		expect(driverPanelShellSource).toContain("'overflow-hidden'")
		expect(fleetPanelSource).toContain('scrollable={false}')
		for (const source of [
			driverTeamChatSource,
			internalAiChatSource,
			portalChatMessagesSource,
			portalDraftPanelSource,
		]) {
			expect(source).toContain('overscroll-contain')
			expect(source).toContain('[-webkit-overflow-scrolling:touch]')
			expect(source).toContain('touch-pan-y')
		}
	})
})
