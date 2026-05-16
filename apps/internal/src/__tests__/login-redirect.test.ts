import { describe, expect, it } from 'vitest'
import { getSafeRedirectPath } from '../lib/login-redirect'

describe('getSafeRedirectPath', () => {
	it('falls back to the internal root when redirect is absent or blank', () => {
		expect(getSafeRedirectPath(undefined)).toBe('/')
		expect(getSafeRedirectPath('   ')).toBe('/')
	})

	it('preserves same-origin path, search, and hash redirects', () => {
		expect(getSafeRedirectPath('/?module=sales#quotes')).toBe(
			'/?module=sales#quotes',
		)
		expect(
			getSafeRedirectPath(
				'https://internal.hyperquote.test/dispatch?view=today#dock',
				'https://internal.hyperquote.test',
			),
		).toBe('/dispatch?view=today#dock')
	})

	it('rejects external, protocol-relative, and non-path redirects', () => {
		expect(
			getSafeRedirectPath(
				'https://example.com/dispatch',
				'https://internal.hyperquote.test',
			),
		).toBe('/')
		expect(getSafeRedirectPath('//example.com/dispatch')).toBe('/')
		expect(getSafeRedirectPath('dispatch')).toBe('/')
	})
})
