import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import type { PluginOption, UserConfig } from 'vite'
import { defineConfig } from 'vite'
import { hyperquoteManualChunks } from './manual-chunks'

type ManualChunks = (id: string) => string | undefined

interface ReactStartAppConfigOptions {
	assetsInclude?: UserConfig['assetsInclude']
	extraPlugins?: PluginOption[]
	manualChunks?: ManualChunks
	port: number
	tanstackStartOptions?: Parameters<typeof tanstackStart>[0]
}

const isCloudflareTarget = process.env.HYPERQUOTE_DEPLOY_TARGET === 'cloudflare'

export function defineReactStartAppConfig({
	assetsInclude,
	extraPlugins = [],
	manualChunks = hyperquoteManualChunks,
	port,
	tanstackStartOptions,
}: ReactStartAppConfigOptions) {
	return defineConfig({
		server: { port, strictPort: true },
		preview: { strictPort: false },
		assetsInclude,
		define: {
			'process.env.TSS_SERVER_FN_BASE': JSON.stringify('/_serverFn/'),
		},
		build: {
			rollupOptions: {
				output: {
					manualChunks,
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
			...(isCloudflareTarget
				? [cloudflare({ viteEnvironment: { name: 'ssr' } })]
				: []),
			tailwindcss(),
			...extraPlugins,
			tanstackStartOptions
				? tanstackStart(tanstackStartOptions)
				: tanstackStart(),
			viteReact(),
			...(isCloudflareTarget ? [] : [nitro()]),
		],
	})
}
