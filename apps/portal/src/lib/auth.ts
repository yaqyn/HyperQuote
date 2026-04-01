import { createServerFn } from '@tanstack/react-start'
import { getServerSession } from '@hyperquote/auth'
import type { AuthSession } from '@hyperquote/auth'

/**
 * Server function to check portal authentication.
 * Used in _portal.tsx beforeLoad to determine auth state.
 *
 * Returns the session for external-pool users, null for unauthenticated,
 * or an object indicating an internal-only user.
 */
export const checkPortalAuth = createServerFn().handler(
  async (): Promise<{
    auth: AuthSession | null
    isInternalUser: boolean
  }> => {
    const session = await getServerSession({
      supabaseUrl:
        process.env.SUPABASE_URL ?? 'https://placeholder.supabase.co',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? 'placeholder',
    })

    if (!session) {
      return { auth: null, isInternalUser: false }
    }

    // Check pool -- portal requires external pool
    if (session.pool !== 'external') {
      return { auth: null, isInternalUser: true }
    }

    return { auth: session, isInternalUser: false }
  },
)
