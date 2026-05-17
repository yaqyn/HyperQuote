import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { hyperquoteManualChunks } from '../../tooling/vite/manual-chunks'

export default defineConfig({
	server: { port: 3001 },
	build: {
		rollupOptions: {
			output: {
				manualChunks: hyperquoteManualChunks,
			},
		},
	},
	plugins: [
		cloudflare({ viteEnvironment: { name: 'ssr' } }),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
})
