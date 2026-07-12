import type { AuthSession } from '@hyperquote/auth'
import { hasPermission } from '@hyperquote/auth'
import { appendSetCookieHeaders } from '@hyperquote/auth/server'
import type { Session, User } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import {
	authenticateInternalPassword,
	getInternalSupabaseConfig,
} from '../lib/server/internal-auth-core'

describe('internal auth runtime policy', () => {
	it('fails closed without Supabase config', () => {
		expect(getInternalSupabaseConfig({})).toBeNull()
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
			validateUser: vi.fn().mockResolvedValue(true),
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
			validateUser: vi.fn().mockResolvedValue(true),
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

	it('signs out internal users without an active employee record', async () => {
		const signOut = vi.fn().mockResolvedValue(undefined)
		const client = {
			auth: {
				signInWithPassword: vi.fn().mockResolvedValue({
					data: {
						session: mockSession(),
						user: mockUser('internal'),
					},
					error: null,
				}),
				signOut,
			},
		}

		const result = await authenticateInternalPassword({
			client,
			input: {
				email: 'disabled@hyperquote.net',
				password: 'correct-password',
			},
			requestUrl: 'https://internal.hyperquote.net/login',
			validateUser: vi.fn().mockResolvedValue(false),
		})

		expect(result).toEqual({ ok: false, error: 'wrong_pool' })
		expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
	})

	it('gates internal module permissions from app roles', () => {
		const sales = mockAuthSession(['sales'])
		const inventory = mockAuthSession(['inventory'])
		const customerService = mockAuthSession(['customer_service'])
		const admin = mockAuthSession(['admin'])
		const external = mockAuthSession(['sales'], 'external')

		expect(hasPermission(sales, 'sales.read')).toBe(true)
		expect(hasPermission(sales, 'finance.read')).toBe(false)
		expect(hasPermission(inventory, 'procurement.read')).toBe(true)
		expect(hasPermission(inventory, 'warehouse.read')).toBe(false)
		expect(hasPermission(customerService, 'customer_service.read')).toBe(true)
		expect(hasPermission(customerService, 'sales.read')).toBe(false)
		expect(hasPermission(admin, 'dispatch.read')).toBe(true)
		expect(hasPermission(external, 'sales.read')).toBe(false)
	})
})

function mockAuthSession(
	roles: string[],
	pool: AuthSession['pool'] = 'internal',
): AuthSession {
	const user = mockUser(pool, roles)
	return {
		session: { ...mockSession(), user },
		user,
		pool,
		roles,
		tenantId: null,
	}
}

function mockUser(pool: AuthSession['pool'], roles: string[] = []): User {
	return {
		id: 'user-1',
		aud: 'authenticated',
		app_metadata: { pool, roles },
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
