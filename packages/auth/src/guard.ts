import { redirect } from '@tanstack/react-router'
import { getRequest } from '@tanstack/react-start/server'
import { getServerSession } from './session'
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
	const loginPath = opts.loginPath ?? '/login'
	const authSession = await getServerSession(opts)
	if (!authSession) {
		throw redirectToLogin(loginPath, request)
	}

	if (opts.requiredPool && authSession.pool !== opts.requiredPool) {
		throw redirectToLogin(loginPath, request)
	}

	return authSession
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
