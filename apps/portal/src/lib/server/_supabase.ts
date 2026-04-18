/**
 * Internal server helpers for Supabase client construction.
 * Keeps env var access narrowed (no non-null assertions) and consolidates
 * the authenticated-client pattern used across every server module.
 */

import { getServerSession } from '@hyperquote/auth/session'

/**
 * True when Supabase env vars are set to real values (not placeholders).
 * Callers use this to branch into mock behavior during dev.
 */
export function isSupabaseConfigured(): boolean {
	return !!(
		process.env.SUPABASE_URL &&
		process.env.SUPABASE_URL !== 'https://placeholder.supabase.co' &&
		process.env.SUPABASE_ANON_KEY &&
		process.env.SUPABASE_ANON_KEY !== 'placeholder'
	)
}

/**
 * Returns validated Supabase env vars, throwing if not configured.
 * Gate callers on `isSupabaseConfigured()` before invoking so this never throws
 * in dev.
 */
function getSupabaseEnv(): {
	supabaseUrl: string
	supabaseAnonKey: string
} {
	const supabaseUrl = process.env.SUPABASE_URL
	const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error('Supabase env not configured')
	}
	return { supabaseUrl, supabaseAnonKey }
}

/**
 * Fetches the current portal session. Throws "Unauthorized" if missing.
 * Server functions should call this after `isSupabaseConfigured()` returns
 * true.
 */
async function requireSession() {
	const env = getSupabaseEnv()
	const session = await getServerSession({
		supabaseUrl: env.supabaseUrl,
		supabaseAnonKey: env.supabaseAnonKey,
	})
	if (!session) throw new Error('Unauthorized')
	return session
}

/**
 * Returns an authenticated Supabase client + the session used to build it.
 * Adds the user's access token as Authorization header so RLS applies.
 */
export async function getAuthenticatedSupabase() {
	const session = await requireSession()
	const env = getSupabaseEnv()
	const { createClient } = await import('@supabase/supabase-js')
	const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
		global: {
			headers: { Authorization: `Bearer ${session.session.access_token}` },
		},
	})
	return { supabase, session }
}
