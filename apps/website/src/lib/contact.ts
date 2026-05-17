import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { checkRateLimit, getKVNamespace } from './rate-limit'

const contactInput = z.object({
	name: z.string().min(1).max(200),
	email: z.string().email(),
	phone: z
		.string()
		.regex(/^\+?20[0-9]{10}$/)
		.optional()
		.or(z.literal('')),
	subject: z.enum(['general', 'quote', 'delivery', 'billing', 'other']),
	message: z.string().min(10).max(2000),
})

export const submitContactForm = createServerFn()
	.inputValidator(contactInput)
	.handler(async () => {
		// Extract client IP for rate limiting
		const request = getRequest()
		const ip =
			request.headers.get('cf-connecting-ip') ??
			request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
			'unknown'

		// Rate limit: 5 per IP per 60 seconds
		const kv = await getKVNamespace()
		const rateCheck = await checkRateLimit(kv, {
			key: `contact:${ip}`,
			limit: 5,
			windowSeconds: 60,
		})

		if (!rateCheck.allowed) {
			return {
				error: 'rate_limited' as const,
				retryAfter: rateCheck.retryAfter ?? 60,
			}
		}

		return { ticketId: `TICKET-${Date.now()}` }
	})
