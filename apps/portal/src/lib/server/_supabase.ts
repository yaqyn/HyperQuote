/**
 * Internal server helpers for Supabase client construction.
 * Keeps env var access narrowed (no non-null assertions) and consolidates
 * the authenticated-client pattern used across every server module.
 */

import {
	resolveSupabaseWorkerConfig,
	type SupabaseServerRuntimeConfig,
} from '@hyperquote/auth/server'
import { getServerSession } from '@hyperquote/auth/session'

/**
 * Returns validated Supabase env vars, throwing if not configured.
 */
async function getSupabaseEnv(): Promise<SupabaseServerRuntimeConfig> {
	const config = await resolveSupabaseWorkerConfig(process.env)
	if (!config) {
		throw new Error('Supabase env not configured')
	}
	return config
}

/**
 * Fetches the current portal session. Throws "Unauthorized" if missing.
 */
async function requireSession() {
	const env = await getSupabaseEnv()
	const session = await getServerSession(env)
	if (!session) throw new Error('Unauthorized')
	return { env, session }
}

/**
 * Returns an authenticated Supabase client + the session used to build it.
 * Adds the user's access token as Authorization header so RLS applies.
 */
export async function getAuthenticatedSupabase() {
	const { env, session } = await requireSession()
	const { createClient } = await import('@supabase/supabase-js')
	const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
		global: {
			headers: { Authorization: `Bearer ${session.session.access_token}` },
		},
	})
	return { supabase, session }
}

export async function getAuthenticatedPortalCustomer() {
	const { supabase, session } = await getAuthenticatedSupabase()
	const metadataCustomerId = session.user.app_metadata?.customer_id
	if (typeof metadataCustomerId === 'string' && metadataCustomerId.length > 0) {
		return { customerId: metadataCustomerId, session, supabase }
	}

	const { data, error } = await supabase
		.from('customers')
		.select('id')
		.eq('user_id', session.user.id)
		.single()

	if (error || !data) {
		throw new Error(error?.message ?? 'Customer profile not found')
	}

	return { customerId: data.id, session, supabase }
}
