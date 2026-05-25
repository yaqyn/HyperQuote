import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import { hyperquoteManualChunks } from '../../tooling/vite/manual-chunks'

function websiteManualChunks(id: string) {
	const normalized = id.replaceAll('\\', '/')

	if (
		normalized.includes('/node_modules/@tanstack/ai/') ||
		normalized.includes('/node_modules/@tanstack/ai-react/')
	) {
		return undefined
	}

	return hyperquoteManualChunks(id)
}

const isCloudflareTarget = process.env.HYPERQUOTE_DEPLOY_TARGET === 'cloudflare'

export default defineConfig({
	server: { port: 3000 },
	assetsInclude: ['**/*.md'],
	build: {
		rollupOptions: {
			output: {
				manualChunks: websiteManualChunks,
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
		tanstackStart({
			prerender: {
				enabled: true,
				autoStaticPathsDiscovery: false,
				crawlLinks: false,
			},
			pages: [{ path: '/' }, { path: '/about' }],
		}),
		viteReact(),
		...(isCloudflareTarget ? [] : [nitro()]),
	],
})
