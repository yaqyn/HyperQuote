import { getRequest } from '@tanstack/react-start/server'
import { createSupabaseServerClient } from './server'
import type { AuthSession } from './types'

/**
 * Get the current session without redirecting.
 * Returns null for unauthenticated users.
 * Use in loaders where auth is optional (e.g., website pages).
 */
export async function getServerSession(opts: {
  supabaseUrl: string
  supabaseAnonKey: string
}): Promise<AuthSession | null> {
  const request = getRequest()
  const { client } = createSupabaseServerClient({
    request,
    supabaseUrl: opts.supabaseUrl,
    supabaseAnonKey: opts.supabaseAnonKey,
  })

  const {
    data: { session },
  } = await client.auth.getSession()

  if (!session) return null

  const metadata = session.user.app_metadata ?? {}

  return {
    session,
    user: session.user,
    pool: (metadata.pool as 'internal' | 'external') ?? 'external',
    roles: (metadata.roles as string[]) ?? [],
    tenantId: (metadata.tenant_id as string) ?? null,
  }
}

/**
 * Client-side permission check for UI gating only.
 * Real authorization is enforced by RLS policies on the database.
 *
 * Permission format: "entity.action" (e.g., "quote_requests.read")
 * Roles with their permissions are defined in the seed data (Phase 2).
 */
export function hasPermission(
  _session: AuthSession,
  _permission: string,
): boolean {
  // TODO: Wire up role-permission mapping from database seed data.
  // For now returns true — RLS is the actual enforcement layer.
  // This will be populated when the permission lookup table is loaded client-side.
  return true
}
