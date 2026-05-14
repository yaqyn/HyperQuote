import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const addInternalNote = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			entityType: z.string(),
			entityId: z.string(),
			note: z.string().min(1),
		}),
	)
	.handler(async () => {
		return { noteId: `note-${Date.now()}` }
	})
