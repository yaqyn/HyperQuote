import { defineConfig } from 'vitest/config'

export default defineConfig({
	define: {
		'import.meta.env.VITE_POWERSYNC_URL': JSON.stringify(
			'https://test.powersync.dev',
		),
		'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
			'https://test.supabase.co',
		),
		'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('test-anon-key'),
	},
	test: {
		globals: true,
		environment: 'node',
		include: ['src/**/*.test.ts'],
	},
})
