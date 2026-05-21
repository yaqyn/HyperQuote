import { resolveSupabaseBrowserConfig } from '@hyperquote/auth'

const DRIVER_SUPABASE_COOKIE_NAME = 'hyperquote_driver_auth'

export function resolveDriverSupabaseConfig() {
	const config = resolveSupabaseBrowserConfig(import.meta.env)
	if (!config) return null
	return {
		...config,
		cookieName: config.cookieName ?? DRIVER_SUPABASE_COOKIE_NAME,
	}
}
