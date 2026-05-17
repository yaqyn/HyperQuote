export interface SupabaseServerRuntimeConfig {
	supabaseUrl: string
	supabaseAnonKey: string
	cookieDomain?: string
}

export interface SupabaseBrowserRuntimeConfig {
	supabaseUrl: string
	supabaseAnonKey: string
}

const PLACEHOLDER_SUPABASE_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_SUPABASE_HOSTNAME = 'placeholder.supabase.co'
const PLACEHOLDER_SUPABASE_ANON_KEY = 'placeholder'

function isPlaceholderSupabaseUrl(value: string): boolean {
	try {
		return new URL(value).hostname === PLACEHOLDER_SUPABASE_HOSTNAME
	} catch {
		return value.includes(PLACEHOLDER_SUPABASE_HOSTNAME)
	}
}

function resolveConfiguredPair(
	supabaseUrl: string | undefined,
	supabaseAnonKey: string | undefined,
): { supabaseUrl: string; supabaseAnonKey: string } | null {
	if (!supabaseUrl || !supabaseAnonKey) return null
	if (
		supabaseUrl === PLACEHOLDER_SUPABASE_URL ||
		isPlaceholderSupabaseUrl(supabaseUrl) ||
		supabaseAnonKey === PLACEHOLDER_SUPABASE_ANON_KEY
	) {
		return null
	}
	return { supabaseUrl, supabaseAnonKey }
}

export function resolveSupabaseServerConfig(
	env: Record<string, string | undefined>,
): SupabaseServerRuntimeConfig | null {
	const config = resolveConfiguredPair(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
	if (!config) return null

	return {
		...config,
		cookieDomain: env.COOKIE_DOMAIN || undefined,
	}
}

export function resolveSupabaseBrowserConfig(
	env: Record<string, string | undefined>,
): SupabaseBrowserRuntimeConfig | null {
	return resolveConfiguredPair(
		env.VITE_SUPABASE_URL,
		env.VITE_SUPABASE_ANON_KEY,
	)
}
