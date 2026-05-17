import {
	type CookieOptions,
	createServerClient,
	parseCookieHeader,
} from '@supabase/ssr'

export {
	resolveSupabaseServerConfig,
	type SupabaseServerRuntimeConfig,
} from './config'

interface ServerClientOptions {
	request: Request
	supabaseUrl: string
	supabaseAnonKey: string
	cookieDomain?: string
}

/**
 * Serialize a Set-Cookie header from name, value, and options.
 * Supabase SSR provides { name, value, options } in setAll callback —
 * we need full headers so the response can set domain/path/etc.
 */
function serializeSetCookie(
	name: string,
	value: string,
	options?: CookieOptions,
): string {
	let header = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`
	if (options?.domain) header += `; Domain=${options.domain}`
	if (options?.path) header += `; Path=${options.path}`
	if (options?.maxAge !== undefined) header += `; Max-Age=${options.maxAge}`
	if (options?.httpOnly) header += '; HttpOnly'
	if (options?.secure) header += '; Secure'
	if (options?.sameSite && typeof options.sameSite === 'string') {
		const ss = options.sameSite
		header += `; SameSite=${ss.charAt(0).toUpperCase()}${ss.slice(1)}`
	}
	return header
}

/**
 * Create a Supabase client for server-side use on Cloudflare Workers.
 * CRITICAL: Always call this INSIDE the request handler, never at module level.
 * Workers are long-lived isolates — module-level state leaks between requests.
 */
export function createSupabaseServerClient({
	request,
	supabaseUrl,
	supabaseAnonKey,
	cookieDomain,
}: ServerClientOptions) {
	const responseCookies = new Map<string, string>()

	const client = createServerClient(supabaseUrl, supabaseAnonKey, {
		cookies: {
			getAll() {
				const header = request.headers.get('cookie') ?? ''
				return parseCookieHeader(header).map(({ name, value }) => ({
					name,
					value: value ?? '',
				}))
			},
			setAll(cookiesToSet) {
				for (const { name, value, options } of cookiesToSet) {
					const cookieOpts = {
						...options,
						// Override domain if cookieDomain is configured (cross-subdomain sharing)
						...(cookieDomain ? { domain: cookieDomain } : {}),
					}
					responseCookies.set(name, serializeSetCookie(name, value, cookieOpts))
				}
			},
		},
	})

	return { client, responseCookies }
}
