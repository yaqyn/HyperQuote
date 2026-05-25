import { supabaseHealthResponse } from '@hyperquote/auth/server'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/health')({
	server: {
		handlers: {
			GET: () => supabaseHealthResponse({ app: 'internal' }),
		},
	},
})
