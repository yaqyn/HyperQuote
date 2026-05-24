interface ImportMetaEnv {
	readonly VITE_SUPABASE_URL?: string
	readonly VITE_SUPABASE_ANON_KEY?: string
	readonly VITE_INTERNAL_URL?: string
	readonly VITE_MAPTILER_KEY?: string
	readonly VITE_ROAD_ROUTE_ENDPOINT?: string
	readonly VITE_WEBSITE_URL?: string
	readonly VITE_SUPPORT_EMAIL?: string
	readonly VITE_SUPPORT_PHONE_E164?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
