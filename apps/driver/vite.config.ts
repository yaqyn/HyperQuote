import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
	server: { port: 3004 },
	plugins: [tailwindcss(), viteReact()],
	resolve: {
		alias: {
			'@': resolve(import.meta.dirname, 'src'),
		},
	},
	worker: {
		format: 'es',
	},
	optimizeDeps: {
		exclude: ['@powersync/web', '@powersync/capacitor'],
	},
})
