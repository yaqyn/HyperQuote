import { redirect } from '@tanstack/react-router'
import { getRequest } from '@tanstack/react-start/server'
import { createSupabaseServerClient } from './server'
import type { AuthGuardOptions, AuthSession } from './types'

/**
 * Route guard for TanStack Start beforeLoad.
 * Creates a Supabase server client with the user's JWT from cookies,
 * ensuring all subsequent queries enforce RLS policies.
 *
 * Usage in route:
 * ```ts
 * beforeLoad: () => authGuard({ supabaseUrl, supabaseAnonKey })
 * ```
 */
export async function authGuard(opts: AuthGuardOptions): Promise<AuthSession> {
  const request = getRequest()
  const { client } = createSupabaseServerClient({
    request,
    supabaseUrl: opts.supabaseUrl,
    supabaseAnonKey: opts.supabaseAnonKey,
  })

  const {
    data: { session },
  } = await client.auth.getSession()

  if (!session) {
    throw redirect({ to: opts.loginPath ?? '/login' })
  }

  // Extract claims set by custom access token hook (Phase 2 migration 004)
  const metadata = session.user.app_metadata ?? {}
  const pool = (metadata.pool as 'internal' | 'external') ?? 'external'
  const roles = (metadata.roles as string[]) ?? []
  const tenantId = (metadata.tenant_id as string) ?? null

  if (opts.requiredPool && pool !== opts.requiredPool) {
    throw redirect({ to: opts.loginPath ?? '/login' })
  }

  return {
    session,
    user: session.user,
    pool,
    roles,
    tenantId,
  }
}
