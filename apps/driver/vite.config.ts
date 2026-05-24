import type { IncomingMessage, ServerResponse } from 'node:http'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

interface DriverApiEnv {
	ASSETS: { fetch(request: Request): Promise<Response> }
	COOKIE_DOMAIN?: string
	SUPABASE_ANON_KEY?: string
	SUPABASE_COOKIE_NAME?: string
	SUPABASE_SERVICE_ROLE_KEY?: string
	SUPABASE_URL?: string
}

interface DriverApi {
	fetch(request: Request, env: DriverApiEnv): Promise<Response>
}

function driverApiDevPlugin(): Plugin {
	return {
		name: 'driver-api-dev',
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				if (!req.url?.startsWith('/api/driver/')) {
					next()
					return
				}

				try {
					const request = await toFetchRequest(req)
					const driverApi = await loadDriverApi(server)
					const response = await driverApi.fetch(request, {
						ASSETS: {
							fetch: () => Promise.resolve(new Response(null, { status: 404 })),
						},
						COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
						SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
						SUPABASE_COOKIE_NAME: process.env.SUPABASE_COOKIE_NAME,
						SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
						SUPABASE_URL: process.env.SUPABASE_URL,
					})
					await writeFetchResponse(res, response)
				} catch (error) {
					server.config.logger.error(
						error instanceof Error
							? error.stack || error.message
							: String(error),
					)
					if (!res.headersSent) {
						res.statusCode = 500
						res.setHeader('content-type', 'application/json; charset=utf-8')
					}
					res.end(JSON.stringify({ error: 'driver_api_dev_failed' }))
				}
			})
		},
	}
}

async function loadDriverApi(server: {
	ssrLoadModule(url: string): Promise<Record<string, unknown>>
}): Promise<DriverApi> {
	const apiModule = await server.ssrLoadModule('/src/api.ts')
	const api = apiModule.default
	if (!isDriverApi(api)) {
		throw new Error('driver_api_unavailable')
	}
	return api
}

function isDriverApi(value: unknown): value is DriverApi {
	return (
		!!value &&
		typeof value === 'object' &&
		'fetch' in value &&
		typeof value.fetch === 'function'
	)
}

async function toFetchRequest(req: IncomingMessage): Promise<Request> {
	const host = req.headers.host ?? '127.0.0.1:3003'
	const url = new URL(req.url ?? '/', `http://${host}`)
	const headers = new Headers()
	for (const [key, value] of Object.entries(req.headers)) {
		if (Array.isArray(value)) {
			for (const item of value) headers.append(key, item)
		} else if (typeof value === 'string') {
			headers.set(key, value)
		}
	}

	return new Request(url, {
		body: await readBody(req),
		headers,
		method: req.method,
	})
}

async function readBody(req: IncomingMessage): Promise<BodyInit | undefined> {
	if (req.method === 'GET' || req.method === 'HEAD') return undefined
	const chunks: ArrayBuffer[] = []
	for await (const chunk of req) {
		const bytes =
			typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk
		chunks.push(
			bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
		)
	}
	return new Blob(chunks)
}

async function writeFetchResponse(
	res: ServerResponse,
	response: Response,
): Promise<void> {
	res.statusCode = response.status
	response.headers.forEach((value, key) => {
		res.setHeader(key, value)
	})
	res.end(Buffer.from(await response.arrayBuffer()))
}

export default defineConfig({
	server: { port: 3003 },
	preview: { port: 3003 },
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (!id.includes('/node_modules/')) return
					if (id.includes('/maplibre-gl/') || id.includes('/react-map-gl/')) {
						return 'map'
					}
					if (
						id.includes('/react/') ||
						id.includes('/react-dom/') ||
						id.includes('/scheduler/')
					) {
						return 'react'
					}
					if (
						id.includes('/react-aria') ||
						id.includes('/@react-aria/') ||
						id.includes('/@react-stately/') ||
						id.includes('/@react-types/') ||
						id.includes('/@internationalized/')
					) {
						return 'aria'
					}
					if (id.includes('/@tanstack/')) return 'tanstack'
					if (
						id.includes('/@capacitor/') ||
						id.includes('/i18next/') ||
						id.includes('/lucide-react/') ||
						id.includes('/motion/') ||
						id.includes('/react-i18next/') ||
						id.includes('/zod/') ||
						id.includes('/zustand/')
					) {
						return 'app-vendor'
					}
				},
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
	plugins: [driverApiDevPlugin(), tailwindcss(), viteReact()],
})
