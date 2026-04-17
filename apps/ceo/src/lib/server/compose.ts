/**
 * CEO compose/route message server function.
 * Routes messages to departments with priority.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

// ============================================================================
// Helper
// ============================================================================

function isSupabaseConfigured(): boolean {
	return !!(
		process.env.SUPABASE_URL &&
		process.env.SUPABASE_URL !== 'https://placeholder.supabase.co' &&
		process.env.SUPABASE_ANON_KEY &&
		process.env.SUPABASE_ANON_KEY !== 'placeholder'
	)
}

// ============================================================================
// Input schema
// ============================================================================

const routeMessageInput = z.object({
	recipientId: z.string().min(1),
	message: z.string().min(1).max(5000),
	priority: z.enum(['normal', 'urgent']),
})

// ============================================================================
// routeMessage
// ============================================================================

export const routeMessage = createServerFn({ method: 'POST' })
	.inputValidator(routeMessageInput)
	.handler(async ({ data: _input }): Promise<{ messageId: string }> => {
		if (isSupabaseConfigured()) {
			// TODO: Real Supabase mutation -- insert into internal_messages, send notification
		}

		return { messageId: crypto.randomUUID() }
	})
