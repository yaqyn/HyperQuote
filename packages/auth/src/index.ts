// Client-safe exports only — no server-only imports in this barrel.
// Server-only functions available via subpath imports:
//   @hyperquote/auth/server  → createSupabaseServerClient
//   @hyperquote/auth/guard   → authGuard
//   @hyperquote/auth/session → getServerSession
export { createSupabaseBrowserClient } from './client'
export { resolveSupabaseBrowserConfig } from './config'
export { hasPermission } from './permissions'
export type { AuthGuardOptions, AuthSession } from './types'
