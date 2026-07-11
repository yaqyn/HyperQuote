import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = process.cwd().endsWith('apps/portal')
	? join(process.cwd(), '../..')
	: process.cwd()

function readRepoFile(path: string): string {
	return readFileSync(join(repoRoot, path), 'utf8')
}

describe('deferred portal surfaces', () => {
	it('keeps supplier, team, referral, and fake-session APIs out of generated output', () => {
		const routeTree = readRepoFile('apps/portal/src/routeTree.gen.ts')
		const databaseTypes = readRepoFile('packages/types/src/database.types.ts')
		const quoteRequests = readRepoFile(
			'apps/portal/src/lib/server/quote-requests.ts',
		)

		expect(routeTree).not.toContain('/supplier/')
		expect(databaseTypes).not.toMatch(/\n\s+team_members: \{/)
		expect(databaseTypes).not.toMatch(/\n\s+team_invites: \{/)
		expect(databaseTypes).not.toMatch(/\n\s+referrals: \{/)
		expect(databaseTypes).not.toMatch(/\n\s+user_sessions: \{/)
		expect(databaseTypes).not.toContain('transfer_team_ownership:')
		expect(databaseTypes).toContain('notification_event:')
		expect(quoteRequests).not.toContain('approvalRequired')
		expect(quoteRequests).not.toContain(".from('approvals')")
	})
})
