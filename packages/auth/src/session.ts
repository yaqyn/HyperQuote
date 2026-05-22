import { getRequest, getResponse } from '@tanstack/react-start/server'
import {
	appendSetCookieHeaders,
	createSupabaseServerClient,
	getSupabaseServerUser,
} from './server'
import type { AuthPool, AuthSession } from './types'

/**
 * Get the current session without redirecting.
 * Returns null for unauthenticated users.
 * Use in loaders where auth is optional (e.g., website pages).
 */
export async function getServerSession(opts: {
	supabaseUrl: string
	supabaseAnonKey: string
	cookieDomain?: string
	cookieName?: string
}): Promise<AuthSession | null> {
	const request = getRequest()
	const { client, responseCookies, responseHeaders } =
		createSupabaseServerClient({
			request,
			supabaseUrl: opts.supabaseUrl,
			supabaseAnonKey: opts.supabaseAnonKey,
			cookieDomain: opts.cookieDomain,
			cookieName: opts.cookieName,
		})

	const {
		data: { user },
		error: userError,
	} = await getSupabaseServerUser({
		client,
		cookieDomain: opts.cookieDomain,
		cookieName: opts.cookieName,
		request,
		responseHeaders: getResponse().headers,
	})

	if (userError || !user) return null

	const {
		data: { session },
	} = await client.auth.getSession()

	if (!session) return null
	appendSetCookieHeaders(
		getResponse().headers,
		responseCookies.values(),
		responseHeaders.entries(),
	)

	const metadata = user.app_metadata ?? {}

	return {
		session: { ...session, user },
		user,
		pool: resolveAuthPool(metadata.pool),
		roles: (metadata.roles as string[]) ?? [],
		tenantId: (metadata.tenant_id as string) ?? null,
	}
}

function resolveAuthPool(value: unknown): AuthPool {
	if (value === 'internal' || value === 'external' || value === 'driver') {
		return value
	}
	return 'external'
}
