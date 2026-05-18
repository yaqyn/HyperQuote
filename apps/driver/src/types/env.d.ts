interface ImportMetaEnv {
	readonly VITE_MAPTILER_KEY?: string
	readonly VITE_SUPABASE_ANON_KEY?: string
	readonly VITE_SUPABASE_URL?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
