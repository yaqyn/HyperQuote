import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
	server: { port: 3003 },
	preview: { port: 3003 },
	resolve: {
		dedupe: ['react', 'react-dom'],
	},
	plugins: [tailwindcss(), viteReact()],
})
