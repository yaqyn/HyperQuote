import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

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
	plugins: [tailwindcss(), viteReact()],
})
