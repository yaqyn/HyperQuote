import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..')

function readWorkspaceFile(path: string): string {
	return readFileSync(join(repoRoot, path), 'utf8')
}

function sourceBetween(source: string, start: string, end: string): string {
	const startIndex = source.indexOf(start)
	const endIndex = source.indexOf(end, startIndex)
	expect(startIndex).toBeGreaterThanOrEqual(0)
	expect(endIndex).toBeGreaterThan(startIndex)
	return source.slice(startIndex, endIndex)
}

describe('admin employee update session safety', () => {
	it('does not reread the current session after a self password change', () => {
		const adminServer = readWorkspaceFile(
			'apps/internal/src/lib/server/admin.ts',
		)
		const updateEmployeeSource = sourceBetween(
			adminServer,
			'export const adminUpdateEmployee',
			'export const adminDeleteEmployee',
		)

		expect(updateEmployeeSource.indexOf('const actingEmployeeId')).toBeLessThan(
			updateEmployeeSource.indexOf('ensureEmployeeAuthUser'),
		)
		expect(updateEmployeeSource).toContain(
			'updatedByEmployeeId: actingEmployeeId',
		)
		expect(updateEmployeeSource).toMatch(
			/recordAdminAudit\([\s\S]*auth\.client,\s*\)/,
		)
	})
})
