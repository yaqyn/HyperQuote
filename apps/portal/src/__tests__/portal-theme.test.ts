import { afterEach, describe, expect, it, vi } from 'vitest'
import { detectPortalTheme } from '../lib/theme'

describe('portal theme defaults', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('defaults to light when no stored preference exists', () => {
		vi.stubGlobal('localStorage', undefined)
		vi.stubGlobal('document', undefined)

		expect(detectPortalTheme()).toBe('light')
	})

	it('uses a stored dark preference when it exists', () => {
		const request = new Request('https://portal.hyperquote.net', {
			headers: { cookie: 'hq-portal-theme=dark' },
		})

		expect(detectPortalTheme(request)).toBe('dark')
	})
})
