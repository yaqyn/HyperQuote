import { createBrowserClient } from '@supabase/ssr'

const browserClients = new Map<string, ReturnType<typeof createBrowserClient>>()

/**
 * Create a Supabase client for browser-side use.
 * Singleton per cookie name — each app/pool gets isolated auth storage.
 */
export function createSupabaseBrowserClient(
	supabaseUrl: string,
	supabaseAnonKey: string,
	cookieName?: string,
) {
	const key = `${supabaseUrl}:${cookieName ?? 'default'}`
	const existing = browserClients.get(key)
	if (existing) return existing
	const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
		...(cookieName ? { cookieOptions: { name: cookieName } } : {}),
	})
	browserClients.set(key, client)
	return client
}
