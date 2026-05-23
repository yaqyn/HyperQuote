import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = process.cwd().endsWith('apps/portal')
	? join(process.cwd(), '../..')
	: process.cwd()

describe('chat action button confirmations', () => {
	it('uses an in-app confirmation dialog, not browser-native confirm', () => {
		const source = readFileSync(
			join(repoRoot, 'apps/portal/src/components/chat/ActionButton.tsx'),
			'utf8',
		)

		expect(source).toContain('ModalOverlay')
		expect(source).not.toContain('window.confirm')
	})
})
