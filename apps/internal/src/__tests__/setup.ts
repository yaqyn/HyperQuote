import '@testing-library/jest-dom'
import { vi } from 'vitest'
import type { AuthSession } from '@hyperquote/auth'

/**
 * Shared test setup for internal platform tests.
 * Provides mock auth sessions and a stub Supabase client.
 */

// Stub environment variables for tests
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')

/**
 * Factory for mock AuthSession objects.
 * Defaults to internal pool with admin role.
 */
export function mockAuthSession(
  overrides: Partial<Pick<AuthSession, 'pool' | 'roles' | 'tenantId'>> = {},
): AuthSession {
  return {
    session: {
      access_token: 'test-token',
      refresh_token: 'test-refresh',
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: 'test-user-id',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'dev@hyperquote.net',
        app_metadata: {},
        user_metadata: { name: 'Test User' },
        created_at: '2026-01-01T00:00:00Z',
      },
    } as any,
    user: {
      id: 'test-user-id',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'dev@hyperquote.net',
      app_metadata: {},
      user_metadata: { name: 'Test User' },
      created_at: '2026-01-01T00:00:00Z',
    } as any,
    pool: overrides.pool ?? 'internal',
    roles: overrides.roles ?? ['admin'],
    tenantId: overrides.tenantId ?? 'test-tenant',
  }
}

/**
 * Stub Supabase client for tests that need channel subscriptions.
 */
export const mockSupabaseClient = {
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    }),
  },
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  })),
}
