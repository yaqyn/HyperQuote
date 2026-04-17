/**
 * Environment variable accessors for the CEO app.
 */

export const SUPABASE_URL =
	process.env.SUPABASE_URL ?? 'https://placeholder.supabase.co'

export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? 'placeholder'

/** URL for deep links into the internal platform */
export const VITE_INTERNAL_URL =
	import.meta.env?.VITE_INTERNAL_URL ?? 'https://app.hyperquote.net'
