import type { Session, User } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import {
	appendSetCookieHeaders,
	authenticateInternalPassword,
	getInternalSupabaseConfig,
	shouldUseInternalDevAuthStub,
} from '../lib/server/internal-auth-core'

describe('internal auth runtime policy', () => {
	it('fails closed instead of enabling the dev stub in production without Supabase config', () => {
		expect(getInternalSupabaseConfig({})).toBeNull()
		expect(shouldUseInternalDevAuthStub({}, true)).toBe(false)
		expect(
			shouldUseInternalDevAuthStub({ NODE_ENV: 'production' }, false),
		).toBe(false)
		expect(shouldUseInternalDevAuthStub({}, false)).toBe(true)
	})

	it('rejects successful Supabase logins outside the internal pool', async () => {
		const signOut = vi.fn().mockResolvedValue(undefined)
		const client = {
			auth: {
				signInWithPassword: vi.fn().mockResolvedValue({
					data: {
						session: mockSession(),
						user: mockUser('external'),
					},
					error: null,
				}),
				signOut,
			},
		}

		const result = await authenticateInternalPassword({
			client,
			input: {
				email: 'employee@hyperquote.net',
				password: 'correct-password',
			},
			requestUrl: 'https://internal.hyperquote.net/login?redirect=%2F',
		})

		expect(result).toEqual({ ok: false, error: 'wrong_pool' })
		expect(signOut).toHaveBeenCalledOnce()
	})

	it('preserves same-origin redirects and appends Supabase response cookies after internal login', async () => {
		const client = {
			auth: {
				signInWithPassword: vi.fn().mockResolvedValue({
					data: {
						session: mockSession(),
						user: mockUser('internal'),
					},
					error: null,
				}),
				signOut: vi.fn().mockResolvedValue(undefined),
			},
		}

		const result = await authenticateInternalPassword({
			client,
			input: {
				email: 'employee@hyperquote.net',
				password: 'correct-password',
				redirect: 'https://internal.hyperquote.net/?module=search',
			},
			requestUrl: 'https://internal.hyperquote.net/login',
		})
		const headers = new Headers()
		const appended = appendSetCookieHeaders(headers, [
			'sb-access-token=one; Path=/; HttpOnly',
			'sb-refresh-token=two; Path=/; HttpOnly',
		])

		expect(result).toEqual({ ok: true, redirectTo: '/?module=search' })
		expect(appended).toBe(2)
		expect(headers.get('set-cookie')).toContain('sb-access-token=one')
		expect(headers.get('set-cookie')).toContain('sb-refresh-token=two')
	})
})

function mockUser(pool: 'internal' | 'external'): User {
	return {
		id: 'user-1',
		aud: 'authenticated',
		app_metadata: { pool },
		user_metadata: {},
		created_at: '2026-01-01T00:00:00.000Z',
	} as unknown as User
}

function mockSession(): Session {
	return {
		access_token: 'access-token',
		refresh_token: 'refresh-token',
		expires_in: 3600,
		token_type: 'bearer',
		user: mockUser('internal'),
	} as unknown as Session
}
