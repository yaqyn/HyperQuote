import { redirect } from '@tanstack/react-router'
import { getRequest, getResponse } from '@tanstack/react-start/server'
import { appendSetCookieHeaders, createSupabaseServerClient } from './server'
import type { AuthGuardOptions, AuthPool, AuthSession } from './types'

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
	const loginPath = opts.loginPath ?? '/login'
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
	} = await client.auth.getUser()

	if (userError || !user) {
		throw redirectToLogin(loginPath, request)
	}

	const {
		data: { session },
	} = await client.auth.getSession()

	if (!session) {
		throw redirectToLogin(loginPath, request)
	}
	appendSetCookieHeaders(
		getResponse().headers,
		responseCookies.values(),
		responseHeaders.entries(),
	)

	// Extract claims set by custom access token hook (Phase 2 migration 004)
	const metadata = user.app_metadata ?? {}
	const pool = resolveAuthPool(metadata.pool)
	const roles = (metadata.roles as string[]) ?? []
	const tenantId = (metadata.tenant_id as string) ?? null

	if (opts.requiredPool && pool !== opts.requiredPool) {
		throw redirectToLogin(loginPath, request)
	}

	return {
		session: { ...session, user },
		user,
		pool,
		roles,
		tenantId,
	}
}

function redirectToLogin(loginPath: string, request: Request) {
	const requestUrl = new URL(request.url)
	const redirectPath = `${requestUrl.pathname}${requestUrl.search}${requestUrl.hash}`

	if (redirectPath === loginPath) {
		return redirect({ to: loginPath })
	}

	return redirect({
		to: loginPath,
		search: { redirect: redirectPath },
	})
}

function resolveAuthPool(value: unknown): AuthPool {
	if (value === 'internal' || value === 'external' || value === 'driver') {
		return value
	}
	return 'external'
}
