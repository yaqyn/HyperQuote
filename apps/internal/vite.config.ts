import { resolve } from 'node:path'
import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import type { PluginOption } from 'vite'
import { defineConfig } from 'vite'
import { hyperquoteManualChunks } from '../../tooling/vite/manual-chunks'

// Client-only shims for server modules that leak into the client module graph.
// TanStack Start + Cloudflare leaks server-only modules (start-server-core,
// router-core/ssr/server) into the client during dev. These shims provide
// browser-compatible stubs so the leaked modules load without crashing.
function clientOnlyShims(): PluginOption {
	const id = 'tanstack-start-injected-head-scripts:v'
	const resolved = `\0${id}`

	const shimMap: Record<string, string> = {
		'node:stream/web': resolve(__dirname, 'src/shims/node-stream-web.ts'),
		'node:stream': resolve(__dirname, 'src/shims/node-stream.ts'),
		'react-dom/server': resolve(__dirname, 'src/shims/react-dom-server.ts'),
	}

	return {
		name: 'client-only-shims',
		enforce: 'pre',
		applyToEnvironment: (env) => env.config.consumer === 'client',
		resolveId(source) {
			if (source === id) return resolved
			if (shimMap[source]) return shimMap[source]
		},
		load(loadId) {
			if (loadId === resolved)
				return 'export const injectedHeadScripts = undefined'
		},
	}
}

export default defineConfig({
	server: { port: 3002 },
	build: {
		rollupOptions: {
			output: {
				manualChunks: hyperquoteManualChunks,
			},
		},
	},
	resolve: {
		dedupe: ['react', 'react-dom'],
	},
	ssr: {
		optimizeDeps: {
			exclude: ['@supabase/supabase-js'],
		},
	},
	plugins: [
		cloudflare({ viteEnvironment: { name: 'ssr' } }),
		tailwindcss(),
		clientOnlyShims(),
		tanstackStart(),
		viteReact(),
	],
})
