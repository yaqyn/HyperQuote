import { resolve } from 'node:path'
import type { PluginOption } from 'vite'
import { defineReactStartAppConfig } from '../../tooling/vite/react-start-app'

// Client-only shims for server modules that leak into the client module graph.
// TanStack Start can expose server-only modules during dev. These shims provide
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

export default defineReactStartAppConfig({
	extraPlugins: [clientOnlyShims()],
	port: 3002,
})
