import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
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
	resolve: {
		dedupe: ['react', 'react-dom'],
	},
	ssr: {
		optimizeDeps: {
			exclude: ['@supabase/supabase-js'],
		},
	},
	plugins: [tailwindcss(), tanstackStart(), viteReact(), nitro()],
})
