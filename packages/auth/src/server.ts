/// <reference types="@cloudflare/workers-types" />
import {
	type CookieOptions,
	createServerClient,
	parseCookieHeader,
} from '@supabase/ssr'
import {
	resolveSupabaseServerConfig,
	type SupabaseServerRuntimeConfig,
} from './config'

export { resolveSupabaseServerConfig, type SupabaseServerRuntimeConfig }

interface ServerClientOptions {
	request: Request
	supabaseUrl: string
	supabaseAnonKey: string
	cookieDomain?: string
	cookieName?: string
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
	cookieName,
}: ServerClientOptions) {
	const responseCookies = new Map<string, string>()
	const requestCookieDomain = resolveCookieDomainForRequest(
		request,
		cookieDomain,
	)
	const secureCookies = shouldUseSecureCookies(request)

	const client = createServerClient(supabaseUrl, supabaseAnonKey, {
		cookieOptions: {
			...(cookieName ? { name: cookieName } : {}),
			...(requestCookieDomain ? { domain: requestCookieDomain } : {}),
			path: '/',
			sameSite: 'lax',
			secure: secureCookies,
		},
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
						secure: secureCookies,
						// Override domain only when the request host is inside that domain.
						...(requestCookieDomain ? { domain: requestCookieDomain } : {}),
					}
					responseCookies.set(name, serializeSetCookie(name, value, cookieOpts))
				}
			},
		},
	})

	return { client, responseCookies, responseHeaders: new Map<string, string>() }
}

function resolveCookieDomainForRequest(
	request: Request,
	cookieDomain?: string,
): string | undefined {
	const normalized = normalizeCookieDomain(cookieDomain)
	if (!normalized) return undefined

	let hostname: string
	try {
		hostname = new URL(request.url).hostname.toLowerCase()
	} catch {
		return undefined
	}

	const bareDomain = normalized.replace(/^\./, '')
	if (hostname === bareDomain || hostname.endsWith(`.${bareDomain}`)) {
		return normalized
	}
	return undefined
}

function normalizeCookieDomain(value?: string): string | undefined {
	const trimmed = value?.trim().toLowerCase()
	if (!trimmed) return undefined
	return trimmed
}

function shouldUseSecureCookies(request: Request): boolean {
	try {
		if (new URL(request.url).protocol === 'https:') return true
	} catch {
		// Fall through to forwarded protocol check.
	}
	const forwardedProto = request.headers
		.get('x-forwarded-proto')
		?.split(',')[0]
		?.trim()
		.toLowerCase()
	return forwardedProto === 'https'
}

export function appendSetCookieHeaders(
	headers: Headers,
	cookies: Iterable<string>,
	extraHeaders: Iterable<[string, string]> = [],
): number {
	let appended = 0
	for (const [key, value] of extraHeaders) {
		headers.set(key, value)
	}
	for (const cookie of cookies) {
		headers.append('set-cookie', cookie)
		appended += 1
	}
	return appended
}

export async function resolveSupabaseWorkerConfig(
	fallbackEnv: Record<string, string | undefined>,
): Promise<SupabaseServerRuntimeConfig | null> {
	const processConfig = resolveSupabaseServerConfig(fallbackEnv)
	if (processConfig) return processConfig

	try {
		const workersModule = 'cloudflare:workers'
		const { env } = await import(/* @vite-ignore */ workersModule)
		return resolveSupabaseServerConfig({
			COOKIE_DOMAIN: stringEnvValue(env, 'COOKIE_DOMAIN'),
			SUPABASE_COOKIE_NAME: stringEnvValue(env, 'SUPABASE_COOKIE_NAME'),
			SUPABASE_ANON_KEY: stringEnvValue(env, 'SUPABASE_ANON_KEY'),
			SUPABASE_URL: stringEnvValue(env, 'SUPABASE_URL'),
		})
	} catch {
		return null
	}
}

function stringEnvValue(env: unknown, key: string): string | undefined {
	if (!env || typeof env !== 'object') return undefined
	const value = (env as Record<string, unknown>)[key]
	return typeof value === 'string' ? value : undefined
}
