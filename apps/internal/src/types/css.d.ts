declare module '*.css?url' {
	const url: string
	export default url
}

declare module '*.css' {
	const css: string
	export default css
}

declare module 'maplibre-gl/dist/maplibre-gl.css'

interface ImportMetaEnv {
	readonly VITE_SUPABASE_URL?: string
	readonly VITE_SUPABASE_ANON_KEY?: string
	readonly VITE_MAPTILER_KEY?: string
	readonly VITE_ROAD_ROUTE_ENDPOINT?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
